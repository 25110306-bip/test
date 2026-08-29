const User = require('../models/User');
const { verifyToken } = require('../utils/jwt');
const { createError } = require('../utils/http');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw createError(401, 'Bạn cần đăng nhập.');
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user || user.status !== 'active') throw createError(401, 'Tài khoản không hợp lệ.');
    req.user = user;
    next();
  } catch (err) {
    next(createError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'));
  }
}

function requireVerifiedPhone(req, res, next) {
  // Dự án hiện dùng xác minh chống bot cơ bản, không bắt buộc xác minh SĐT.
  // Giữ middleware này để tương thích các route cũ, nhưng không chặn người dùng.
  next();
}

function requireRole(role) {
  return function roleMiddleware(req, res, next) {
    if (!req.user?.roles?.includes(role)) return next(createError(403, 'Bạn không có quyền thực hiện thao tác này.'));
    next();
  };
}

module.exports = { requireAuth, requireVerifiedPhone, requireRole };
