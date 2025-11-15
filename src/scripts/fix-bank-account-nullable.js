const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Fix database schema to allow NULL values for bank_account_id columns
 */
const fixBankAccountNullable = async () => {
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

        // Check if tables exist and modify them
        const tables = ['payment_cheques', 'invoice_payments'];
        
        for (const tableName of tables) {
          try {
            // Check if table exists
            const [tableExists] = await tenantConnection.query(
              `SELECT COUNT(*) as count FROM information_schema.tables 
               WHERE table_schema = ? AND table_name = ?`,
              [dbName, tableName]
            );

            if (tableExists[0].count > 0) {
              console.log(`  Updating table: ${tableName}`);
              
              // Modify bank_account_id column to allow NULL
              await tenantConnection.query(
                `ALTER TABLE ${tableName} 
                 MODIFY COLUMN bank_account_id INT NULL`
              );
              
              // Update foreign key constraint to SET NULL on delete
              await tenantConnection.query(
                `ALTER TABLE ${tableName} 
                 DROP FOREIGN KEY ${tableName}_ibfk_2`
              );
              
              await tenantConnection.query(
                `ALTER TABLE ${tableName} 
                 ADD CONSTRAINT ${tableName}_ibfk_2 
                 FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL`
              );
              
              console.log(`  ✓ Updated ${tableName} successfully`);
            } else {
              console.log(`  - Table ${tableName} does not exist, skipping`);
            }
          } catch (error) {
            console.log(`  ⚠ Error updating ${tableName}:`, error.message);
          }
        }

        await tenantConnection.end();
        console.log(`✓ Completed database: ${dbName}`);
        
      } catch (error) {
        console.log(`⚠ Error processing database ${dbName}:`, error.message);
      }
    }

    console.log('\n✅ Database schema update completed');
    
  } catch (error) {
    console.error('Error fixing database schema:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Run the script
if (require.main === module) {
  fixBankAccountNullable()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixBankAccountNullable };
