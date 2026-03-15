const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

router.get('/balance', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('walletBalance name email');
    res.json({ balance: user.walletBalance });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.post('/add', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ msg: 'Valid amount required' });
    const user = await User.findById(req.user.id);
    user.walletBalance = parseFloat((user.walletBalance + parseFloat(amount)).toFixed(2));
    await user.save();
    await Transaction.create({ user: user._id, amount: parseFloat(amount), type: 'credit', description: 'Added funds to wallet', balanceAfter: user.walletBalance });
    res.json({ balance: user.walletBalance });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.get('/transactions', auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id }).sort('-createdAt').limit(50);
    res.json(transactions);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

module.exports = router;
