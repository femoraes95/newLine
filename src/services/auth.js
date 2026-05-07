const axios = require('axios');

// Token em memória com controle de expiração
let tokenCache = { token: null, expiresAt: 0 };

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

  const { data } = response.data;
  const token = data.token;
  // Cache baseado na expiração real retornada pela API
  tokenCache = { token, expiresAt: Date.now() + 23 * 60 * 60 * 1000 };

  console.log('[Auth] Token renovado com sucesso');
  return token;
}

async function getToken() {
  if (tokenCache.token && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }
  return authenticate();
}

function clearToken() {
  tokenCache = { token: null, expiresAt: 0 };
}

module.exports = { getToken, clearToken };
