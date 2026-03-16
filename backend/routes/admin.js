const router = require('express').Router();
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');
const Device = require('../models/Device');
const Rental = require('../models/Rental');
const Transaction = require('../models/Transaction');
const Platform = require('../models/Platform');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const getPlatform = async () => {
  let p = await Platform.findOne();
  if (!p) p = await Platform.create({});
  return p;
};

// Admin login (separate from user login)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, isAdmin: true });
    if (!user || !(await user.comparePassword(password))) return res.status(400).json({ msg: 'Invalid admin credentials' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '7d' });
    res.json({ token, admin: { id: user._id, name: user.name, email: user.email } });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// Stats overview
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const platform = await getPlatform();
    const [totalUsers, totalDevices, totalRentals, activeRentals, totalAds] = await Promise.all([
        User.countDocuments({ isAdmin: { $ne: true } }),
      Device.countDocuments(),
      Rental.countDocuments(),
      Rental.countDocuments({ status: 'active' }),
      require('../models/Ad').countDocuments(),
    ]);
    const revenueData = await Rental.aggregate([
      { $group: { _id: null, total: { $sum: '$totalCost' }, commission: { $sum: '$commission' } } }
    ]);
    res.json({
      totalUsers, totalDevices, totalRentals, activeRentals, totalAds,
      totalRevenue: revenueData[0]?.total || 0,
      totalCommission: platform.totalCommission,
      totalPenalties: platform.totalPenalties,
      commissionRate: platform.commissionRate,
    });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find({ isAdmin: { $ne: true } }).select('-password').sort('-createdAt');
    res.json(users);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// Ban / unban user
router.put('/users/:id/ban', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    user.isBanned = !user.isBanned;
    await user.save();
    res.json({ msg: user.isBanned ? 'User banned' : 'User unbanned', isBanned: user.isBanned });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// Delete user
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ msg: 'User deleted' });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// Get all devices
router.get('/devices', adminAuth, async (req, res) => {
  try {
    const devices = await Device.find().populate('owner', 'name email').sort('-createdAt');
    res.json(devices);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// Delete device (admin)
router.delete('/devices/:id', adminAuth, async (req, res) => {
  try {
    await Device.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Device deleted' });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// Get all rentals
router.get('/rentals', adminAuth, async (req, res) => {
  try {
    const rentals = await Rental.find()
      .populate('device', 'deviceName location')
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .sort('-createdAt');
    res.json(rentals);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// Get all transactions
router.get('/transactions', adminAuth, async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('user', 'name email')
      .sort('-createdAt')
      .limit(200);
    res.json(transactions);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// Update commission rate
router.put('/commission', adminAuth, async (req, res) => {
  try {
    const { rate } = req.body;
    if (rate < 0 || rate > 1) return res.status(400).json({ msg: 'Rate must be between 0 and 1' });
    const platform = await getPlatform();
    platform.commissionRate = rate;
    await platform.save();
    res.json({ commissionRate: platform.commissionRate });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});
// Get all ads
router.get('/ads', adminAuth, async (req, res) => {
    try {
      const ads = await require('../models/Ad').find()
        .populate('device', 'deviceName location')
        .populate('uploadedBy', 'name email')
        .sort('-createdAt');
      res.json(ads);
    } catch (err) { res.status(500).json({ msg: 'Server error' }); }
  });
  
  // Delete ad (admin)
  router.delete('/ads/:id', adminAuth, async (req, res) => {
    try {
      const Ad = require('../models/Ad');
      const fs = require('fs');
      const path = require('path');
      const ad = await Ad.findById(req.params.id);
      if (!ad) return res.status(404).json({ msg: 'Ad not found' });
      const filePath = path.join(__dirname, '..', ad.fileUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await ad.deleteOne();
      res.json({ msg: 'Ad deleted' });
    } catch (err) { res.status(500).json({ msg: 'Server error' }); }
  });
  // Admin wallet / earnings overview
router.get('/wallet', adminAuth, async (req, res) => {
    try {
      const platform = await getPlatform();
      const recentCommissions = await Rental.find({ commission: { $gt: 0 } })
        .populate('device', 'deviceName')
        .populate('buyer', 'name')
        .sort('-createdAt')
        .limit(50)
        .select('totalCost commission createdAt device buyer');
      res.json({
        totalCommission: platform.totalCommission,
        totalPenalties: platform.totalPenalties,
        totalEarnings: parseFloat((platform.totalCommission + platform.totalPenalties).toFixed(2)),
        commissionRate: platform.commissionRate,
        recentCommissions,
      });
    } catch (err) { res.status(500).json({ msg: 'Server error' }); }
  });
  // Admin cancel rental — full refund to buyer, no fee
router.post('/rentals/:id/cancel', adminAuth, async (req, res) => {
    try {
      const Rental = require('../models/Rental');
      const User = require('../models/User');
      const Device = require('../models/Device');
      const Transaction = require('../models/Transaction');
  
      const rental = await Rental.findById(req.params.id);
      if (!rental) return res.status(404).json({ msg: 'Rental not found' });
      if (rental.status === 'cancelled') return res.status(400).json({ msg: 'Already cancelled' });
      if (rental.status === 'completed') return res.status(400).json({ msg: 'Already completed' });
  
      const now = new Date();
      const start = new Date(rental.startDate);
      const end   = new Date(rental.endDate);
      const totalHours     = (end - start) / 3600000;
      const usedHours      = Math.max(0, Math.min((now - start) / 3600000, totalHours));
      const remainingHours = Math.max(0, totalHours - usedHours);
      const pricePerHour   = rental.totalCost / totalHours;
      const refundAmount   = parseFloat((remainingHours * pricePerHour).toFixed(2));
  
      // Full refund to buyer
      const buyer = await User.findById(rental.buyer);
      buyer.walletBalance = parseFloat((buyer.walletBalance + refundAmount).toFixed(2));
      await buyer.save();
      await Transaction.create({
        user: buyer._id,
        amount: refundAmount,
        type: 'credit',
        description: 'Full refund — rental cancelled by admin',
        balanceAfter: buyer.walletBalance,
      });
  
      // Deduct refund from seller (no penalty, just return buyer's remaining time)
      const seller = await User.findById(rental.seller);
      seller.walletBalance = parseFloat((seller.walletBalance - refundAmount).toFixed(2));
      await seller.save();
      await Transaction.create({
        user: seller._id,
        amount: refundAmount,
        type: 'debit',
        description: 'Refund issued — rental cancelled by admin (no penalty)',
        balanceAfter: seller.walletBalance,
      });
  
      rental.status = 'cancelled';
      await rental.save();
      await Device.findByIdAndUpdate(rental.device, { status: 'available' });
  
      res.json({ msg: 'Rental cancelled by admin', refundAmount, newBalance: buyer.walletBalance });
    } catch (err) { console.error(err); res.status(500).json({ msg: 'Server error' }); }
  });
  
module.exports = router;
