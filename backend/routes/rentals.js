const router = require('express').Router();
const auth = require('../middleware/auth');
const Rental = require('../models/Rental');
const Device = require('../models/Device');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Platform = require('../models/Platform');

const getPlatform = async () => {
  let p = await Platform.findOne();
  if (!p) p = await Platform.create({});
  return p;
};

router.post('/', auth, async (req, res) => {
  try {
    const { deviceId, startDate, endDate } = req.body;
    if (!deviceId || !startDate || !endDate) return res.status(400).json({ msg: 'All fields required' });
    const device = await Device.findById(deviceId);
    if (!device) return res.status(404).json({ msg: 'Device not found' });
    if (device.status !== 'available') return res.status(400).json({ msg: 'Device is not available' });
    const start = new Date(startDate); const end = new Date(endDate);
    if (end <= start) return res.status(400).json({ msg: 'End must be after start' });

    const platform = await getPlatform();
    const hours = (end - start) / 3600000;
    const totalCost = parseFloat((hours * device.pricePerHour).toFixed(2));
    const commission = parseFloat((totalCost * platform.commissionRate).toFixed(2));
    const sellerEarns = parseFloat((totalCost - commission).toFixed(2));

    const buyer = await User.findById(req.user.id);
    if (buyer.walletBalance < totalCost) return res.status(400).json({ msg: 'Insufficient balance. Need $' + totalCost });

    buyer.walletBalance = parseFloat((buyer.walletBalance - totalCost).toFixed(2));
    await buyer.save();

    const seller = await User.findById(device.owner);
    seller.walletBalance = parseFloat((seller.walletBalance + sellerEarns).toFixed(2));
    await seller.save();

    platform.totalCommission = parseFloat((platform.totalCommission + commission).toFixed(2));
    platform.totalRevenue = parseFloat((platform.totalRevenue + totalCost).toFixed(2));
    await platform.save();

    await Transaction.create({ user: buyer._id, amount: totalCost, type: 'debit', description: 'Rented ' + device.deviceName, balanceAfter: buyer.walletBalance });
    await Transaction.create({ user: seller._id, amount: sellerEarns, type: 'credit', description: device.deviceName + ' rented by ' + buyer.name + ' (after 5% commission)', balanceAfter: seller.walletBalance });

    const rental = await Rental.create({ device: deviceId, buyer: buyer._id, seller: seller._id, startDate: start, endDate: end, totalCost, commission });
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

router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const rental = await Rental.findOne({ _id: req.params.id, buyer: req.user.id });
    if (!rental) return res.status(404).json({ msg: 'Rental not found' });
    if (rental.status === 'cancelled') return res.status(400).json({ msg: 'Already cancelled' });
    if (rental.status === 'completed') return res.status(400).json({ msg: 'Already completed' });

    const now = new Date();
    const start = new Date(rental.startDate);
    const end = new Date(rental.endDate);
    const totalHours = (end - start) / 3600000;
    const usedHours = Math.max(0, Math.min((now - start) / 3600000, totalHours));
    const remainingHours = Math.max(0, totalHours - usedHours);
    const pricePerHour = rental.totalCost / totalHours;
    const remainingCost = parseFloat((remainingHours * pricePerHour).toFixed(2));
    const refundAmount  = parseFloat((remainingCost * 0.90).toFixed(2));
    const cancellationFee = parseFloat((remainingCost * 0.10).toFixed(2));

    // Refund 90% of remaining to buyer
    const buyer = await User.findById(req.user.id);
    buyer.walletBalance = parseFloat((buyer.walletBalance + refundAmount).toFixed(2));
    await buyer.save();

    // Deduct refund from seller
    const seller = await User.findById(rental.seller);
    seller.walletBalance = parseFloat((seller.walletBalance - refundAmount).toFixed(2));
    await seller.save();

    // 10% cancellation fee goes to platform
    const platform = await getPlatform();
    platform.totalPenalties = parseFloat((platform.totalPenalties + cancellationFee).toFixed(2));
    await platform.save();

    await Transaction.create({ user: buyer._id, amount: refundAmount, type: 'credit', description: 'Cancellation refund (90% of unused time)', balanceAfter: buyer.walletBalance });
    await Transaction.create({ user: seller._id, amount: refundAmount, type: 'debit', description: 'Refund issued for cancellation (10% kept as fee)', balanceAfter: seller.walletBalance });

    rental.status = 'cancelled';
    await rental.save();
    await Device.findByIdAndUpdate(rental.device, { status: 'available' });

    res.json({ msg: 'Rental cancelled', refundAmount, cancellationFee, newBalance: buyer.walletBalance });
  } catch (err) { console.error(err); res.status(500).json({ msg: 'Server error' }); }
});

module.exports = router;