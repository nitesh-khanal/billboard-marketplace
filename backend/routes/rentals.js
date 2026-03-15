const router = require('express').Router();
const auth = require('../middleware/auth');
const Rental = require('../models/Rental');
const Device = require('../models/Device');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

router.post('/', auth, async (req, res) => {
  try {
    const { deviceId, startDate, endDate } = req.body;
    if (!deviceId || !startDate || !endDate) return res.status(400).json({ msg: 'All fields required' });
    const device = await Device.findById(deviceId);
    if (!device) return res.status(404).json({ msg: 'Device not found' });
    if (device.status !== 'available') return res.status(400).json({ msg: 'Device is not available' });
    const start = new Date(startDate); const end = new Date(endDate);
    if (end <= start) return res.status(400).json({ msg: 'End must be after start' });
    const hours = (end - start) / 3600000;
    const totalCost = parseFloat((hours * device.pricePerHour).toFixed(2));
    const buyer = await User.findById(req.user.id);
    if (buyer.walletBalance < totalCost) return res.status(400).json({ msg: 'Insufficient balance. Need $' + totalCost });
    buyer.walletBalance = parseFloat((buyer.walletBalance - totalCost).toFixed(2));
    await buyer.save();
    const seller = await User.findById(device.owner);
    seller.walletBalance = parseFloat((seller.walletBalance + totalCost).toFixed(2));
    await seller.save();
    await Transaction.create({ user: buyer._id, amount: totalCost, type: 'debit', description: 'Rented ' + device.deviceName, balanceAfter: buyer.walletBalance });
    await Transaction.create({ user: seller._id, amount: totalCost, type: 'credit', description: device.deviceName + ' rented by ' + buyer.name, balanceAfter: seller.walletBalance });
    const rental = await Rental.create({ device: deviceId, buyer: buyer._id, seller: seller._id, startDate: start, endDate: end, totalCost });
    device.status = 'rented'; await device.save();
    res.status(201).json({ rental, newBalance: buyer.walletBalance });
  } catch (err) { console.error(err); res.status(500).json({ msg: 'Server error' }); }
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

module.exports = router;
