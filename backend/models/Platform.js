const mongoose = require('mongoose');
const platformSchema = new mongoose.Schema({
  singletonKey: { type: String, default: 'main' },
  commissionRate: { type: Number, default: 0.05 },
  totalCommission: { type: Number, default: 0 },
  totalPenalties: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
}, { timestamps: true });
platformSchema.index({ singletonKey: 1 }, { unique: true, partialFilterExpression: { singletonKey: { $type: 'string' } } });
module.exports = mongoose.model('Platform', platformSchema);
