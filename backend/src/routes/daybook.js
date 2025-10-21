const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all daybook entries (including cash payments from invoices)
router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, entry_type } = req.query;
    
    // Query for regular daybook entries (excluding cash payment duplicates)
    let daybookQuery = `
      SELECT de.*, a.account_name, a.account_type,
             e.first_name, e.last_name,
             'daybook' as source_type,
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
    const [daybookEntries] = await db.execute(daybookQuery, daybookParams);
    const [cashPayments] = await db.execute(cashPaymentsQuery, cashPaymentsParams);
    
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

// Get daybook entry by ID
router.get('/:id', async (req, res) => {
  try {
    const [entries] = await db.execute(`
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
    notes = null,
    created_by = null,
    source_type = null,
    customer_name = null
  } = req.body;

  try {
    // Create daybook entry
    const [result] = await db.execute(
      `INSERT INTO daybook_entries 
       (entry_date, entry_type, account_id, amount, payment_method, reference_number, description, notes, source_type, customer_name, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [entry_date, entry_type, account_id, amount, payment_method, reference_number, description, notes, source_type, customer_name, created_by]
    );

    // Update account balance only if account_id is provided
    if (account_id) {
      const balanceChange = entry_type === 'income' ? amount : -amount;
      await db.execute(
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
    notes
  } = req.body;

  try {
    // Get old entry to reverse balance change
    const [oldEntries] = await db.execute('SELECT * FROM daybook_entries WHERE id = ?', [id]);
    
    if (oldEntries.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    const oldEntry = oldEntries[0];
    const account_id = oldEntry.account_id; // Keep the same account
    
    // Reverse old balance change only if account exists
    if (oldEntry.account_id) {
      const oldBalanceChange = oldEntry.entry_type === 'income' ? -oldEntry.amount : oldEntry.amount;
      await db.execute(
        'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?',
        [oldBalanceChange, oldEntry.account_id]
      );
    }
    
    // Update entry
    await db.execute(
      `UPDATE daybook_entries SET 
       entry_date = ?, entry_type = ?, amount = ?, 
       payment_method = ?, reference_number = ?, description = ?, notes = ?
       WHERE id = ?`,
      [entry_date, entry_type, amount, payment_method, reference_number, description, notes, id]
    );
    
    // Apply new balance change only if account exists
    if (account_id) {
      const newBalanceChange = entry_type === 'income' ? amount : -amount;
      await db.execute(
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
    const [entries] = await db.execute('SELECT * FROM daybook_entries WHERE id = ?', [req.params.id]);
    
    if (entries.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    const entry = entries[0];
    
    // Reverse balance change only if account exists
    if (entry.account_id) {
      const balanceChange = entry.entry_type === 'income' ? -entry.amount : entry.amount;
      await db.execute(
        'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?',
        [balanceChange, entry.account_id]
      );
    }
    
    // Delete entry
    await db.execute('DELETE FROM daybook_entries WHERE id = ?', [req.params.id]);

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
    const [daybookSummary] = await db.execute(`
      SELECT 
        COALESCE(SUM(CASE WHEN de.entry_type = 'income' THEN de.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN de.entry_type = 'expense' THEN de.amount ELSE 0 END), 0) as total_expense
      FROM daybook_entries de
      LEFT JOIN accounts a ON de.account_id = a.id
      WHERE de.entry_date = ?
        AND (a.account_name != 'Cash Received - Customer Payments' OR a.account_name IS NULL)
    `, [targetDate]);
    
    // Get cash payments summary for the same date
    const [cashPaymentsSummary] = await db.execute(`
      SELECT 
        COALESCE(SUM(amount), 0) as cash_income
      FROM invoice_payments
      WHERE payment_type = 'cash' AND payment_date = ?
    `, [targetDate]);
    
    const totalIncome = parseFloat(daybookSummary[0].total_income) + parseFloat(cashPaymentsSummary[0].cash_income);
    const totalExpense = parseFloat(daybookSummary[0].total_expense);
    const netBalance = totalIncome - totalExpense;
    
    res.json({
      entry_date: targetDate,
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
    
    const [summary] = await db.execute(`
      SELECT 
        YEAR(de.entry_date) as year,
        MONTH(de.entry_date) as month,
        SUM(CASE WHEN de.entry_type = 'income' THEN de.amount ELSE 0 END) as total_income,
        SUM(CASE WHEN de.entry_type = 'expense' THEN de.amount ELSE 0 END) as total_expense,
        SUM(CASE WHEN de.entry_type = 'income' THEN de.amount ELSE -de.amount END) as net_balance
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
