const { recordError, sanitizeForControl } = require('./localControl');
const { sendErrorEmail } = require('./errorEmailService');

function getRoute(req) {
  return req?.originalUrl || req?.baseUrl || req?.path || '';
}

function shouldReportOperationalError(req = {}) {
  if (req.idsecureControl?.operation) {
    return true;
  }

  const route = getRoute(req);
  const { method } = req;

  return (
    (method === 'POST' && route.startsWith('/persons'))
    || (method === 'PUT' && route.startsWith('/persons/'))
    || (method === 'POST' && route.startsWith('/visitors'))
    || (method === 'POST' && route.startsWith('/webhook/patient'))
  );
}

function extractErrorData(error = {}) {
  const idsecureResponse = error.response?.data || null;
  const httpStatus = error.response?.status || error.status || error.statusCode || 500;
  const message = idsecureResponse?.message || error.message || 'Erro interno';

  return { httpStatus, message, idsecureResponse };
}

function buildReportDetails(req, details = {}) {
  const errorData = details.error ? extractErrorData(details.error) : {};
  const requestContext = req.idsecureControl || {};
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  return {
    operation: details.operation ?? requestContext.operation ?? null,
    route: details.route ?? getRoute(req),
    method: details.method ?? req.method ?? null,
    name: details.name ?? requestContext.name ?? body.name ?? null,
    cardNumber: details.cardNumber ?? requestContext.cardNumber ?? body.cardNumber ?? null,
    requestId: details.requestId ?? req.requestId ?? req.headers?.['x-request-id'] ?? null,
    httpStatus: details.httpStatus ?? errorData.httpStatus ?? 500,
    message: details.message ?? errorData.message ?? 'Erro interno',
    idsecureResponse: sanitizeForControl(
      details.idsecureResponse ?? errorData.idsecureResponse ?? null,
    ),
  };
}

async function reportOperationalError(req, details = {}) {
  const reportDetails = buildReportDetails(req, details);
  let emailStatus;

  try {
    emailStatus = await sendErrorEmail(reportDetails);
  } catch (err) {
    emailStatus = {
      status: 'failed',
      name: err.name || null,
      message: err.message || 'Falha ao enviar email de erro',
    };
    console.error(`[SES] Falha ao enviar alerta de erro: ${err.message}`);
  }

  await recordError(req, {
    ...reportDetails,
    emailStatus,
  });

  return {
    ...reportDetails,
    emailStatus,
  };
}

module.exports = {
  reportOperationalError,
  shouldReportOperationalError,
  extractErrorData,
};
