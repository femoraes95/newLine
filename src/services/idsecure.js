const axios = require('axios');
const { getToken, clearToken } = require('./auth');

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
    // Token expirou — limpa cache e tenta uma vez mais
    if (err.response?.status === 401) {
      clearToken();
      const freshToken = await getToken();
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
    }
    throw err;
  }
}

function generateCardNumber() {
  // Garante unicidade usando timestamp em ms (13 dígitos)
  return Date.now();
}

async function createPerson(payload) {
  return request('POST', '/api/v1/persons', payload);
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

module.exports = { createPerson, updatePerson, createVisitor, searchPersons, generateCardNumber };
