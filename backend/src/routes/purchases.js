const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Generate purchase number
const generatePurchaseNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PO-${timestamp}-${random}`;
};

// Get all purchases
router.get('/', async (req, res) => {
  try {
    const [purchases] = await db.execute(`
      SELECT p.*, v.name as vendor_name, v.email as vendor_email,
             e.first_name, e.last_name
      FROM purchases p
      LEFT JOIN vendors v ON p.vendor_id = v.id
      LEFT JOIN employees e ON p.employee_id = e.id
      ORDER BY p.created_at DESC
    `);
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get purchase by ID
router.get('/:id', async (req, res) => {
  try {
    const [purchases] = await db.execute(`
      SELECT p.*, v.name as vendor_name, v.email as vendor_email,
             e.first_name, e.last_name
      FROM purchases p
      LEFT JOIN vendors v ON p.vendor_id = v.id
      LEFT JOIN employees e ON p.employee_id = e.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (purchases.length === 0) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // Get purchase items
    const [items] = await db.execute(`
      SELECT pi.*
      FROM purchase_items pi
      WHERE pi.purchase_id = ?
    `, [req.params.id]);

    res.json({
      ...purchases[0],
      items
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new purchase
router.post('/', async (req, res) => {
  const {
    vendor_id,
    employee_id = null,
    items,
    subtotal,
    tax_amount = 0,
    discount_amount = 0,
    total_amount,
    purchase_date,
    expected_delivery_date,
    notes
  } = req.body;

  console.log('Creating purchase with data:', {
    vendor_id,
    employee_id,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    purchase_date,
    expected_delivery_date,
    notes,
    items
  });

  try {
    // Create purchase
    const purchase_number = generatePurchaseNumber();
    const [purchaseResult] = await db.execute(
      `INSERT INTO purchases 
       (purchase_number, vendor_id, employee_id, subtotal, tax_amount, discount_amount, 
        total_amount, purchase_date, expected_delivery_date, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [purchase_number, vendor_id, employee_id, subtotal, tax_amount, discount_amount, 
       total_amount, purchase_date, expected_delivery_date, notes]
    );

    const purchaseId = purchaseResult.insertId;

    // Create purchase items
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const { product_name, quantity, unit_cost, total_cost } = item;
        
        await db.execute(
          `INSERT INTO purchase_items (purchase_id, product_name, quantity, unit_cost, total_cost) 
           VALUES (?, ?, ?, ?, ?)`,
          [purchaseId, product_name, quantity, unit_cost, total_cost]
        );
      }
    }

    res.json({ 
      message: 'Purchase created successfully', 
      id: purchaseId,
      purchase_number: purchase_number
    });
  } catch (error) {
    console.error('Error creating purchase:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
  }
});

// Update purchase
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    vendor_id,
    employee_id = null,
    items,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    purchase_date,
    expected_delivery_date,
    notes,
    status
  } = req.body;

  try {
    // Update purchase
    await db.execute(
      `UPDATE purchases SET 
       vendor_id = ?, employee_id = ?, subtotal = ?, tax_amount = ?, discount_amount = ?, 
       total_amount = ?, purchase_date = ?, expected_delivery_date = ?, notes = ?, status = ?
       WHERE id = ?`,
      [vendor_id, employee_id, subtotal, tax_amount, discount_amount, 
       total_amount, purchase_date, expected_delivery_date, notes, status, id]
    );

    // Update purchase items (delete existing and insert new)
    if (items && Array.isArray(items)) {
      // Delete existing items
      await db.execute('DELETE FROM purchase_items WHERE purchase_id = ?', [id]);
      
      // Insert new items
      for (const item of items) {
        const { product_name, quantity, unit_cost, total_cost } = item;
        
        await db.execute(
          `INSERT INTO purchase_items (purchase_id, product_name, quantity, unit_cost, total_cost) 
           VALUES (?, ?, ?, ?, ?)`,
          [id, product_name, quantity, unit_cost, total_cost]
        );
      }
    }

    res.json({ message: 'Purchase updated successfully' });
  } catch (error) {
    console.error('Error updating purchase:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete purchase
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM purchases WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    res.json({ message: 'Purchase deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get purchase items
router.get('/:id/items', async (req, res) => {
  try {
    const [items] = await db.execute(`
      SELECT pi.*
      FROM purchase_items pi
      WHERE pi.purchase_id = ?
    `, [req.params.id]);

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
