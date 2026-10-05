const jwt = require('jsonwebtoken');
const User = require('../models/User');
const secret = require('../config/jwt');
module.exports = async (req, res, next) => {
  const header = req.header('Authorization');
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
  let decoded;
  try {
    decoded = jwt.verify(token, secret);
    if (!decoded || typeof decoded.id !== 'string' || !/^[a-f0-9]{24}$/i.test(decoded.id)) throw new Error('Invalid subject');
  } catch (err) { return res.status(401).json({ msg: 'Token is not valid' }); }
  try {
    const user = await User.findById(decoded.id).select('isBanned');
    if (!user) return res.status(401).json({ msg: 'Account no longer exists' });
    if (user.isBanned) return res.status(403).json({ msg: 'Your account has been banned' });
    req.user = decoded;
    return next();
  } catch (err) { return res.status(500).json({ msg: 'Server error' }); }
};
