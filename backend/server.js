const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(s => s.trim())
  .concat(['http://localhost:3000']);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
  },
});

require('./config/jwt');


app.use(cors(corsOptions));
app.use(express.json());
app.disable('x-powered-by');
app.use('/uploads', (req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); next(); }, express.static(path.join(__dirname, 'uploads')));

app.set('io', io);

app.use('/api/auth',    require('./routes/auth'));
app.use('/api/devices', require('./routes/devices'));
app.use('/api/rentals', require('./routes/rentals'));
app.use('/api/ads',     require('./routes/ads'));
app.use('/api/wallet',  require('./routes/wallet'));
app.use('/api/admin',   require('./routes/admin'));

app.get('/health', (req, res) => {
  const healthy = require('mongoose').connection.readyState === 1;
  res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'unavailable' });
});

io.on('connection', (socket) => {
  socket.on('join-device', (id) => { if (typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id)) socket.join(id); });
  socket.on('leave-device', (id) => { if (typeof id === 'string') socket.leave(id); });
});

const PORT = process.env.PORT || 5000;
async function start() {
  await connectDB();
  const mongoose = require('mongoose');
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('MongoDB must use a replica set or Atlas for atomic payments');
  const Platform = require('./models/Platform');
  if (await Platform.countDocuments() > 1) throw new Error('Multiple platform records found; reconcile these before starting');
  await Platform.init();
  const existingPlatform = await Platform.findOne();
  if (existingPlatform) await Platform.updateOne({ _id: existingPlatform._id }, { $set: { singletonKey: 'main' } });
  else {
    try { await Platform.findOneAndUpdate({ singletonKey: 'main' }, { $setOnInsert: { singletonKey: 'main' } }, { upsert: true, new: true }); }
    catch (err) { if (err.code !== 11000) throw err; }
  }
  await Promise.all(['User', 'Device', 'Rental', 'Transaction', 'Platform', 'Ad'].map(name => require('./models/' + name).init()));
  const { expireRentals } = require('./services/payments');
  await expireRentals();
  let running = false;
  const expiryTimer = setInterval(async () => {
    if (running) return;
    running = true;
    try { await expireRentals(); } catch (err) { console.error('Rental expiry failed:', err.message); }
    finally { running = false; }
  }, 30000);
  expiryTimer.unref();
  server.listen(PORT, '0.0.0.0', () => console.log('Server running on port ' + PORT));
}
start().catch(err => { console.error('Startup failed:', err.message); process.exit(1); });
