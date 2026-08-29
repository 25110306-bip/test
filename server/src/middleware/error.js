function notFound(req, res, next) {
  res.status(404).json({ message: 'Không tìm thấy API.' });
}

function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    message: err.message || 'Lỗi máy chủ.',
    details: err.details
  });
}

module.exports = { notFound, errorHandler };
