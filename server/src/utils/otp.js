const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Otp = require('../models/Otp');

function generateOtpCode() {
  return String(crypto.randomInt(100000, 999999));
}

function normalizeVnPhone(phone) {
  const raw = String(phone || '').replace(/\s|\.|-/g, '');
  if (raw.startsWith('+')) return raw;
  if (raw.startsWith('84')) return `+${raw}`;
  if (raw.startsWith('0')) return `+84${raw.slice(1)}`;
  return raw;
}

function otpMessage(code) {
  const brand = process.env.SMS_BRAND_NAME || 'VietRank';
  return `${brand}: Ma OTP xac thuc cua ban la ${code}. Ma het han sau 10 phut. Khong chia se ma nay.`;
}

async function createPhoneOtp(user) {
  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, 10);
  await Otp.deleteMany({ userId: user._id, purpose: 'phone_verify', consumedAt: null });
  await Otp.create({
    userId: user._id,
    phone: user.phone,
    codeHash,
    purpose: 'phone_verify',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });
  return code;
}

async function sendViaTwilio(phone, code) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) throw new Error('Thiếu TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN hoặc TWILIO_FROM.');
  const body = new URLSearchParams({
    To: normalizeVnPhone(phone),
    From: from,
    Body: otpMessage(code)
  });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Twilio SMS lỗi ${res.status}`);
  return { provider: 'twilio', id: data.sid };
}

async function sendViaESms(phone, code) {
  const apiKey = process.env.ESMS_API_KEY;
  const secretKey = process.env.ESMS_SECRET_KEY;
  const brandname = process.env.ESMS_BRANDNAME || process.env.SMS_BRAND_NAME || '';
  const smsType = process.env.ESMS_SMS_TYPE || '2';
  if (!apiKey || !secretKey) throw new Error('Thiếu ESMS_API_KEY hoặc ESMS_SECRET_KEY.');
  const params = new URLSearchParams({
    Phone: normalizeVnPhone(phone).replace(/^\+/, ''),
    Content: otpMessage(code),
    ApiKey: apiKey,
    SecretKey: secretKey,
    SmsType: smsType
  });
  if (brandname) params.set('Brandname', brandname);
  const res = await fetch(`https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_get?${params.toString()}`);
  const data = await res.json().catch(() => ({}));
  const ok = data.CodeResult === '100' || data.CodeResult === 100 || data.CodeResult === '1000' || data.CodeResult === 1000;
  if (!res.ok || !ok) throw new Error(data.ErrorMessage || data.Message || `eSMS lỗi ${res.status}`);
  return { provider: 'esms', id: data.SMSID || data.Session || '' };
}

async function sendViaWebhook(phone, code) {
  const url = process.env.SMS_WEBHOOK_URL;
  if (!url) throw new Error('Thiếu SMS_WEBHOOK_URL.');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(process.env.SMS_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.SMS_WEBHOOK_TOKEN}` } : {}) },
    body: JSON.stringify({ phone: normalizeVnPhone(phone), code, message: otpMessage(code) })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `SMS webhook lỗi ${res.status}`);
  return { provider: 'webhook', id: data.id || data.messageId || '' };
}

async function sendOtp(phone, code) {
  const provider = (process.env.SMS_PROVIDER || 'console').toLowerCase();
  if (provider === 'console' || provider === 'mock') {
    console.log(`[otp] Phone ${phone}: ${code}`);
    return { sent: false, provider: 'console', message: 'OTP đang in trong Render Logs vì SMS_PROVIDER=console.' };
  }

  try {
    if (provider === 'twilio') return { sent: true, ...(await sendViaTwilio(phone, code)) };
    if (provider === 'esms') return { sent: true, ...(await sendViaESms(phone, code)) };
    if (provider === 'webhook') return { sent: true, ...(await sendViaWebhook(phone, code)) };
    throw new Error(`SMS_PROVIDER=${provider} chưa được hỗ trợ. Dùng console, twilio, esms hoặc webhook.`);
  } catch (err) {
    console.error('[otp] send failed:', err.message);
    if (process.env.SMS_FAIL_OPEN === 'true') {
      console.log(`[otp] FAIL_OPEN Phone ${phone}: ${code}`);
      return { sent: false, provider, message: `Gửi SMS thất bại, OTP in trong logs: ${err.message}` };
    }
    throw err;
  }
}

module.exports = { createPhoneOtp, sendOtp, normalizeVnPhone };
