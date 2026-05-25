const express = require('express');
const { createVisitor, generateCardNumber } = require('../services/idsecure');
const { recordSuccess } = require('../services/localControl');
const { reportOperationalError } = require('../services/errorReporter');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    req.idsecureControl = { operation: 'createVisitor' };

    // eslint-disable-next-line no-unused-vars
    const {
      name,
      visitorStartDate,
      visitorEndDate,
      cardNumber,
      personCard: _,
      ...rest
    } = req.body;

    if (!name || !visitorStartDate || !visitorEndDate) {
      const message = 'Campos obrigatórios: name, visitorStartDate, visitorEndDate';

      reportOperationalError(req, {
        operation: 'createVisitor',
        httpStatus: 400,
        message,
      }).catch((err) => {
        console.error(`[ErrorReporter] Falha ao registrar erro operacional: ${err.message}`);
      });

      return res.status(400).json({
        success: false,
        message,
      });
    }

    const card = cardNumber || generateCardNumber();
    req.idsecureControl = { operation: 'createVisitor', name, cardNumber: card };

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

    const result = await createVisitor(payload);
    await recordSuccess(req, {
      operation: 'createVisitor',
      name,
      cardNumber: card,
      httpStatus: 201,
      message: 'Visitante cadastrado com sucesso',
      idsecureResponse: result,
    });

    return res.status(201).json({ success: true, cardNumber: card, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
