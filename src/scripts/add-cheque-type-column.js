const mysql = require('mysql2/promise');
require('dotenv').config();

const addChequeTypeColumn = async () => {
  let connection;
  
  try {
    // Connect to the main database to get tenant information
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Get all tenants
    const [tenants] = await connection.execute('SELECT tenant_slug FROM tenants WHERE status = "active"');
    
    console.log(`Found ${tenants.length} active tenants`);

    for (const tenant of tenants) {
      const tenantDbName = `nimsleas_${tenant.tenant_slug}`;
      console.log(`Adding cheque_type column to ${tenantDbName}...`);
      
      try {
        // Connect to tenant database
        const tenantConnection = await mysql.createConnection({
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: tenantDbName
        });

        // Check if cheque_type column exists in issued_cheques table
        const [columns] = await tenantConnection.execute(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = ? 
          AND TABLE_NAME = 'issued_cheques' 
          AND COLUMN_NAME = 'cheque_type'
        `, [tenantDbName]);

        if (columns.length === 0) {
          // Add cheque_type column to issued_cheques table
          await tenantConnection.execute(`
            ALTER TABLE issued_cheques 
            ADD COLUMN cheque_type ENUM('account_pay', 'cash') DEFAULT 'account_pay' 
            AFTER payee_account
          `);
          console.log(`  ✅ Added cheque_type to issued_cheques table`);
        } else {
          console.log(`  ⏭️  cheque_type column already exists in issued_cheques table`);
        }

        // Check if cheque_type column exists in issued_cheque_items table
        const [itemColumns] = await tenantConnection.execute(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = ? 
          AND TABLE_NAME = 'issued_cheque_items' 
          AND COLUMN_NAME = 'cheque_type'
        `, [tenantDbName]);

        if (itemColumns.length === 0) {
          // Check if table exists first
          const [tables] = await tenantConnection.execute(`SHOW TABLES LIKE 'issued_cheque_items'`);
          if (tables.length > 0) {
            // Add cheque_type column to issued_cheque_items table
            await tenantConnection.execute(`
              ALTER TABLE issued_cheque_items 
              ADD COLUMN cheque_type ENUM('account_pay', 'cash') DEFAULT 'account_pay' 
              AFTER payee_account
            `);
            console.log(`  ✅ Added cheque_type to issued_cheque_items table`);
          } else {
            console.log(`  ⏭️  issued_cheque_items table does not exist, skipping`);
          }
        } else {
          console.log(`  ⏭️  cheque_type column already exists in issued_cheque_items table`);
        }

        await tenantConnection.end();
        console.log(`✅ Successfully updated ${tenantDbName}\n`);
        
      } catch (error) {
        console.error(`❌ Error updating ${tenantDbName}:`, error.message);
      }
    }

    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Run the migration
addChequeTypeColumn();

