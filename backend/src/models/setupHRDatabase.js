const db = require('../config/database');

const setupHRDatabase = async () => {
  try {
    // Employee Leaves table
    await db.execute(`
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
      )
    `);

    // Employee Leave Balance table
    await db.execute(`
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
      )
    `);

    // Employee Commissions table
    await db.execute(`
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
      )
    `);

    // Payroll/Salary Processing table
    await db.execute(`
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
      )
    `);

    // Payslips table (detailed breakdown)
    await db.execute(`
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
      )
    `);

    // Salary Advance table
    await db.execute(`
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
      )
    `);

    console.log('HR Database tables created successfully');
  } catch (error) {
    console.error('HR Database setup error:', error);
    throw error;
  }
};

module.exports = setupHRDatabase;

