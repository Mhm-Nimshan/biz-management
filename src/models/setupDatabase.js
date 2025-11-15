const db = require('../config/database');
const setupSubscriptionDatabase = require('./setupSubscriptionDatabase');

/**
 * Main database setup - Creates ONLY Super Admin and Tenant Management tables
 * Business tables (employees, products, invoices, etc.) are created in individual tenant databases
 */
const setupDatabase = async () => {
  try {
    console.log('🚀 Setting up Super Admin database...\n');
    
    // Setup Super Admin and Tenant Management tables
    await setupSubscriptionDatabase();
    
    console.log('✅ Super Admin database setup completed!');
    console.log('📊 Tables created: subscription_plans, tenants, tenant_users, subscriptions, subscription_history, menu_permissions, super_admins, payment_transactions\n');
    console.log('ℹ️  Note: Business tables (employees, products, invoices, etc.) are created in individual tenant databases when tenants sign up.\n');
  } catch (error) {
    console.error('\n❌ Error setting up database:');
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Access Denied - Check your database credentials in .env file');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Connection Refused - MySQL server is not running or not accessible');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Database does not exist - Create it in cPanel/phpMyAdmin first');
    }
    
    console.error('\n🔧 To diagnose: npm run test-db\n');
    throw error;
  }
};

// Run setup if called directly
if (require.main === module) {
  console.log('🚀 Starting database setup...\n');
  setupDatabase()
    .then(() => {
      console.log('✅ Database setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = setupDatabase;