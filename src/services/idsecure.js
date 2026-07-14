const axios = require('axios');
const { getToken, clearToken } = require('./auth');

const DEFAULT_PERSON_GROUP_ID = 1003;

function logRequestError(err, method, path) {
  const responseData = err.response?.data;
  const message = responseData?.message || responseData?.error || err.message;

  console.log('[IDSecure] Erro na requisição', {
    method,
    path,
    status: err.response?.status,
    message,
    response: responseData,
  });
}

async function request(method, path, data, params) {
  const token = await getToken();

  try {
    const response = await axios({
      method,
      url: `${process.env.IDSECURE_BASE_URL}${path}`,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data,
      params,
    });
    return response.data;
  } catch (err) {
    // Gera um novo login e tenta uma vez mais em caso de 401.
    if (err.response?.status === 401) {
      clearToken();
      const freshToken = await getToken();

      try {
        const retry = await axios({
          method,
          url: `${process.env.IDSECURE_BASE_URL}${path}`,
          headers: {
            Authorization: `Bearer ${freshToken}`,
            'Content-Type': 'application/json',
          },
          data,
          params,
        });
        return retry.data;
      } catch (retryErr) {
        logRequestError(retryErr, method, path);
        throw retryErr;
      }
    }

    logRequestError(err, method, path);
    throw err;
  }
}

function generateCardNumber() {
  // Garante unicidade usando timestamp em ms (13 dígitos)
  return Date.now();
}

async function createPerson(payload) {
  return request('POST', '/api/v1/persons', {
    ...payload,
    personGroup: [{ groupId: DEFAULT_PERSON_GROUP_ID }],
  });
}

async function updatePerson(id, payload) {
  return request('PUT', '/api/v1/persons', { id, ...payload });
}

async function createVisitor(payload) {
  return request('POST', '/api/v1/visitors', payload);
}

async function searchPersons(query = {}) {
  return request('GET', '/api/v1/persons/advanced', null, {
    personType: 1,
    status: 1,
    sortOrder: 'asc',
    sortField: 'Name',
    pageNumber: 1,
    pageSize: 100,
    ...query,
  });
}

module.exports = {
  createPerson,
  updatePerson,
  createVisitor,
  searchPersons,
  generateCardNumber,
};
