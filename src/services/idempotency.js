const registrationLocks = new Map();

function normalizeKeyPart(value) {
  return String(value).trim().toLowerCase();
}

function buildRegistrationKey(req) {
  const headerKey = req.get('Idempotency-Key');

  if (headerKey?.trim()) {
    return `header:${normalizeKeyPart(headerKey)}`;
  }

  const { cardNumber, doc } = req.body || {};

  if (cardNumber !== undefined && cardNumber !== null && String(cardNumber).trim()) {
    return `card:${normalizeKeyPart(cardNumber)}`;
  }

  if (doc !== undefined && doc !== null && String(doc).trim()) {
    return `doc:${normalizeKeyPart(doc)}`;
  }

  return null;
}

async function acquireRegistrationLock(key) {
  if (!key) {
    return () => {};
  }

  let releaseCurrent;
  const current = new Promise((resolve) => {
    releaseCurrent = resolve;
  });
  const previous = registrationLocks.get(key);

  registrationLocks.set(key, current);

  if (previous) {
    await previous;
  }

  return () => {
    if (registrationLocks.get(key) === current) {
      registrationLocks.delete(key);
    }

    releaseCurrent();
  };
}

module.exports = {
  acquireRegistrationLock,
  buildRegistrationKey,
};
