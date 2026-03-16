#!/usr/bin/env node
// Run this ONCE to create the admin user
// Usage: cd backend && node createAdmin.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@billboard.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@1234';
const ADMIN_NAME = 'Admin';

async function createAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    existing.isAdmin = true;
    await existing.save();
    console.log('Existing user promoted to admin:', ADMIN_EMAIL);
  } else {
    await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, isAdmin: true });
    console.log('Admin user created!');
    console.log('Email:', ADMIN_EMAIL);
    console.log('Password:', ADMIN_PASSWORD);
  }
  process.exit(0);
}

createAdmin().catch(err => { console.error(err); process.exit(1); });
