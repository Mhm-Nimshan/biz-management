const db = require('../config/database');

const setupDatabase = async () => {
  try {
    // Employees table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS employees (
        id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id VARCHAR(50) UNIQUE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        department VARCHAR(100),
        position VARCHAR(100),
        role ENUM('admin', 'manager', 'salesman', 'employee') DEFAULT 'employee',
        salary DECIMAL(12,2),
        commission_rate DECIMAL(5,2) DEFAULT 0.00,
        hire_date DATE,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Products table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INT PRIMARY KEY AUTO_INCREMENT,
        sku VARCHAR(100) UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        price DECIMAL(10,2),
        cost_price DECIMAL(10,2),
        selling_price DECIMAL(10,2),
        stock_quantity INT DEFAULT 0,
        current_stock INT DEFAULT 0,
        min_stock_level INT DEFAULT 5,
        supplier_id INT,
        supplier VARCHAR(255),
        image_url VARCHAR(500),
        qr_code TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Customers table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        zip_code VARCHAR(20),
        country VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Sales table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sales (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_name VARCHAR(255),
        customer_email VARCHAR(255),
        customer_phone VARCHAR(20),
        employee_id INT,
        total_amount DECIMAL(12,2) NOT NULL,
        discount_amount DECIMAL(12,2) DEFAULT 0,
        tax_amount DECIMAL(12,2) DEFAULT 0,
        payment_method ENUM('cash', 'card', 'bank_transfer', 'check') DEFAULT 'cash',
        card_last_four VARCHAR(4),
        card_type VARCHAR(50),
        status ENUM('pending', 'completed', 'cancelled') DEFAULT 'completed',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
      )
    `);

    // Sale items table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        sale_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    // Invoices table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INT PRIMARY KEY AUTO_INCREMENT,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id INT NOT NULL,
        salesman_id INT,
        subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
        tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        status ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
        due_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
        FOREIGN KEY (salesman_id) REFERENCES employees(id) ON DELETE SET NULL,
        INDEX idx_invoice_number (invoice_number),
        INDEX idx_customer_id (customer_id),
        INDEX idx_salesman_id (salesman_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      )
    `);

    // Invoice items table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        invoice_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
        INDEX idx_invoice_id (invoice_id),
        INDEX idx_product_id (product_id),
        CONSTRAINT chk_quantity CHECK (quantity > 0),
        CONSTRAINT chk_unit_price CHECK (unit_price >= 0),
        CONSTRAINT chk_total_price CHECK (total_price >= 0)
      )
    `);

    // Vendors table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS vendors (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        zip_code VARCHAR(20),
        country VARCHAR(100),
        contact_person VARCHAR(255),
        payment_terms VARCHAR(100),
        tax_id VARCHAR(100),
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Purchases table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS purchases (
        id INT PRIMARY KEY AUTO_INCREMENT,
        purchase_number VARCHAR(50) UNIQUE NOT NULL,
        vendor_id INT,
        employee_id INT,
        subtotal DECIMAL(12,2) NOT NULL,
        tax_amount DECIMAL(12,2) DEFAULT 0,
        discount_amount DECIMAL(12,2) DEFAULT 0,
        total_amount DECIMAL(12,2) NOT NULL,
        status ENUM('pending', 'received', 'cancelled') DEFAULT 'pending',
        purchase_date DATE,
        expected_delivery_date DATE,
        received_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
      )
    `);

    // Purchase items table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS purchase_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        purchase_id INT NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        unit_cost DECIMAL(10,2) NOT NULL,
        total_cost DECIMAL(10,2) NOT NULL,
        received_quantity INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
      )
    `);

    // Accounts table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        account_name VARCHAR(255) NOT NULL,
        account_type ENUM('asset', 'liability', 'equity', 'income', 'expense') NOT NULL,
        description TEXT,
        opening_balance DECIMAL(12,2) DEFAULT 0,
        current_balance DECIMAL(12,2) DEFAULT 0,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Daybook entries table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS daybook_entries (
        id INT PRIMARY KEY AUTO_INCREMENT,
        entry_date DATE NOT NULL,
        entry_type ENUM('income', 'expense') NOT NULL,
        account_id INT,
        amount DECIMAL(12,2) NOT NULL,
        payment_method ENUM('cash', 'bank', 'card', 'cheque', 'online') DEFAULT 'cash',
        reference_number VARCHAR(100),
        description TEXT,
        notes TEXT,
        source_type VARCHAR(50),
        customer_name VARCHAR(255),
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
      )
    `);

    // Bank Accounts table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        account_name VARCHAR(255) NOT NULL,
        account_number VARCHAR(100) UNIQUE NOT NULL,
        bank_name VARCHAR(255) NOT NULL,
        branch_name VARCHAR(255),
        account_type ENUM('savings', 'current', 'business', 'other') DEFAULT 'current',
        opening_balance DECIMAL(12,2) DEFAULT 0,
        current_balance DECIMAL(12,2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'USD',
        status ENUM('active', 'inactive', 'closed') DEFAULT 'active',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_account_number (account_number),
        INDEX idx_status (status)
      )
    `);

    // Bank Transactions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS bank_transactions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        bank_account_id INT NOT NULL,
        transaction_type ENUM('deposit', 'withdrawal', 'cheque_deposit', 'cheque_return', 'transfer', 'fee') NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        balance_before DECIMAL(12,2) NOT NULL,
        balance_after DECIMAL(12,2) NOT NULL,
        transaction_date DATE NOT NULL,
        value_date DATE,
        reference_number VARCHAR(100),
        description TEXT,
        related_invoice_id INT,
        related_cheque_id INT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE RESTRICT,
        FOREIGN KEY (related_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL,
        INDEX idx_bank_account (bank_account_id),
        INDEX idx_transaction_date (transaction_date),
        INDEX idx_transaction_type (transaction_type)
      )
    `);

    // Payment Cheques table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS payment_cheques (
        id INT PRIMARY KEY AUTO_INCREMENT,
        cheque_number VARCHAR(100) NOT NULL,
        invoice_id INT NOT NULL,
        bank_account_id INT NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        cheque_date DATE NOT NULL,
        received_date DATE NOT NULL,
        deposited_date DATE,
        cleared_date DATE,
        status ENUM('pending', 'deposited', 'on_hold', 'cleared', 'returned', 'cancelled') DEFAULT 'pending',
        return_reason TEXT,
        payer_name VARCHAR(255),
        payer_bank VARCHAR(255),
        payer_account VARCHAR(100),
        notes TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
        FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL,
        INDEX idx_cheque_number (cheque_number),
        INDEX idx_invoice_id (invoice_id),
        INDEX idx_bank_account_id (bank_account_id),
        INDEX idx_status (status),
        INDEX idx_cheque_date (cheque_date)
      )
    `);

    // Invoice Payments table (to track payment methods for invoices)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS invoice_payments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        invoice_id INT,
        customer_id INT,
        payment_type ENUM('cash', 'cheque', 'bank_transfer', 'card', 'other') NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        payment_date DATE NOT NULL,
        bank_account_id INT,
        cheque_id INT,
        reference_number VARCHAR(100),
        notes TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL,
        FOREIGN KEY (cheque_id) REFERENCES payment_cheques(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL,
        INDEX idx_invoice_id (invoice_id),
        INDEX idx_customer_id (customer_id),
        INDEX idx_payment_type (payment_type),
        CHECK (invoice_id IS NOT NULL OR customer_id IS NOT NULL)
      )
    `);
    
    console.log('✅ All database tables created successfully');
    console.log('📊 Database setup completed!\n');
  } catch (error) {
    console.error('\n❌ Error setting up database:');
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Access Denied - Check your database credentials in .env file');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Connection Refused - MySQL server is not running or not accessible');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Database does not exist - Create it in cPanel/phpMyAdmin first');
    }
    
    console.error('\n🔧 To diagnose: npm run test-db\n');
    throw error;
  }
};

// Run setup if called directly
if (require.main === module) {
  console.log('🚀 Starting database setup...\n');
  setupDatabase()
    .then(() => {
      console.log('✅ Database setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = setupDatabase;