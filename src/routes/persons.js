const express = require('express');
const {
  createPerson,
  updatePerson,
  searchPersons,
  generateCardNumber,
} = require('../services/idsecure');
const { recordSuccess } = require('../services/localControl');
const { reportOperationalError } = require('../services/errorReporter');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    req.idsecureControl = { operation: 'createPerson' };

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
        operation: 'createPerson',
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
    req.idsecureControl = { operation: 'createPerson', name, cardNumber: card };

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

    const result = await createPerson(payload);
    await recordSuccess(req, {
      operation: 'createPerson',
      name,
      cardNumber: card,
      httpStatus: 201,
      message: 'Pessoa cadastrada com sucesso',
      idsecureResponse: result,
    });

    return res.status(201).json({ success: true, cardNumber: card, data: result });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    req.idsecureControl = {
      operation: 'updatePerson',
      name: req.body?.name,
      cardNumber: req.body?.cardNumber,
    };

    const result = await updatePerson(req.params.id, req.body);
    await recordSuccess(req, {
      operation: 'updatePerson',
      name: req.body?.name,
      cardNumber: req.body?.cardNumber,
      httpStatus: 200,
      message: 'Pessoa atualizada com sucesso',
      idsecureResponse: result,
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const result = await searchPersons(req.query);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
