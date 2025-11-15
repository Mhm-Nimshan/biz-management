const express = require('express');
const router = express.Router();
const tenantAuth = require('../middleware/tenantAuth');

// Apply tenant authentication to all routes
router.use(tenantAuth);

// Generate party cheque number
const generatePartyChequeNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PC-${timestamp}-${random}`;
};

// Get all party cheques
router.get('/', async (req, res) => {
  try {
    const { status, vendor_id } = req.query;
    
    let query = `
      SELECT pc.*, 
             pc_original.cheque_number as original_cheque_number,
             pc_original.amount as original_amount,
             pc_original.customer_name,
             v.name as vendor_name,
             e.first_name,
             e.last_name
      FROM party_cheques pc
      LEFT JOIN payment_cheques pc_original ON pc.customer_cheque_id = pc_original.id
      LEFT JOIN vendors v ON pc.vendor_id = v.id
      LEFT JOIN employees e ON pc.created_by = e.id
    `;
    
    const params = [];
    const conditions = [];
    
    if (status) {
      conditions.push('pc.status = ?');
      params.push(status);
    }
    
    if (vendor_id) {
      conditions.push('pc.vendor_id = ?');
      params.push(vendor_id);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY pc.issue_date DESC, pc.created_at DESC';
    
    const [cheques] = await req.db.execute(query, params);
    res.json(cheques);
  } catch (error) {
    console.error('Error fetching party cheques:', error);
    res.status(500).json({ error: 'Failed to fetch party cheques' });
  }
});

// Get party cheque by ID
router.get('/:id', async (req, res) => {
  try {
    const [cheques] = await req.db.execute(`
      SELECT pc.*, 
             pc_original.cheque_number as original_cheque_number,
             pc_original.amount as original_amount,
             pc_original.customer_name,
             v.name as vendor_name,
             e.first_name,
             e.last_name
      FROM party_cheques pc
      LEFT JOIN payment_cheques pc_original ON pc.customer_cheque_id = pc_original.id
      LEFT JOIN vendors v ON pc.vendor_id = v.id
      LEFT JOIN employees e ON pc.created_by = e.id
      WHERE pc.id = ?
    `, [req.params.id]);

    if (cheques.length === 0) {
      return res.status(404).json({ error: 'Party cheque not found' });
    }

    res.json(cheques[0]);
  } catch (error) {
    console.error('Error fetching party cheque:', error);
    res.status(500).json({ error: 'Failed to fetch party cheque' });
  }
});

// Create new party cheque (issue customer cheque to vendor)
router.post('/', async (req, res) => {
  const {
    customer_cheque_id,
    vendor_id,
    amount,
    issue_date,
    description = null,
    notes = null,
    created_by = null
  } = req.body;

  try {
    // Validate required fields
    if (!customer_cheque_id || !vendor_id || !amount || !issue_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if customer cheque exists and is cleared
    const [customerCheques] = await req.db.execute(
      'SELECT * FROM payment_cheques WHERE id = ? AND status = "cleared"',
      [customer_cheque_id]
    );

    if (customerCheques.length === 0) {
      return res.status(400).json({ error: 'Customer cheque not found or not cleared' });
    }

    const customerCheque = customerCheques[0];

    // Check if amount is valid
    if (parseFloat(amount) > parseFloat(customerCheque.amount)) {
      return res.status(400).json({ error: 'Party cheque amount cannot exceed customer cheque amount' });
    }

    // Generate party cheque number
    const cheque_number = generatePartyChequeNumber();

    // Create party cheque
    const [result] = await req.db.execute(
      `INSERT INTO party_cheques 
       (cheque_number, customer_cheque_id, vendor_id, amount, issue_date, description, notes, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [cheque_number, customer_cheque_id, vendor_id, amount, issue_date, description, notes, created_by]
    );

    // Create daybook entry for expense (party cheque issued)
    await req.db.execute(
      `INSERT INTO daybook_entries 
       (entry_date, entry_type, amount, payment_method, reference_number, description, source_type, created_by) 
       VALUES (?, 'expense', ?, 'cheque', ?, ?, 'party_cheque_issued')`,
      [issue_date, amount, cheque_number, `Party cheque issued to vendor`, created_by]
    );

    res.json({ 
      message: 'Party cheque issued successfully', 
      id: result.insertId,
      cheque_number: cheque_number
    });
  } catch (error) {
    console.error('Error creating party cheque:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update party cheque status
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, cashed_date = null, return_reason = null, notes = null } = req.body;

  try {
    // Get current cheque details
    const [cheques] = await req.db.execute(
      'SELECT * FROM party_cheques WHERE id = ?',
      [id]
    );

    if (cheques.length === 0) {
      return res.status(404).json({ error: 'Party cheque not found' });
    }

    const cheque = cheques[0];

    // Update cheque status
    await req.db.execute(
      `UPDATE party_cheques SET status = ?, cashed_date = ?, return_reason = ?, notes = ? WHERE id = ?`,
      [status, cashed_date, return_reason, notes, id]
    );

    // If cheque is returned, create daybook entry for income (cheque return)
    if (status === 'returned') {
      await req.db.execute(
        `INSERT INTO daybook_entries 
         (entry_date, entry_type, amount, payment_method, reference_number, description, source_type, created_by) 
         VALUES (?, 'income', ?, 'cheque', ?, ?, 'party_cheque_returned')`,
        [new Date().toISOString().split('T')[0], cheque.amount, cheque.cheque_number, `Party cheque returned: ${cheque.cheque_number}`, cheque.created_by]
      );
    }

    res.json({ message: 'Party cheque status updated successfully' });
  } catch (error) {
    console.error('Error updating party cheque status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete party cheque
router.delete('/:id', async (req, res) => {
  try {
    // Check if cheque can be deleted
    const [cheques] = await req.db.execute(
      'SELECT status FROM party_cheques WHERE id = ?',
      [req.params.id]
    );

    if (cheques.length === 0) {
      return res.status(404).json({ error: 'Party cheque not found' });
    }

    const cheque = cheques[0];

    if (cheque.status === 'cashed') {
      return res.status(400).json({ error: 'Cannot delete cashed party cheque' });
    }

    // Delete the cheque
    await req.db.execute('DELETE FROM party_cheques WHERE id = ?', [req.params.id]);

    res.json({ message: 'Party cheque deleted successfully' });
  } catch (error) {
    console.error('Error deleting party cheque:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
