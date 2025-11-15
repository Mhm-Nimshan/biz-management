const { createTenantDatabase } = require('../models/tenantDatabase');

/**
 * cPanel Setup Guide and Database Creation
 * This script provides step-by-step guidance for cPanel users
 */
const cpanelSetupGuide = async () => {
  console.log('🎯 cPanel Database Setup Guide');
  console.log('================================\n');

  console.log('📋 Step 1: Manual Database Creation in cPanel');
  console.log('1. Login to your cPanel');
  console.log('2. Go to "MySQL Databases"');
  console.log('3. Create a new database with name: nimsleas_[tenant_name]');
  console.log('4. Add user "nimsleas_bizmanager_main" to the database');
  console.log('5. Grant "All Privileges" to the user\n');

  console.log('📋 Step 2: Test Database Connection');
  console.log('Running connection test...\n');

  try {
    // Test connection to main database
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ Main database connection successful');
    await connection.end();

    console.log('\n📋 Step 3: Create Test Tenant Database');
    console.log('Creating test tenant database...\n');

    const testTenantSlug = 'test-tenant-' + Date.now();
    const dbName = await createTenantDatabase(testTenantSlug);
    
    console.log(`✅ Successfully created tenant database: ${dbName}`);
    console.log('\n🎉 Setup completed successfully!');
    console.log('\n💡 Next Steps:');
    console.log('1. Check phpMyAdmin to verify tables were created');
    console.log('2. If tables are missing, run the table creation script');
    console.log('3. Test your application with the new tenant');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    
    if (error.code === 'ER_DBACCESS_DENIED_ERROR') {
      console.error('\n🔧 Manual cPanel Setup Required:');
      console.error('1. Create database manually in cPanel');
      console.error('2. Add user to database with all privileges');
      console.error('3. Run: node src/scripts/create-tables-only.js [database_name]');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n🔧 Permission Issue:');
      console.error('1. Check user permissions in cPanel');
      console.error('2. Ensure user has access to the database');
    }
    
    throw error;
  }
};

// Run the guide if called directly
if (require.main === module) {
  cpanelSetupGuide()
    .then(() => {
      console.log('\n✅ cPanel setup guide completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Setup guide failed:', error.message);
      process.exit(1);
    });
}

module.exports = { cpanelSetupGuide };
