const axios = require('axios');

async function authenticate() {
  const response = await axios.post(
    `${process.env.IDSECURE_BASE_URL}/api/v1/operators/login`,
    {
      email: process.env.IDSECURE_EMAIL,
      password: process.env.IDSECURE_PASSWORD,
    },
    {
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        accept: 'application/json, text/plain, */*',
      },
    },
  );

  const {
    data: { token },
  } = response.data;

  console.log('[Auth] Token renovado com sucesso');
  return token;
}

async function getToken() {
  return authenticate();
}

function clearToken() {
  return null;
}

module.exports = { getToken, clearToken };
