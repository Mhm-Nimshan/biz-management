const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all customers
router.get('/', async (req, res) => {
  try {
    const [customers] = await db.execute('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer by ID
router.get('/:id', async (req, res) => {
  try {
    const [customers] = await db.execute('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    
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
    country
  } = req.body;

  try {
    const [result] = await db.execute(
      `INSERT INTO customers 
       (name, email, phone, address, city, state, zip_code, country) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, phone, address, city, state, zip_code, country]
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

    const [result] = await db.execute(
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
    const [result] = await db.execute('DELETE FROM customers WHERE id = ?', [req.params.id]);
    
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
    const [orders] = await db.execute(`
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
