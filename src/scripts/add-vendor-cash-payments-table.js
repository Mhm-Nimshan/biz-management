const mysql = require('mysql2/promise');
require('dotenv').config();

const addVendorCashPaymentsTable = async () => {
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
      console.log(`Adding vendor_cash_payments table to ${tenantDbName}...`);
      
      try {
        // Connect to tenant database
        const tenantConnection = await mysql.createConnection({
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: tenantDbName
        });

        // Create vendor_cash_payments table
        await tenantConnection.execute(`
          CREATE TABLE IF NOT EXISTS vendor_cash_payments (
            id INT PRIMARY KEY AUTO_INCREMENT,
            vendor_id INT NOT NULL,
            bank_account_id INT NULL,
            amount DECIMAL(12,2) NOT NULL,
            payment_date DATE NOT NULL,
            description TEXT,
            reference_number VARCHAR(255),
            notes TEXT,
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT,
            FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL,
            FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL,
            INDEX idx_vendor_id (vendor_id),
            INDEX idx_bank_account_id (bank_account_id),
            INDEX idx_payment_date (payment_date),
            INDEX idx_created_at (created_at)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await tenantConnection.end();
        console.log(`✅ Successfully added vendor_cash_payments table to ${tenantDbName}`);
        
      } catch (error) {
        console.error(`❌ Error adding table to ${tenantDbName}:`, error.message);
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
addVendorCashPaymentsTable();

