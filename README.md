# Billboard Marketplace

A full-stack Digital Billboard Advertising Marketplace where device owners rent out display screens and advertisers rent them to show ads.

## Tech Stack
- **Frontend**: React + TailwindCSS
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Real-time**: Socket.io (WebSockets)
- **Auth**: JWT

## Prerequisites
- Node.js v16+
- MongoDB running locally (default: `mongodb://localhost:27017`)
- npm

## Quick Start

### Step 1 — Install all dependencies
```bash
npm run install-all
```

### Step 2 — Start MongoDB
```bash
# Mac (Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Or with Docker
docker run -d -p 27017:27017 --name mongo mongo:latest
```

### Step 3 — Start the app
```bash
npm start
```

This runs both the backend (port 5000) and frontend (port 3000) concurrently.

Open **http://localhost:3000** in your browser.

---

## Folder Structure

```
billboard-marketplace/
├── package.json              # Root: runs both servers
├── README.md
├── backend/
│   ├── .env                  # MongoDB URI, JWT secret, Port
│   ├── server.js             # Express + Socket.io entry
│   ├── config/
│   │   └── db.js             # MongoDB connection
│   ├── middleware/
│   │   └── auth.js           # JWT middleware
│   ├── models/
│   │   ├── User.js
│   │   ├── Device.js
│   │   ├── Rental.js
│   │   ├── Ad.js
│   │   └── Transaction.js
│   ├── routes/
│   │   ├── auth.js           # /api/auth/*
│   │   ├── devices.js        # /api/devices/*
│   │   ├── rentals.js        # /api/rentals/*
│   │   ├── ads.js            # /api/ads/*
│   │   └── wallet.js         # /api/wallet/*
│   └── uploads/              # Uploaded ad files
└── frontend/
    ├── package.json
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── App.js
        ├── index.js
        ├── index.css
        ├── context/
        │   └── AuthContext.js
        ├── components/
        │   └── Navbar.js
        └── pages/
            ├── Login.js
            ├── Signup.js
            ├── Dashboard.js
            ├── Playback.js
            ├── seller/
            │   ├── SellerDashboard.js
            │   ├── ListDevice.js
            │   ├── MyDevices.js
            │   ├── RentedDevices.js
            │   └── SellerAds.js
            ├── buyer/
            │   ├── BuyerDashboard.js
            │   ├── BrowseDevices.js
            │   ├── MyRentals.js
            │   ├── UploadAd.js
            │   └── AdSchedule.js
            └── shared/
                └── Wallet.js
```

## Features

### Authentication
- Signup / Login with JWT
- Persistent sessions via localStorage

### Seller Features
- List display devices with full specs
- View all owned devices and their statuses
- See rented-out devices with buyer details and revenue
- View all ads scheduled on your screens

### Buyer Features
- Browse all available screens with pricing
- Rent devices (cost deducted from wallet automatically)
- Upload image/video ads (up to 50MB)
- Schedule ads on rented devices
- View full ad schedule with live/scheduled/ended status

### Wallet System
- Add funds with quick-select buttons ($10/$50/$100/$500)
- Automatic payment on rental (buyer debited, seller credited)
- Full transaction history with running balance

### Device Playback
- Real-time billboard preview page per device
- Shows current playing ad + next scheduled ad
- Auto-rotates ads every 10 seconds
- Live WebSocket updates when new ads are scheduled

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | Create account |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| PUT | /api/auth/switch-role | Switch seller/buyer role |
| POST | /api/devices | List new device |
| GET | /api/devices/available | Get available devices |
| GET | /api/devices/mine | Get seller's devices |
| GET | /api/devices/:id | Get single device |
| POST | /api/rentals | Create rental |
| GET | /api/rentals/buyer | Buyer's rentals |
| GET | /api/rentals/seller | Seller's rentals |
| POST | /api/ads/upload | Upload ad (multipart) |
| GET | /api/ads/buyer | Buyer's ads |
| GET | /api/ads/seller | Ads on seller's devices |
| GET | /api/ads/device/:id | Ads for playback |
| GET | /api/wallet/balance | Get balance |
| POST | /api/wallet/add | Add funds |
| GET | /api/wallet/transactions | Transaction history |
