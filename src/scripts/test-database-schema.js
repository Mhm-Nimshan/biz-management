const mysql = require('mysql2/promise');

const testDatabaseSchema = async () => {
  let connection;
  
  try {
    // Connect to MySQL server
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306
    });

    console.log('Connected to MySQL server');

    // Get list of tenant databases
    const [databases] = await connection.execute(`
      SELECT SCHEMA_NAME as db_name 
      FROM information_schema.SCHEMATA 
      WHERE SCHEMA_NAME LIKE 'tenant_%'
    `);

    console.log(`Found ${databases.length} tenant databases`);

    for (const { db_name } of databases) {
      try {
        console.log(`\nChecking database: ${db_name}`);
        
        // Connect to tenant database
        const tenantConnection = await mysql.createConnection({
          host: process.env.DB_HOST || 'localhost',
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          port: process.env.DB_PORT || 3306,
          database: db_name
        });

        // Check daybook_entries table structure
        console.log(`  Checking daybook_entries table structure in ${db_name}`);
        try {
          const [columns] = await tenantConnection.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'daybook_entries'
            ORDER BY ORDINAL_POSITION
          `, [db_name]);
          
          console.log(`  ✓ Found ${columns.length} columns in daybook_entries:`);
          columns.forEach(col => {
            console.log(`    - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'nullable' : 'not null'})`);
          });
          
          // Check if category field exists
          const hasCategory = columns.some(col => col.COLUMN_NAME === 'category');
          if (!hasCategory) {
            console.log(`  ⚠ Category field missing in ${db_name}, adding it...`);
            await tenantConnection.execute(`
              ALTER TABLE daybook_entries 
              ADD COLUMN category VARCHAR(100) NULL AFTER notes
            `);
            console.log(`  ✓ Added category field to ${db_name}`);
          } else {
            console.log(`  ✓ Category field exists in ${db_name}`);
          }
          
        } catch (error) {
          console.log(`  - Error checking table structure in ${db_name}: ${error.message}`);
        }

        await tenantConnection.end();
        console.log(`✓ Completed database: ${db_name}`);
        
      } catch (error) {
        console.log(`⚠ Error processing database ${db_name}:`, error.message);
      }
    }

    console.log('\n✅ Database schema check completed');
    
  } catch (error) {
    console.error('Error checking database schema:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Run the script
if (require.main === module) {
  testDatabaseSchema()
    .then(() => {
      console.log('Schema check completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Schema check failed:', error);
      process.exit(1);
    });
}

module.exports = testDatabaseSchema;
