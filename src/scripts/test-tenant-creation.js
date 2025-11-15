const { createTenantDatabase } = require('../models/tenantDatabase');

/**
 * Test tenant database creation
 */
const testTenantCreation = async () => {
  try {
    console.log('🧪 Testing tenant database creation...');
    
    const testTenantSlug = 'test-tenant-' + Date.now();
    console.log(`📋 Creating test tenant: ${testTenantSlug}`);
    
    const dbName = await createTenantDatabase(testTenantSlug);
    console.log(`✅ Successfully created database: ${dbName}`);
    
    console.log('\n🎉 Tenant creation test passed!');
    console.log('💡 You can now create tenant databases without permission errors.');
    
  } catch (error) {
    console.error('❌ Tenant creation test failed:', error.message);
    
    if (error.code === 'ER_DBACCESS_DENIED_ERROR') {
      console.error('\n💡 Permission Error: The user still lacks CREATE privilege');
      console.error('   Please run: node src/scripts/setup-database-permissions.js');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Access Error: Check your database credentials in .env file');
    }
    
    throw error;
  }
};

// Run the test if called directly
if (require.main === module) {
  testTenantCreation()
    .then(() => {
      console.log('\n✅ Test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testTenantCreation };