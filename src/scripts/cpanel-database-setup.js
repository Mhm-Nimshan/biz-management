const mysql = require('mysql2/promise');
const { setupTenantTables } = require('../models/tenantDatabase');
require('dotenv').config();

/**
 * cPanel Database Setup using root credentials
 * This script creates databases and tables for cPanel users
 */
const cpanelDatabaseSetup = async (tenantSlug) => {
  let rootConnection;
  let tenantConnection;
  
  try {
    console.log('🔧 cPanel Database Setup');
    console.log('========================\n');

    // Step 1: Connect as root user
    console.log('📋 Step 1: Connecting as root user...');
    rootConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_ROOT_USER || 'nimsleas_bizmanager_main',
      password: process.env.DB_ROOT_PASSWORD || 'L&X6e}a=khH&',
      multipleStatements: true
    });
    console.log('✅ Root connection established');

    const dbName = `nimsleas_${tenantSlug}`;
    const dbUser = process.env.DB_USER || 'nimsleas_bizmanager_main';
    const dbHost = process.env.DB_HOST || 'localhost';

    // Step 2: Create database
    console.log(`\n📋 Step 2: Creating database ${dbName}...`);
    await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Database ${dbName} created successfully`);

    // Step 3: Grant privileges
    console.log(`\n📋 Step 3: Granting privileges to user ${dbUser}...`);
    try {
      await rootConnection.query(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO ?@?`, [dbUser, dbHost]);
      await rootConnection.query('FLUSH PRIVILEGES');
      console.log(`✅ Privileges granted to ${dbUser}@${dbHost}`);
    } catch (grantError) {
      console.warn(`⚠️  Warning: Could not grant privileges: ${grantError.message}`);
      console.warn('💡 You may need to manually add the user to the database in cPanel');
    }

    // Close root connection
    await rootConnection.end();

    // Step 4: Connect to tenant database and create tables
    console.log(`\n📋 Step 4: Creating tables in ${dbName}...`);
    tenantConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: dbName,
      multipleStatements: true
    });

    await setupTenantTables(tenantConnection);
    console.log(`✅ All tables created in ${dbName}`);

    // Step 5: Verify tables
    console.log(`\n📋 Step 5: Verifying tables...`);
    const [tables] = await tenantConnection.query('SHOW TABLES');
    console.log(`✅ Found ${tables.length} tables:`);
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`   - ${tableName}`);
    });

    console.log('\n🎉 Database setup completed successfully!');
    console.log(`💡 Database: ${dbName}`);
    console.log('💡 You can now use this tenant in your application.');

    return dbName;

  } catch (error) {
    console.error('❌ Error in cPanel database setup:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Root Access Error:');
      console.error('1. Check DB_ROOT_USER and DB_ROOT_PASSWORD in .env file');
      console.error('2. Ensure root user has necessary privileges');
      console.error('3. Try using cPanel MySQL root credentials');
    } else if (error.code === 'ER_DBACCESS_DENIED_ERROR') {
      console.error('\n💡 Database Access Error:');
      console.error('1. Check if the database was created successfully');
      console.error('2. Verify user permissions in cPanel');
    }
    
    throw error;
  } finally {
    if (rootConnection) {
      await rootConnection.end();
    }
    if (tenantConnection) {
      await tenantConnection.end();
    }
  }
};

// Get tenant slug from command line arguments
const tenantSlug = process.argv[2];

// Run the script if called directly
if (require.main === module) {
  if (!tenantSlug) {
    console.error('❌ Error: Tenant slug is required');
    console.error('Usage: node src/scripts/cpanel-database-setup.js [tenant_slug]');
    console.error('Example: node src/scripts/cpanel-database-setup.js company-abc-1234567890');
    process.exit(1);
  }

  cpanelDatabaseSetup(tenantSlug)
    .then((dbName) => {
      console.log(`\n✅ Setup completed successfully! Database: ${dbName}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { cpanelDatabaseSetup };
