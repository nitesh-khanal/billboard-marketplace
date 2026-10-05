const test = require('node:test');
const assert = require('node:assert/strict');
const { positiveAmount, validWindow } = require('../utils/validation');

test('money validation rejects coercion, invalid numbers and zero-cent payments', () => {
  for (const value of [null, true, [], {}, '', ' ', '12oops', 'Infinity', Infinity, NaN, -1, 0, 0.001]) {
    assert.equal(positiveAmount(value), null, String(value));
  }
  assert.equal(positiveAmount('12.34'), 12.34);
  assert.equal(positiveAmount(5), 5);
});
test('rental and advertising dates reject invalid or reversed windows', () => {
  assert.equal(validWindow(new Date('invalid'), new Date()), false);
  assert.equal(validWindow(new Date(), new Date('invalid')), false);
  assert.equal(validWindow(new Date(2), new Date(1)), false);
  assert.equal(validWindow(new Date(1), new Date(1)), false);
  assert.equal(validWindow(new Date(1), new Date(2)), true);
});

process.env.JWT_SECRET = 'test-only-secret-with-at-least-32-characters';
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const token = jwt.sign({ id: '0123456789abcdef01234567' }, process.env.JWT_SECRET);
const runAuth = async user => {
  const original = User.findById;
  User.findById = () => ({ select: async () => user });
  let status, next = false;
  const res = { status(code) { status = code; return this; }, json() {} };
  try { await auth({ header: () => 'Bearer ' + token }, res, () => { next = true; }); }
  finally { User.findById = original; }
  return { status, next };
};
test('existing tokens lose access when their account is banned or deleted', async () => {
  assert.deepEqual(await runAuth({ isBanned: true }), { status: 403, next: false });
  assert.deepEqual(await runAuth(null), { status: 401, next: false });
  assert.deepEqual(await runAuth({ isBanned: false }), { status: undefined, next: true });
});
test('JWT configuration refuses a missing or short signing secret', () => {
  const { spawnSync } = require('node:child_process');
  for (const secret of ['', 'secret123']) {
    const result = spawnSync(process.execPath, ['-e', "require('./config/jwt')"], {
      cwd: require('node:path').join(__dirname, '..'), env: { ...process.env, JWT_SECRET: secret }
    });
    assert.notEqual(result.status, 0);
  }
});

test('ad upload rejects missing, mismatched and cancelled rentals and removes rejected files', async () => {
  const express = require('express');
  const fs = require('node:fs');
  const path = require('node:path');
  const Rental = require('../models/Rental');
  const originalUser = User.findById;
  const originalRental = Rental.findOne;
  const uploadDir = path.join(__dirname, '../uploads');
  fs.mkdirSync(uploadDir, { recursive: true });
  const before = fs.readdirSync(uploadDir).sort();
  User.findById = () => ({ select: async () => ({ isBanned: false }) });
  let filter;
  Rental.findOne = async query => { filter = query; return null; };
  const app = express();
  app.use('/api/ads', require('../routes/ads'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    for (const rentalId of ['', '111111111111111111111111']) {
      const form = new FormData();
      form.append('file', new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: 'image/png' }), 'ad.html');
      form.append('adName', 'Test');
      form.append('deviceId', '222222222222222222222222');
      form.append('rentalId', rentalId);
      form.append('startTime', '2027-01-01T00:00:00Z');
      form.append('endTime', '2027-01-01T01:00:00Z');
      const result = await fetch(`http://127.0.0.1:${server.address().port}/api/ads/upload`, {
        method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form
      });
      assert.equal(result.status, rentalId ? 404 : 400);
      await result.json();
    }
    assert.deepEqual(filter, {
      _id: '111111111111111111111111', buyer: '0123456789abcdef01234567',
      device: '222222222222222222222222', status: 'active'
    });
    // Cleanup runs in the handler's finally block after sending the response.
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(fs.readdirSync(uploadDir).sort(), before);
  } finally {
    User.findById = originalUser;
    Rental.findOne = originalRental;
    await new Promise(resolve => server.close(resolve));
  }
});

test('refunds conserve funds before, during and after the rental window', () => {
  const { settlement } = require('../utils/money');
  const rental = { startDate: new Date(1000), endDate: new Date(2000), totalCost: 100, commission: 5 };
  for (const mode of ['buyer', 'seller', 'admin']) {
    for (const now of [0, 1000, 1500, 2000, 3000]) {
      const result = settlement(rental, mode, new Date(now));
      assert.equal(result.refund - result.sellerDebit - result.returnedCommission + result.penalty, 0);
    }
  }
  assert.deepEqual(settlement(rental, 'admin', new Date(1500)), { refund: 5000, sellerDebit: 4750, returnedCommission: 250, penalty: 0 });
  assert.deepEqual(settlement(rental, 'buyer', new Date(1500)), { refund: 4500, sellerDebit: 4750, returnedCommission: 250, penalty: 500 });
});
test('media header validation rejects HTML disguised as an image', async () => {
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const path = require('node:path');
  const { matchesMediaHeader } = require('../utils/media');
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'billboard-media-'));
  const file = path.join(folder, 'test.png');
  try {
    await fs.writeFile(file, '<html><script>alert(1)</script></html>');
    assert.equal(await matchesMediaHeader({ path: file, mimetype: 'image/png' }), false);
    await fs.writeFile(file, Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
    assert.equal(await matchesMediaHeader({ path: file, mimetype: 'image/png' }), true);
  } finally { await fs.rm(folder, { recursive: true, force: true }); }
});
