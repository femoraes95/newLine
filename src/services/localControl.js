const fs = require('fs/promises');
const path = require('path');

const CONTROL_VERSION = 1;
const CONTROL_FILE_PATH = path.join(__dirname, '..', '..', 'data', 'idsecure-control.json');
const MAX_SANITIZE_DEPTH = 6;
const MAX_STRING_LENGTH = 2000;
const MAX_ARRAY_ITEMS = 50;
const REDACTED = '[redacted]';

let writeQueue = Promise.resolve();

function isSensitiveKey(key) {
  return /password|senha|token|authorization|secret|credential|access[_-]?key/i.test(key);
}

function sanitizeString(value) {
  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_STRING_LENGTH)}...[truncated]`;
}

function sanitizeForControl(value, depth = 0) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (depth >= MAX_SANITIZE_DEPTH) {
    return '[max-depth]';
  }

  if (Array.isArray(value)) {
    const sanitized = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeForControl(item, depth + 1));

    if (value.length > MAX_ARRAY_ITEMS) {
      sanitized.push(`[${value.length - MAX_ARRAY_ITEMS} items truncated]`);
    }

    return sanitized;
  }

  if (typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, item]) => {
      acc[key] = isSensitiveKey(key) ? REDACTED : sanitizeForControl(item, depth + 1);
      return acc;
    }, {});
  }

  return String(value);
}

function getRequestId(req) {
  return req?.requestId || req?.headers?.['x-request-id'] || null;
}

function getRoute(req) {
  return req?.originalUrl || req?.baseUrl || req?.path || null;
}

function getControlContext(req = {}, details = {}) {
  const requestContext = req.idsecureControl || {};
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  return {
    operation: details.operation ?? requestContext.operation ?? null,
    route: details.route ?? getRoute(req),
    method: details.method ?? req.method ?? null,
    name: details.name ?? requestContext.name ?? body.name ?? null,
    cardNumber: details.cardNumber ?? requestContext.cardNumber ?? body.cardNumber ?? null,
    idempotencyKey: details.idempotencyKey ?? requestContext.idempotencyKey ?? null,
    requestId: details.requestId ?? getRequestId(req),
  };
}

function buildControlItem(status, req, details = {}) {
  const context = getControlContext(req, details);

  return {
    timestamp: new Date().toISOString(),
    status,
    operation: context.operation,
    route: context.route,
    method: context.method,
    name: context.name,
    cardNumber: context.cardNumber,
    idempotencyKey: context.idempotencyKey,
    httpStatus: details.httpStatus ?? (status === 'success' ? 200 : 500),
    message: details.message ?? null,
    idsecureResponse: sanitizeForControl(details.idsecureResponse ?? null),
    requestId: context.requestId,
    ...(details.emailStatus
      ? { emailStatus: sanitizeForControl(details.emailStatus) }
      : {}),
  };
}

async function readControlFile() {
  try {
    const raw = await fs.readFile(CONTROL_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed.items)) {
      return { version: CONTROL_VERSION, updatedAt: new Date().toISOString(), items: [] };
    }

    return {
      version: parsed.version || CONTROL_VERSION,
      updatedAt: parsed.updatedAt || null,
      items: parsed.items,
    };
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { version: CONTROL_VERSION, updatedAt: new Date().toISOString(), items: [] };
    }

    throw err;
  }
}

async function findSuccessfulRegistration(idempotencyKey, cardNumber) {
  if (!idempotencyKey && !cardNumber) {
    return null;
  }

  const control = await readControlFile();

  return control.items.find((item) => (
    item.status === 'success'
    && (
      item.idempotencyKey === idempotencyKey
      || (
        cardNumber
        && String(item.cardNumber) === String(cardNumber)
      )
    )
  )) || null;
}

async function appendControlItem(item) {
  await fs.mkdir(path.dirname(CONTROL_FILE_PATH), { recursive: true });

  const control = await readControlFile();
  control.version = CONTROL_VERSION;
  control.updatedAt = new Date().toISOString();
  control.items.push(item);

  const tempPath = `${CONTROL_FILE_PATH}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(control, null, 2)}\n`, 'utf8');
  await fs.rename(tempPath, CONTROL_FILE_PATH);

  return item;
}

function enqueueControlItem(item) {
  const writeJob = writeQueue.then(() => appendControlItem(item));
  writeQueue = writeJob.catch(() => {});
  return writeJob;
}

async function recordControlItem(status, req, details) {
  const item = buildControlItem(status, req, details);

  try {
    await enqueueControlItem(item);
    return item;
  } catch (err) {
    console.error(`[LocalControl] Falha ao registrar controle local: ${err.message}`);
    return null;
  }
}

function recordSuccess(req, details = {}) {
  return recordControlItem('success', req, details);
}

function recordError(req, details = {}) {
  return recordControlItem('error', req, details);
}

module.exports = {
  recordSuccess,
  recordError,
  findSuccessfulRegistration,
  sanitizeForControl,
};
