const express = require('express');
const router = express.Router();
const tenantAuth = require('../middleware/tenantAuth');

// Apply tenant authentication to all routes
router.use(tenantAuth);

// Get all vendor cash payments
router.get('/', async (req, res) => {
  try {
    const { vendor_id, bank_account_id, start_date, end_date } = req.query;
    
    let query = `
      SELECT vcp.*,
             v.name as vendor_name,
             ba.account_name as bank_account_name,
             ba.bank_name,
             e.first_name,
             e.last_name
      FROM vendor_cash_payments vcp
      LEFT JOIN vendors v ON vcp.vendor_id = v.id
      LEFT JOIN bank_accounts ba ON vcp.bank_account_id = ba.id
      LEFT JOIN employees e ON vcp.created_by = e.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (vendor_id) {
      query += ' AND vcp.vendor_id = ?';
      params.push(vendor_id);
    }
    
    if (bank_account_id) {
      query += ' AND vcp.bank_account_id = ?';
      params.push(bank_account_id);
    }
    
    if (start_date) {
      query += ' AND vcp.payment_date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND vcp.payment_date <= ?';
      params.push(end_date);
    }
    
    query += ' ORDER BY vcp.payment_date DESC, vcp.created_at DESC';
    
    const [payments] = await req.db.execute(query, params);
    res.json(payments);
  } catch (error) {
    console.error('Error fetching vendor cash payments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get vendor cash payment by ID
router.get('/:id', async (req, res) => {
  try {
    const [payments] = await req.db.execute(`
      SELECT vcp.*,
             v.name as vendor_name,
             ba.account_name as bank_account_name,
             ba.bank_name,
             e.first_name,
             e.last_name
      FROM vendor_cash_payments vcp
      LEFT JOIN vendors v ON vcp.vendor_id = v.id
      LEFT JOIN bank_accounts ba ON vcp.bank_account_id = ba.id
      LEFT JOIN employees e ON vcp.created_by = e.id
      WHERE vcp.id = ?
    `, [req.params.id]);

    if (payments.length === 0) {
      return res.status(404).json({ error: 'Vendor cash payment not found' });
    }

    res.json(payments[0]);
  } catch (error) {
    console.error('Error fetching vendor cash payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new vendor cash payment
router.post('/', async (req, res) => {
  const connection = await req.db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Check if vendor_cash_payments table exists, create if not
    try {
      const [tables] = await connection.execute(`SHOW TABLES LIKE 'vendor_cash_payments'`);
      if (tables.length === 0) {
        await connection.execute(`
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
        console.log('✅ Created vendor_cash_payments table');
      }
    } catch (tableError) {
      console.warn('⚠️  Warning: Could not check/create vendor_cash_payments table:', tableError.message);
    }

    const {
      vendor_id,
      bank_account_id = null,
      amount,
      payment_date,
      description = null,
      reference_number = null,
      notes = null,
      created_by = null
    } = req.body;

    // Validate required fields
    if (!vendor_id || !amount || !payment_date) {
      await connection.rollback();
      return res.status(400).json({ 
        error: 'Missing required fields: vendor_id, amount, and payment_date are required' 
      });
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    // Verify vendor exists
    const [vendors] = await connection.execute(
      'SELECT id, name FROM vendors WHERE id = ?',
      [vendor_id]
    );

    if (vendors.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const vendor = vendors[0];

    // If bank_account_id is provided, verify it exists and update balance
    let balanceBefore = null;
    let balanceAfter = null;
    
    if (bank_account_id) {
      const [bankAccounts] = await connection.execute(
        'SELECT id, current_balance FROM bank_accounts WHERE id = ?',
        [bank_account_id]
      );

      if (bankAccounts.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Bank account not found' });
      }

      balanceBefore = parseFloat(bankAccounts[0].current_balance);
      balanceAfter = balanceBefore - paymentAmount; // Deduct from bank account

      // Update bank account balance
      await connection.execute(
        'UPDATE bank_accounts SET current_balance = ? WHERE id = ?',
        [balanceAfter, bank_account_id]
      );

      // Create bank transaction record
      await connection.execute(
        `INSERT INTO bank_transactions (
          bank_account_id, transaction_type, amount, 
          balance_before, balance_after, transaction_date, 
          reference_number, description
        ) VALUES (?, 'payment', ?, ?, ?, ?, ?, ?)`,
        [
          bank_account_id,
          paymentAmount,
          balanceBefore,
          balanceAfter,
          payment_date,
          reference_number || null,
          description || `Cash payment to vendor ${vendor.name}`
        ]
      );
    }

    // Insert vendor cash payment record
    const [result] = await connection.execute(
      `INSERT INTO vendor_cash_payments (
        vendor_id, bank_account_id, amount, payment_date, 
        description, reference_number, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vendor_id,
        bank_account_id,
        paymentAmount,
        payment_date,
        description || null,
        reference_number || null,
        notes || null,
        created_by
      ]
    );

    // Create daybook entry
    await connection.execute(
      `INSERT INTO daybook_entries 
       (entry_date, entry_type, amount, payment_method, reference_number, description, source_type, created_by) 
       VALUES (?, 'expense', ?, 'cash', ?, ?, 'vendor_cash_payment', ?)`,
      [
        payment_date,
        paymentAmount,
        reference_number || `VCP-${result.insertId}`,
        description || `Cash payment to vendor ${vendor.name}`,
        created_by
      ]
    );

    await connection.commit();

    // Fetch the created payment with related data
    const [createdPayments] = await connection.execute(`
      SELECT vcp.*,
             v.name as vendor_name,
             ba.account_name as bank_account_name,
             ba.bank_name
      FROM vendor_cash_payments vcp
      LEFT JOIN vendors v ON vcp.vendor_id = v.id
      LEFT JOIN bank_accounts ba ON vcp.bank_account_id = ba.id
      WHERE vcp.id = ?
    `, [result.insertId]);

    res.status(201).json({
      message: 'Vendor cash payment created successfully',
      payment: createdPayments[0]
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating vendor cash payment:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Update vendor cash payment
router.put('/:id', async (req, res) => {
  const connection = await req.db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const {
      vendor_id,
      bank_account_id,
      amount,
      payment_date,
      description,
      reference_number,
      notes
    } = req.body;

    // Get existing payment
    const [existingPayments] = await connection.execute(
      'SELECT * FROM vendor_cash_payments WHERE id = ?',
      [id]
    );

    if (existingPayments.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Vendor cash payment not found' });
    }

    const existingPayment = existingPayments[0];
    const oldAmount = parseFloat(existingPayment.amount);
    const oldBankAccountId = existingPayment.bank_account_id;

    // Update payment record
    const updateFields = [];
    const updateValues = [];

    if (vendor_id !== undefined) updateFields.push('vendor_id = ?'), updateValues.push(vendor_id);
    if (bank_account_id !== undefined) updateFields.push('bank_account_id = ?'), updateValues.push(bank_account_id);
    if (amount !== undefined) updateFields.push('amount = ?'), updateValues.push(amount);
    if (payment_date !== undefined) updateFields.push('payment_date = ?'), updateValues.push(payment_date);
    if (description !== undefined) updateFields.push('description = ?'), updateValues.push(description);
    if (reference_number !== undefined) updateFields.push('reference_number = ?'), updateValues.push(reference_number);
    if (notes !== undefined) updateFields.push('notes = ?'), updateValues.push(notes);

    if (updateFields.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(id);
    await connection.execute(
      `UPDATE vendor_cash_payments SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Handle bank account balance adjustments if bank_account_id or amount changed
    const newAmount = amount !== undefined ? parseFloat(amount) : oldAmount;
    const newBankAccountId = bank_account_id !== undefined ? bank_account_id : oldBankAccountId;

    if (oldBankAccountId && (oldAmount !== newAmount || oldBankAccountId !== newBankAccountId)) {
      // Revert old transaction
      const [oldBankAccount] = await connection.execute(
        'SELECT current_balance FROM bank_accounts WHERE id = ?',
        [oldBankAccountId]
      );
      
      if (oldBankAccount.length > 0) {
        const currentBalance = parseFloat(oldBankAccount[0].current_balance);
        const adjustedBalance = currentBalance + oldAmount; // Add back old amount
        await connection.execute(
          'UPDATE bank_accounts SET current_balance = ? WHERE id = ?',
          [adjustedBalance, oldBankAccountId]
        );
      }
    }

    if (newBankAccountId && (oldAmount !== newAmount || oldBankAccountId !== newBankAccountId)) {
      // Apply new transaction
      const [newBankAccount] = await connection.execute(
        'SELECT current_balance FROM bank_accounts WHERE id = ?',
        [newBankAccountId]
      );
      
      if (newBankAccount.length > 0) {
        const currentBalance = parseFloat(newBankAccount[0].current_balance);
        const adjustedBalance = currentBalance - newAmount; // Deduct new amount
        await connection.execute(
          'UPDATE bank_accounts SET current_balance = ? WHERE id = ?',
          [adjustedBalance, newBankAccountId]
        );
      }
    }

    await connection.commit();

    res.json({ message: 'Vendor cash payment updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating vendor cash payment:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Delete vendor cash payment
router.delete('/:id', async (req, res) => {
  const connection = await req.db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { id } = req.params;

    // Get existing payment
    const [existingPayments] = await connection.execute(
      'SELECT * FROM vendor_cash_payments WHERE id = ?',
      [id]
    );

    if (existingPayments.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Vendor cash payment not found' });
    }

    const existingPayment = existingPayments[0];
    const amount = parseFloat(existingPayment.amount);
    const bankAccountId = existingPayment.bank_account_id;

    // Revert bank account balance if bank_account_id exists
    if (bankAccountId) {
      const [bankAccount] = await connection.execute(
        'SELECT current_balance FROM bank_accounts WHERE id = ?',
        [bankAccountId]
      );
      
      if (bankAccount.length > 0) {
        const currentBalance = parseFloat(bankAccount[0].current_balance);
        const adjustedBalance = currentBalance + amount; // Add back the amount
        await connection.execute(
          'UPDATE bank_accounts SET current_balance = ? WHERE id = ?',
          [adjustedBalance, bankAccountId]
        );
      }
    }

    // Delete payment record
    await connection.execute(
      'DELETE FROM vendor_cash_payments WHERE id = ?',
      [id]
    );

    await connection.commit();

    res.json({ message: 'Vendor cash payment deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting vendor cash payment:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;

