const mysql = require('mysql2/promise');
require('dotenv').config();

const fixDatabaseSchema = async () => {
  let connection;
  
  try {
    console.log('🔧 Fixing Database Schema for Opening Balance...\n');
    
    // Connect to MySQL server
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connected to MySQL server');

    // Get list of all databases
    const [databases] = await connection.execute(`
      SELECT SCHEMA_NAME as db_name 
      FROM information_schema.SCHEMATA 
      WHERE SCHEMA_NAME NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
    `);

    console.log(`📊 Found ${databases.length} databases`);

    // Process each database
    for (const { db_name } of databases) {
      try {
        console.log(`\n🔍 Processing database: ${db_name}`);
        
        // Connect to database
        const dbConnection = await mysql.createConnection({
          host: process.env.DB_HOST || 'localhost',
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          port: process.env.DB_PORT || 3306,
          database: db_name
        });

        // Check if daybook_entries table exists
        const [tables] = await dbConnection.execute(`
          SELECT TABLE_NAME 
          FROM information_schema.TABLES 
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'daybook_entries'
        `, [db_name]);
        
        if (tables.length > 0) {
          console.log(`  ✅ Found daybook_entries table`);
          
          // Check current entry_type enum values
          const [columns] = await dbConnection.execute(`
            SELECT COLUMN_TYPE 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'daybook_entries' AND COLUMN_NAME = 'entry_type'
          `, [db_name]);
          
          if (columns.length > 0) {
            const currentEnum = columns[0].COLUMN_TYPE;
            console.log(`  📋 Current entry_type: ${currentEnum}`);
            
            // Check if opening_balance is already included
            if (currentEnum.includes('opening_balance')) {
              console.log(`  ✅ opening_balance already supported`);
            } else {
              console.log(`  🔧 Adding opening_balance to entry_type enum...`);
              try {
                await dbConnection.execute(`
                  ALTER TABLE daybook_entries 
                  MODIFY COLUMN entry_type ENUM('income', 'expense', 'opening_balance') NOT NULL
                `);
                console.log(`  ✅ Successfully updated entry_type enum`);
              } catch (error) {
                console.log(`  ❌ Failed to update entry_type: ${error.message}`);
              }
            }
          }
          
          // Add category field if it doesn't exist
          try {
            await dbConnection.execute(`
              ALTER TABLE daybook_entries 
              ADD COLUMN category VARCHAR(100) NULL AFTER notes
            `);
            console.log(`  ✅ Added category field`);
          } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
              console.log(`  ✅ Category field already exists`);
            } else {
              console.log(`  ❌ Failed to add category field: ${error.message}`);
            }
          }
          
          // Test the fix by checking if we can insert an opening_balance entry
          try {
            const testDate = new Date().toISOString().split('T')[0];
            await dbConnection.execute(`
              INSERT INTO daybook_entries 
              (entry_date, entry_type, amount, payment_method, reference_number, description, category) 
              VALUES (?, 'opening_balance', 0, 'cash', 'TEST', 'Test Opening Balance', 'Test')
            `, [testDate]);
            
            // Clean up test entry
            await dbConnection.execute(`
              DELETE FROM daybook_entries 
              WHERE reference_number = 'TEST' AND description = 'Test Opening Balance'
            `);
            
            console.log(`  ✅ Test successful - opening_balance entry type works!`);
          } catch (error) {
            console.log(`  ❌ Test failed: ${error.message}`);
          }
          
        } else {
          console.log(`  ⚠️  No daybook_entries table found`);
        }
        
        await dbConnection.end();
        console.log(`✅ Completed database: ${db_name}`);
        
      } catch (error) {
        console.log(`❌ Error processing database ${db_name}: ${error.message}`);
      }
    }

    console.log('\n🎉 Database schema fix completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Test opening balance in DaybookForm');
    console.log('2. Check that entries are saved with entry_type = "opening_balance"');
    console.log('3. Verify entries appear with blue highlighting in Daybook page');
    
  } catch (error) {
    console.error('❌ Error fixing database schema:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Run the script
if (require.main === module) {
  fixDatabaseSchema()
    .then(() => {
      console.log('\n✅ Schema fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Schema fix failed:', error);
      process.exit(1);
    });
}

module.exports = fixDatabaseSchema;
