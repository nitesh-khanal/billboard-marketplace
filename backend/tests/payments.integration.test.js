const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Device = require('../models/Device');
const Rental = require('../models/Rental');
const Transaction = require('../models/Transaction');
const Platform = require('../models/Platform');
const payments = require('../services/payments');

// Every run uses a new database. Never clear the caller's existing database.
test('atomic marketplace payments against a MongoDB replica set', { skip: !process.env.TEST_MONGO_URI }, async t => {
  const database = 'billboard_regression_' + randomUUID().replace(/-/g, '');
  await mongoose.connect(process.env.TEST_MONGO_URI, { dbName: database });
  try {
    await Promise.all([User, Device, Rental, Transaction, Platform].map(model => model.init()));
    async function fixture(balance = 100) {
      await Promise.all([User, Device, Rental, Transaction, Platform].map(model => model.deleteMany({})));
      const seller = await User.create({ name: 'Seller', email: 'seller@test.invalid', password: 'test-password' });
      const buyer = await User.create({ name: 'Buyer', email: 'buyer@test.invalid', password: 'test-password', walletBalance: balance });
      const device = await Device.create({ deviceName: 'Test screen', location: 'Test', screenSize: '10', resolution: '100x100', pricePerHour: 100, deviceId: 'test-screen', owner: seller._id });
      await Platform.create({});
      const start = new Date(Date.now() + 3600000), end = new Date(start.getTime() + 3600000);
      return { buyer, seller, device, body: { deviceId: String(device._id), startDate: start.toISOString(), endDate: end.toISOString() } };
    }
    async function balances(f) {
      return {
        buyer: (await User.findById(f.buyer._id)).walletBalance,
        seller: (await User.findById(f.seller._id)).walletBalance,
        platform: await Platform.findOne()
      };
    }
    await t.test('simultaneous bookings reserve a screen only once', async () => {
      const f = await fixture(200);
      const results = await Promise.allSettled([payments.book(f.buyer._id, f.body), payments.book(f.buyer._id, f.body)]);
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal(await Rental.countDocuments(), 1);
      assert.equal(await Transaction.countDocuments(), 2);
      const b = await balances(f);
      assert.equal(b.buyer, 100); assert.equal(b.seller, 95); assert.equal(b.platform.totalCommission, 5);
    });
    await t.test('booking retries return the same rental without charging again', async () => {
      const f = await fixture(200), key = randomUUID();
      const results = await Promise.all([payments.book(f.buyer._id, f.body, key), payments.book(f.buyer._id, f.body, key)]);
      assert.equal(String(results[0].rental._id), String(results[1].rental._id));
      assert.equal(await Rental.countDocuments(), 1);
      assert.equal(await Transaction.countDocuments(), 2);
      assert.equal((await User.findById(f.buyer._id)).walletBalance, 100);
      await assert.rejects(payments.book(f.buyer._id, { ...f.body, endDate: new Date(new Date(f.body.endDate).getTime() + 60000).toISOString() }, key), /different details/);
    });
    await t.test('a ledger failure rolls back reservation and all balance writes', async () => {
      const f = await fixture();
      const original = Transaction.create;
      let calls = 0;
      Transaction.create = async (...args) => {
        if (++calls === 2) throw new Error('simulated ledger failure');
        return original.apply(Transaction, args);
      };
      try { await assert.rejects(payments.book(f.buyer._id, f.body), /simulated ledger failure/); }
      finally { Transaction.create = original; }
      const b = await balances(f);
      assert.equal(b.buyer, 100); assert.equal(b.seller, 0); assert.equal(b.platform.totalCommission, 0);
      assert.equal((await Device.findById(f.device._id)).status, 'available');
      assert.equal(await Rental.countDocuments(), 0); assert.equal(await Transaction.countDocuments(), 0);
    });
    await t.test('insufficient funds leave the device available', async () => {
      const f = await fixture(20);
      await assert.rejects(payments.book(f.buyer._id, f.body), /Insufficient balance/);
      assert.equal((await Device.findById(f.device._id)).status, 'available');
      assert.equal(await Transaction.countDocuments(), 0);
    });
    await t.test('simultaneous cancellations refund once and reconcile commission and fee', async () => {
      const f = await fixture();
      const { rental } = await payments.book(f.buyer._id, f.body);
      await Promise.all([payments.cancel(rental._id, f.buyer._id), payments.cancel(rental._id, f.buyer._id)]);
      const b = await balances(f);
      assert.equal(b.buyer, 90); assert.equal(b.seller, 0);
      assert.equal(b.platform.totalCommission, 0); assert.equal(b.platform.totalPenalties, 10);
      assert.equal(b.buyer + b.seller + b.platform.totalCommission + b.platform.totalPenalties, 100);
      assert.equal(await Transaction.countDocuments(), 4);
      assert.equal((await Device.findById(f.device._id)).status, 'available');
    });
    await t.test('seller removal refunds the buyer, charges 25%, and preserves references', async () => {
      const f = await fixture(); await payments.book(f.buyer._id, f.body);
      await payments.removeDevice(f.device._id, f.seller._id);
      const b = await balances(f);
      assert.equal(b.buyer, 100); assert.equal(b.seller, -25); assert.equal(b.platform.totalPenalties, 25);
      assert.equal(b.platform.totalCommission, 0);
      assert.equal((await Device.findById(f.device._id)).status, 'removed');
      assert.equal((await Rental.findOne()).status, 'cancelled');
      assert.ok((await Rental.findOne().populate('device')).device);
      await payments.removeDevice(f.device._id, f.seller._id);
      assert.equal(await Transaction.countDocuments(), 4);
    });
    await t.test('admin cancellation returns full unused payment without penalty', async () => {
      const f = await fixture(); const { rental } = await payments.book(f.buyer._id, f.body);
      await payments.cancel(rental._id, f.seller._id, 'admin');
      const b = await balances(f);
      assert.equal(b.buyer, 100); assert.equal(b.seller, 0);
      assert.equal(b.platform.totalCommission, 0); assert.equal(b.platform.totalPenalties, 0);
    });
    await t.test('expired rentals complete and release the screen once', async () => {
      const f = await fixture(); const { rental } = await payments.book(f.buyer._id, f.body);
      await Rental.updateOne({ _id: rental._id }, { $set: { endDate: new Date(Date.now() - 1000) } });
      await payments.expireRentals(); await payments.expireRentals();
      assert.equal((await Rental.findById(rental._id)).status, 'completed');
      assert.equal((await Device.findById(f.device._id)).status, 'available');
      assert.equal(await Transaction.countDocuments(), 2);
    });
    await t.test('demo wallet is disabled by default and always disabled in production', async () => {
      const f = await fixture();
      delete process.env.ENABLE_DEMO_WALLET;
      await assert.rejects(payments.addDemoFunds(f.buyer._id, 10), /disabled/);
      process.env.ENABLE_DEMO_WALLET = 'true'; process.env.NODE_ENV = 'production';
      await assert.rejects(payments.addDemoFunds(f.buyer._id, 10), /disabled/);
      process.env.NODE_ENV = 'test';
      await Promise.all([payments.addDemoFunds(f.buyer._id, 10), payments.addDemoFunds(f.buyer._id, 20)]);
      assert.equal((await User.findById(f.buyer._id)).walletBalance, 130);
      delete process.env.ENABLE_DEMO_WALLET;
    });
  } finally {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
