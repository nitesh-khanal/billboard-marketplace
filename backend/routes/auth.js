const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '7d' });
const userPayload = (u) => ({ id: u._id, name: u.name, email: u.email, currentRole: u.currentRole, walletBalance: u.walletBalance, isAdmin: u.isAdmin });

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ msg: 'All fields required' });
    if (await User.findOne({ email })) return res.status(400).json({ msg: 'Email already registered' });
    const user = new User({ name, email, password });
    await user.save();
    res.status(201).json({ token: signToken(user._id), user: userPayload(user) });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ msg: 'All fields required' });
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) return res.status(400).json({ msg: 'Invalid credentials' });
    if (user.isBanned) return res.status(403).json({ msg: 'Your account has been banned' });
    res.json({ token: signToken(user._id), user: userPayload(user) });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.put('/switch-role', auth, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['seller', 'buyer'].includes(role)) return res.status(400).json({ msg: 'Invalid role' });
    const user = await User.findByIdAndUpdate(req.user.id, { currentRole: role }, { new: true }).select('-password');
    res.json({ user: userPayload(user) });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(userPayload(user));
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

module.exports = router;
