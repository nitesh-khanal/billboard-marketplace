const mongoose = require('mongoose');
const platformSchema = new mongoose.Schema({
  commissionRate: { type: Number, default: 0.05 },
  totalCommission: { type: Number, default: 0 },
  totalPenalties: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
}, { timestamps: true });
module.exports = mongoose.model('Platform', platformSchema);
