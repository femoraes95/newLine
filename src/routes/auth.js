const express = require('express');
const { getToken, clearToken } = require('../services/auth');

const router = express.Router();

router.post('/token', async (req, res, next) => {
  try {
    clearToken();
    const token = await getToken();
    return res.json({ success: true, token });
  } catch (err) {
    next(err);
  }
});

router.get('/token', async (req, res, next) => {
  try {
    const token = await getToken();
    return res.json({ success: true, token });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
