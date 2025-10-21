#!/usr/bin/env node

/**
 * Generate bcrypt password hash
 * Usage: node generatePasswordHash.js
 */

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║         Password Hash Generator for Super Admin           ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

rl.question('Enter password to hash: ', (password) => {
  if (!password) {
    console.error('❌ Password cannot be empty');
    process.exit(1);
  }

  const hash = bcrypt.hashSync(password, 10);
  
  console.log('\n✅ Password hash generated successfully!\n');
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nCopy the hash above and use it in your SQL INSERT statement.\n');
  console.log('SQL Example:');
  console.log(`INSERT INTO super_admins (email, password_hash, full_name, role, is_active)`);
  console.log(`VALUES ('admin@gmail.com', '${hash}', 'Super Admin', 'super_admin', TRUE);\n`);
  
  rl.close();
  process.exit(0);
});

