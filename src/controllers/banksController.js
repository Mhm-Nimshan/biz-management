// Note: This controller uses req.db provided by tenantAuth middleware

// Get all bank accounts
const getBankAccounts = async (req, res) => {
  try {
    const [accounts] = await req.db.execute(`
      SELECT * FROM bank_accounts 
      ORDER BY created_at DESC
    `);
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    res.status(500).json({ error: 'Failed to fetch bank accounts' });
  }
};

// Get a single bank account
const getBankAccount = async (req, res) => {
  try {
    const [accounts] = await req.db.execute(
      'SELECT * FROM bank_accounts WHERE id = ?',
      [req.params.id]
    );
    
    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Bank account not found' });
    }
    
    res.json(accounts[0]);
  } catch (error) {
    console.error('Error fetching bank account:', error);
    res.status(500).json({ error: 'Failed to fetch bank account' });
  }
};

// Create a bank account
const createBankAccount = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    await connection.beginTransaction();
    
    const {
      account_name,
      account_number,
      bank_name,
      branch_name,
      account_type,
      opening_balance,
      currency,
      description
    } = req.body;

    // Insert bank account
    const [result] = await connection.execute(
      `INSERT INTO bank_accounts (
        account_name, account_number, bank_name, branch_name, 
        account_type, opening_balance, current_balance, currency, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        account_name,
        account_number,
        bank_name,
        branch_name || null,
        account_type || 'current',
        opening_balance || 0,
        opening_balance || 0,
        currency || 'USD',
        description || null
      ]
    );

    const bankAccountId = result.insertId;

    // If there's an opening balance, create a transaction record
    if (opening_balance && parseFloat(opening_balance) > 0) {
      await connection.execute(
        `INSERT INTO bank_transactions (
          bank_account_id, transaction_type, amount, 
          balance_before, balance_after, transaction_date, 
          description
        ) VALUES (?, 'deposit', ?, 0, ?, CURDATE(), 'Opening Balance')`,
        [bankAccountId, opening_balance, opening_balance]
      );
    }

    await connection.commit();

    const [newAccount] = await req.db.execute(
      'SELECT * FROM bank_accounts WHERE id = ?',
      [bankAccountId]
    );

    res.status(201).json(newAccount[0]);
  } catch (error) {
    await connection.rollback();
    console.error('Error creating bank account:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Account number already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create bank account' });
    }
  } finally {
    connection.release();
  }
};

// Update a bank account
const updateBankAccount = async (req, res) => {
  try {
    const {
      account_name,
      account_number,
      bank_name,
      branch_name,
      account_type,
      status,
      description
    } = req.body;

    await req.db.execute(
      `UPDATE bank_accounts 
       SET account_name = ?, account_number = ?, bank_name = ?, 
           branch_name = ?, account_type = ?, status = ?, description = ?
       WHERE id = ?`,
      [
        account_name,
        account_number,
        bank_name,
        branch_name,
        account_type,
        status,
        description,
        req.params.id
      ]
    );

    const [updatedAccount] = await req.db.execute(
      'SELECT * FROM bank_accounts WHERE id = ?',
      [req.params.id]
    );

    res.json(updatedAccount[0]);
  } catch (error) {
    console.error('Error updating bank account:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Account number already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update bank account' });
    }
  }
};

// Delete a bank account
const deleteBankAccount = async (req, res) => {
  try {
    // Check if there are any transactions
    const [transactions] = await req.db.execute(
      'SELECT COUNT(*) as count FROM bank_transactions WHERE bank_account_id = ?',
      [req.params.id]
    );

    if (transactions[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete bank account with existing transactions. Set status to inactive instead.' 
      });
    }

    await req.db.execute('DELETE FROM bank_accounts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Bank account deleted successfully' });
  } catch (error) {
    console.error('Error deleting bank account:', error);
    res.status(500).json({ error: 'Failed to delete bank account' });
  }
};

// Get bank transactions
const getBankTransactions = async (req, res) => {
  try {
    const { bankAccountId } = req.params;
    
    const [transactions] = await req.db.execute(
      `SELECT bt.*, ba.account_name, ba.bank_name,
              i.invoice_number, pc.cheque_number
       FROM bank_transactions bt
       LEFT JOIN bank_accounts ba ON bt.bank_account_id = ba.id
       LEFT JOIN invoices i ON bt.related_invoice_id = i.id
       LEFT JOIN payment_cheques pc ON bt.related_cheque_id = pc.id
       WHERE bt.bank_account_id = ?
       ORDER BY bt.transaction_date DESC, bt.created_at DESC`,
      [bankAccountId]
    );
    
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching bank transactions:', error);
    res.status(500).json({ error: 'Failed to fetch bank transactions' });
  }
};

// Deposit cash to bank
const depositCash = async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    await connection.beginTransaction();
    
    const { bank_account_id, amount, transaction_date, reference_number, description } = req.body;

    // Get current balance
    const [account] = await connection.execute(
      'SELECT current_balance FROM bank_accounts WHERE id = ?',
      [bank_account_id]
    );

    if (account.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Bank account not found' });
    }

    const balanceBefore = parseFloat(account[0].current_balance);
    const depositAmount = parseFloat(amount);
    const balanceAfter = balanceBefore + depositAmount;

    // Create transaction record
    await connection.execute(
      `INSERT INTO bank_transactions (
        bank_account_id, transaction_type, amount, 
        balance_before, balance_after, transaction_date, 
        reference_number, description
      ) VALUES (?, 'deposit', ?, ?, ?, ?, ?, ?)`,
      [
        bank_account_id,
        depositAmount,
        balanceBefore,
        balanceAfter,
        transaction_date,
        reference_number || null,
        description || 'Cash Deposit'
      ]
    );

    // Update bank account balance
    await connection.execute(
      'UPDATE bank_accounts SET current_balance = ? WHERE id = ?',
      [balanceAfter, bank_account_id]
    );

    await connection.commit();
    res.json({ message: 'Cash deposited successfully', balance: balanceAfter });
  } catch (error) {
    await connection.rollback();
    console.error('Error depositing cash:', error);
    res.status(500).json({ error: 'Failed to deposit cash' });
  } finally {
    connection.release();
  }
};

module.exports = {
  getBankAccounts,
  getBankAccount,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  getBankTransactions,
  depositCash
};

