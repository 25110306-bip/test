const crypto = require('crypto');
const { createError } = require('./http');

function secret() {
  return process.env.JWT_SECRET || process.env.BOT_CHECK_SECRET || 'dev-secret-change-me';
}

function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function read(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) throw createError(400, 'Mã chống bot không hợp lệ.');
  const [data, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', secret()).update(data).digest('base64url');
  if (!sig || sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw createError(400, 'Mã chống bot không hợp lệ.');
  const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  if (!payload.exp || payload.exp < Date.now()) throw createError(400, 'Mã chống bot đã hết hạn. Hãy tải lại captcha.');
  return payload;
}

function createBotChallenge() {
  const a = Math.floor(Math.random() * 8) + 2;
  const b = Math.floor(Math.random() * 8) + 2;
  const payload = {
    a,
    b,
    exp: Date.now() + 5 * 60 * 1000,
    nonce: crypto.randomBytes(12).toString('hex')
  };
  return {
    token: sign(payload),
    question: `${a} + ${b} = ?`,
    expiresInSeconds: 300
  };
}

function verifyBotChallenge({ captchaToken, captchaAnswer, botTrap }) {
  if (botTrap && String(botTrap).trim()) throw createError(400, 'Phát hiện bot.');
  const payload = read(captchaToken);
  const answer = Number(String(captchaAnswer ?? '').trim());
  if (!Number.isFinite(answer) || answer !== payload.a + payload.b) throw createError(400, 'Captcha không đúng.');
  return true;
}

module.exports = { createBotChallenge, verifyBotChallenge };
