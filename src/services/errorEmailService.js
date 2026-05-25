const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { sanitizeForControl } = require('./localControl');

const DEFAULT_ERROR_TO = 'felipe@hospitalpaulista.com.br';

let sesClient = null;
let sesClientRegion = null;

function getSesClient(region) {
  if (!sesClient || sesClientRegion !== region) {
    sesClient = new SESClient({ region });
    sesClientRegion = region;
  }

  return sesClient;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(sanitizeForControl(value), null, 2);
}

function buildEmailBody(details) {
  const lines = [
    'Erro operacional no newLine iDSecure.',
    '',
    `Request ID: ${formatValue(details.requestId)}`,
    `Operacao: ${formatValue(details.operation)}`,
    `Rota: ${formatValue(details.method)} ${formatValue(details.route)}`,
    `Status HTTP: ${formatValue(details.httpStatus)}`,
    `Mensagem: ${formatValue(details.message)}`,
    `Nome: ${formatValue(details.name)}`,
    `CardNumber: ${formatValue(details.cardNumber)}`,
    '',
    'Resposta iDSecure:',
    formatValue(details.idsecureResponse),
  ];

  const text = lines.join('\n');
  const html = `
    <h2>Erro operacional no newLine iDSecure</h2>
    <table>
      <tr><td><strong>Request ID</strong></td><td>${escapeHtml(formatValue(details.requestId))}</td></tr>
      <tr><td><strong>Operacao</strong></td><td>${escapeHtml(formatValue(details.operation))}</td></tr>
      <tr><td><strong>Rota</strong></td><td>${escapeHtml(formatValue(details.method))} ${escapeHtml(formatValue(details.route))}</td></tr>
      <tr><td><strong>Status HTTP</strong></td><td>${escapeHtml(formatValue(details.httpStatus))}</td></tr>
      <tr><td><strong>Mensagem</strong></td><td>${escapeHtml(formatValue(details.message))}</td></tr>
      <tr><td><strong>Nome</strong></td><td>${escapeHtml(formatValue(details.name))}</td></tr>
      <tr><td><strong>CardNumber</strong></td><td>${escapeHtml(formatValue(details.cardNumber))}</td></tr>
    </table>
    <h3>Resposta iDSecure</h3>
    <pre>${escapeHtml(formatValue(details.idsecureResponse))}</pre>
  `;

  return { text, html };
}

async function sendErrorEmail(details = {}) {
  const region = process.env.AWS_REGION;
  const from = process.env.SES_FROM_EMAIL;
  const to = process.env.SES_ERROR_TO || DEFAULT_ERROR_TO;

  if (!region) {
    return { status: 'skipped', reason: 'AWS_REGION nao configurado', to };
  }

  if (!from) {
    return { status: 'skipped', reason: 'SES_FROM_EMAIL nao configurado', to };
  }

  const subject = `[newLine iDSecure] Erro ${details.httpStatus || 500} em ${details.method || '-'} ${details.route || '-'}`;
  const { text, html } = buildEmailBody(details);

  const command = new SendEmailCommand({
    Source: from,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: text,
          Charset: 'UTF-8',
        },
        Html: {
          Data: html,
          Charset: 'UTF-8',
        },
      },
    },
  });

  const response = await getSesClient(region).send(command);

  return {
    status: 'sent',
    messageId: response.MessageId || null,
    to,
    from,
  };
}

module.exports = {
  sendErrorEmail,
};
