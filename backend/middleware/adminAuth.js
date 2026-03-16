const jwt = require('jsonwebtoken');
const User = require('../models/User');
module.exports = async (req, res, next) => {
  const header = req.header('Authorization');
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ msg: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    const user = await User.findById(decoded.id);
    if (!user || !user.isAdmin) return res.status(403).json({ msg: 'Admin access required' });
    req.user = decoded;
    next();
  } catch (err) { res.status(401).json({ msg: 'Token invalid' }); }
};
