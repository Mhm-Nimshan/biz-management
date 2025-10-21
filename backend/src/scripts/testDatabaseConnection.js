const mysql = require('mysql2/promise');
require('dotenv').config();

const testConnection = async () => {
  console.log('🔍 Testing Database Connection...\n');
  
  console.log('Configuration:');
  console.log('  Host:', process.env.DB_HOST || 'localhost');
  console.log('  User:', process.env.DB_USER || 'nimsleas_bizmanager_main');
  console.log('  Database:', process.env.DB_NAME || 'nimsleas_bizmanager_main');
  console.log('  Password:', process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-4) : 'Not set');
  console.log('\n');

  try {
    // Test connection WITHOUT database first
    console.log('Step 1: Testing MySQL connection (without database)...');
    const connectionWithoutDB = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'nimsleas_bizmanager_main',
      password: process.env.DB_PASSWORD || 'L&X6e}a=khH&',
    });
    
    console.log('✅ MySQL connection successful!\n');
    
    // Check if database exists
    console.log('Step 2: Checking if database exists...');
    const dbName = process.env.DB_NAME || 'nimsleas_bizmanager_main';
    const [databases] = await connectionWithoutDB.execute(
      `SHOW DATABASES LIKE '${dbName}'`
    );
    
    if (databases.length === 0) {
      console.log(`❌ Database '${dbName}' does NOT exist`);
      console.log(`\n🔧 Creating database '${dbName}'...`);
      
      await connectionWithoutDB.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
      console.log(`✅ Database '${dbName}' created successfully!\n`);
    } else {
      console.log(`✅ Database '${dbName}' exists\n`);
    }
    
    await connectionWithoutDB.end();
    
    // Test connection WITH database
    console.log('Step 3: Testing connection to database...');
    const connectionWithDB = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'nimsleas_bizmanager_main',
      password: process.env.DB_PASSWORD || 'L&X6e}a=khH&',
      database: process.env.DB_NAME || 'nimsleas_bizmanager_main',
    });
    
    console.log('✅ Connected to database successfully!\n');
    
    // Check tables
    console.log('Step 4: Checking existing tables...');
    const [tables] = await connectionWithDB.execute('SHOW TABLES');
    
    if (tables.length === 0) {
      console.log('⚠️  No tables found in database (this is normal for first setup)');
      console.log('💡 Run the server to create tables automatically\n');
    } else {
      console.log(`✅ Found ${tables.length} tables:`);
      tables.forEach(table => {
        console.log(`   - ${Object.values(table)[0]}`);
      });
      console.log('');
    }
    
    await connectionWithDB.end();
    
    console.log('🎉 All database checks passed!\n');
    console.log('Next steps:');
    console.log('  1. Start the server: npm start');
    console.log('  2. Tables will be created automatically');
    console.log('  3. Create super admin: npm run create-super-admin\n');
    
  } catch (error) {
    console.error('\n❌ Database Connection Error:\n');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('\nPossible Solutions:');
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('  ❌ Access Denied - Check your username and password');
      console.error('  - Verify DB_USER in .env file');
      console.error('  - Verify DB_PASSWORD in .env file');
      console.error('  - Check if user has proper privileges in cPanel/phpMyAdmin');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('  ❌ Connection Refused - MySQL server is not running or not accessible');
      console.error('  - Check if MySQL is running');
      console.error('  - Verify DB_HOST in .env file');
      console.error('  - Check firewall settings');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('  ❌ Database does not exist');
      console.error('  - Create database in cPanel/phpMyAdmin');
      console.error('  - Or grant CREATE DATABASE permission to user');
    } else {
      console.error('  - Check all database credentials in .env file');
      console.error('  - Verify MySQL server is accessible');
      console.error('  - Check user permissions');
    }
    
    console.error('\nFull Error:', error);
    process.exit(1);
  }
};

testConnection();

