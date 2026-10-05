const mongoose = require('mongoose');
const rentalSchema = new mongoose.Schema({
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalCost: { type: Number, required: true },
  commission: { type: Number, default: 0 },
  bookingKey: { type: String },
  refundedCommission: { type: Number, default: 0 },
  refundAmount: { type: Number, default: 0 },
  cancellationFee: { type: Number, default: 0 },
  cancelledBy: { type: String, enum: ['buyer', 'seller', 'admin'] },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
}, { timestamps: true });
rentalSchema.index({ buyer: 1, bookingKey: 1 }, { unique: true, partialFilterExpression: { bookingKey: { $type: 'string' } } });
module.exports = mongoose.model('Rental', rentalSchema);
