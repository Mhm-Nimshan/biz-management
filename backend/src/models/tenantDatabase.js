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

    const dbName = `biz_${tenantSlug}`;
    
    // Create database
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    
    console.log(`Database ${dbName} created successfully`);

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
    await setupTenantTables(connection);
    
    console.log(`All tables created for tenant database: ${dbName}`);
    
    return dbName;
  } catch (error) {
    console.error('Error creating tenant database:', error);
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
      supplier VARCHAR(255),
      image_url VARCHAR(500),
      qr_code TEXT,
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    -- Invoices table
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

