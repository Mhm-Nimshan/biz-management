const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Generate unique invoice number
const generateInvoiceNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `INV-${timestamp}-${random}`;
};

// Get all invoices
router.get('/', async (req, res) => {
  try {
    const [invoices] = await db.execute(`
      SELECT i.*, 
             c.name as customer_name, c.email as customer_email,
             e.first_name as salesman_first_name, e.last_name as salesman_last_name,
             e.employee_id as salesman_id
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN employees e ON i.salesman_id = e.id
      ORDER BY i.created_at DESC
    `);
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get invoice by ID
router.get('/:id', async (req, res) => {
  try {
    const [invoices] = await db.execute(`
      SELECT i.*, 
             c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
             c.address as customer_address, c.city as customer_city, c.state as customer_state,
             e.first_name as salesman_first_name, e.last_name as salesman_last_name,
             e.employee_id as salesman_id, e.commission_rate
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN employees e ON i.salesman_id = e.id
      WHERE i.id = ?
    `, [req.params.id]);
    
    if (invoices.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Get invoice items
    const [items] = await db.execute(`
      SELECT ii.*, p.name as product_name, p.sku, p.description
      FROM invoice_items ii
      LEFT JOIN products p ON ii.product_id = p.id
      WHERE ii.invoice_id = ?
    `, [req.params.id]);

    const invoice = {
      ...invoices[0],
      items: items
    };
    
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new invoice
router.post('/', async (req, res) => {
  const {
    customer_id,
    salesman_id,
    items,
    subtotal,
    tax_amount = 0,
    discount_amount = 0,
    total_amount,
    due_date,
    notes
  } = req.body;

  console.log('Creating invoice with data:', {
    customer_id,
    salesman_id,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    due_date,
    notes,
    items
  });

  try {
    // Get salesman commission rate
    let commission_rate = 0;
    if (salesman_id) {
      const [salesman] = await db.execute(
        'SELECT commission_rate FROM employees WHERE id = ? AND role = "salesman"',
        [salesman_id]
      );
      if (salesman.length > 0) {
        commission_rate = salesman[0].commission_rate || 0;
      }
    }

    const commission_amount = (total_amount * commission_rate / 100);

    // Create invoice
    const invoice_number = generateInvoiceNumber();
    const [invoiceResult] = await db.execute(
      `INSERT INTO invoices 
       (invoice_number, customer_id, salesman_id, subtotal, tax_amount, discount_amount, 
        total_amount, commission_amount, due_date, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [invoice_number, customer_id, salesman_id, subtotal, tax_amount, discount_amount, 
       total_amount, commission_amount, due_date, notes]
    );

    const invoiceId = invoiceResult.insertId;

    // Create invoice items
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const { product_id, quantity, unit_price, total_price } = item;
        
        await db.execute(
          `INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, total_price) 
           VALUES (?, ?, ?, ?, ?)`,
          [invoiceId, product_id, quantity, unit_price, total_price]
        );
      }
    }

    res.json({ 
      message: 'Invoice created successfully', 
      id: invoiceId,
      invoice_number: invoice_number
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
  }
});

// Update invoice
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { items, ...updates } = req.body; // Separate items from other updates
  
  try {
    // If updating total_amount, recalculate commission
    if (updates.total_amount && updates.salesman_id) {
      const [salesman] = await db.execute(
        'SELECT commission_rate FROM employees WHERE id = ? AND role = "salesman"',
        [updates.salesman_id]
      );
      if (salesman.length > 0) {
        const commission_rate = salesman[0].commission_rate || 0;
        updates.commission_amount = (updates.total_amount * commission_rate / 100);
      }
    }

    // Update invoice main record (if there are fields to update)
    if (Object.keys(updates).length > 0) {
      const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      values.push(id);

      const [result] = await db.execute(
        `UPDATE invoices SET ${fields} WHERE id = ?`,
        values
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
    }

    // Update invoice items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items
      await db.execute('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);

      // Insert new items
      for (const item of items) {
        const { product_id, quantity, unit_price, total_price } = item;
        
        await db.execute(
          `INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, total_price) 
           VALUES (?, ?, ?, ?, ?)`,
          [id, product_id, quantity, unit_price, total_price]
        );
      }
    }

    res.json({ message: 'Invoice updated successfully' });
  } catch (error) {
    console.error('Error updating invoice:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    // Delete invoice items first (due to foreign key constraint)
    await db.execute('DELETE FROM invoice_items WHERE invoice_id = ?', [req.params.id]);

    // Delete invoice
    const [result] = await db.execute('DELETE FROM invoices WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
  }
});

// Get invoices by salesman
router.get('/salesman/:salesman_id', async (req, res) => {
  try {
    const [invoices] = await db.execute(`
      SELECT i.*, 
             c.name as customer_name, c.email as customer_email,
             e.first_name as salesman_first_name, e.last_name as salesman_last_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN employees e ON i.salesman_id = e.id
      WHERE i.salesman_id = ?
      ORDER BY i.created_at DESC
    `, [req.params.salesman_id]);

    res.json(invoices);
  } catch (error) {
    console.error('Error getting invoices by salesman:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
  }
});

// Get commission summary for salesman
router.get('/commission/:salesman_id', async (req, res) => {
  const { start_date, end_date } = req.query;

  try {
    let query = `
      SELECT 
        COUNT(*) as total_invoices,
        SUM(total_amount) as total_sales,
        SUM(commission_amount) as total_commission,
        AVG(commission_amount) as avg_commission_per_invoice
      FROM invoices
      WHERE salesman_id = ? AND status IN ('sent', 'paid')
    `;
    
    let params = [req.params.salesman_id];
    
    if (start_date && end_date) {
      query += ' AND DATE(created_at) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    const [summary] = await db.execute(query, params);
    res.json(summary[0]);
  } catch (error) {
    console.error('Error getting commission summary for salesman:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
  }
});

// Add payment to invoice
router.post('/:id/payment', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const {
      payment_type,
      amount,
      payment_date,
      bank_account_id,
      customer_id, // Added for payments without specific invoice
      // Cheque specific fields
      cheque_number,
      cheque_date,
      received_date,
      payer_name,
      payer_bank,
      payer_account,
      reference_number,
      notes
    } = req.body;

    // Verify invoice exists and get customer_id
    const [invoice] = await connection.execute(
      'SELECT * FROM invoices WHERE id = ?',
      [id]
    );

    if (invoice.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoiceCustomerId = invoice[0].customer_id;
    let chequeId = null;

    // If payment is by cheque, create cheque record
    if (payment_type === 'cheque') {
      if (!bank_account_id || !cheque_number || !cheque_date || !received_date) {
        await connection.rollback();
        return res.status(400).json({ 
          error: 'Cheque payments require bank_account_id, cheque_number, cheque_date, and received_date' 
        });
      }

      const [chequeResult] = await connection.execute(
        `INSERT INTO payment_cheques (
          cheque_number, invoice_id, bank_account_id, amount, 
          cheque_date, received_date, payer_name, payer_bank, 
          payer_account, notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          cheque_number,
          id,
          bank_account_id,
          amount,
          cheque_date,
          received_date,
          payer_name || null,
          payer_bank || null,
          payer_account || null,
          notes || null
        ]
      );

      chequeId = chequeResult.insertId;
    }

    // If payment is cash deposit to bank
    if (payment_type === 'cash' && bank_account_id) {
      // Get current bank balance
      const [bankAccount] = await connection.execute(
        'SELECT current_balance FROM bank_accounts WHERE id = ?',
        [bank_account_id]
      );

      if (bankAccount.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Bank account not found' });
      }

      const balanceBefore = parseFloat(bankAccount[0].current_balance);
      const depositAmount = parseFloat(amount);
      const balanceAfter = balanceBefore + depositAmount;

      // Create bank transaction
      await connection.execute(
        `INSERT INTO bank_transactions (
          bank_account_id, transaction_type, amount, 
          balance_before, balance_after, transaction_date, 
          related_invoice_id, reference_number, description
        ) VALUES (?, 'deposit', ?, ?, ?, ?, ?, ?, ?)`,
        [
          bank_account_id,
          depositAmount,
          balanceBefore,
          balanceAfter,
          payment_date,
          id,
          reference_number || null,
          `Cash deposit from invoice ${invoice[0].invoice_number}`
        ]
      );

      // Update bank account balance
      await connection.execute(
        'UPDATE bank_accounts SET current_balance = ? WHERE id = ?',
        [balanceAfter, bank_account_id]
      );
    }

    // Note: Cash payments are automatically displayed in daybook via invoice_payments table query
    // No need to create separate daybook_entries to avoid duplication

    // Create invoice payment record with customer_id
    await connection.execute(
      `INSERT INTO invoice_payments (
        invoice_id, customer_id, payment_type, amount, payment_date, 
        bank_account_id, cheque_id, reference_number, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        invoiceCustomerId,
        payment_type,
        amount,
        payment_date,
        bank_account_id || null,
        chequeId,
        reference_number || null,
        notes || null
      ]
    );

    // Update invoice status to paid if full payment received
    const [payments] = await connection.execute(
      'SELECT SUM(amount) as total_paid FROM invoice_payments WHERE invoice_id = ?',
      [id]
    );

    const totalPaid = parseFloat(payments[0].total_paid || 0);
    const invoiceAmount = parseFloat(invoice[0].total_amount);

    if (totalPaid >= invoiceAmount) {
      await connection.execute(
        'UPDATE invoices SET status = "paid" WHERE id = ?',
        [id]
      );

      // Record commission for salesman when invoice is paid
      if (invoice[0].salesman_id && invoice[0].commission_amount > 0) {
        // Check if commission already recorded to avoid duplicates
        const [existingCommission] = await connection.execute(
          'SELECT id FROM employee_commissions WHERE invoice_id = ?',
          [id]
        );

        if (existingCommission.length === 0) {
          // Get salesman's commission rate
          const [salesman] = await connection.execute(
            'SELECT commission_rate FROM employees WHERE id = ?',
            [invoice[0].salesman_id]
          );

          if (salesman.length > 0 && salesman[0].commission_rate > 0) {
            await connection.execute(
              `INSERT INTO employee_commissions (
                employee_id, invoice_id, sale_amount, commission_rate, 
                commission_amount, commission_date, status
              ) VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
              [
                invoice[0].salesman_id,
                id,
                invoice[0].total_amount,
                salesman[0].commission_rate,
                invoice[0].commission_amount,
                payment_date
              ]
            );
          }
        }
      }
    }

    await connection.commit();
    res.json({ 
      message: 'Payment added successfully',
      cheque_id: chequeId 
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error adding payment:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Get all payments (for customer balance calculations) - must be before /:id routes
router.get('/payments/all', async (req, res) => {
  try {
    const [payments] = await db.execute(
      `SELECT ip.*, 
              ba.account_name as bank_account_name,
              ba.bank_name,
              pc.cheque_number, pc.cheque_date, pc.status as cheque_status
       FROM invoice_payments ip
       LEFT JOIN bank_accounts ba ON ip.bank_account_id = ba.id
       LEFT JOIN payment_cheques pc ON ip.cheque_id = pc.id
       ORDER BY ip.payment_date DESC`
    );
    
    res.json(payments);
  } catch (error) {
    console.error('Error fetching all payments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get invoice payments
router.get('/:id/payments', async (req, res) => {
  try {
    const [payments] = await db.execute(
      `SELECT ip.*, 
              ba.account_name as bank_account_name,
              pc.cheque_number, pc.cheque_date, pc.status as cheque_status
       FROM invoice_payments ip
       LEFT JOIN bank_accounts ba ON ip.bank_account_id = ba.id
       LEFT JOIN payment_cheques pc ON ip.cheque_id = pc.id
       WHERE ip.invoice_id = ?
       ORDER BY ip.payment_date DESC`,
      [req.params.id]
    );
    
    res.json(payments);
  } catch (error) {
    console.error('Error fetching invoice payments:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
