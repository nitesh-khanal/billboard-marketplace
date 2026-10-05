const auth = require('./auth');
const User = require('../models/User');
module.exports = (req, res, next) => auth(req, res, async () => {
  try {
    const user = await User.findById(req.user.id).select('isAdmin');
    if (!user || !user.isAdmin) return res.status(403).json({ msg: 'Admin access required' });
    return next();
  } catch (err) { return res.status(500).json({ msg: 'Server error' }); }
});
