const mysql = require('mysql2/promise');
require('dotenv').config();

const addIssuedChequesTable = async () => {
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
      console.log(`Adding issued_cheques table to ${tenantDbName}...`);
      
      try {
        // Connect to tenant database
        const tenantConnection = await mysql.createConnection({
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: tenantDbName
        });

        // Create issued_cheques table
        await tenantConnection.execute(`
          CREATE TABLE IF NOT EXISTS issued_cheques (
            id INT PRIMARY KEY AUTO_INCREMENT,
            cheque_number VARCHAR(100) NOT NULL,
            bank_account_id INT NOT NULL,
            vendor_id INT NULL,
            customer_id INT NULL,
            amount DECIMAL(12,2) NOT NULL,
            cheque_date DATE NOT NULL,
            issue_date DATE NOT NULL,
            payee_name VARCHAR(255) NOT NULL,
            payee_bank VARCHAR(255),
            payee_account VARCHAR(100),
            cheque_type ENUM('account_pay', 'cash') DEFAULT 'account_pay',
            description TEXT,
            status ENUM('issued', 'cashed', 'cancelled', 'returned') DEFAULT 'issued',
            cashed_date DATE,
            return_reason TEXT,
            notes TEXT,
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE RESTRICT,
            FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
            FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL,
            INDEX idx_cheque_number (cheque_number),
            INDEX idx_bank_account_id (bank_account_id),
            INDEX idx_status (status),
            INDEX idx_cheque_date (cheque_date)
          )
        `);

        // Create party_cheques table for customer cheques issued to vendors
        await tenantConnection.execute(`
          CREATE TABLE IF NOT EXISTS party_cheques (
            id INT PRIMARY KEY AUTO_INCREMENT,
            cheque_number VARCHAR(100) NOT NULL,
            customer_cheque_id INT NOT NULL,
            vendor_id INT NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            issue_date DATE NOT NULL,
            description TEXT,
            status ENUM('issued', 'cashed', 'cancelled', 'returned') DEFAULT 'issued',
            cashed_date DATE,
            return_reason TEXT,
            notes TEXT,
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_cheque_id) REFERENCES payment_cheques(id) ON DELETE RESTRICT,
            FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT,
            FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL,
            INDEX idx_cheque_number (cheque_number),
            INDEX idx_customer_cheque_id (customer_cheque_id),
            INDEX idx_vendor_id (vendor_id),
            INDEX idx_status (status)
          )
        `);

        await tenantConnection.end();
        console.log(`✅ Successfully added tables to ${tenantDbName}`);
        
      } catch (error) {
        console.error(`❌ Error adding tables to ${tenantDbName}:`, error.message);
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
addIssuedChequesTable();
