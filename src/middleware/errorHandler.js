const {
  extractErrorData,
  reportOperationalError,
  shouldReportOperationalError,
} = require('../services/errorReporter');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const { httpStatus, message, idsecureResponse } = extractErrorData(err);

  console.error(`[Error] ${req.method} ${req.path} -> ${httpStatus}: ${message}`);

  const sendResponse = () => {
    if (!res.headersSent) {
      res.status(httpStatus).json({ success: false, message, details: idsecureResponse });
    }
  };

  if (!shouldReportOperationalError(req)) {
    sendResponse();
    return;
  }

  reportOperationalError(req, {
    error: err,
    httpStatus,
    message,
    idsecureResponse,
  })
    .catch((reportErr) => {
      console.error(`[ErrorReporter] Falha ao registrar erro operacional: ${reportErr.message}`);
    });

  sendResponse();
}

module.exports = errorHandler;
