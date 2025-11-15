const express = require('express');
const router = express.Router();
const tenantAuth = require('../middleware/tenantAuth');

// Apply tenant authentication to all routes
router.use(tenantAuth);

// Generate cheque number
const generateChequeNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `CHQ-${timestamp}-${random}`;
};

// Get all issued cheques
router.get('/', async (req, res) => {
  try {
    const { status, bank_account_id } = req.query;
    
    let query = `
      SELECT ic.*, 
             ba.account_name as bank_account_name,
             ba.bank_name,
             v.name as vendor_name,
             c.name as customer_name,
             e.first_name,
             e.last_name
      FROM issued_cheques ic
      LEFT JOIN bank_accounts ba ON ic.bank_account_id = ba.id
      LEFT JOIN vendors v ON ic.vendor_id = v.id
      LEFT JOIN customers c ON ic.customer_id = c.id
      LEFT JOIN employees e ON ic.created_by = e.id
    `;
    
    const params = [];
    const conditions = [];
    
    if (status) {
      conditions.push('ic.status = ?');
      params.push(status);
    }
    
    if (bank_account_id) {
      conditions.push('ic.bank_account_id = ?');
      params.push(bank_account_id);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY ic.cheque_date DESC, ic.created_at DESC';
    
    const [cheques] = await req.db.execute(query, params);

    // Fetch cheque items for each cheque
    const chequesWithItems = await Promise.all(cheques.map(async (cheque) => {
      try {
        // Check if table exists first
        const [tables] = await req.db.execute(`SHOW TABLES LIKE 'issued_cheque_items'`);
        if (tables.length === 0) {
          return {
            ...cheque,
            items: []
          };
        }
        
        const [items] = await req.db.execute(
          `SELECT * FROM issued_cheque_items WHERE issued_cheque_id = ? ORDER BY cheque_date, id`,
          [cheque.id]
        );
        return {
          ...cheque,
          items: items || []
        };
      } catch (error) {
        // If table doesn't exist yet, return cheque without items (backwards compatibility)
        return {
          ...cheque,
          items: []
        };
      }
    }));

    res.json(chequesWithItems);
  } catch (error) {
    console.error('Error fetching issued cheques:', error);
    res.status(500).json({ error: 'Failed to fetch issued cheques' });
  }
});

// Get issued cheque by ID
router.get('/:id', async (req, res) => {
  try {
    const [cheques] = await req.db.execute(`
      SELECT ic.*, 
             ba.account_name as bank_account_name,
             ba.bank_name,
             v.name as vendor_name,
             c.name as customer_name,
             e.first_name,
             e.last_name
      FROM issued_cheques ic
      LEFT JOIN bank_accounts ba ON ic.bank_account_id = ba.id
      LEFT JOIN vendors v ON ic.vendor_id = v.id
      LEFT JOIN customers c ON ic.customer_id = c.id
      LEFT JOIN employees e ON ic.created_by = e.id
      WHERE ic.id = ?
    `, [req.params.id]);

    if (cheques.length === 0) {
      return res.status(404).json({ error: 'Issued cheque not found' });
    }

    const cheque = cheques[0];

    // Fetch cheque items
    try {
      // Check if table exists first
      const [tables] = await req.db.execute(`SHOW TABLES LIKE 'issued_cheque_items'`);
      if (tables.length === 0) {
        return res.json({
          ...cheque,
          items: []
        });
      }
      
      const [items] = await req.db.execute(
        `SELECT * FROM issued_cheque_items WHERE issued_cheque_id = ? ORDER BY cheque_date, id`,
        [req.params.id]
      );
      
      res.json({
        ...cheque,
        items: items || []
      });
    } catch (error) {
      // If table doesn't exist yet, return cheque without items (backwards compatibility)
      res.json({
        ...cheque,
        items: []
      });
    }
  } catch (error) {
    console.error('Error fetching issued cheque:', error);
    res.status(500).json({ error: 'Failed to fetch issued cheque' });
  }
});

// Create new issued cheque(s)
router.post('/', async (req, res) => {
  const connection = await req.db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Check if issued_cheque_items table exists, create if not
    try {
      const [tables] = await connection.execute(`SHOW TABLES LIKE 'issued_cheque_items'`);
      if (tables.length === 0) {
        await connection.execute(`
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
        console.log('✅ Created issued_cheque_items table');
      } else {
        // Table exists, check if cheque_type column exists
        try {
          const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'issued_cheque_items' 
            AND COLUMN_NAME = 'cheque_type'
          `);
          
          if (columns.length === 0) {
            // Column doesn't exist, add it
            await connection.execute(`
              ALTER TABLE issued_cheque_items 
              ADD COLUMN cheque_type ENUM('account_pay', 'cash') DEFAULT 'account_pay' 
              AFTER payee_account
            `);
            console.log('✅ Added cheque_type column to issued_cheque_items table');
          }
        } catch (columnError) {
          console.warn('⚠️  Warning: Could not check/add cheque_type column:', columnError.message);
        }
      }
    } catch (tableError) {
      console.warn('⚠️  Warning: Could not check/create issued_cheque_items table:', tableError.message);
    }

    // Check if daybook_entries table has category column, add if missing
    try {
      const [categoryColumns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'daybook_entries' 
        AND COLUMN_NAME = 'category'
      `);
      
      if (categoryColumns.length === 0) {
        // Column doesn't exist, add it
        await connection.execute(`
          ALTER TABLE daybook_entries 
          ADD COLUMN category VARCHAR(100) 
          AFTER reference_number
        `);
        console.log('✅ Added category column to daybook_entries table');
      }
    } catch (categoryError) {
      console.warn('⚠️  Warning: Could not check/add category column:', categoryError.message);
    }

    const {
      bank_account_id,
      vendor_id = null,
      customer_id = null,
      amount, // Total amount (for backwards compatibility)
      cheque_date, // Default cheque date (for backwards compatibility)
      issue_date,
      payee_name,
      payee_bank = null,
      payee_account = null,
      description = null,
      notes = null,
      created_by = null,
      cheque_type = 'account_pay', // 'account_pay' or 'cash'
      cheques = [] // Array of cheques from the form
    } = req.body;

    // Validate required fields
    if (!bank_account_id || !issue_date || !payee_name) {
      await connection.rollback();
      return res.status(400).json({ error: 'Missing required fields: bank_account_id, issue_date, and payee_name are required' });
    }

    // Vendor and customer are now optional - payee_name is the only required payee field

    // Determine if we're handling multiple cheques or a single cheque (backwards compatibility)
    const hasMultipleCheques = cheques && Array.isArray(cheques) && cheques.length > 0;
    
    let totalAmount = 0;
    let chequesToProcess = [];

    if (hasMultipleCheques) {
      // Process multiple cheques from the array
      chequesToProcess = cheques.map(cheque => ({
        cheque_number: cheque.cheque_number || generateChequeNumber(),
        cheque_date: cheque.cheque_date || cheque_date,
        amount: parseFloat(cheque.amount) || 0,
        payee_bank: cheque.payee_bank || payee_bank,
        payee_account: cheque.payee_account || payee_account
      }));
      
      totalAmount = chequesToProcess.reduce((sum, chq) => sum + (chq.amount || 0), 0);
    } else {
      // Single cheque (backwards compatibility)
      if (!amount || !cheque_date) {
        await connection.rollback();
        return res.status(400).json({ error: 'Missing required fields: amount and cheque_date are required for single cheque' });
      }
      
      chequesToProcess = [{
        cheque_number: generateChequeNumber(),
        cheque_date: cheque_date,
        amount: parseFloat(amount),
        payee_bank: payee_bank,
        payee_account: payee_account
      }];
      
      totalAmount = parseFloat(amount);
    }

    // Validate that we have cheques to process
    if (chequesToProcess.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'No cheques to process' });
    }

    // Validate each cheque
    for (let i = 0; i < chequesToProcess.length; i++) {
      const cheque = chequesToProcess[i];
      if (!cheque.cheque_number || cheque.cheque_number.trim() === '') {
        await connection.rollback();
        return res.status(400).json({ error: `Cheque number is required for cheque #${i + 1}` });
      }
      if (!cheque.cheque_date) {
        await connection.rollback();
        return res.status(400).json({ error: `Cheque date is required for cheque #${i + 1}` });
      }
      if (!cheque.amount || cheque.amount <= 0) {
        await connection.rollback();
        return res.status(400).json({ error: `Valid amount is required for cheque #${i + 1}` });
      }
    }

    // Get current bank account balance before transaction
    const [bankAccountBefore] = await connection.execute(
      'SELECT current_balance FROM bank_accounts WHERE id = ?',
      [bank_account_id]
    );

    if (bankAccountBefore.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Bank account not found' });
    }

    const balance_before = parseFloat(bankAccountBefore[0].current_balance);

    // Check if sufficient balance
    if (balance_before < totalAmount) {
      await connection.rollback();
      return res.status(400).json({ error: 'Insufficient bank account balance' });
    }

    // Generate a reference number for the main issued cheque record
    const referenceNumber = hasMultipleCheques 
      ? `CHQ-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
      : chequesToProcess[0].cheque_number;

    // Create main issued cheque record (parent record)
    const [mainResult] = await connection.execute(
      `INSERT INTO issued_cheques 
       (cheque_number, bank_account_id, vendor_id, customer_id, amount, cheque_date, 
        issue_date, payee_name, payee_bank, payee_account, cheque_type, description, status, notes, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        referenceNumber,
        bank_account_id,
        vendor_id,
        customer_id,
        totalAmount,
        chequesToProcess[0].cheque_date, // Use first cheque date as main date
        issue_date,
        payee_name,
        payee_bank || chequesToProcess[0].payee_bank,
        payee_account || chequesToProcess[0].payee_account,
        cheque_type,
        description,
        'issued',
        notes,
        created_by
      ]
    );

    const mainChequeId = mainResult.insertId;

    // Create individual cheque items in issued_cheque_items table
    const createdCheques = [];
    
    for (const cheque of chequesToProcess) {
      // Insert each cheque as a separate item record
      const [itemResult] = await connection.execute(
        `INSERT INTO issued_cheque_items 
         (issued_cheque_id, cheque_number, cheque_date, amount, payee_bank, payee_account, cheque_type, status, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mainChequeId,
          cheque.cheque_number,
          cheque.cheque_date,
          cheque.amount,
          cheque.payee_bank,
          cheque.payee_account,
          cheque_type,
          'issued',
          notes
        ]
      );

      createdCheques.push({
        id: itemResult.insertId,
        cheque_number: cheque.cheque_number,
        amount: cheque.amount
      });

      // Create daybook entry for each cheque as expense (money going out)
      // This will show in the expense view
      const categoryValue = vendor_id ? 'Vendor Payment' : customer_id ? 'Customer Refund' : 'Cheque Payment';
      
      await connection.execute(
        `INSERT INTO daybook_entries 
         (entry_date, entry_type, amount, payment_method, reference_number, description, category, source_type, created_by) 
         VALUES (?, 'expense', ?, 'cheque', ?, ?, ?, 'cheque_issued', ?)`,
        [
          issue_date,
          cheque.amount,
          cheque.cheque_number,
          vendor_id ? `Cheque issued to vendor ${payee_name}` : 
          customer_id ? `Cheque issued to customer ${payee_name}` : 
          `Cheque issued to ${payee_name}`,
          categoryValue,
          created_by
        ]
      );
      
      // Also create an income entry for tracking/reconciliation purposes
      // This allows the cheque to show in both income and expense views for complete tracking
      await connection.execute(
        `INSERT INTO daybook_entries 
         (entry_date, entry_type, amount, payment_method, reference_number, description, category, source_type, created_by) 
         VALUES (?, 'income', ?, 'cheque', ?, ?, ?, 'cheque_issued_income', ?)`,
        [
          issue_date,
          cheque.amount,
          cheque.cheque_number,
          vendor_id ? `Cheque payment to vendor ${payee_name} (Tracking)` : 
          customer_id ? `Customer refund via cheque: ${payee_name}` : 
          `Cheque issued to ${payee_name} (Tracking)`,
          vendor_id ? 'Vendor Payment (Tracking)' : customer_id ? 'Customer Refund' : 'Cheque Payment (Tracking)',
          created_by
        ]
      );
    }

    // Update bank account balance (deduct total amount once)
    await connection.execute(
      'UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?',
      [totalAmount, bank_account_id]
    );

    // Get updated balance
    const [bankAccountAfter] = await connection.execute(
      'SELECT current_balance FROM bank_accounts WHERE id = ?',
      [bank_account_id]
    );

    const balance_after = parseFloat(bankAccountAfter[0].current_balance);

    // Create bank transaction record for the total withdrawal
    await connection.execute(
      `INSERT INTO bank_transactions 
       (bank_account_id, transaction_type, amount, balance_before, balance_after, 
        transaction_date, description, created_by) 
       VALUES (?, 'withdrawal', ?, ?, ?, ?, ?, ?)`,
      [
        bank_account_id,
        totalAmount,
        balance_before,
        balance_after,
        issue_date,
        `Multiple cheques issued to ${payee_name} (${chequesToProcess.length} cheque(s))`,
        created_by
      ]
    );

    await connection.commit();

    res.json({ 
      message: `${chequesToProcess.length} cheque(s) issued successfully`,
      issued_cheque_id: mainChequeId,
      reference_number: referenceNumber,
      items: createdCheques,
      total_amount: totalAmount,
      item_count: chequesToProcess.length
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating issued cheques:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Update issued cheque (full update)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const connection = await req.db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Get current cheque details
    const [cheques] = await connection.execute(
      'SELECT * FROM issued_cheques WHERE id = ?',
      [id]
    );

    if (cheques.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Issued cheque not found' });
    }

    const oldCheque = cheques[0];
    const {
      bank_account_id,
      vendor_id = null,
      customer_id = null,
      amount,
      issue_date,
      payee_name,
      payee_bank,
      payee_account,
      description,
      notes,
      cheque_type = 'account_pay',
      cheques: chequesToProcess = []
    } = req.body;

    // Validate required fields
    if (!bank_account_id || !amount || !issue_date || !payee_name) {
      await connection.rollback();
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Reverse old daybook entries if amount or date changed
    if (oldCheque.amount !== parseFloat(amount) || oldCheque.issue_date !== issue_date) {
      // Delete old daybook entries
      await connection.execute(
        `DELETE FROM daybook_entries 
         WHERE source_type IN ('cheque_issued', 'cheque_issued_income') 
         AND reference_number IN (
           SELECT cheque_number FROM issued_cheque_items WHERE issued_cheque_id = ?
         )`,
        [id]
      );

      // Reverse bank balance change
      await connection.execute(
        'UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?',
        [oldCheque.amount, oldCheque.bank_account_id]
      );
    }

    // Update main cheque record
    await connection.execute(
      `UPDATE issued_cheques SET 
       bank_account_id = ?, vendor_id = ?, customer_id = ?, amount = ?, 
       issue_date = ?, payee_name = ?, payee_bank = ?, payee_account = ?, 
       description = ?, notes = ?, cheque_type = ?
       WHERE id = ?`,
      [
        bank_account_id, vendor_id, customer_id, parseFloat(amount),
        issue_date, payee_name, payee_bank, payee_account,
        description, notes, cheque_type, id
      ]
    );

    // Delete old cheque items
    await connection.execute(
      'DELETE FROM issued_cheque_items WHERE issued_cheque_id = ?',
      [id]
    );

    // Insert new cheque items
    for (const cheque of chequesToProcess) {
      await connection.execute(
        `INSERT INTO issued_cheque_items 
         (issued_cheque_id, cheque_number, cheque_date, amount, payee_bank, payee_account, cheque_type, status, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'issued', ?)`,
        [
          id,
          cheque.cheque_number,
          cheque.cheque_date,
          cheque.amount,
          cheque.payee_bank,
          cheque.payee_account,
          cheque_type,
          notes
        ]
      );

      // Create daybook entries for each cheque
      const categoryValue = vendor_id ? 'Vendor Payment' : customer_id ? 'Customer Refund' : 'Cheque Payment';
      
      await connection.execute(
        `INSERT INTO daybook_entries 
         (entry_date, entry_type, amount, payment_method, reference_number, description, category, source_type, created_by) 
         VALUES (?, 'expense', ?, 'cheque', ?, ?, ?, 'cheque_issued', ?)`,
        [
          issue_date,
          cheque.amount,
          cheque.cheque_number,
          vendor_id ? `Cheque issued to vendor ${payee_name}` : 
          customer_id ? `Cheque issued to customer ${payee_name}` : 
          `Cheque issued to ${payee_name}`,
          categoryValue,
          oldCheque.created_by
        ]
      );
      
      await connection.execute(
        `INSERT INTO daybook_entries 
         (entry_date, entry_type, amount, payment_method, reference_number, description, category, source_type, created_by) 
         VALUES (?, 'income', ?, 'cheque', ?, ?, ?, 'cheque_issued_income', ?)`,
        [
          issue_date,
          cheque.amount,
          cheque.cheque_number,
          vendor_id ? `Cheque payment to vendor ${payee_name} (Tracking)` : 
          customer_id ? `Customer refund via cheque: ${payee_name}` : 
          `Cheque issued to ${payee_name} (Tracking)`,
          vendor_id ? 'Vendor Payment (Tracking)' : customer_id ? 'Customer Refund' : 'Cheque Payment (Tracking)',
          oldCheque.created_by
        ]
      );
    }

    // Update bank account balance (deduct new total amount)
    if (oldCheque.bank_account_id !== parseInt(bank_account_id)) {
      // If bank account changed, reverse old and apply new
      await connection.execute(
        'UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?',
        [oldCheque.amount, oldCheque.bank_account_id]
      );
      await connection.execute(
        'UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?',
        [parseFloat(amount), bank_account_id]
      );
    } else {
      // Same bank account, adjust balance
      const amountDiff = parseFloat(amount) - parseFloat(oldCheque.amount);
      await connection.execute(
        'UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?',
        [amountDiff, bank_account_id]
      );
    }

    await connection.commit();
    res.json({ message: 'Issued cheque updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating issued cheque:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Update issued cheque status
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, cashed_date = null, return_reason = null, notes = null } = req.body;

  try {
    // Get current cheque details
    const [cheques] = await req.db.execute(
      'SELECT * FROM issued_cheques WHERE id = ?',
      [id]
    );

    if (cheques.length === 0) {
      return res.status(404).json({ error: 'Issued cheque not found' });
    }

    const cheque = cheques[0];

    // Update cheque status
    await req.db.execute(
      `UPDATE issued_cheques SET status = ?, cashed_date = ?, return_reason = ?, notes = ? WHERE id = ?`,
      [status, cashed_date, return_reason, notes, id]
    );

    // If cheque is cashed, no additional action needed (amount already deducted)
    // If cheque is returned, add amount back to bank account
    if (status === 'returned') {
      await req.db.execute(
        'UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?',
        [cheque.amount, cheque.bank_account_id]
      );

      // Create bank transaction record for return
      const [bankAccount] = await req.db.execute(
        'SELECT current_balance FROM bank_accounts WHERE id = ?',
        [cheque.bank_account_id]
      );

      const balance_after = bankAccount[0].current_balance;
      const balance_before = balance_after - parseFloat(cheque.amount);

      await req.db.execute(
        `INSERT INTO bank_transactions 
         (bank_account_id, transaction_type, amount, balance_before, balance_after, 
          transaction_date, description, created_by) 
         VALUES (?, 'deposit', ?, ?, ?, ?, ?, ?)`,
        [
          cheque.bank_account_id, cheque.amount, balance_before, balance_after,
          new Date().toISOString().split('T')[0], `Cheque returned: ${cheque.cheque_number}`, cheque.created_by
        ]
      );

      // Create daybook entry for income (cheque return)
      await req.db.execute(
        `INSERT INTO daybook_entries 
         (entry_date, entry_type, amount, payment_method, reference_number, description, source_type, created_by) 
         VALUES (?, 'income', ?, 'cheque', ?, ?, 'cheque_returned', ?)`,
        [new Date().toISOString().split('T')[0], cheque.amount, cheque.cheque_number, `Cheque returned: ${cheque.cheque_number}`, cheque.created_by]
      );
    }

    res.json({ message: 'Cheque status updated successfully' });
  } catch (error) {
    console.error('Error updating cheque status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete issued cheque (only if not cashed)
router.delete('/:id', async (req, res) => {
  try {
    // Check if cheque can be deleted
    const [cheques] = await req.db.execute(
      'SELECT status, amount, bank_account_id FROM issued_cheques WHERE id = ?',
      [req.params.id]
    );

    if (cheques.length === 0) {
      return res.status(404).json({ error: 'Issued cheque not found' });
    }

    const cheque = cheques[0];

    if (cheque.status === 'cashed') {
      return res.status(400).json({ error: 'Cannot delete cashed cheque' });
    }

    // If cheque is not cashed, add amount back to bank account
    if (cheque.status === 'issued') {
      await req.db.execute(
        'UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?',
        [cheque.amount, cheque.bank_account_id]
      );
    }

    // Delete the cheque
    await req.db.execute('DELETE FROM issued_cheques WHERE id = ?', [req.params.id]);

    res.json({ message: 'Issued cheque deleted successfully' });
  } catch (error) {
    console.error('Error deleting issued cheque:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
