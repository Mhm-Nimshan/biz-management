const express = require('express');
const router = express.Router();
const tenantAuth = require('../middleware/tenantAuth');

// Apply tenant authentication to all routes
router.use(tenantAuth);

// Get all customers
router.get('/', async (req, res) => {
  try {
    const [customers] = await req.db.execute('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer summary with invoices and returns (MUST come before /:id route)
router.get('/:id/summary', async (req, res) => {
  try {
    const customerId = req.params.id;
    
    // Get customer details
    const [customers] = await req.db.execute('SELECT * FROM customers WHERE id = ?', [customerId]);
    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const customer = customers[0];

    // Get invoices
    const [invoices] = await req.db.execute(`
      SELECT i.*, 
             e.first_name as salesman_first_name, e.last_name as salesman_last_name
      FROM invoices i
      LEFT JOIN employees e ON i.salesman_id = e.id
      WHERE i.customer_id = ?
      ORDER BY i.created_at DESC
    `, [customerId]);

    // Get invoice returns
    const [returns] = await req.db.execute(`
      SELECT ir.*, 
             i.invoice_number
      FROM invoice_returns ir
      LEFT JOIN invoices i ON ir.invoice_id = i.id
      WHERE ir.customer_id = ?
      ORDER BY ir.created_at DESC
    `, [customerId]);

    // Calculate totals
    const totalInvoices = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
    const totalReturns = returns.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);
    const openingBalance = parseFloat(customer.opening_balance || 0) || 0;
    const totalBalance = (openingBalance || 0) + (totalInvoices || 0) - (totalReturns || 0);

    res.json({
      customer,
      invoices,
      returns,
      summary: {
        opening_balance: openingBalance || 0,
        total_invoices: totalInvoices || 0,
        total_returns: totalReturns || 0,
        total_balance: totalBalance || 0,
        invoice_count: invoices.length || 0,
        return_count: returns.length || 0
      }
    });
  } catch (error) {
    console.error('Error fetching customer summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get customer by ID (must come after /:id/summary to avoid route conflict)
router.get('/:id', async (req, res) => {
  try {
    const [customers] = await req.db.execute('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    
    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(customers[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new customer
router.post('/', async (req, res) => {
  const {
    name,
    email,
    phone,
    address,
    city,
    state,
    zip_code,
    country,
    opening_balance
  } = req.body;

  try {
    const [result] = await req.db.execute(
      `INSERT INTO customers 
       (name, email, phone, address, city, state, zip_code, country, opening_balance) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, phone, address, city, state, zip_code, country, opening_balance || 0]
    );

    res.json({ 
      message: 'Customer created successfully', 
      id: result.insertId 
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  try {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    const [result] = await req.db.execute(
      `UPDATE customers SET ${fields} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ message: 'Customer updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await req.db.execute('DELETE FROM customers WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer orders/sales
router.get('/:id/orders', async (req, res) => {
  try {
    const [orders] = await req.db.execute(`
      SELECT s.*, e.first_name, e.last_name, e.employee_id
      FROM sales s
      LEFT JOIN employees e ON s.employee_id = e.id
      WHERE s.customer_email = (SELECT email FROM customers WHERE id = ?)
      ORDER BY s.created_at DESC
    `, [req.params.id]);

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
