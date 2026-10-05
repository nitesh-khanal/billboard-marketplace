const mongoose = require('mongoose');
const User = require('../models/User');
const Device = require('../models/Device');
const Rental = require('../models/Rental');
const Transaction = require('../models/Transaction');
const Platform = require('../models/Platform');
const { AppError } = require('../utils/errors');
const { cents, dollars, settlement } = require('../utils/money');
const { validWindow, positiveAmount } = require('../utils/validation');

async function atomic(work) {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => { result = await work(session); });
    return result;
  } finally { await session.endSession(); }
}
async function platformFor(session) {
  const platform = await Platform.findOne({ singletonKey: 'main' }).session(session);
  if (!platform) throw new AppError(503, 'Platform is not initialized');
  return platform;
}
async function changeBalance(userId, delta, description, session, mustHaveFunds = false) {
  const filter = { _id: userId };
  if (mustHaveFunds) {
    filter.walletBalance = { $gte: dollars(-delta) };
    filter.isBanned = { $ne: true };
  }
  const user = await User.findOneAndUpdate(filter,
    [{ $set: { walletBalance: { $round: [{ $add: ['$walletBalance', dollars(delta)] }, 2] } } }],
    { new: true, session });
  if (!user) throw new AppError(409, mustHaveFunds ? 'Insufficient balance or account unavailable' : 'Account no longer exists');
  if (delta !== 0) await Transaction.create([{
    user: user._id, amount: dollars(Math.abs(delta)), type: delta > 0 ? 'credit' : 'debit',
    description, balanceAfter: user.walletBalance
  }], { session });
  return user;
}
async function book(buyerId, body, bookingKey) {
  const start = new Date(body.startDate), end = new Date(body.endDate);
  if (!body.deviceId || !validWindow(start, end)) throw new AppError(400, 'Choose valid future rental dates');
  if (bookingKey !== undefined && (typeof bookingKey !== 'string' || !/^[a-zA-Z0-9_-]{16,128}$/.test(bookingKey))) throw new AppError(400, 'Invalid booking request key');
  return atomic(async session => {
    if (bookingKey) {
      const existing = await Rental.findOne({ buyer: buyerId, bookingKey }).session(session);
      if (existing) {
        if (String(existing.device) !== String(body.deviceId) || existing.startDate.getTime() !== start.getTime() || existing.endDate.getTime() !== end.getTime()) throw new AppError(409, 'This booking request key was already used for different details');
        const buyer = await User.findById(buyerId).session(session);
        return { rental: existing, newBalance: buyer.walletBalance };
      }
    }
    if (start <= new Date()) throw new AppError(400, 'Rental must start in the future');
    // Reserving this document creates a write conflict for simultaneous bookings/removals.
    const device = await Device.findOneAndUpdate({ _id: body.deviceId, status: 'available' },
      { $set: { status: 'rented' } }, { new: true, session });
    if (!device) throw new AppError(409, 'Device is no longer available');
    if (String(device.owner) === String(buyerId)) throw new AppError(400, 'Cannot rent your own device');
    if (positiveAmount(device.pricePerHour) === null) throw new AppError(409, 'Device price needs repair');
    const platform = await platformFor(session);
    const total = cents(((end - start) / 3600000) * device.pricePerHour);
    if (total <= 0) throw new AppError(400, 'Rental must cost at least one cent');
    if (!Number.isFinite(platform.commissionRate) || platform.commissionRate < 0 || platform.commissionRate > 1) throw new AppError(409, 'Commission rate needs repair');
    const commission = Math.round(total * platform.commissionRate);
    const buyer = await changeBalance(buyerId, -total, 'Rented ' + device.deviceName, session, true);
    await changeBalance(device.owner, total - commission, 'Rental earnings for ' + device.deviceName + ' after commission', session);
    await Platform.updateOne({ _id: platform._id }, { $inc: { totalCommission: dollars(commission), totalRevenue: dollars(total) } }, { session });
    const [rental] = await Rental.create([{
      device: device._id, buyer: buyerId, seller: device.owner, startDate: start, endDate: end,
      totalCost: dollars(total), commission: dollars(commission), bookingKey
    }], { session });
    return { rental, newBalance: buyer.walletBalance };
  });
}
async function settleRental(rental, mode, session, now) {
  const amounts = settlement(rental, mode, now);
  const buyer = await changeBalance(rental.buyer, amounts.refund, 'Unused rental time refunded (' + mode + ' cancellation)', session);
  await changeBalance(rental.seller, -amounts.sellerDebit, 'Unused earnings returned (' + mode + ' cancellation)', session);
  const platform = await platformFor(session);
  await Platform.updateOne({ _id: platform._id }, { $inc: {
    totalCommission: -dollars(amounts.returnedCommission), totalPenalties: dollars(amounts.penalty)
  } }, { session });
  // Save settlement details so repeated cancellation requests do not issue another refund.
  rental.status = 'cancelled';
  rental.refundAmount = dollars(amounts.refund);
  rental.cancellationFee = dollars(amounts.penalty);
  rental.cancelledBy = mode;
  rental.refundedCommission = dollars(amounts.returnedCommission);
  await rental.save({ session });
  return { refundAmount: rental.refundAmount, cancellationFee: rental.cancellationFee, newBalance: buyer.walletBalance };
}
async function cancel(id, actorId, mode = 'buyer') {
  return atomic(async session => {
    const query = { _id: id };
    if (mode === 'buyer') query.buyer = actorId;
    const rental = await Rental.findOne(query).session(session);
    if (!rental) throw new AppError(404, 'Rental not found');
    if (rental.status === 'cancelled') {
      const buyer = await User.findById(rental.buyer).session(session);
      return { refundAmount: rental.refundAmount || 0, cancellationFee: rental.cancellationFee || 0, newBalance: buyer?.walletBalance, alreadyCancelled: true, deviceId: String(rental.device) };
    }
    if (rental.status !== 'active') throw new AppError(409, 'Rental is already completed');
    const result = await settleRental(rental, mode, session, new Date());
    await Device.updateOne({ _id: rental.device, status: 'rented' }, { $set: { status: 'available' } }, { session });
    return { ...result, deviceId: String(rental.device) };
  });
}
async function removeDevice(id, ownerId, mode = 'seller') {
  return atomic(async session => {
    const filter = { _id: id };
    if (mode === 'seller') filter.owner = ownerId;
    const device = await Device.findOneAndUpdate(filter, { $set: { status: 'removed' } }, { new: true, session });
    if (!device) throw new AppError(404, 'Device not found');
    const rentals = await Rental.find({ device: id, status: 'active' }).session(session);
    let penalty = 0;
    for (const rental of rentals) {
      const result = await settleRental(rental, mode, session, new Date());
      penalty += cents(result.cancellationFee);
    }
    return { msg: 'Device removed successfully', activeRentals: rentals.length, totalPenalty: dollars(penalty).toFixed(2), deviceId: String(id) };
  });
}
async function expireRentals() {
  const expired = await Rental.find({ status: 'active', endDate: { $lte: new Date() } }).select('_id');
  for (const item of expired) await atomic(async session => {
    const rental = await Rental.findOneAndUpdate({ _id: item._id, status: 'active', endDate: { $lte: new Date() } },
      { $set: { status: 'completed' } }, { new: true, session });
    if (rental) await Device.updateOne({ _id: rental.device, status: 'rented' }, { $set: { status: 'available' } }, { session });
  });
}
async function addDemoFunds(userId, amount) {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEMO_WALLET !== 'true') throw new AppError(403, 'Demo funds are disabled');
  const valid = positiveAmount(amount);
  if (valid === null) throw new AppError(400, 'Valid amount required');
  return atomic(async session => {
    const user = await changeBalance(userId, cents(valid), 'Demo funds added (no real payment)', session);
    return { balance: user.walletBalance };
  });
}
module.exports = { atomic, book, cancel, removeDevice, expireRentals, addDemoFunds };
