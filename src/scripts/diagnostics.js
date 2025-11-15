#!/usr/bin/env node

/**
 * Diagnostic Script for Business Management System
 * Run this to check if your backend is configured correctly
 * 
 * Usage: node src/scripts/diagnostics.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

console.log('\n🔍 Business Management System - Diagnostic Check\n');
console.log('='.repeat(60));

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const success = (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`);
const error = (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`);
const warning = (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`);
const info = (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`);

let errorCount = 0;
let warningCount = 0;

// Check 1: Environment Variables
console.log('\n1️⃣  Checking Environment Variables...');
console.log('-'.repeat(60));

require('dotenv').config();

const requiredEnvVars = [
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'SUPER_ADMIN_JWT_SECRET'
];

requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    success(`${varName} is set`);
    if (varName.includes('SECRET') && process.env[varName].length < 32) {
      warning(`${varName} should be at least 32 characters long`);
      warningCount++;
    }
  } else {
    error(`${varName} is NOT set`);
    errorCount++;
  }
});

if (process.env.CORS_ORIGIN) {
  success(`CORS_ORIGIN is set: ${process.env.CORS_ORIGIN}`);
} else {
  warning('CORS_ORIGIN is not set (may cause CORS errors)');
  warningCount++;
}

// Check 2: Node.js Version
console.log('\n2️⃣  Checking Node.js Version...');
console.log('-'.repeat(60));

const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));

if (majorVersion >= 18) {
  success(`Node.js version: ${nodeVersion} (>= 18.x required)`);
} else {
  error(`Node.js version: ${nodeVersion} (< 18.x, upgrade required!)`);
  errorCount++;
}

// Check 3: Required Files
console.log('\n3️⃣  Checking Required Files...');
console.log('-'.repeat(60));

const requiredFiles = [
  'package.json',
  'src/server.js',
  'src/config/database.js',
  'src/models/setupDatabase.js',
  'src/controllers/superAdminController.js',
  'src/routes/superAdmin.js'
];

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', '..', file);
  if (fs.existsSync(filePath)) {
    success(`${file} exists`);
  } else {
    error(`${file} is missing!`);
    errorCount++;
  }
});

// Check 4: node_modules
console.log('\n4️⃣  Checking Dependencies...');
console.log('-'.repeat(60));

const nodeModulesPath = path.join(__dirname, '..', '..', 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  success('node_modules directory exists');
  
  // Check critical packages
  const criticalPackages = ['express', 'mysql2', 'bcryptjs', 'jsonwebtoken', 'cors'];
  criticalPackages.forEach(pkg => {
    const pkgPath = path.join(nodeModulesPath, pkg);
    if (fs.existsSync(pkgPath)) {
      success(`${pkg} is installed`);
    } else {
      error(`${pkg} is NOT installed`);
      errorCount++;
    }
  });
} else {
  error('node_modules directory does not exist! Run: npm install');
  errorCount++;
}

// Check 5: Database Connection
console.log('\n5️⃣  Testing Database Connection...');
console.log('-'.repeat(60));

async function testDatabase() {
  try {
    info('Attempting to connect to database...');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    success('Database connection successful!');
    
    // Test query
    const [rows] = await connection.execute('SELECT 1 as test');
    success('Database query successful!');
    
    // Check if super_admins table exists
    try {
      const [tables] = await connection.execute(
        "SHOW TABLES LIKE 'super_admins'"
      );
      
      if (tables.length > 0) {
        success('super_admins table exists');
        
        // Check if there are any super admins
        const [admins] = await connection.execute(
          'SELECT COUNT(*) as count FROM super_admins'
        );
        
        if (admins[0].count > 0) {
          success(`${admins[0].count} super admin(s) exist`);
        } else {
          warning('No super admins found. Run: npm run create-super-admin');
          warningCount++;
        }
      } else {
        warning('super_admins table does not exist yet (will be created on first run)');
        warningCount++;
      }
    } catch (err) {
      warning('Could not check super_admins table: ' + err.message);
      warningCount++;
    }
    
    await connection.end();
  } catch (err) {
    error('Database connection FAILED!');
    error('Error: ' + err.message);
    console.log('\n' + colors.yellow + 'Troubleshooting tips:' + colors.reset);
    console.log('  • Verify DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in .env');
    console.log('  • Check if MySQL is running');
    console.log('  • Verify user has permissions on database');
    console.log('  • Check for special characters in password that might need escaping');
    errorCount++;
  }
}

// Check 6: Port Availability
console.log('\n6️⃣  Checking Port Configuration...');
console.log('-'.repeat(60));

const port = process.env.PORT || 5000;
info(`Configured port: ${port}`);

// Try to listen on the port
const net = require('net');
const server = net.createServer();

server.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    warning(`Port ${port} is already in use (app might be running)`);
    warningCount++;
  } else {
    error(`Port ${port} error: ${err.message}`);
    errorCount++;
  }
  server.close();
});

server.once('listening', () => {
  success(`Port ${port} is available`);
  server.close();
});

server.listen(port);

// Run async checks
(async () => {
  await testDatabase();
  
  // Wait for port check
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(60));
  
  if (errorCount === 0 && warningCount === 0) {
    console.log(`\n${colors.green}🎉 All checks passed! Your backend should be ready to run.${colors.reset}\n`);
    console.log('Next steps:');
    console.log('  1. Start the server: npm start');
    console.log('  2. Or in cPanel: Start the Node.js app');
    console.log('  3. Test API: curl http://localhost:5000/api/health');
    console.log('  4. Create super admin: npm run create-super-admin');
  } else {
    if (errorCount > 0) {
      console.log(`\n${colors.red}❌ ${errorCount} error(s) found - must be fixed before starting${colors.reset}`);
    }
    if (warningCount > 0) {
      console.log(`${colors.yellow}⚠️  ${warningCount} warning(s) found - should be addressed${colors.reset}`);
    }
    console.log('\nPlease fix the issues above and run diagnostics again.');
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  process.exit(errorCount > 0 ? 1 : 0);
})();

