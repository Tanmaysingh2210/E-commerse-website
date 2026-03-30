require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ADMIN_NAME     = 'Priyansh';
const ADMIN_EMAIL    = 'priyanshsharma745@gmail.com';
const ADMIN_PASSWORD = 'Priyansh#9650';

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    const User = require('../models/User');

    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      if (existing.role === 'admin') {
        console.log('\nℹ️  Admin already exists!');
        console.log(`   Email   : ${ADMIN_EMAIL}`);
        console.log(`   Password: ${ADMIN_PASSWORD}`);
      } else {
        existing.role = 'admin';
        await existing.save();
        console.log(`\n✅ User upgraded to admin role.`);
        console.log(`   Email   : ${ADMIN_EMAIL}`);
        console.log(`   Password: ${ADMIN_PASSWORD}`);
      }
      await mongoose.disconnect();
      return;
    }

    const salt   = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, salt);

    await User.create({
      name:            ADMIN_NAME,
      email:           ADMIN_EMAIL,
      password:        ADMIN_PASSWORD,
      role:            'admin',
      isEmailVerified: true,
      isActive:        true,
    });

    console.log('\n🎉 Admin account created!\n');
    console.log('─────────────────────────────────────');
    console.log(`   Email   : ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('─────────────────────────────────────');
    console.log('\n👉 Login  : http://localhost:3000/login');
    console.log('👉 Panel  : http://localhost:3000/admin\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createAdmin();