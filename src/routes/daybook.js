const express = require('express');
const router = express.Router();
const tenantAuth = require('../middleware/tenantAuth');

// Apply tenant authentication to all routes
router.use(tenantAuth);

// Get all daybook entries (including cash payments from invoices)
router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, entry_type } = req.query;
    
    // Query for regular daybook entries (excluding cash payment duplicates)
    // Include both cheque_issued (expense) and cheque_issued_income (income) entries
    let daybookQuery = `
      SELECT de.*, a.account_name, a.account_type,
             e.first_name, e.last_name,
             CASE 
               WHEN de.source_type = 'cheque_issued_income' THEN 'cheque_issued'
               ELSE COALESCE(de.source_type, 'daybook')
             END as source_type,
             NULL as customer_name,
             NULL as invoice_number
      FROM daybook_entries de
      LEFT JOIN accounts a ON de.account_id = a.id
      LEFT JOIN employees e ON de.created_by = e.id
      WHERE 1=1
        AND (a.account_name != 'Cash Received - Customer Payments' OR a.account_name IS NULL)
    `;
    
    const daybookParams = [];
    
    if (start_date) {
      daybookQuery += ' AND de.entry_date >= ?';
      daybookParams.push(start_date);
    }
    
    if (end_date) {
      daybookQuery += ' AND de.entry_date <= ?';
      daybookParams.push(end_date);
    }
    
    if (entry_type) {
      daybookQuery += ' AND de.entry_type = ?';
      daybookParams.push(entry_type);
    }
    
    // Query for cash payments from invoices
    let cashPaymentsQuery = `
      SELECT 
        ip.id,
        ip.payment_date as entry_date,
        'income' as entry_type,
        NULL as account_id,
        'Cash Received - Customer Payments' as account_name,
        'income' as account_type,
        ip.amount,
        'cash' as payment_method,
        ip.reference_number,
        CONCAT('Cash Received - ', c.name) as description,
        ip.notes,
        ip.created_by,
        NULL as first_name,
        NULL as last_name,
        ip.created_at,
        ip.updated_at,
        'cash_payment' as source_type,
        c.name as customer_name,
        i.invoice_number
      FROM invoice_payments ip
      INNER JOIN customers c ON ip.customer_id = c.id
      LEFT JOIN invoices i ON ip.invoice_id = i.id
      WHERE ip.payment_type = 'cash'
    `;
    
    const cashPaymentsParams = [];
    
    if (start_date) {
      cashPaymentsQuery += ' AND ip.payment_date >= ?';
      cashPaymentsParams.push(start_date);
    }
    
    if (end_date) {
      cashPaymentsQuery += ' AND ip.payment_date <= ?';
      cashPaymentsParams.push(end_date);
    }
    
    // Only show cash payments if entry_type is income or not specified
    if (entry_type === 'expense') {
      // Don't include cash payments for expense filter
      cashPaymentsQuery += ' AND 1=0';
    }
    
    // Fetch both types of entries
    const [daybookEntries] = await req.db.execute(daybookQuery, daybookParams);
    const [cashPayments] = await req.db.execute(cashPaymentsQuery, cashPaymentsParams);
    
    // Combine and sort by date
    const allEntries = [...daybookEntries, ...cashPayments].sort((a, b) => {
      const dateCompare = new Date(b.entry_date) - new Date(a.entry_date);
      if (dateCompare !== 0) return dateCompare;
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    res.json(allEntries);
  } catch (error) {
    console.error('Error fetching daybook entries:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all categories from daybook_categories table (MUST come before /:id route)
router.get('/categories', async (req, res) => {
  try {
    // Check if daybook_categories table exists, create if not
    try {
      const [tables] = await req.db.execute(`SHOW TABLES LIKE 'daybook_categories'`);
      if (tables.length === 0) {
        await req.db.execute(`
          CREATE TABLE IF NOT EXISTS daybook_categories (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(100) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_name (name)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Created daybook_categories table');
        
        // Insert default categories
        const defaultCategories = [
          'Batta',
          'Drawing', 
          'Factory Purchase',
          'Fuel',
          'Ration Items',
          'Cash Refund',
          'New Celebration',
          'Office Supplies',
          'Transport',
          'Maintenance',
          'Utilities',
          'Marketing',
          'Professional Services',
          'Opening Balance',
          'Other',
          'Meas & Tea Expenses',
          'Salary Advance',
          'Travelling Exp',
          'Factory Bun',
          'Showroom Cash'
        ];
        
        for (const categoryName of defaultCategories) {
          try {
            await req.db.execute(
              'INSERT INTO daybook_categories (name) VALUES (?)',
              [categoryName]
            );
          } catch (insertError) {
            // Ignore duplicate key errors
            if (insertError.code !== 'ER_DUP_ENTRY') {
              console.error(`Error inserting category ${categoryName}:`, insertError);
            }
          }
        }
        console.log('✅ Inserted default categories');
      }
    } catch (tableError) {
      console.error('Error checking/creating daybook_categories table:', tableError);
    }

    // Fetch all categories from the table
    const [categories] = await req.db.execute(`
      SELECT name 
      FROM daybook_categories 
      ORDER BY name ASC
    `);
    
    const categoryList = categories.map(row => row.name);
    res.json(categoryList);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new category (MUST come before /:id route)
router.post('/categories', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check if daybook_categories table exists, create if not
    try {
      const [tables] = await req.db.execute(`SHOW TABLES LIKE 'daybook_categories'`);
      if (tables.length === 0) {
        await req.db.execute(`
          CREATE TABLE IF NOT EXISTS daybook_categories (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(100) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_name (name)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }
    } catch (tableError) {
      console.error('Error checking/creating daybook_categories table:', tableError);
    }

    const trimmedName = name.trim();
    
    // Insert new category
    try {
      const [result] = await req.db.execute(
        'INSERT INTO daybook_categories (name) VALUES (?)',
        [trimmedName]
      );
      
      res.json({ 
        message: 'Category created successfully', 
        id: result.insertId,
        name: trimmedName
      });
    } catch (insertError) {
      if (insertError.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Category already exists' });
      }
      throw insertError;
    }
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get daybook entry by ID (must come after /categories routes)
router.get('/:id', async (req, res) => {
  try {
    const [entries] = await req.db.execute(`
      SELECT de.*, a.account_name, a.account_type,
             e.first_name, e.last_name
      FROM daybook_entries de
      LEFT JOIN accounts a ON de.account_id = a.id
      LEFT JOIN employees e ON de.created_by = e.id
      WHERE de.id = ?
    `, [req.params.id]);

    if (entries.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json(entries[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new daybook entry
router.post('/', async (req, res) => {
  const {
    entry_date,
    entry_type,
    account_id = null,
    amount,
    payment_method = 'cash',
    reference_number = null,
    description = null,
    category = null,
    notes = null,
    created_by = null
  } = req.body;

  try {
    // Create daybook entry
    const [result] = await req.db.execute(
      `INSERT INTO daybook_entries 
       (entry_date, entry_type, account_id, amount, payment_method, reference_number, description, category, notes, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [entry_date, entry_type, account_id, amount, payment_method, reference_number, description, category, notes, created_by]
    );

    // Update account balance only if account_id is provided
    if (account_id) {
      const balanceChange = (entry_type === 'income' || entry_type === 'opening_balance') ? amount : -amount;
      await req.db.execute(
        'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?',
        [balanceChange, account_id]
      );
    }

    res.json({ 
      message: 'Daybook entry created successfully', 
      id: result.insertId
    });
  } catch (error) {
    console.error('Error creating daybook entry:', error);
    res.status(500).json({ 
      error: error.message,
      code: error.code
    });
  }
});

// Update daybook entry
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    entry_date,
    entry_type,
    amount,
    payment_method,
    reference_number,
    description,
    category,
    notes
  } = req.body;

  try {
    // Get old entry to reverse balance change
    const [oldEntries] = await req.db.execute('SELECT * FROM daybook_entries WHERE id = ?', [id]);
    
    if (oldEntries.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    const oldEntry = oldEntries[0];
    const account_id = oldEntry.account_id; // Keep the same account
    
    // Reverse old balance change only if account exists
    if (oldEntry.account_id) {
      const oldBalanceChange = (oldEntry.entry_type === 'income' || oldEntry.entry_type === 'opening_balance') ? -oldEntry.amount : oldEntry.amount;
      await req.db.execute(
        'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?',
        [oldBalanceChange, oldEntry.account_id]
      );
    }

    
    // Update entry
    await req.db.execute(
      `UPDATE daybook_entries SET 
       entry_date = ?, entry_type = ?, amount = ?, 
       payment_method = ?, reference_number = ?, description = ?, category = ?, notes = ?
       WHERE id = ?`,
      [entry_date, entry_type, amount, payment_method, reference_number, description, category, notes, id]
    );
        
    // Apply new balance change only if account exists
    if (account_id) {
      const newBalanceChange = (entry_type === 'income' || entry_type === 'opening_balance') ? amount : -amount;
      await req.db.execute(
        'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?',
        [newBalanceChange, account_id]
      );
    }

    res.json({ message: 'Daybook entry updated successfully' });
  } catch (error) {
    console.error('Error updating daybook entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete daybook entry
router.delete('/:id', async (req, res) => {
  try {
    // Get entry to reverse balance change
    const [entries] = await req.db.execute('SELECT * FROM daybook_entries WHERE id = ?', [req.params.id]);
    
    if (entries.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    const entry = entries[0];
    
    // Reverse balance change only if account exists
    if (entry.account_id) {
      const balanceChange = (entry.entry_type === 'income' || entry.entry_type === 'opening_balance') ? -entry.amount : entry.amount;
      await req.db.execute(
        'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?',
        [balanceChange, entry.account_id]
      );
    }
    
    // Delete entry
    await req.db.execute('DELETE FROM daybook_entries WHERE id = ?', [req.params.id]);

    res.json({ message: 'Daybook entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get daily summary (including cash payments)
router.get('/summary/daily', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Get daybook entries summary (excluding cash payment duplicates)
    // Separate opening_balance from income for correct calculation
    const [daybookSummary] = await req.db.execute(`
      SELECT 
        COALESCE(SUM(CASE WHEN de.entry_type = 'opening_balance' THEN de.amount ELSE 0 END), 0) as opening_balance,
        COALESCE(SUM(CASE WHEN de.entry_type = 'income' THEN de.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN de.entry_type = 'expense' THEN de.amount ELSE 0 END), 0) as total_expense
      FROM daybook_entries de
      LEFT JOIN accounts a ON de.account_id = a.id
      WHERE de.entry_date = ?
        AND (a.account_name != 'Cash Received - Customer Payments' OR a.account_name IS NULL)
    `, [targetDate]);
    
    // Get cash payments summary for the same date
    const [cashPaymentsSummary] = await req.db.execute(`
      SELECT 
        COALESCE(SUM(amount), 0) as cash_income
      FROM invoice_payments
      WHERE payment_type = 'cash' AND payment_date = ?
    `, [targetDate]);
    
    const openingBalance = parseFloat(daybookSummary[0].opening_balance || 0);
    const totalIncome = parseFloat(daybookSummary[0].total_income || 0) + parseFloat(cashPaymentsSummary[0].cash_income || 0);
    const totalExpense = parseFloat(daybookSummary[0].total_expense || 0);
    // Net Balance = (Opening Balance + Total Income) - Total Expense
    const netBalance = (openingBalance + totalIncome) - totalExpense;
    
    res.json({
      entry_date: targetDate,
      opening_balance: openingBalance,
      total_income: totalIncome,
      total_expense: totalExpense,
      net_balance: netBalance
    });
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get monthly summary (excluding cash payment duplicates)
router.get('/summary/monthly', async (req, res) => {
  try {
    const { month, year } = req.query;
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();
    
    const [summary] = await req.db.execute(`
      SELECT 
        YEAR(de.entry_date) as year,
        MONTH(de.entry_date) as month,
        SUM(CASE WHEN de.entry_type IN ('income', 'opening_balance') THEN de.amount ELSE 0 END) as total_income,
        SUM(CASE WHEN de.entry_type = 'expense' THEN de.amount ELSE 0 END) as total_expense,
        SUM(CASE WHEN de.entry_type IN ('income', 'opening_balance') THEN de.amount ELSE -de.amount END) as net_balance
      FROM daybook_entries de
      LEFT JOIN accounts a ON de.account_id = a.id
      WHERE YEAR(de.entry_date) = ? AND MONTH(de.entry_date) = ?
        AND (a.account_name != 'Cash Received - Customer Payments' OR a.account_name IS NULL)
      GROUP BY YEAR(de.entry_date), MONTH(de.entry_date)
    `, [targetYear, targetMonth]);
    
    if (summary.length === 0) {
      return res.json({
        year: targetYear,
        month: targetMonth,
        total_income: 0,
        total_expense: 0,
        net_balance: 0
      });
    }
    
    res.json(summary[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
