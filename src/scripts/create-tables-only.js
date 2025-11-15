const mysql = require('mysql2/promise');
const { setupTenantTables } = require('../models/tenantDatabase');
require('dotenv').config();

/**
 * Create tables only in an existing database
 * Usage: node src/scripts/create-tables-only.js [database_name]
 */
const createTablesOnly = async (databaseName) => {
  let connection;
  
  try {
    if (!databaseName) {
      console.error('❌ Error: Database name is required');
      console.error('Usage: node src/scripts/create-tables-only.js [database_name]');
      console.error('Example: node src/scripts/create-tables-only.js nimsleas_test-tenant-1234567890');
      process.exit(1);
    }

    console.log(`🔧 Creating tables in database: ${databaseName}`);
    
    // Connect to the specified database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: databaseName,
      multipleStatements: true
    });

    console.log(`✅ Connected to database: ${databaseName}`);

    // Create all tenant-specific tables
    await setupTenantTables(connection);
    
    console.log(`✅ All tables created successfully in database: ${databaseName}`);
    
    // Verify tables were created
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`\n📋 Tables created (${tables.length}):`);
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`   - ${tableName}`);
    });

    console.log('\n🎉 Table creation completed successfully!');
    console.log('💡 You can now use this tenant database in your application.');

  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.error(`\n💡 Database "${databaseName}" does not exist.`);
      console.error('Please create the database first in cPanel or check the database name.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Access denied. Please check:');
      console.error('1. Database name is correct');
      console.error('2. User has access to the database');
      console.error('3. User has CREATE privilege on the database');
    }
    
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Get database name from command line arguments
const databaseName = process.argv[2];

// Run the script if called directly
if (require.main === module) {
  createTablesOnly(databaseName)
    .then(() => {
      console.log('\n✅ Table creation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Table creation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createTablesOnly };
