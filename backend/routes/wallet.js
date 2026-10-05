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
  try { res.json(await require('../services/payments').addDemoFunds(req.user.id, req.body.amount)); }
  catch (err) { require('../utils/errors').sendError(res, err); }
});
router.get('/config', auth, (req, res) => res.json({
  demoFundsEnabled: process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEMO_WALLET === 'true'
}));

router.get('/transactions', auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id }).sort('-createdAt').limit(50);
    res.json(transactions);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

module.exports = router;
