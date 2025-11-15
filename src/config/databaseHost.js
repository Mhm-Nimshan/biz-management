const mysql = require('mysql2/promise');
require('dotenv').config();

// Check if required environment variables are set
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
  console.warn('⚠️  Warning: Database environment variables not fully configured!');
  console.warn('Please check your .env file has:');
  console.warn('  - DB_HOST');
  console.warn('  - DB_USER');
  console.warn('  - DB_PASSWORD');
  console.warn('  - DB_NAME');
  console.warn('\nUsing default values for now...\n');
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'nimsleas_bizmanager_main',
  password: process.env.DB_PASSWORD || 'L&X6e}a=khH&',
  database: process.env.DB_NAME || 'nimsleas_bizmanager_main',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Add these options to handle connection issues
  acquireTimeout: 60000,
  timeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection on startup
pool.getConnection()
  .then(connection => {
    console.log('✅ Database connection pool established successfully');
    console.log(`   Connected to: ${process.env.DB_NAME || 'business_management'}`);
    connection.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed!');
    console.error('Error:', err.message);
    console.error('\n💡 Run: npm run test-db to diagnose the issue\n');
  });

module.exports = pool;