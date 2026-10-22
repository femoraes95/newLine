const test = require('node:test');
const assert = require('node:assert/strict');

const routePath = require.resolve('../src/routes/webhook');
const idsecurePath = require.resolve('../src/services/idsecure');
const localControlPath = require.resolve('../src/services/localControl');
const errorReporterPath = require.resolve('../src/services/errorReporter');
const idempotencyPath = require.resolve('../src/services/idempotency');

function loadWebhook({ createVisitor, createPerson }) {
  require.cache[idsecurePath] = {
    id: idsecurePath,
    filename: idsecurePath,
    loaded: true,
    exports: { createVisitor, createPerson, generateCardNumber: () => 999 },
  };
  require.cache[localControlPath] = {
    id: localControlPath,
    filename: localControlPath,
    loaded: true,
    exports: { findSuccessfulRegistration: async () => null, recordSuccess: async () => {} },
  };
  require.cache[errorReporterPath] = {
    id: errorReporterPath,
    filename: errorReporterPath,
    loaded: true,
    exports: { reportOperationalError: async () => {} },
  };
  require.cache[idempotencyPath] = {
    id: idempotencyPath,
    filename: idempotencyPath,
    loaded: true,
    exports: {
      acquireRegistrationLock: async () => () => {},
      buildRegistrationKey: () => 'test-key',
      getIdempotencyTtlMs: () => 1000,
    },
  };
  delete require.cache[routePath];
  return require('../src/routes/webhook');
}

test('webhook always registers a visitor even when type is person', async () => {
  let visitorPayload;
  let personCalls = 0;
  const router = loadWebhook({
    createVisitor: async (payload) => {
      visitorPayload = payload;
      return { id: 1 };
    },
    createPerson: async () => { personCalls += 1; },
  });
  const handler = router.stack.find((layer) => layer.route?.path === '/patient').route.stack[0].handle;
  const req = {
    body: { name: 'Teste', type: 'person', personType: 'Person' },
    get: () => undefined,
  };
  const response = {};
  const res = {
    status(code) { response.status = code; return this; },
    json(body) { response.body = body; return this; },
  };

  await handler(req, res, (error) => { throw error; });

  assert.equal(personCalls, 0);
  assert.equal(visitorPayload.personType, 'Visitant');
  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
});
