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
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
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
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
  },
});

connectDB();

app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.set('io', io);

app.use('/api/auth',    require('./routes/auth'));
app.use('/api/devices', require('./routes/devices'));
app.use('/api/rentals', require('./routes/rentals'));
app.use('/api/ads',     require('./routes/ads'));
app.use('/api/wallet',  require('./routes/wallet'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

io.on('connection', (socket) => {
  socket.on('join-device',  (id) => socket.join(id));
  socket.on('leave-device', (id) => socket.leave(id));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('Server running on port ' + PORT);
});
