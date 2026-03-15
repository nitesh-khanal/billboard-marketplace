const mongoose = require('mongoose');
const txSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  description: { type: String, default: '' },
  balanceAfter: { type: Number, required: true },
}, { timestamps: true });
module.exports = mongoose.model('Transaction', txSchema);
