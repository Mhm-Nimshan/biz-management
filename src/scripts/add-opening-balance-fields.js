const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Add opening balance fields to vendors, customers tables and update daybook entry types
 */
const addOpeningBalanceFields = async () => {
  let connection;
  
  try {
    // Connect to MySQL server
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: true
    });

    console.log('Connected to MySQL server');

    // Get all tenant databases
    const [databases] = await connection.query(
      "SHOW DATABASES LIKE 'nimsleas_%'"
    );

    console.log(`Found ${databases.length} tenant databases`);

    for (const db of databases) {
      const dbName = db.Database;
      console.log(`\nProcessing database: ${dbName}`);
      
      try {
        // Connect to the tenant database
        const tenantConnection = await mysql.createConnection({
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: dbName,
          multipleStatements: true
        });

        // Add opening_balance column to vendors table
        console.log(`  Adding opening_balance to vendors table in ${dbName}`);
        try {
          await tenantConnection.execute(`
            ALTER TABLE vendors 
            ADD COLUMN opening_balance DECIMAL(12,2) DEFAULT 0.00 
            AFTER status
          `);
          console.log(`  ✓ Added opening_balance column to vendors table in ${dbName}`);
        } catch (error) {
          if (error.code === 'ER_DUP_FIELDNAME') {
            console.log(`  - opening_balance column already exists in vendors table in ${dbName}`);
          } else {
            throw error;
          }
        }

        // Add opening_balance column to customers table
        console.log(`  Adding opening_balance to customers table in ${dbName}`);
        try {
          await tenantConnection.execute(`
            ALTER TABLE customers 
            ADD COLUMN opening_balance DECIMAL(12,2) DEFAULT 0.00 
            AFTER country
          `);
          console.log(`  ✓ Added opening_balance column to customers table in ${dbName}`);
        } catch (error) {
          if (error.code === 'ER_DUP_FIELDNAME') {
            console.log(`  - opening_balance column already exists in customers table in ${dbName}`);
          } else {
            throw error;
          }
        }

        // Update daybook_entries table to support opening balance entry type
        console.log(`  Updating daybook_entries entry_type enum in ${dbName}`);
        try {
          await tenantConnection.execute(`
            ALTER TABLE daybook_entries 
            MODIFY COLUMN entry_type ENUM('income', 'expense', 'opening_balance') NOT NULL
          `);
          console.log(`  ✓ Updated daybook_entries entry_type enum in ${dbName}`);
        } catch (error) {
          console.log(`  - Could not update daybook_entries entry_type enum in ${dbName}: ${error.message}`);
        }

        await tenantConnection.end();
        console.log(`✓ Completed database: ${dbName}`);
        
      } catch (error) {
        console.log(`⚠ Error processing database ${dbName}:`, error.message);
      }
    }

    console.log('\n✅ Opening balance fields migration completed');
    
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
  addOpeningBalanceFields()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addOpeningBalanceFields;
