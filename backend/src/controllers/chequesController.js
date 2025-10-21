const db = require('../config/database');

// Get all cheques
const getCheques = async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT pc.*, 
             i.invoice_number,
             ba.account_name as bank_account_name,
             ba.bank_name,
             c.name as customer_name
      FROM payment_cheques pc
      LEFT JOIN invoices i ON pc.invoice_id = i.id
      LEFT JOIN bank_accounts ba ON pc.bank_account_id = ba.id
      LEFT JOIN customers c ON i.customer_id = c.id
    `;
    
    const params = [];
    
    if (status) {
      query += ' WHERE pc.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY pc.cheque_date DESC, pc.created_at DESC';
    
    const [cheques] = await db.execute(query, params);
    res.json(cheques);
  } catch (error) {
    console.error('Error fetching cheques:', error);
    res.status(500).json({ error: 'Failed to fetch cheques' });
  }
};

// Get a single cheque
const getCheque = async (req, res) => {
  try {
    const [cheques] = await db.execute(
      `SELECT pc.*, 
              i.invoice_number,
              ba.account_name as bank_account_name,
              ba.bank_name,
              c.name as customer_name
       FROM payment_cheques pc
       LEFT JOIN invoices i ON pc.invoice_id = i.id
       LEFT JOIN bank_accounts ba ON pc.bank_account_id = ba.id
       LEFT JOIN customers c ON i.customer_id = c.id
       WHERE pc.id = ?`,
      [req.params.id]
    );
    
    if (cheques.length === 0) {
      return res.status(404).json({ error: 'Cheque not found' });
    }
    
    res.json(cheques[0]);
  } catch (error) {
    console.error('Error fetching cheque:', error);
    res.status(500).json({ error: 'Failed to fetch cheque' });
  }
};

// Deposit a cheque
const depositCheque = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const { chequeId } = req.params;
    const { deposited_date } = req.body;

    // Get cheque details
    const [cheques] = await connection.execute(
      'SELECT * FROM payment_cheques WHERE id = ?',
      [chequeId]
    );

    if (cheques.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Cheque not found' });
    }

    const cheque = cheques[0];
    const currentDate = new Date(deposited_date);
    const chequeDate = new Date(cheque.cheque_date);

    // Determine status based on cheque date
    let newStatus = 'deposited';
    if (currentDate < chequeDate) {
      newStatus = 'on_hold';
    }

    // Update cheque status
    await connection.execute(
      'UPDATE payment_cheques SET status = ?, deposited_date = ? WHERE id = ?',
      [newStatus, deposited_date, chequeId]
    );

    // If cheque date has passed, update bank balance
    if (newStatus === 'deposited' && currentDate >= chequeDate) {
      // Get current bank balance
      const [account] = await connection.execute(
        'SELECT current_balance FROM bank_accounts WHERE id = ?',
        [cheque.bank_account_id]
      );

      const balanceBefore = parseFloat(account[0].current_balance);
      const chequeAmount = parseFloat(cheque.amount);
      const balanceAfter = balanceBefore + chequeAmount;

      // Create bank transaction
      const [transactionResult] = await connection.execute(
        `INSERT INTO bank_transactions (
          bank_account_id, transaction_type, amount, 
          balance_before, balance_after, transaction_date, value_date,
          related_invoice_id, related_cheque_id, description
        ) VALUES (?, 'cheque_deposit', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cheque.bank_account_id,
          chequeAmount,
          balanceBefore,
          balanceAfter,
          deposited_date,
          cheque.cheque_date,
          cheque.invoice_id,
          chequeId,
          `Cheque deposit - ${cheque.cheque_number}`
        ]
      );

      // Update bank account balance
      await connection.execute(
        'UPDATE bank_accounts SET current_balance = ? WHERE id = ?',
        [balanceAfter, cheque.bank_account_id]
      );

      // Mark cheque as cleared
      await connection.execute(
        'UPDATE payment_cheques SET status = ?, cleared_date = ? WHERE id = ?',
        ['cleared', deposited_date, chequeId]
      );
    }

    await connection.commit();

    const [updatedCheque] = await db.execute(
      `SELECT pc.*, 
              i.invoice_number,
              ba.account_name as bank_account_name
       FROM payment_cheques pc
       LEFT JOIN invoices i ON pc.invoice_id = i.id
       LEFT JOIN bank_accounts ba ON pc.bank_account_id = ba.id
       WHERE pc.id = ?`,
      [chequeId]
    );

    res.json(updatedCheque[0]);
  } catch (error) {
    await connection.rollback();
    console.error('Error depositing cheque:', error);
    res.status(500).json({ error: 'Failed to deposit cheque' });
  } finally {
    connection.release();
  }
};

// Process cheques on hold (to be run daily or on-demand)
const processHoldCheques = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    // Get all cheques on hold where cheque date has passed
    const [holdCheques] = await connection.execute(
      `SELECT * FROM payment_cheques 
       WHERE status = 'on_hold' 
       AND cheque_date <= CURDATE()`
    );

    let processedCount = 0;

    for (const cheque of holdCheques) {
      // Get current bank balance
      const [account] = await connection.execute(
        'SELECT current_balance FROM bank_accounts WHERE id = ?',
        [cheque.bank_account_id]
      );

      const balanceBefore = parseFloat(account[0].current_balance);
      const chequeAmount = parseFloat(cheque.amount);
      const balanceAfter = balanceBefore + chequeAmount;

      // Create bank transaction
      await connection.execute(
        `INSERT INTO bank_transactions (
          bank_account_id, transaction_type, amount, 
          balance_before, balance_after, transaction_date, value_date,
          related_invoice_id, related_cheque_id, description
        ) VALUES (?, 'cheque_deposit', ?, ?, ?, CURDATE(), ?, ?, ?, ?)`,
        [
          cheque.bank_account_id,
          chequeAmount,
          balanceBefore,
          balanceAfter,
          cheque.cheque_date,
          cheque.invoice_id,
          cheque.id,
          `Cheque cleared - ${cheque.cheque_number}`
        ]
      );

      // Update bank account balance
      await connection.execute(
        'UPDATE bank_accounts SET current_balance = ? WHERE id = ?',
        [balanceAfter, cheque.bank_account_id]
      );

      // Mark cheque as cleared
      await connection.execute(
        'UPDATE payment_cheques SET status = ?, cleared_date = CURDATE() WHERE id = ?',
        ['cleared', cheque.id]
      );

      processedCount++;
    }

    await connection.commit();
    res.json({ 
      message: `Successfully processed ${processedCount} cheques`,
      count: processedCount 
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error processing hold cheques:', error);
    res.status(500).json({ error: 'Failed to process hold cheques' });
  } finally {
    connection.release();
  }
};

// Return a cheque
const returnCheque = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const { chequeId } = req.params;
    const { return_reason } = req.body;

    // Get cheque details
    const [cheques] = await connection.execute(
      'SELECT * FROM payment_cheques WHERE id = ?',
      [chequeId]
    );

    if (cheques.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Cheque not found' });
    }

    const cheque = cheques[0];

    // If cheque was cleared, reverse the transaction
    if (cheque.status === 'cleared') {
      // Get current bank balance
      const [account] = await connection.execute(
        'SELECT current_balance FROM bank_accounts WHERE id = ?',
        [cheque.bank_account_id]
      );

      const balanceBefore = parseFloat(account[0].current_balance);
      const chequeAmount = parseFloat(cheque.amount);
      const balanceAfter = balanceBefore - chequeAmount;

      // Create reversal transaction
      await connection.execute(
        `INSERT INTO bank_transactions (
          bank_account_id, transaction_type, amount, 
          balance_before, balance_after, transaction_date,
          related_invoice_id, related_cheque_id, description
        ) VALUES (?, 'cheque_return', ?, ?, ?, CURDATE(), ?, ?, ?)`,
        [
          cheque.bank_account_id,
          chequeAmount,
          balanceBefore,
          balanceAfter,
          cheque.invoice_id,
          chequeId,
          `Cheque returned - ${cheque.cheque_number}: ${return_reason}`
        ]
      );

      // Update bank account balance
      await connection.execute(
        'UPDATE bank_accounts SET current_balance = ? WHERE id = ?',
        [balanceAfter, cheque.bank_account_id]
      );
    }

    // Update cheque status
    await connection.execute(
      'UPDATE payment_cheques SET status = ?, return_reason = ? WHERE id = ?',
      ['returned', return_reason, chequeId]
    );

    await connection.commit();

    const [updatedCheque] = await db.execute(
      `SELECT pc.*, 
              i.invoice_number,
              ba.account_name as bank_account_name
       FROM payment_cheques pc
       LEFT JOIN invoices i ON pc.invoice_id = i.id
       LEFT JOIN bank_accounts ba ON pc.bank_account_id = ba.id
       WHERE pc.id = ?`,
      [chequeId]
    );

    res.json(updatedCheque[0]);
  } catch (error) {
    await connection.rollback();
    console.error('Error returning cheque:', error);
    res.status(500).json({ error: 'Failed to return cheque' });
  } finally {
    connection.release();
  }
};

module.exports = {
  getCheques,
  getCheque,
  depositCheque,
  processHoldCheques,
  returnCheque
};

