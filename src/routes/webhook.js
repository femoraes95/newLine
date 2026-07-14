const express = require('express');
const { createPerson, createVisitor, generateCardNumber } = require('../services/idsecure');
const { findSuccessfulRegistration, recordSuccess } = require('../services/localControl');
const { reportOperationalError } = require('../services/errorReporter');
const { addHours, formatSaoPauloDateTime } = require('../services/saoPauloTime');
const {
  acquireRegistrationLock,
  buildRegistrationKey,
  getIdempotencyTtlMs,
} = require('../services/idempotency');

const router = express.Router();

router.post('/patient', async (req, res, next) => {
  let releaseRegistrationLock;

  try {
    console.log('[Webhook] Payload recebido:', req.body);

    const idempotencyKey = buildRegistrationKey(req);
    req.idsecureControl = { operation: 'webhookCreatePatient', idempotencyKey };

    // eslint-disable-next-line no-unused-vars
    const {
      name,
      cardNumber,
      type = 'person',
      personCard: _,
      ...rest
    } = req.body;

    if (!name) {
      const message = 'Campo obrigatório: name';

      reportOperationalError(req, {
        operation: 'webhookCreatePatient',
        httpStatus: 400,
        message,
      }).catch((err) => {
        console.error(`[ErrorReporter] Falha ao registrar erro operacional: ${err.message}`);
      });

      return res.status(400).json({ success: false, message });
    }

    releaseRegistrationLock = await acquireRegistrationLock(idempotencyKey);

    const previousRegistration = await findSuccessfulRegistration(
      idempotencyKey,
      cardNumber,
      getIdempotencyTtlMs(),
    );

    if (previousRegistration) {
      console.log(`[Webhook] Cadastro duplicado ignorado: ${idempotencyKey}`);

      return res.status(200).json({
        success: true,
        duplicate: true,
        message: 'Cadastro já processado anteriormente',
        cardNumber: previousRegistration.cardNumber || cardNumber || null,
        originalRequestId: previousRegistration.requestId || null,
      });
    }

    const accessHours = parseInt(process.env.VISITOR_ACCESS_HOURS || '24', 10);
    const now = new Date();
    const end = addHours(now, accessHours);

    const visitorStartDate = formatSaoPauloDateTime(now);
    const visitorEndDate = formatSaoPauloDateTime(end);

    const card = cardNumber || generateCardNumber();
    const operation = type === 'visitor' ? 'webhookCreateVisitor' : 'webhookCreatePerson';
    req.idsecureControl = {
      operation,
      name,
      cardNumber: card,
      idempotencyKey,
    };

    const payload = {
      name,
      visitorStartDate,
      visitorEndDate,
      password: '00000',
      password2: '00000',
      personType: 1,
      ...rest,
      personCard: [{
        personId: 0,
        type: 3,
        cardNumber: card,
        readableCode: card,
      }],
    };

    const register = type === 'visitor' ? createVisitor : createPerson;
    const result = await register(payload);
    await recordSuccess(req, {
      operation,
      name,
      cardNumber: card,
      idempotencyKey,
      httpStatus: 201,
      message: 'Paciente cadastrado via webhook com sucesso',
      idsecureResponse: result,
    });

    console.log(`[Webhook] Paciente cadastrado: ${name} | card: ${card} | acesso: ${accessHours}h`);

    return res.status(201).json({
      success: true,
      cardNumber: card,
      visitorStartDate,
      visitorEndDate,
      data: result,
    });
  } catch (err) {
    next(err);
  } finally {
    if (releaseRegistrationLock) {
      releaseRegistrationLock();
    }
  }
});

module.exports = router;
