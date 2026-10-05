const router = require('express').Router();
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');
const Device = require('../models/Device');
const Rental = require('../models/Rental');
const Transaction = require('../models/Transaction');
const Platform = require('../models/Platform');
const jwt = require('jsonwebtoken');
const payments = require('../services/payments');
const { sendError } = require('../utils/errors');

const getPlatform = async () => {
  let p = await Platform.findOne();
  if (!p) p = await Platform.create({});
  return p;
};

// Admin login (separate from user login)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || !password) return res.status(400).json({ msg: 'Email and password required' });
    const user = await User.findOne({ email, isAdmin: true });
    if (!user || !(await user.comparePassword(password))) return res.status(400).json({ msg: 'Invalid admin credentials' });
    if (user.isBanned) return res.status(403).json({ msg: 'Your account has been banned' });
    const token = jwt.sign({ id: user._id }, require('../config/jwt'), { expiresIn: '7d' });
    res.json({ token, admin: { id: user._id, name: user.name, email: user.email } });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// Stats overview
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const platform = await getPlatform();
    const [totalUsers, totalDevices, totalRentals, activeRentals, totalAds] = await Promise.all([
        User.countDocuments({ isAdmin: { $ne: true } }),
      Device.countDocuments({ status: { $ne: 'removed' } }),
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
  // Keep account references and financial history intact. Ban revokes access.
  res.status(409).json({ msg: 'Accounts with marketplace history are retained. Ban the user to revoke access.' });
});

// Get all devices
router.get('/devices', adminAuth, async (req, res) => {
  try {
    const devices = await Device.find({ status: { $ne: 'removed' } }).populate('owner', 'name email').sort('-createdAt');
    res.json(devices);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// Delete device (admin)
router.delete('/devices/:id', adminAuth, async (req, res) => {
  try {
    const result = await payments.removeDevice(req.params.id, req.user.id, 'admin');
    req.app.get('io')?.to(result.deviceId).emit('schedule-changed');
    res.json(result);
  } catch (err) { sendError(res, err); }
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
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0 || rate > 1) return res.status(400).json({ msg: 'Rate must be between 0 and 1' });
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
    const result = await payments.cancel(req.params.id, req.user.id, 'admin');
    req.app.get('io')?.to(result.deviceId).emit('schedule-changed');
    res.json({ msg: 'Rental cancelled by admin', ...result });
  } catch (err) { sendError(res, err); }
});

router.delete('/rentals/:id', adminAuth, (req, res) => {
  res.status(409).json({ msg: 'Rental history is retained for accounting. Cancel an active rental instead.' });
});
module.exports = router;
