const mysql = require('mysql2/promise');

const fixDaybookSchema = async () => {
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

    // Get list of all databases
    const [databases] = await connection.execute(`
      SELECT SCHEMA_NAME as db_name 
      FROM information_schema.SCHEMATA 
      WHERE SCHEMA_NAME NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
    `);

    console.log(`Found ${databases.length} databases:`);
    databases.forEach(db => {
      console.log(`  - ${db.db_name}`);
    });

    // Process each database
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

        // Check if daybook_entries table exists
        const [tables] = await tenantConnection.execute(`
          SELECT TABLE_NAME 
          FROM information_schema.TABLES 
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'daybook_entries'
        `, [db_name]);
        
        if (tables.length > 0) {
          console.log(`  ✓ Found daybook_entries table in ${db_name}`);
          
          // Check current entry_type enum values
          const [columns] = await tenantConnection.execute(`
            SELECT COLUMN_TYPE 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'daybook_entries' AND COLUMN_NAME = 'entry_type'
          `, [db_name]);
          
          if (columns.length > 0) {
            console.log(`  Current entry_type: ${columns[0].COLUMN_TYPE}`);
            
            // Update entry_type to include opening_balance
            try {
              await tenantConnection.execute(`
                ALTER TABLE daybook_entries 
                MODIFY COLUMN entry_type ENUM('income', 'expense', 'opening_balance') NOT NULL
              `);
              console.log(`  ✓ Updated entry_type enum to include 'opening_balance' in ${db_name}`);
            } catch (error) {
              console.log(`  - Could not update entry_type enum in ${db_name}: ${error.message}`);
            }
          }
          
          // Add category field if it doesn't exist
          try {
            await tenantConnection.execute(`
              ALTER TABLE daybook_entries 
              ADD COLUMN category VARCHAR(100) NULL AFTER notes
            `);
            console.log(`  ✓ Added category field to ${db_name}`);
          } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
              console.log(`  - Category field already exists in ${db_name}`);
            } else {
              console.log(`  - Could not add category field in ${db_name}: ${error.message}`);
            }
          }
        } else {
          console.log(`  - No daybook_entries table found in ${db_name}`);
        }
        
        await tenantConnection.end();
        console.log(`✓ Completed database: ${db_name}`);
        
      } catch (error) {
        console.log(`⚠ Error processing database ${db_name}:`, error.message);
      }
    }

    console.log('\n✅ Database schema update completed');
    
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
  fixDaybookSchema()
    .then(() => {
      console.log('Schema update completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Schema update failed:', error);
      process.exit(1);
    });
}

module.exports = fixDaybookSchema;
