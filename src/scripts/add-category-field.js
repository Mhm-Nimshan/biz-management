const mysql = require('mysql2/promise');

const addCategoryField = async () => {
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
        console.log(`\nProcessing database: ${db_name}`);
        
        // Connect to tenant database
        const tenantConnection = await mysql.createConnection({
          host: process.env.DB_HOST || 'localhost',
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          port: process.env.DB_PORT || 3306,
          database: db_name
        });

        // Add category field to daybook_entries table
        console.log(`  Adding category field to daybook_entries in ${db_name}`);
        try {
          await tenantConnection.execute(`
            ALTER TABLE daybook_entries 
            ADD COLUMN category VARCHAR(100) NULL AFTER notes
          `);
          console.log(`  ✓ Added category field to daybook_entries in ${db_name}`);
        } catch (error) {
          if (error.code === 'ER_DUP_FIELDNAME') {
            console.log(`  - Category field already exists in ${db_name}`);
          } else {
            console.log(`  - Could not add category field in ${db_name}: ${error.message}`);
          }
        }

        await tenantConnection.end();
        console.log(`✓ Completed database: ${db_name}`);
        
      } catch (error) {
        console.log(`⚠ Error processing database ${db_name}:`, error.message);
      }
    }

    console.log('\n✅ Category field migration completed');
    
  } catch (error) {
    console.error('Error updating database schema:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Run the script
if (require.main === module) {
  addCategoryField()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addCategoryField;
