/**
 * Script to create the first super admin account
 * Run with: node src/scripts/createSuperAdmin.js
 */

const bcrypt = require('bcryptjs');
const db = require('../config/database');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const createSuperAdmin = async () => {
  try {
    console.log('\n=== Create Super Admin Account ===\n');

    const email = await question('Email: ');
    const password = await question('Password: ');
    const fullName = await question('Full Name: ');

    if (!email || !password || !fullName) {
      console.error('All fields are required');
      process.exit(1);
    }

    // Check if super admin already exists
    const [existing] = await db.execute(
      'SELECT id FROM super_admins WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      console.error('Super admin with this email already exists');
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create super admin
    await db.execute(
      `INSERT INTO super_admins (email, password_hash, full_name, role, is_active)
       VALUES (?, ?, ?, 'super_admin', TRUE)`,
      [email, passwordHash, fullName]
    );

    console.log('\n✓ Super admin account created successfully!');
    console.log(`Email: ${email}`);
    console.log(`Name: ${fullName}`);
    console.log('\nYou can now login at /super-admin/login\n');

    process.exit(0);
  } catch (error) {
    console.error('Error creating super admin:', error);
    process.exit(1);
  }
};

createSuperAdmin();

