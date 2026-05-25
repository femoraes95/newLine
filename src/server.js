require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const authRoutes = require('./routes/auth');
const personsRoutes = require('./routes/persons');
const visitorsRoutes = require('./routes/visitors');
const webhookRoutes = require('./routes/webhook');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  req.requestId = req.get('x-request-id') || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'newline-idsecure' }));

app.use('/auth', authRoutes);
app.use('/persons', personsRoutes);
app.use('/visitors', visitorsRoutes);
app.use('/webhook', webhookRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[Server] Rodando na porta ${PORT}`);
  console.log(`[Server] iDSecure: ${process.env.IDSECURE_BASE_URL}`);
});
