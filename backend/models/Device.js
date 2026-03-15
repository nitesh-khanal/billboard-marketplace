const mongoose = require('mongoose');
const deviceSchema = new mongoose.Schema({
  deviceName: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  screenSize: { type: String, required: true },
  resolution: { type: String, required: true },
  pricePerHour: { type: Number, required: true, min: 0 },
  deviceId: { type: String, required: true, unique: true, trim: true },
  availabilitySchedule: { type: String, default: '24/7' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['available', 'rented', 'offline'], default: 'available' },
}, { timestamps: true });
module.exports = mongoose.model('Device', deviceSchema);
