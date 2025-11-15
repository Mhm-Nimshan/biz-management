const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Add vendor_id column to products table in all tenant databases
 */
const addVendorIdToProducts = async () => {
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

        // Check if products table exists
        const [tableExists] = await tenantConnection.query(
          `SELECT COUNT(*) as count FROM information_schema.tables 
           WHERE table_schema = ? AND table_name = 'products'`,
          [dbName]
        );

        if (tableExists[0].count > 0) {
          console.log(`  Updating products table in ${dbName}`);
          
          // Check if vendor_id column already exists
          const [columnExists] = await tenantConnection.query(
            `SELECT COUNT(*) as count FROM information_schema.columns 
             WHERE table_schema = ? AND table_name = 'products' AND column_name = 'vendor_id'`,
            [dbName]
          );

          if (columnExists[0].count === 0) {
            // Add vendor_id column
            await tenantConnection.query(
              `ALTER TABLE products ADD COLUMN vendor_id INT NULL AFTER supplier_id`
            );
            
            // Add foreign key constraint
            await tenantConnection.query(
              `ALTER TABLE products 
               ADD CONSTRAINT products_ibfk_vendor 
               FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL`
            );
            
            console.log(`  ✓ Added vendor_id column to products table in ${dbName}`);
          } else {
            console.log(`  - vendor_id column already exists in ${dbName}`);
          }
        } else {
          console.log(`  - Products table does not exist in ${dbName}, skipping`);
        }

        await tenantConnection.end();
        console.log(`✓ Completed database: ${dbName}`);
        
      } catch (error) {
        console.log(`⚠ Error processing database ${dbName}:`, error.message);
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
  addVendorIdToProducts()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { addVendorIdToProducts };
