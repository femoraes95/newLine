const express = require('express');
const {
  createPerson,
  updatePerson,
  searchPersons,
  generateCardNumber,
} = require('../services/idsecure');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    // eslint-disable-next-line no-unused-vars
    const { name, visitorStartDate, visitorEndDate, cardNumber, personCard: _, ...rest } = req.body;

    if (!name || !visitorStartDate || !visitorEndDate) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: name, visitorStartDate, visitorEndDate',
      });
    }

    const card = cardNumber || generateCardNumber();

    const payload = {
      name,
      visitorStartDate,
      visitorEndDate,
      password: '00000',
      password2: '00000',
      personType: 1,
      ...rest,
      personCard: [{ personId: 0, type: 3, cardNumber: card, readableCode: card }],
    };

    const result = await createPerson(payload);
    return res.status(201).json({ success: true, cardNumber: card, data: result });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const result = await updatePerson(req.params.id, req.body);
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
