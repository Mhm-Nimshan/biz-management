const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all vendors
router.get('/', async (req, res) => {
  try {
    const [vendors] = await db.execute('SELECT * FROM vendors ORDER BY created_at DESC');
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get vendor by ID
router.get('/:id', async (req, res) => {
  try {
    const [vendors] = await db.execute('SELECT * FROM vendors WHERE id = ?', [req.params.id]);

    if (vendors.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(vendors[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new vendor
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
    contact_person,
    payment_terms,
    tax_id,
    status
  } = req.body;

  try {
    const [result] = await db.execute(
      `INSERT INTO vendors
       (name, email, phone, address, city, state, zip_code, country, contact_person, payment_terms, tax_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, phone, address, city, state, zip_code, country, contact_person, payment_terms, tax_id, status]
    );

    res.json({
      message: 'Vendor created successfully',
      id: result.insertId
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update vendor
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    const [result] = await db.execute(
      `UPDATE vendors SET ${fields} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json({ message: 'Vendor updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete vendor
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM vendors WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
