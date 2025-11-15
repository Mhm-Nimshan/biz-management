// ========== LEAVE MANAGEMENT ==========

// Apply for leave
exports.applyLeave = async (req, res) => {
  const connection = await req.req.db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { employee_id, leave_type, start_date, end_date, days_count, reason } = req.body;

    // Check leave balance
    const year = new Date(start_date).getFullYear();
    const [balance] = await connection.execute(
      'SELECT * FROM employee_leave_balance WHERE employee_id = ? AND year = ?',
      [employee_id, year]
    );

    if (balance.length === 0) {
      // Initialize leave balance for the year
      await connection.execute(
        `INSERT INTO employee_leave_balance (employee_id, year) VALUES (?, ?)`,
        [employee_id, year]
      );
    }

    const leaveBalance = balance[0] || {
      annual_leave_balance: 14,
      sick_leave_balance: 7,
      casual_leave_balance: 7
    };

    // Check if enough balance
    if (leave_type === 'annual' && days_count > leaveBalance.annual_leave_balance) {
      await connection.rollback();
      return res.status(400).json({ error: 'Insufficient annual leave balance' });
    }
    if (leave_type === 'sick' && days_count > leaveBalance.sick_leave_balance) {
      await connection.rollback();
      return res.status(400).json({ error: 'Insufficient sick leave balance' });
    }
    if (leave_type === 'casual' && days_count > leaveBalance.casual_leave_balance) {
      await connection.rollback();
      return res.status(400).json({ error: 'Insufficient casual leave balance' });
    }

    // Create leave request
    const [result] = await connection.execute(
      `INSERT INTO employee_leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [employee_id, leave_type, start_date, end_date, days_count, reason]
    );

    await connection.commit();

    res.status(201).json({ 
      message: 'Leave application submitted successfully',
      leaveId: result.insertId 
    });
  } catch (error) {
    await connection.rollback();
    console.error('Apply leave error:', error);
    res.status(500).json({ error: 'Failed to apply for leave' });
  } finally {
    connection.release();
  }
};

// Get employee leaves
exports.getEmployeeLeaves = async (req, res) => {
  try {
    const { employee_id, status, year } = req.query;

    let query = `
      SELECT el.*, 
             CONCAT(e.first_name, ' ', e.last_name) as employee_name,
             CONCAT(a.first_name, ' ', a.last_name) as approved_by_name
      FROM employee_leaves el
      JOIN employees e ON el.employee_id = e.id
      LEFT JOIN employees a ON el.approved_by = a.id
      WHERE 1=1
    `;
    const params = [];

    if (employee_id) {
      query += ' AND el.employee_id = ?';
      params.push(employee_id);
    }

    if (status) {
      query += ' AND el.status = ?';
      params.push(status);
    }

    if (year) {
      query += ' AND YEAR(el.start_date) = ?';
      params.push(year);
    }

    query += ' ORDER BY el.created_at DESC';

    const [leaves] = await req.db.execute(query, params);

    res.json({ leaves });
  } catch (error) {
    console.error('Get leaves error:', error);
    res.status(500).json({ error: 'Failed to fetch leaves' });
  }
};

// Get leave balance
exports.getLeaveBalance = async (req, res) => {
  try {
    const { employee_id, year } = req.query;
    const currentYear = year || new Date().getFullYear();

    let [balance] = await req.db.execute(
      'SELECT * FROM employee_leave_balance WHERE employee_id = ? AND year = ?',
      [employee_id, currentYear]
    );

    if (balance.length === 0) {
      // Create default balance
      await req.db.execute(
        `INSERT INTO employee_leave_balance (employee_id, year) VALUES (?, ?)`,
        [employee_id, currentYear]
      );

      [balance] = await req.db.execute(
        'SELECT * FROM employee_leave_balance WHERE employee_id = ? AND year = ?',
        [employee_id, currentYear]
      );
    }

    res.json({ balance: balance[0] });
  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({ error: 'Failed to fetch leave balance' });
  }
};

// Approve/Reject leave
exports.updateLeaveStatus = async (req, res) => {
  const connection = await req.db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { leaveId } = req.params;
    const { status, approved_by, notes } = req.body;

    // Get leave details
    const [leaves] = await connection.execute(
      'SELECT * FROM employee_leaves WHERE id = ?',
      [leaveId]
    );

    if (leaves.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Leave not found' });
    }

    const leave = leaves[0];

    // Update leave status
    await connection.execute(
      `UPDATE employee_leaves 
       SET status = ?, approved_by = ?, approved_date = NOW(), notes = ?
       WHERE id = ?`,
      [status, approved_by, notes, leaveId]
    );

    // If approved, update leave balance
    if (status === 'approved') {
      const year = new Date(leave.start_date).getFullYear();
      
      let field_used, field_balance;
      if (leave.leave_type === 'annual') {
        field_used = 'annual_leave_used';
        field_balance = 'annual_leave_balance';
      } else if (leave.leave_type === 'sick') {
        field_used = 'sick_leave_used';
        field_balance = 'sick_leave_balance';
      } else if (leave.leave_type === 'casual') {
        field_used = 'casual_leave_used';
        field_balance = 'casual_leave_balance';
      }

      if (field_used) {
        await connection.execute(
          `UPDATE employee_leave_balance 
           SET ${field_used} = ${field_used} + ?,
               ${field_balance} = ${field_balance} - ?
           WHERE employee_id = ? AND year = ?`,
          [leave.days_count, leave.days_count, leave.employee_id, year]
        );
      }
    }

    await connection.commit();

    res.json({ message: `Leave ${status} successfully` });
  } catch (error) {
    await connection.rollback();
    console.error('Update leave status error:', error);
    res.status(500).json({ error: 'Failed to update leave status' });
  } finally {
    connection.release();
  }
};

// ========== COMMISSION MANAGEMENT ==========

// Record commission
exports.recordCommission = async (req, res) => {
  try {
    const { employee_id, invoice_id, sale_amount, commission_rate, commission_date } = req.body;

    const commission_amount = (sale_amount * commission_rate) / 100;

    await req.db.execute(
      `INSERT INTO employee_commissions (employee_id, invoice_id, sale_amount, commission_rate, commission_amount, commission_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [employee_id, invoice_id, sale_amount, commission_rate, commission_amount, commission_date]
    );

    res.status(201).json({ 
      message: 'Commission recorded successfully',
      commission_amount 
    });
  } catch (error) {
    console.error('Record commission error:', error);
    res.status(500).json({ error: 'Failed to record commission' });
  }
};

// Get employee commissions
exports.getEmployeeCommissions = async (req, res) => {
  try {
    const { employee_id, month, year, status } = req.query;

    let query = `
      SELECT ec.*, 
             CONCAT(e.first_name, ' ', e.last_name) as employee_name,
             i.invoice_number
      FROM employee_commissions ec
      JOIN employees e ON ec.employee_id = e.id
      LEFT JOIN invoices i ON ec.invoice_id = i.id
      WHERE 1=1
    `;
    const params = [];

    if (employee_id) {
      query += ' AND ec.employee_id = ?';
      params.push(employee_id);
    }

    if (month && year) {
      query += ' AND MONTH(ec.commission_date) = ? AND YEAR(ec.commission_date) = ?';
      params.push(month, year);
    }

    if (status) {
      query += ' AND ec.status = ?';
      params.push(status);
    }

    query += ' ORDER BY ec.commission_date DESC';

    const [commissions] = await req.db.execute(query, params);

    const total = commissions.reduce((sum, c) => sum + parseFloat(c.commission_amount), 0);

    res.json({ commissions, total });
  } catch (error) {
    console.error('Get commissions error:', error);
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
};

// ========== PAYROLL & SALARY ==========

// Calculate salary (with EPF/ETF)
exports.calculateSalary = async (req, res) => {
  try {
    const { employee_id, pay_period_start, pay_period_end } = req.body;

    // Get employee details
    const [employees] = await req.db.execute(
      'SELECT * FROM employees WHERE id = ?',
      [employee_id]
    );

    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employee = employees[0];
    const basic_salary = parseFloat(employee.salary) || 0;

    // Get pending commissions for the period
    const [commissions] = await req.db.execute(
      `SELECT SUM(commission_amount) as total_commission
       FROM employee_commissions
       WHERE employee_id = ? 
         AND commission_date BETWEEN ? AND ?
         AND status = 'pending'`,
      [employee_id, pay_period_start, pay_period_end]
    );

    const commission_amount = parseFloat(commissions[0]?.total_commission) || 0;

    // Calculate no-pay days
    const [nopay_leaves] = await req.db.execute(
      `SELECT SUM(days_count) as nopay_days
       FROM employee_leaves
       WHERE employee_id = ?
         AND leave_type = 'no_pay'
         AND status = 'approved'
         AND start_date BETWEEN ? AND ?`,
      [employee_id, pay_period_start, pay_period_end]
    );

    const no_pay_days = parseInt(nopay_leaves[0]?.nopay_days) || 0;
    const days_in_month = new Date(pay_period_end).getDate();
    const no_pay_deduction = (basic_salary / days_in_month) * no_pay_days;

    // Calculate gross salary
    const gross_salary = basic_salary + commission_amount - no_pay_deduction;

    // Calculate EPF & ETF
    const epf_employee = gross_salary * 0.08;  // Employee contributes 8%
    const epf_employer = gross_salary * 0.12;  // Employer contributes 12%
    const etf_employer = gross_salary * 0.03;  // Employer contributes 3%

    const total_deductions = epf_employee;
    const net_salary = gross_salary - total_deductions;

    const calculation = {
      employee_id,
      employee_name: `${employee.first_name} ${employee.last_name}`,
      pay_period: `${pay_period_start} to ${pay_period_end}`,
      
      basic_salary: basic_salary.toFixed(2),
      commission_amount: commission_amount.toFixed(2),
      no_pay_days,
      no_pay_deduction: no_pay_deduction.toFixed(2),
      
      gross_salary: gross_salary.toFixed(2),
      
      epf_employee_8: epf_employee.toFixed(2),
      epf_employer_12: epf_employer.toFixed(2),
      etf_employer_3: etf_employer.toFixed(2),
      
      total_deductions: total_deductions.toFixed(2),
      net_salary: net_salary.toFixed(2),
      
      employer_cost: (gross_salary + epf_employer + etf_employer).toFixed(2)
    };

    res.json(calculation);
  } catch (error) {
    console.error('Calculate salary error:', error);
    res.status(500).json({ error: 'Failed to calculate salary' });
  }
};

// Process payroll
exports.processPayroll = async (req, res) => {
  const connection = await req.db.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      employee_id,
      pay_period_start,
      pay_period_end,
      pay_date,
      basic_salary,
      commission_amount,
      allowances,
      gross_salary,
      epf_employee,
      epf_employer,
      etf_employer,
      total_deductions,
      net_salary,
      no_pay_days,
      no_pay_deduction,
      processed_by
    } = req.body;

    // Create payroll record
    const [payrollResult] = await connection.execute(
      `INSERT INTO payroll (
        employee_id, pay_period_start, pay_period_end, pay_date,
        basic_salary, commission_amount, allowances, gross_salary,
        epf_employee, epf_employer, etf_employer,
        total_deductions, net_salary,
        no_pay_days, no_pay_deduction,
        status, processed_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processed', ?)`,
      [
        employee_id, pay_period_start, pay_period_end, pay_date,
        basic_salary, commission_amount, allowances || 0, gross_salary,
        epf_employee, epf_employer, etf_employer,
        total_deductions, net_salary,
        no_pay_days, no_pay_deduction,
        processed_by
      ]
    );

    const payroll_id = payrollResult.insertId;

    // Mark commissions as paid
    await connection.execute(
      `UPDATE employee_commissions 
       SET status = 'paid', paid_in_payslip_id = ?
       WHERE employee_id = ? 
         AND commission_date BETWEEN ? AND ?
         AND status = 'pending'`,
      [payroll_id, employee_id, pay_period_start, pay_period_end]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Payroll processed successfully',
      payroll_id
    });
  } catch (error) {
    await connection.rollback();
    console.error('Process payroll error:', error);
    res.status(500).json({ error: 'Failed to process payroll' });
  } finally {
    connection.release();
  }
};

// Generate payslip
exports.generatePayslip = async (req, res) => {
  const connection = await req.db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { payroll_id } = req.params;

    // Get payroll details
    const [payrolls] = await connection.execute(
      `SELECT p.*, CONCAT(e.first_name, ' ', e.last_name) as employee_name,
              e.employee_id as emp_code, e.department, e.position
       FROM payroll p
       JOIN employees e ON p.employee_id = e.id
       WHERE p.id = ?`,
      [payroll_id]
    );

    if (payrolls.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Payroll not found' });
    }

    const payroll = payrolls[0];

    // Generate payslip number
    const payslip_number = `PS-${payroll.employee_id}-${Date.now()}`;
    const pay_period = `${new Date(payroll.pay_period_start).toLocaleDateString()} - ${new Date(payroll.pay_period_end).toLocaleDateString()}`;

    // Calculate working days
    const start = new Date(payroll.pay_period_start);
    const end = new Date(payroll.pay_period_end);
    const working_days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const worked_days = working_days - (payroll.no_pay_days || 0);

    // Create payslip
    const [result] = await connection.execute(
      `INSERT INTO payslips (
        payroll_id, employee_id, payslip_number, issue_date, pay_period,
        basic_salary, commission, gross_salary,
        epf_employee_8, epf_employer_12, etf_employer_3,
        no_pay_deduction, total_deductions, net_salary,
        working_days, worked_days, no_pay_days, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generated')`,
      [
        payroll_id, payroll.employee_id, payslip_number, payroll.pay_date, pay_period,
        payroll.basic_salary, payroll.commission_amount, payroll.gross_salary,
        payroll.epf_employee, payroll.epf_employer, payroll.etf_employer,
        payroll.no_pay_deduction, payroll.total_deductions, payroll.net_salary,
        working_days, worked_days, payroll.no_pay_days
      ]
    );

    await connection.commit();

    // Get the created payslip
    const [payslips] = await connection.execute(
      `SELECT ps.*, CONCAT(e.first_name, ' ', e.last_name) as employee_name,
              e.employee_id as emp_code, e.department, e.position, e.email
       FROM payslips ps
       JOIN employees e ON ps.employee_id = e.id
       WHERE ps.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Payslip generated successfully',
      payslip: payslips[0]
    });
  } catch (error) {
    await connection.rollback();
    console.error('Generate payslip error:', error);
    res.status(500).json({ error: 'Failed to generate payslip' });
  } finally {
    connection.release();
  }
};

// Get payslips
exports.getPayslips = async (req, res) => {
  try {
    const { employee_id, month, year } = req.query;

    let query = `
      SELECT ps.*, CONCAT(e.first_name, ' ', e.last_name) as employee_name,
             e.employee_id as emp_code, e.department, e.position
      FROM payslips ps
      JOIN employees e ON ps.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (employee_id) {
      query += ' AND ps.employee_id = ?';
      params.push(employee_id);
    }

    if (month && year) {
      query += ' AND MONTH(ps.issue_date) = ? AND YEAR(ps.issue_date) = ?';
      params.push(month, year);
    }

    query += ' ORDER BY ps.issue_date DESC';

    const [payslips] = await req.db.execute(query, params);

    res.json({ payslips });
  } catch (error) {
    console.error('Get payslips error:', error);
    res.status(500).json({ error: 'Failed to fetch payslips' });
  }
};

module.exports = exports;

