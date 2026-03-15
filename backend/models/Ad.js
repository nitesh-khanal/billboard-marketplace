const mongoose = require('mongoose');
const adSchema = new mongoose.Schema({
  adName: { type: String, required: true, trim: true },
  fileUrl: { type: String, required: true },
  fileType: { type: String, enum: ['image', 'video'], required: true },
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
  rental: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
}, { timestamps: true });
module.exports = mongoose.model('Ad', adSchema);
