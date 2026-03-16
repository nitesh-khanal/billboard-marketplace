const router = require('express').Router();
const auth = require('../middleware/auth');
const Device = require('../models/Device');
const Rental = require('../models/Rental');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Platform = require('../models/Platform');

router.post('/', auth, async (req, res) => {
  try {
    const { deviceName, location, screenSize, resolution, pricePerHour, deviceId, availabilitySchedule } = req.body;
    if (!deviceName || !location || !screenSize || !resolution || !pricePerHour || !deviceId)
      return res.status(400).json({ msg: 'All fields required' });
    if (await Device.findOne({ deviceId })) return res.status(400).json({ msg: 'Device ID already used' });
    const device = new Device({ deviceName, location, screenSize, resolution, pricePerHour, deviceId, availabilitySchedule, owner: req.user.id });
    await device.save();
    res.status(201).json(device);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.get('/available', auth, async (req, res) => {
  try {
    const devices = await Device.find({ status: 'available' }).populate('owner', 'name email');
    res.json(devices);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.get('/mine', auth, async (req, res) => {
  try {
    const devices = await Device.find({ owner: req.user.id });
    res.json(devices);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const device = await Device.findById(req.params.id).populate('owner', 'name email');
    if (!device) return res.status(404).json({ msg: 'Device not found' });
    res.json(device);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// DELETE /api/devices/:id
// Seller keeps used time payment
// Buyer gets 100% refund of remaining time
// Seller pays 25% of remaining time as penalty
router.delete('/:id', auth, async (req, res) => {
  try {
    const device = await Device.findOne({ _id: req.params.id, owner: req.user.id });
    if (!device) return res.status(404).json({ msg: 'Device not found or unauthorized' });

    const now = new Date();
    const activeRentals = await Rental.find({ device: device._id, status: 'active' });

    let totalPenalty = 0;

    for (const rental of activeRentals) {
      const start        = new Date(rental.startDate);
      const end          = new Date(rental.endDate);
      const totalHours   = (end - start) / 3600000;
      const usedHours    = Math.max(0, Math.min((now - start) / 3600000, totalHours));
      const remainHours  = Math.max(0, totalHours - usedHours);
      const pricePerHour = rental.totalCost / totalHours;

      // Seller already received full payment — refund comes from their wallet
      const refund  = parseFloat((remainHours * pricePerHour).toFixed(2));
      // 25% penalty on remaining time only
      const penalty = parseFloat((refund * 0.10).toFixed(2));

      // Full refund of remaining time to buyer
      const buyer = await User.findById(rental.buyer);
      buyer.walletBalance = parseFloat((buyer.walletBalance + refund).toFixed(2));
      await buyer.save();
      await Transaction.create({
        user: buyer._id,
        amount: refund,
        type: 'credit',
        description: 'Full refund of remaining time — seller removed device: ' + device.deviceName,
        balanceAfter: buyer.walletBalance,
      });

      // Seller loses: refund amount + 25% penalty
      const seller = await User.findById(req.user.id);
      const sellerDeduct = parseFloat((refund + penalty).toFixed(2));
      seller.walletBalance = parseFloat((seller.walletBalance - sellerDeduct).toFixed(2));
      await seller.save();
      await Transaction.create({
        user: seller._id,
        amount: sellerDeduct,
        type: 'debit',
        description: 'Buyer refund ($' + refund + ') + 25% penalty ($' + penalty + ') for removing device during rental',
        balanceAfter: seller.walletBalance,
      });

     // Add penalty to platform wallet
const platform = await Platform.findOne() || await Platform.create({});
platform.totalPenalties = parseFloat((platform.totalPenalties + penalty).toFixed(2));
await platform.save();

totalPenalty += penalty;
rental.status = 'cancelled';
await rental.save();
    }

    await device.deleteOne();

    res.json({
      msg: 'Device removed successfully',
      activeRentals: activeRentals.length,
      totalPenalty: totalPenalty.toFixed(2),
    });
  } catch (err) { console.error(err); res.status(500).json({ msg: 'Server error' }); }
});

module.exports = router;