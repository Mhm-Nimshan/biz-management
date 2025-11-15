const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Creates a new database for a tenant and sets up all necessary tables
 */
const createTenantDatabase = async (tenantSlug) => {
  let connection;
  
  try {
    // Connect to MySQL server (without database)
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: true
    });

    const dbName = `nimsleas_${tenantSlug}`;
    
    console.log(`Creating database: ${dbName}`);
    
    // Create database with proper character set
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Database ${dbName} created successfully`);

    // Grant privileges to the user for the new database
    try {
      await connection.query(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO ?@?`, [process.env.DB_USER, process.env.DB_HOST || 'localhost']);
      await connection.query('FLUSH PRIVILEGES');
      console.log(`✅ Granted privileges to user for database: ${dbName}`);
    } catch (grantError) {
      console.warn(`⚠️  Warning: Could not grant privileges automatically: ${grantError.message}`);
      console.warn('💡 You may need to manually allocate the user in cPanel');
    }

    // Close connection and reconnect to the new database
    await connection.end();
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: dbName,
      multipleStatements: true
    });

    // Create all tenant-specific tables
    console.log(`Creating tables for database: ${dbName}`);
    await setupTenantTables(connection);
    
    console.log(`✅ All tables created for tenant database: ${dbName}`);
    
    return dbName;
  } catch (error) {
    console.error('❌ Error creating tenant database:', error);
    
    // Provide specific guidance for cPanel users
    if (error.code === 'ER_DBACCESS_DENIED_ERROR') {
      console.error('\n💡 cPanel Solution:');
      console.error('1. Go to cPanel > MySQL Databases');
      console.error('2. Create a new database manually');
      console.error('3. Add the user "nimsleas_bizmanager_main" to the database');
      console.error('4. Grant "All Privileges" to the user');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Permission Error:');
      console.error('1. Check if the user has CREATE privilege');
      console.error('2. Run: node src/scripts/setup-database-permissions.js');
    }
    
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

/**
 * Sets up all necessary tables for a tenant database
 */
const setupTenantTables = async (connection) => {
  const tableQueries = `
    -- Employees table
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
    );

    -- Customers table
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
      opening_balance DECIMAL(12,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    -- Vendors table
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
      opening_balance DECIMAL(12,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    -- Products table
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
      vendor_id INT,
      supplier VARCHAR(255),
      image_url VARCHAR(500),
      qr_code TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
    );

    -- Invoices table
    CREATE TABLE IF NOT EXISTS invoices (
      id INT PRIMARY KEY AUTO_INCREMENT,
      invoice_number VARCHAR(50) UNIQUE NOT NULL,
      customer_id INT NOT NULL,
      salesman_id INT,
      subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
      tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      tax_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
      invoice_date DATE NOT NULL,
      discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      status ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
      due_date DATE NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
      FOREIGN KEY (salesman_id) REFERENCES employees(id) ON DELETE SET NULL,
      INDEX idx_invoice_number (invoice_number),
      INDEX idx_customer_id (customer_id)
    );

    -- Invoice items table
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INT PRIMARY KEY AUTO_INCREMENT,
      invoice_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity DECIMAL(10,2) NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      total_price DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );

    -- Sales table
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
    );

    -- Sale items table
    CREATE TABLE IF NOT EXISTS sale_items (
      id INT PRIMARY KEY AUTO_INCREMENT,
      sale_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- Purchases table
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
    );

    -- Purchase items table
    CREATE TABLE IF NOT EXISTS purchase_items (
      id INT PRIMARY KEY AUTO_INCREMENT,
      purchase_id INT NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      quantity INT NOT NULL,
      unit_cost DECIMAL(10,2) NOT NULL,
      total_cost DECIMAL(10,2) NOT NULL,
      received_quantity INT DEFAULT 0,
      item_type ENUM('raw_material', 'product') DEFAULT 'raw_material',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
    );

    -- Accounts table
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
    );

    -- Daybook entries table
    CREATE TABLE IF NOT EXISTS daybook_entries (
      id INT PRIMARY KEY AUTO_INCREMENT,
      entry_date DATE NOT NULL,
      entry_type ENUM('income', 'expense') NOT NULL,
      account_id INT,
      amount DECIMAL(12,2) NOT NULL,
      payment_method ENUM('cash', 'bank', 'card', 'cheque', 'online') DEFAULT 'cash',
      reference_number VARCHAR(100),
      category VARCHAR(100),
      description TEXT,
      notes TEXT,
      source_type VARCHAR(50),
      customer_name VARCHAR(255),
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
    );

    -- Daybook categories table
    CREATE TABLE IF NOT EXISTS daybook_categories (
            id INT PRIMARY KEY AUTO_INCREMENT, 
            name VARCHAR(100) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_name (name)
          );

    -- Bank Accounts table
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
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    -- Bank Transactions table
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
      FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
    );

    -- Payment Cheques table
    CREATE TABLE IF NOT EXISTS payment_cheques (
      id INT PRIMARY KEY AUTO_INCREMENT,
      cheque_number VARCHAR(100) NOT NULL,
      cheque_type ENUM('account_pay', 'cash') DEFAULT 'account_pay',
      invoice_id INT NOT NULL,
      bank_account_id INT NULL,
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
      FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
    );

    -- Invoice Payments table
    CREATE TABLE IF NOT EXISTS invoice_payments (
      id INT PRIMARY KEY AUTO_INCREMENT,
      invoice_id INT,
      customer_id INT,
      payment_type ENUM('cash', 'cheque', 'bank_transfer', 'card', 'other') NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      payment_date DATE NOT NULL,
      bank_account_id INT NULL,
      cheque_id INT NULL,
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
      CHECK (invoice_id IS NOT NULL OR customer_id IS NOT NULL)
    );

    -- Employee Leaves table
    CREATE TABLE IF NOT EXISTS employee_leaves (
      id INT PRIMARY KEY AUTO_INCREMENT,
      employee_id INT NOT NULL,
      leave_type ENUM('annual', 'sick', 'casual', 'no_pay', 'maternity', 'other') NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      days_count INT NOT NULL,
      reason TEXT,
      status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
      approved_by INT,
      approved_date DATETIME,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (approved_by) REFERENCES employees(id) ON DELETE SET NULL,
      INDEX idx_employee_id (employee_id),
      INDEX idx_status (status),
      INDEX idx_leave_dates (start_date, end_date)
    );

    -- Employee Leave Balance table
    CREATE TABLE IF NOT EXISTS employee_leave_balance (
      id INT PRIMARY KEY AUTO_INCREMENT,
      employee_id INT NOT NULL,
      year INT NOT NULL,
      annual_leave_total INT DEFAULT 14,
      annual_leave_used INT DEFAULT 0,
      annual_leave_balance INT DEFAULT 14,
      sick_leave_total INT DEFAULT 7,
      sick_leave_used INT DEFAULT 0,
      sick_leave_balance INT DEFAULT 7,
      casual_leave_total INT DEFAULT 7,
      casual_leave_used INT DEFAULT 0,
      casual_leave_balance INT DEFAULT 7,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      UNIQUE KEY unique_employee_year (employee_id, year),
      INDEX idx_employee_year (employee_id, year)
    );

    -- Employee Commissions table
    CREATE TABLE IF NOT EXISTS employee_commissions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      employee_id INT NOT NULL,
      invoice_id INT,
      sale_amount DECIMAL(12,2) NOT NULL,
      commission_rate DECIMAL(5,2) NOT NULL,
      commission_amount DECIMAL(12,2) NOT NULL,
      commission_date DATE NOT NULL,
      status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
      paid_in_payslip_id INT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
      INDEX idx_employee_id (employee_id),
      INDEX idx_status (status),
      INDEX idx_commission_date (commission_date)
    );

    -- Payroll/Salary Processing table
    CREATE TABLE IF NOT EXISTS payroll (
      id INT PRIMARY KEY AUTO_INCREMENT,
      employee_id INT NOT NULL,
      pay_period_start DATE NOT NULL,
      pay_period_end DATE NOT NULL,
      pay_date DATE NOT NULL,
      basic_salary DECIMAL(12,2) NOT NULL,
      commission_amount DECIMAL(12,2) DEFAULT 0,
      allowances DECIMAL(12,2) DEFAULT 0,
      gross_salary DECIMAL(12,2) NOT NULL,
      epf_employee DECIMAL(12,2) NOT NULL,
      epf_employer DECIMAL(12,2) NOT NULL,
      etf_employer DECIMAL(12,2) NOT NULL,
      total_deductions DECIMAL(12,2) NOT NULL,
      net_salary DECIMAL(12,2) NOT NULL,
      no_pay_days INT DEFAULT 0,
      no_pay_deduction DECIMAL(12,2) DEFAULT 0,
      status ENUM('draft', 'processed', 'paid', 'cancelled') DEFAULT 'draft',
      processed_by INT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (processed_by) REFERENCES employees(id) ON DELETE SET NULL,
      INDEX idx_employee_id (employee_id),
      INDEX idx_pay_period (pay_period_start, pay_period_end),
      INDEX idx_status (status),
      UNIQUE KEY unique_employee_period (employee_id, pay_period_start, pay_period_end)
    );

    -- Payslips table (detailed breakdown)
    CREATE TABLE IF NOT EXISTS payslips (
      id INT PRIMARY KEY AUTO_INCREMENT,
      payroll_id INT NOT NULL,
      employee_id INT NOT NULL,
      payslip_number VARCHAR(50) UNIQUE NOT NULL,
      issue_date DATE NOT NULL,
      pay_period VARCHAR(50) NOT NULL,
      
      basic_salary DECIMAL(12,2) NOT NULL,
      commission DECIMAL(12,2) DEFAULT 0,
      allowances DECIMAL(12,2) DEFAULT 0,
      overtime DECIMAL(12,2) DEFAULT 0,
      bonus DECIMAL(12,2) DEFAULT 0,
      
      gross_salary DECIMAL(12,2) NOT NULL,
      
      epf_employee_8 DECIMAL(12,2) NOT NULL,
      epf_employer_12 DECIMAL(12,2) NOT NULL,
      etf_employer_3 DECIMAL(12,2) NOT NULL,
      tax_deduction DECIMAL(12,2) DEFAULT 0,
      other_deductions DECIMAL(12,2) DEFAULT 0,
      no_pay_deduction DECIMAL(12,2) DEFAULT 0,
      
      total_deductions DECIMAL(12,2) NOT NULL,
      net_salary DECIMAL(12,2) NOT NULL,
      
      working_days INT NOT NULL,
      worked_days DECIMAL(5,2) NOT NULL,
      no_pay_days INT DEFAULT 0,
      
      pdf_path VARCHAR(255),
      status ENUM('generated', 'sent', 'received') DEFAULT 'generated',
      
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (payroll_id) REFERENCES payroll(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      INDEX idx_payroll_id (payroll_id),
      INDEX idx_employee_id (employee_id),
      INDEX idx_issue_date (issue_date)
    );

    -- Salary Advance table
    CREATE TABLE IF NOT EXISTS salary_advances (
      id INT PRIMARY KEY AUTO_INCREMENT,
      employee_id INT NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      request_date DATE NOT NULL,
      approved_date DATE,
      approved_by INT,
      status ENUM('pending', 'approved', 'rejected', 'paid', 'recovered') DEFAULT 'pending',
      recovery_start_date DATE,
      monthly_recovery_amount DECIMAL(12,2),
      recovered_amount DECIMAL(12,2) DEFAULT 0,
      remaining_amount DECIMAL(12,2),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (approved_by) REFERENCES employees(id) ON DELETE SET NULL,
      INDEX idx_employee_id (employee_id),
      INDEX idx_status (status)
    );

    -- Issued Cheques table
          CREATE TABLE IF NOT EXISTS issued_cheques (
            id INT PRIMARY KEY AUTO_INCREMENT,
            cheque_number VARCHAR(100) NOT NULL,
            cheque_type ENUM('account_pay', 'cash') DEFAULT 'account_pay',
            bank_account_id INT NOT NULL,
            vendor_id INT NULL,
            customer_id INT NULL,
            amount DECIMAL(12,2) NOT NULL,
            cheque_date DATE NOT NULL,
            issue_date DATE NOT NULL,
            payee_name VARCHAR(255) NOT NULL,
            payee_bank VARCHAR(255),
            payee_account VARCHAR(100),
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
          );

          CREATE TABLE IF NOT EXISTS issued_cheque_items (
            id INT PRIMARY KEY AUTO_INCREMENT,
            issued_cheque_id INT NOT NULL,
            cheque_type ENUM('account_pay', 'cash') DEFAULT 'account_pay',
            cheque_number VARCHAR(100) NOT NULL,
            cheque_date DATE NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            payee_bank VARCHAR(255),
            payee_account VARCHAR(100),
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
          );

    -- Party Cheques table
    CREATE TABLE IF NOT EXISTS party_cheques (
      id INT PRIMARY KEY AUTO_INCREMENT,
      cheque_number VARCHAR(100) NOT NULL,
      cheque_type ENUM('account_pay', 'cash') DEFAULT 'account_pay',
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
    );

    -- Manufacturing Units table
    CREATE TABLE IF NOT EXISTS manufacturing_units (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      location VARCHAR(255),
      capacity INT DEFAULT 0,
      status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    -- Manufacturing Products table
    CREATE TABLE IF NOT EXISTS manufacturing_products (
      id INT PRIMARY KEY AUTO_INCREMENT,
      product_name VARCHAR(255) NOT NULL,
      product_sku VARCHAR(100) UNIQUE,
      description TEXT,
      category VARCHAR(100),
      manufacturing_unit_id INT,
      final_cost DECIMAL(10,2) NOT NULL,
      selling_price DECIMAL(10,2),
      status ENUM('active', 'inactive', 'discontinued') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (manufacturing_unit_id) REFERENCES manufacturing_units(id) ON DELETE SET NULL,
      INDEX idx_product_sku (product_sku),
      INDEX idx_manufacturing_unit_id (manufacturing_unit_id),
      INDEX idx_status (status)
    );

    -- Manufacturing Process table
    CREATE TABLE IF NOT EXISTS manufacturing_processes (
      id INT PRIMARY KEY AUTO_INCREMENT,
      manufacturing_product_id INT NOT NULL,
      process_name VARCHAR(255) NOT NULL,
      process_order INT NOT NULL,
      description TEXT,
      estimated_duration_hours DECIMAL(5,2) DEFAULT 0,
      required_equipment TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (manufacturing_product_id) REFERENCES manufacturing_products(id) ON DELETE CASCADE,
      INDEX idx_manufacturing_product_id (manufacturing_product_id),
      INDEX idx_process_order (process_order)
    );

    -- Manufacturing Raw Materials table
    CREATE TABLE IF NOT EXISTS manufacturing_raw_materials (
      id INT PRIMARY KEY AUTO_INCREMENT,
      manufacturing_product_id INT NOT NULL,
      purchase_item_id INT,
      product_name VARCHAR(255) NOT NULL,
      quantity_required DECIMAL(10,2) NOT NULL,
      unit_of_measure VARCHAR(50) DEFAULT 'pieces',
      unit_cost DECIMAL(10,2) NOT NULL,
      total_cost DECIMAL(10,2) NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (manufacturing_product_id) REFERENCES manufacturing_products(id) ON DELETE CASCADE,
      FOREIGN KEY (purchase_item_id) REFERENCES purchase_items(id) ON DELETE SET NULL,
      INDEX idx_manufacturing_product_id (manufacturing_product_id),
      INDEX idx_purchase_item_id (purchase_item_id)
    );

    -- Manufacturing Orders table
    CREATE TABLE IF NOT EXISTS manufacturing_orders (
      id INT PRIMARY KEY AUTO_INCREMENT,
      order_number VARCHAR(50) UNIQUE NOT NULL,
      manufacturing_product_id INT NOT NULL,
      quantity_to_produce INT NOT NULL,
      status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
      start_date DATE,
      expected_completion_date DATE,
      actual_completion_date DATE,
      total_cost DECIMAL(12,2) NOT NULL,
      notes TEXT,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (manufacturing_product_id) REFERENCES manufacturing_products(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL,
      INDEX idx_order_number (order_number),
      INDEX idx_manufacturing_product_id (manufacturing_product_id),
      INDEX idx_status (status)
    );

    -- Create invoice_returns table
CREATE TABLE IF NOT EXISTS invoice_returns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NULL,
  customer_id INT NOT NULL,
  return_number VARCHAR(50) NOT NULL UNIQUE,
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  return_reason VARCHAR(100) NOT NULL,
  return_date DATE NOT NULL,
  notes TEXT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_customer_id (customer_id),
  INDEX idx_invoice_id (invoice_id),
  INDEX idx_return_date (return_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create invoice_return_items table
CREATE TABLE IF NOT EXISTS invoice_return_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  return_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (return_id) REFERENCES invoice_returns(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  INDEX idx_return_id (return_id),
  INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create purchase_returns table
CREATE TABLE IF NOT EXISTS purchase_returns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_id INT NULL,
  vendor_id INT NOT NULL,
  return_number VARCHAR(50) NOT NULL UNIQUE,
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  return_reason VARCHAR(100) NOT NULL,
  return_date DATE NOT NULL,
  notes TEXT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  INDEX idx_vendor_id (vendor_id),
  INDEX idx_purchase_id (purchase_id),
  INDEX idx_return_date (return_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create purchase_return_items table
CREATE TABLE IF NOT EXISTS purchase_return_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  return_id INT NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  unit_cost DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (return_id) REFERENCES purchase_returns(id) ON DELETE CASCADE,
  INDEX idx_return_id (return_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    -- Users table (System users for login and access control)
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('system_admin', 'admin', 'user') DEFAULT 'user',
      status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      last_login DATETIME,
      INDEX idx_email (email),
      INDEX idx_username (username),
      INDEX idx_role (role),
      INDEX idx_status (status)
    );

    -- Menu Permissions table (Menu visibility control for each user - similar to tenant menu permissions)
    CREATE TABLE IF NOT EXISTS menu_permissions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      menu_key VARCHAR(100) NOT NULL,
      is_visible BOOLEAN DEFAULT TRUE,
      display_order INT DEFAULT 0,
      custom_label VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_menu (user_id, menu_key),
      INDEX idx_user_id (user_id),
      INDEX idx_menu_key (menu_key)
    );

    -- Vendor Cash Payments table
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
          );

    -- ========== HOTEL MANAGEMENT TABLES ==========
    
    -- Rooms table
    CREATE TABLE IF NOT EXISTS hotel_rooms (
      id INT PRIMARY KEY AUTO_INCREMENT,
      room_number VARCHAR(50) UNIQUE NOT NULL,
      room_type VARCHAR(100) NOT NULL,
      floor_number INT,
      bed_count INT NOT NULL DEFAULT 1,
      max_occupancy INT NOT NULL DEFAULT 1,
      amenities JSON,
      status ENUM('clean', 'dirty', 'occupied', 'out_of_order', 'maintenance') DEFAULT 'clean',
      rate_per_night DECIMAL(10,2) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_room_number (room_number),
      INDEX idx_status (status),
      INDEX idx_room_type (room_type)
    );

    -- Guests table (extended customer profile for hotel)
    CREATE TABLE IF NOT EXISTS hotel_guests (
      id INT PRIMARY KEY AUTO_INCREMENT,
      customer_id INT,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(20),
      id_type ENUM('passport', 'national_id', 'driving_license', 'other') DEFAULT 'national_id',
      id_number VARCHAR(100),
      nationality VARCHAR(100),
      address TEXT,
      city VARCHAR(100),
      country VARCHAR(100),
      preferences JSON,
      special_requests TEXT,
      stay_history_count INT DEFAULT 0,
      total_nights INT DEFAULT 0,
      loyalty_points INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
      INDEX idx_email (email),
      INDEX idx_phone (phone),
      INDEX idx_id_number (id_number)
    );

    -- Reservations table
    CREATE TABLE IF NOT EXISTS hotel_reservations (
      id INT PRIMARY KEY AUTO_INCREMENT,
      reservation_number VARCHAR(50) UNIQUE NOT NULL,
      guest_id INT NOT NULL,
      room_id INT,
      check_in_date DATE NOT NULL,
      check_out_date DATE NOT NULL,
      nights_count INT NOT NULL,
      adults_count INT NOT NULL DEFAULT 1,
      children_count INT DEFAULT 0,
      rate_plan ENUM('standard', 'non_refundable', 'corporate', 'promotional', 'package') DEFAULT 'standard',
      base_rate DECIMAL(10,2) NOT NULL,
      discount_amount DECIMAL(10,2) DEFAULT 0,
      tax_amount DECIMAL(10,2) DEFAULT 0,
      total_amount DECIMAL(10,2) NOT NULL,
      status ENUM('confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show') DEFAULT 'confirmed',
      booking_source ENUM('walk_in', 'online', 'phone', 'ota', 'corporate', 'other') DEFAULT 'walk_in',
      special_requests TEXT,
      notes TEXT,
      cancellation_reason TEXT,
      cancelled_at DATETIME,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (guest_id) REFERENCES hotel_guests(id) ON DELETE RESTRICT,
      FOREIGN KEY (room_id) REFERENCES hotel_rooms(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL,
      INDEX idx_reservation_number (reservation_number),
      INDEX idx_guest_id (guest_id),
      INDEX idx_room_id (room_id),
      INDEX idx_check_in_date (check_in_date),
      INDEX idx_check_out_date (check_out_date),
      INDEX idx_status (status),
      INDEX idx_dates (check_in_date, check_out_date)
    );

    -- Waitlist table
    CREATE TABLE IF NOT EXISTS hotel_waitlist (
      id INT PRIMARY KEY AUTO_INCREMENT,
      guest_id INT NOT NULL,
      check_in_date DATE NOT NULL,
      check_out_date DATE NOT NULL,
      adults_count INT NOT NULL DEFAULT 1,
      children_count INT DEFAULT 0,
      preferred_room_type VARCHAR(100),
      status ENUM('active', 'notified', 'converted', 'cancelled') DEFAULT 'active',
      priority INT DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (guest_id) REFERENCES hotel_guests(id) ON DELETE RESTRICT,
      INDEX idx_guest_id (guest_id),
      INDEX idx_dates (check_in_date, check_out_date),
      INDEX idx_status (status)
    );

    -- Reservation Payments table
    CREATE TABLE IF NOT EXISTS hotel_reservation_payments (
      id INT PRIMARY KEY AUTO_INCREMENT,
      reservation_id INT NOT NULL,
      guest_id INT NOT NULL,
      payment_type ENUM('credit_card', 'debit_card', 'cash', 'mobile_wallet', 'virtual_wallet', 'bank_transfer') NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      payment_date DATETIME NOT NULL,
      transaction_id VARCHAR(255),
      payment_method_token VARCHAR(255),
      authorization_code VARCHAR(100),
      status ENUM('pending', 'authorized', 'captured', 'failed', 'refunded') DEFAULT 'pending',
      is_incidental_hold BOOLEAN DEFAULT FALSE,
      bank_account_id INT,
      reference_number VARCHAR(100),
      notes TEXT,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (reservation_id) REFERENCES hotel_reservations(id) ON DELETE RESTRICT,
      FOREIGN KEY (guest_id) REFERENCES hotel_guests(id) ON DELETE RESTRICT,
      FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL,
      INDEX idx_reservation_id (reservation_id),
      INDEX idx_guest_id (guest_id),
      INDEX idx_payment_date (payment_date),
      INDEX idx_status (status)
    );

    -- Rate Plans table
    CREATE TABLE IF NOT EXISTS hotel_rate_plans (
      id INT PRIMARY KEY AUTO_INCREMENT,
      plan_name VARCHAR(100) NOT NULL,
      plan_type ENUM('standard', 'non_refundable', 'corporate', 'promotional', 'package') NOT NULL,
      base_rate DECIMAL(10,2) NOT NULL,
      room_type VARCHAR(100),
      min_length_of_stay INT DEFAULT 1,
      max_length_of_stay INT,
      close_to_arrival_restriction INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      valid_from DATE,
      valid_to DATE,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_plan_type (plan_type),
      INDEX idx_room_type (room_type),
      INDEX idx_valid_dates (valid_from, valid_to)
    );

    -- Dynamic Rates table (for date-specific rate overrides)
    CREATE TABLE IF NOT EXISTS hotel_dynamic_rates (
      id INT PRIMARY KEY AUTO_INCREMENT,
      room_id INT,
      room_type VARCHAR(100),
      rate_date DATE NOT NULL,
      base_rate DECIMAL(10,2) NOT NULL,
      demand_multiplier DECIMAL(5,2) DEFAULT 1.00,
      seasonal_adjustment DECIMAL(5,2) DEFAULT 0.00,
      day_of_week_adjustment DECIMAL(5,2) DEFAULT 0.00,
      competitor_rate DECIMAL(10,2),
      final_rate DECIMAL(10,2) NOT NULL,
      is_manual_override BOOLEAN DEFAULT FALSE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES hotel_rooms(id) ON DELETE CASCADE,
      UNIQUE KEY unique_room_date (room_id, rate_date),
      INDEX idx_rate_date (rate_date),
      INDEX idx_room_type (room_type)
    );

    -- Promotions table
    CREATE TABLE IF NOT EXISTS hotel_promotions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      promotion_name VARCHAR(255) NOT NULL,
      promotion_type ENUM('discount', 'package', 'stay_nights_get_free', 'percentage_off') NOT NULL,
      discount_percentage DECIMAL(5,2),
      discount_amount DECIMAL(10,2),
      stay_nights_required INT,
      free_nights_granted INT,
      valid_from DATE NOT NULL,
      valid_to DATE NOT NULL,
      min_length_of_stay INT DEFAULT 1,
      applicable_room_types JSON,
      is_active BOOLEAN DEFAULT TRUE,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_valid_dates (valid_from, valid_to),
      INDEX idx_is_active (is_active)
    );

    -- Revenue Management KPIs table (for tracking)
    CREATE TABLE IF NOT EXISTS hotel_revenue_kpis (
      id INT PRIMARY KEY AUTO_INCREMENT,
      report_date DATE NOT NULL,
      total_rooms INT NOT NULL,
      occupied_rooms INT NOT NULL,
      occupancy_percentage DECIMAL(5,2) NOT NULL,
      average_daily_rate DECIMAL(10,2) NOT NULL,
      revenue_per_available_room DECIMAL(10,2) NOT NULL,
      total_revenue DECIMAL(12,2) NOT NULL,
      forecasted_demand INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_date (report_date),
      INDEX idx_report_date (report_date)
    );

    -- Channel Manager Integration table
    CREATE TABLE IF NOT EXISTS hotel_channel_integrations (
      id INT PRIMARY KEY AUTO_INCREMENT,
      channel_name VARCHAR(100) NOT NULL,
      channel_type ENUM('siteminder', 'cloudbeds', 'booking_com', 'expedia', 'other') NOT NULL,
      api_key VARCHAR(255),
      api_secret VARCHAR(255),
      is_active BOOLEAN DEFAULT FALSE,
      last_sync_at DATETIME,
      sync_frequency INT DEFAULT 15,
      settings JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_channel_name (channel_name),
      INDEX idx_is_active (is_active)
    );

  `;

  await connection.query(tableQueries);
};

/**
 * Drops a tenant database (use with caution!)
 */
const dropTenantDatabase = async (databaseName) => {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    await connection.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
    console.log(`Database ${databaseName} dropped successfully`);
  } catch (error) {
    console.error('Error dropping tenant database:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

module.exports = {
  createTenantDatabase,
  setupTenantTables,
  dropTenantDatabase
};

