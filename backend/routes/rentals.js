const router = require('express').Router();
const auth = require('../middleware/auth');
const Rental = require('../models/Rental');
const payments = require('../services/payments');
const { sendError } = require('../utils/errors');

router.post('/', auth, async (req, res) => {
  try { res.status(201).json(await payments.book(req.user.id, req.body, req.get('Idempotency-Key'))); }
  catch (err) { sendError(res, err); }
});

router.get('/buyer', auth, async (req, res) => {
  try {
    const rentals = await Rental.find({ buyer: req.user.id })
      .populate('device', 'deviceName location screenSize pricePerHour deviceId')
      .populate('seller', 'name email').sort('-createdAt');
    res.json(rentals);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.get('/seller', auth, async (req, res) => {
  try {
    const rentals = await Rental.find({ seller: req.user.id })
      .populate('device', 'deviceName location screenSize')
      .populate('buyer', 'name email').sort('-createdAt');
    res.json(rentals);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const result = await payments.cancel(req.params.id, req.user.id);
    req.app.get('io')?.to(result.deviceId).emit('schedule-changed');
    res.json({ msg: 'Rental cancelled', ...result });
  } catch (err) { sendError(res, err); }
});
module.exports = router;
