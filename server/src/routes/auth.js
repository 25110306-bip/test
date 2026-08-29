const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const validator = require('validator');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, createError } = require('../utils/http');
const { signToken } = require('../utils/jwt');
const { calculateAge } = require('../utils/age');
const { createPhoneOtp, sendOtp } = require('../utils/otp');
const { verifyBotChallenge } = require('../utils/botCheck');

const router = express.Router();

const phoneRegex = /^(\+?84|0)(3|5|7|8|9)\d{8}$/;

const registerSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().transform(v => v.toLowerCase()),
    password: z.string().min(8).max(72).regex(/[A-Z]/, 'Mật khẩu cần có chữ hoa.').regex(/[a-z]/, 'Mật khẩu cần có chữ thường.').regex(/[0-9]/, 'Mật khẩu cần có số.'),
    phone: z.string().trim().optional().default('').refine(v => !v || phoneRegex.test(v), 'Số điện thoại Việt Nam không hợp lệ.'),
    dateOfBirth: z.string().refine(v => !Number.isNaN(Date.parse(v)), 'Ngày sinh không hợp lệ.'),
    guardianFullName: z.string().trim().max(120).optional(),
    guardianPhone: z.string().trim().optional(),
    acceptTerms: z.boolean(),
    acceptPrivacy: z.boolean(),
    acceptDataProcessing: z.boolean(),
    marketingConsent: z.boolean().optional().default(false),
    captchaToken: z.string().min(10),
    captchaAnswer: z.string().min(1),
    botTrap: z.string().optional().default('')
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email().transform(v => v.toLowerCase()),
    password: z.string().min(1).max(72),
    captchaToken: z.string().min(10),
    captchaAnswer: z.string().min(1),
    botTrap: z.string().optional().default('')
  })
});

const verifyOtpSchema = z.object({
  body: z.object({
    code: z.string().regex(/^\d{6}$/)
  })
});

router.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
  const body = req.validated.body;
  verifyBotChallenge(body);
  if (!body.acceptTerms || !body.acceptPrivacy || !body.acceptDataProcessing) {
    throw createError(400, 'Bạn cần đồng ý điều khoản, chính sách riêng tư và xử lý dữ liệu cá nhân.');
  }

  const age = calculateAge(body.dateOfBirth);
  if (age < 16) {
    if (!body.guardianFullName || !body.guardianPhone || !phoneRegex.test(body.guardianPhone)) {
      throw createError(400, 'Người dưới 16 tuổi cần thông tin người giám hộ hợp lệ.');
    }
  }

  const duplicateQuery = body.phone ? { $or: [{ email: body.email }, { phone: body.phone }] } : { email: body.email };
  const exists = await User.findOne(duplicateQuery);
  if (exists) throw createError(409, body.phone ? 'Email hoặc số điện thoại đã được sử dụng.' : 'Email đã được sử dụng.');

  const passwordHash = await bcrypt.hash(body.password, 12);
  const roles = ['user'];
  if (process.env.ADMIN_EMAIL && body.email === process.env.ADMIN_EMAIL.toLowerCase()) roles.push('admin');

  const now = new Date();
  const user = await User.create({
    fullName: validator.escape(body.fullName),
    email: body.email,
    passwordHash,
    phone: body.phone || undefined,
    botVerified: true,
    botVerifiedAt: now,
    dateOfBirth: new Date(body.dateOfBirth),
    guardian: age < 16 ? {
      fullName: validator.escape(body.guardianFullName),
      phone: body.guardianPhone,
      consentAt: now
    } : undefined,
    roles,
    consent: {
      termsAcceptedAt: now,
      privacyAcceptedAt: now,
      dataProcessingAcceptedAt: now,
      marketingConsent: Boolean(body.marketingConsent)
    }
  });

  res.status(201).json({
    token: signToken(user),
    user: user.toSafeJSON(),
    message: 'Đăng ký thành công. Tài khoản đã vượt kiểm tra chống bot cơ bản.'
  });
}));

router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  verifyBotChallenge(req.validated.body);
  const { email, password } = req.validated.body;
  const user = await User.findOne({ email });
  if (!user || user.status !== 'active') throw createError(401, 'Email hoặc mật khẩu không đúng.');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw createError(401, 'Email hoặc mật khẩu không đúng.');
  user.lastLoginAt = new Date();
  user.botVerified = true;
  user.botVerifiedAt = new Date();
  await user.save();
  res.json({ token: signToken(user), user: user.toSafeJSON() });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
}));

router.post('/request-phone-otp', requireAuth, asyncHandler(async (req, res) => {
  if (!req.user.phone) throw createError(400, 'Tài khoản này chưa có số điện thoại. Web hiện không bắt buộc OTP.');
  const code = await createPhoneOtp(req.user);
  let sms;
  try {
    sms = await sendOtp(req.user.phone, code);
  } catch (err) {
    sms = { sent: false, provider: process.env.SMS_PROVIDER || 'console', message: err.message };
  }
  res.json({
    sms,
    message: sms.sent
      ? 'Đã gửi OTP mới. OTP hết hạn sau 10 phút.'
      : 'Đã tạo OTP mới nhưng SMS thật chưa bật. Hãy xem OTP trong Render Logs hoặc cấu hình SMS_PROVIDER.'
  });
}));

router.post('/verify-phone', requireAuth, validate(verifyOtpSchema), asyncHandler(async (req, res) => {
  const otp = await Otp.findOne({
    userId: req.user._id,
    purpose: 'phone_verify',
    consumedAt: null,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (!otp) throw createError(400, 'OTP không tồn tại hoặc đã hết hạn.');
  if (otp.attempts >= 5) throw createError(429, 'Bạn đã nhập sai OTP quá nhiều lần. Hãy yêu cầu mã mới.');

  const ok = await bcrypt.compare(req.validated.body.code, otp.codeHash);
  if (!ok) {
    otp.attempts += 1;
    await otp.save();
    throw createError(400, 'OTP không đúng.');
  }

  otp.consumedAt = new Date();
  req.user.phoneVerified = true;
  req.user.phoneVerifiedAt = new Date();
  await Promise.all([otp.save(), req.user.save()]);
  res.json({ message: 'Xác thực số điện thoại thành công.', user: req.user.toSafeJSON() });
}));


router.get('/oauth/:provider', (req, res) => {
  const provider = req.params.provider;
  if (!['google', 'facebook', 'telegram'].includes(provider)) {
    return res.status(400).json({ message: 'Nhà cung cấp đăng nhập không hợp lệ.' });
  }
  res.status(501).json({
    message: `Đăng nhập nhanh qua ${provider} đã có khung API nhưng chưa bật. Hãy cấu hình OAuth client, callback URL và bước nối SĐT/OTP trước khi chạy thật.`,
    provider,
    requiredEnv: provider === 'google'
      ? ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'OAUTH_CALLBACK_URL']
      : provider === 'facebook'
        ? ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET', 'OAUTH_CALLBACK_URL']
        : ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_LOGIN_WIDGET_OR_CALLBACK']
  });
});

module.exports = router;
