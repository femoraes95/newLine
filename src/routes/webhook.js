const express = require('express');
const { createPerson, createVisitor, generateCardNumber } = require('../services/idsecure');

const router = express.Router();

router.post('/patient', async (req, res, next) => {
  try {
    // eslint-disable-next-line no-unused-vars
    const { name, cardNumber, type = 'person', personCard: _, ...rest } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Campo obrigatório: name' });
    }

    const accessHours = parseInt(process.env.VISITOR_ACCESS_HOURS || '24', 10);
    const now = new Date();
    const end = new Date(now.getTime() + accessHours * 60 * 60 * 1000);

    const visitorStartDate = now.toISOString();
    const visitorEndDate = end.toISOString();

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

    const register = type === 'visitor' ? createVisitor : createPerson;
    const result = await register(payload);

    console.log(`[Webhook] Paciente cadastrado: ${name} | card: ${card} | acesso: ${accessHours}h`);

    return res.status(201).json({ success: true, cardNumber: card, visitorStartDate, visitorEndDate, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
