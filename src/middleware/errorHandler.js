function errorHandler(err, req, res, next) {
  const status = err.response?.status || 500;
  const message = err.response?.data?.message || err.message || 'Erro interno';

  console.error(`[Error] ${req.method} ${req.path} → ${status}: ${message}`);

  res.status(status).json({ success: false, message, details: err.response?.data || null });
}

module.exports = errorHandler;
