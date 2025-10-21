const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all products
router.get('/', async (req, res) => {
  try {
    const [products] = await db.execute('SELECT * FROM products ORDER BY created_at DESC');
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const [products] = await db.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
    
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(products[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new product
router.post('/', async (req, res) => {
  const {
    name,
    description,
    selling_price,
    cost_price,
    category,
    sku,
    current_stock,
    min_stock_level,
    supplier_id
  } = req.body;

  try {
    const [result] = await db.execute(
      `INSERT INTO products 
       (name, description, selling_price, cost_price, category, sku, current_stock, min_stock_level, supplier_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, selling_price, cost_price, category, sku, current_stock, min_stock_level, supplier_id]
    );

    res.json({ 
      message: 'Product created successfully', 
      id: result.insertId 
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  try {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    const [result] = await db.execute(
      `UPDATE products SET ${fields} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update stock quantity
router.patch('/:id/stock', async (req, res) => {
  const { id } = req.params;
  const { quantity, operation = 'set' } = req.body; // operation: 'set', 'add', 'subtract'

  try {
    let query, values;
    
    if (operation === 'set') {
      query = 'UPDATE products SET current_stock = ? WHERE id = ?';
      values = [quantity, id];
    } else if (operation === 'add') {
      query = 'UPDATE products SET current_stock = current_stock + ? WHERE id = ?';
      values = [quantity, id];
    } else if (operation === 'subtract') {
      query = 'UPDATE products SET current_stock = current_stock - ? WHERE id = ?';
      values = [quantity, id];
    } else {
      return res.status(400).json({ error: 'Invalid operation. Use: set, add, or subtract' });
    }

    const [result] = await db.execute(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Stock updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get low stock products
router.get('/alerts/low-stock', async (req, res) => {
  try {
    const [products] = await db.execute(
      'SELECT * FROM products WHERE current_stock <= min_stock_level ORDER BY current_stock ASC'
    );
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
