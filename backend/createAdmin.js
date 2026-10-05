#!/usr/bin/env node
// Run this ONCE to create the admin user
// Usage: cd backend && node createAdmin.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = 'Admin';

async function createAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters)');
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
  }
  process.exit(0);
}

createAdmin().catch(err => { console.error(err); process.exit(1); });
