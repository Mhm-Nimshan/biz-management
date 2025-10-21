const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all accounts
router.get('/', async (req, res) => {
  try {
    const [accounts] = await db.execute('SELECT * FROM accounts ORDER BY account_name');
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get account by ID
router.get('/:id', async (req, res) => {
  try {
    const [accounts] = await db.execute('SELECT * FROM accounts WHERE id = ?', [req.params.id]);

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json(accounts[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new account
router.post('/', async (req, res) => {
  const {
    account_name,
    account_type,
    description,
    opening_balance = 0,
    status = 'active'
  } = req.body;

  try {
    const [result] = await db.execute(
      `INSERT INTO accounts
       (account_name, account_type, description, opening_balance, current_balance, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [account_name, account_type, description, opening_balance, opening_balance, status]
    );

    res.json({
      message: 'Account created successfully',
      id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update account
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    const [result] = await db.execute(
      `UPDATE accounts SET ${fields} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ message: 'Account updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete account
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM accounts WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
