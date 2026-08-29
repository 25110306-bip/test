const { createError } = require('../utils/http');

function validate(schema) {
  return function validateRequest(req, res, next) {
    const parsed = schema.safeParse({ body: req.body, query: req.query, params: req.params });
    if (!parsed.success) {
      return next(createError(400, 'Dữ liệu gửi lên không hợp lệ.', parsed.error.flatten()));
    }
    req.validated = parsed.data;
    next();
  };
}

module.exports = { validate };
