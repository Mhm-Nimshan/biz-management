const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all sales
router.get('/', async (req, res) => {
  try {
    const [sales] = await db.execute(`
      SELECT s.*, e.first_name, e.last_name, e.employee_id
      FROM sales s
      LEFT JOIN employees e ON s.employee_id = e.id
      ORDER BY s.created_at DESC
    `);
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sale by ID
router.get('/:id', async (req, res) => {
  try {
    const [sales] = await db.execute(`
      SELECT s.*, e.first_name, e.last_name, e.employee_id
      FROM sales s
      LEFT JOIN employees e ON s.employee_id = e.id
      WHERE s.id = ?
    `, [req.params.id]);
    
    if (sales.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    res.json(sales[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new sale
router.post('/', async (req, res) => {
  const {
    customer_name,
    customer_email = null,
    customer_phone = null,
    employee_id = null,
    total_amount,
    discount_amount = 0,
    tax_amount = 0,
    payment_method,
    card_last_four = null,
    card_type = null,
    status = 'completed',
    notes = null
  } = req.body;

  let connection;
  
  try {
    // Get a connection from the pool for transaction
    connection = await db.getConnection();
    
    // Start transaction
    await connection.beginTransaction();

    console.log('Creating sale with data:', {
      customer_name,
      total_amount,
      payment_method,
      items_count: req.body.items?.length
    });

    // Create sale record with optional card details
    const [saleResult] = await connection.execute(
      `INSERT INTO sales 
       (customer_name, customer_email, customer_phone, employee_id, total_amount, 
        discount_amount, tax_amount, payment_method, card_last_four, card_type, status, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer_name, customer_email, customer_phone, employee_id, total_amount,
       discount_amount, tax_amount, payment_method, card_last_four, card_type, status, notes]
    );

    const saleId = saleResult.insertId;
    console.log('Sale created with ID:', saleId);

    // If sale items are provided, create them
    if (req.body.items && Array.isArray(req.body.items)) {
      for (const item of req.body.items) {
        const { product_id, quantity, unit_price } = item;
        
        console.log('Adding sale item:', { product_id, quantity, unit_price });
        
        // Create sale item
        await connection.execute(
          `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) 
           VALUES (?, ?, ?, ?)`,
          [saleId, product_id, quantity, unit_price]
        );

        // Update product stock
        await connection.execute(
          'UPDATE products SET current_stock = current_stock - ? WHERE id = ?',
          [quantity, product_id]
        );
      }
    }

    // Commit transaction
    await connection.commit();
    console.log('Transaction committed successfully');
    
    // Release connection back to pool
    connection.release();

    res.json({ 
      message: 'Sale created successfully', 
      id: saleId 
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    console.error('Error stack:', error.stack);
    
    // Rollback transaction on error
    if (connection) {
      try {
        await connection.rollback();
        console.log('Transaction rolled back');
      } catch (rollbackError) {
        console.error('Error rolling back:', rollbackError);
      }
      connection.release();
    }
    
    res.status(500).json({ 
      error: error.message,
      details: error.sqlMessage || 'No additional details'
    });
  }
});

// Update sale
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  try {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    const [result] = await db.execute(
      `UPDATE sales SET ${fields} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    res.json({ message: 'Sale updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete sale
router.delete('/:id', async (req, res) => {
  // Get a connection from the pool for transaction
  const connection = await db.getConnection();

  try {
    // Start transaction
    await connection.beginTransaction();

    // Get sale items to restore stock
    const [saleItems] = await connection.execute(
      'SELECT product_id, quantity FROM sale_items WHERE sale_id = ?',
      [req.params.id]
    );

    // Restore stock for each item
    for (const item of saleItems) {
      await connection.execute(
        'UPDATE products SET current_stock = current_stock + ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    // Delete sale items
    await connection.execute('DELETE FROM sale_items WHERE sale_id = ?', [req.params.id]);

    // Delete sale
    const [result] = await connection.execute('DELETE FROM sales WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: 'Sale not found' });
    }

    // Commit transaction
    await connection.commit();
    connection.release();
    
    res.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error deleting sale:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get sales by date range
router.get('/reports/date-range', async (req, res) => {
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }

  try {
    const [sales] = await db.execute(`
      SELECT s.*, e.first_name, e.last_name, e.employee_id
      FROM sales s
      LEFT JOIN employees e ON s.employee_id = e.id
      WHERE DATE(s.created_at) BETWEEN ? AND ?
      ORDER BY s.created_at DESC
    `, [start_date, end_date]);

    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sales summary
router.get('/reports/summary', async (req, res) => {
  const { start_date, end_date } = req.query;

  try {
    let query = `
      SELECT 
        COUNT(*) as total_sales,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_sale,
        SUM(discount_amount) as total_discounts,
        SUM(tax_amount) as total_taxes
      FROM sales
    `;
    
    let params = [];
    
    if (start_date && end_date) {
      query += ' WHERE DATE(created_at) BETWEEN ? AND ?';
      params = [start_date, end_date];
    }

    const [summary] = await db.execute(query, params);
    res.json(summary[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sale items for a specific sale
router.get('/:id/items', async (req, res) => {
  try {
    const [items] = await db.execute(`
      SELECT si.*, p.name as product_name, p.sku
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `, [req.params.id]);

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
