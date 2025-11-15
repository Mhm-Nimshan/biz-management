const mysql = require('mysql2/promise');
require('dotenv').config();

const addIssuedChequeItemsTable = async () => {
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
      console.log(`Adding issued_cheque_items table to ${tenantDbName}...`);
      
      try {
        // Connect to tenant database
        const tenantConnection = await mysql.createConnection({
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: tenantDbName
        });

        // Create issued_cheque_items table
        await tenantConnection.execute(`
          CREATE TABLE IF NOT EXISTS issued_cheque_items (
            id INT PRIMARY KEY AUTO_INCREMENT,
            issued_cheque_id INT NOT NULL,
            cheque_number VARCHAR(100) NOT NULL,
            cheque_date DATE NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            payee_bank VARCHAR(255),
            payee_account VARCHAR(100),
            cheque_type ENUM('account_pay', 'cash') DEFAULT 'account_pay',
            status ENUM('issued', 'cashed', 'cancelled', 'returned') DEFAULT 'issued',
            cashed_date DATE,
            return_reason TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (issued_cheque_id) REFERENCES issued_cheques(id) ON DELETE CASCADE,
            INDEX idx_issued_cheque_id (issued_cheque_id),
            INDEX idx_cheque_number (cheque_number),
            INDEX idx_status (status),
            INDEX idx_cheque_date (cheque_date)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await tenantConnection.end();
        console.log(`✅ Successfully added issued_cheque_items table to ${tenantDbName}`);
        
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
addIssuedChequeItemsTable();

