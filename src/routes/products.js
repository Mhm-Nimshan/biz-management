const express = require('express');
const router = express.Router();
const tenantAuth = require('../middleware/tenantAuth');

// Apply tenant authentication to all routes
router.use(tenantAuth);

// Get all products
router.get('/', async (req, res) => {
  try {
    const [products] = await req.db.execute('SELECT * FROM products ORDER BY created_at DESC');
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const [products] = await req.db.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
    
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
    supplier_id,
    vendor_id,
    image_url
  } = req.body;

  try {
    // Start transaction
    const connection = await req.db.getConnection();
    await connection.beginTransaction();

    try {
      // Create product
      const [result] = await connection.execute(
        `INSERT INTO products 
         (name, description, selling_price, cost_price, category, sku, current_stock, min_stock_level, supplier_id, image_url) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, description, selling_price, cost_price, category, sku, current_stock, min_stock_level, supplier_id || null, image_url || null]
      );

      const productId = result.insertId;

      // If vendor is selected, create a purchase record
      if (vendor_id && current_stock > 0) {
        // Generate purchase number
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const purchase_number = `PO-${timestamp}-${random}`;

        // Calculate purchase amounts
        const subtotal = parseFloat(cost_price) * parseInt(current_stock);
        const tax_amount = subtotal * 0.1; // 10% tax
        const total_amount = subtotal + tax_amount;

        // Create purchase record
        const [purchaseResult] = await connection.execute(
          `INSERT INTO purchases 
           (purchase_number, vendor_id, subtotal, tax_amount, total_amount, purchase_date, status) 
           VALUES (?, ?, ?, ?, ?, CURDATE(), 'received')`,
          [purchase_number, vendor_id, subtotal, tax_amount, total_amount]
        );

        const purchaseId = purchaseResult.insertId;

        // Create purchase item
        await connection.execute(
          `INSERT INTO purchase_items 
           (purchase_id, product_name, quantity, unit_cost, total_cost, received_quantity) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [purchaseId, name, current_stock, cost_price, subtotal, current_stock]
        );

        console.log(`Purchase record created for product ${productId} with vendor ${vendor_id}`);
      }

      // Commit transaction
      await connection.commit();
      connection.release();

      res.json({ 
        message: 'Product created successfully', 
        id: productId,
        purchase_created: vendor_id ? true : false
      });
    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    console.error('Error creating product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  try {
    // Remove vendor_id from updates as it's handled separately
    const { vendor_id, ...productUpdates } = updates;
    
    const fields = Object.keys(productUpdates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(productUpdates);
    values.push(id);

    const [result] = await req.db.execute(
      `UPDATE products SET ${fields} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // If vendor_id is provided and product has stock, create a purchase record
    if (vendor_id && updates.current_stock > 0) {
      const connection = await req.db.getConnection();
      await connection.beginTransaction();

      try {
        // Generate purchase number
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const purchase_number = `PO-${timestamp}-${random}`;

        // Calculate purchase amounts
        const subtotal = parseFloat(updates.cost_price || 0) * parseInt(updates.current_stock || 0);
        const tax_amount = subtotal * 0.1; // 10% tax
        const total_amount = subtotal + tax_amount;

        // Create purchase record
        const [purchaseResult] = await connection.execute(
          `INSERT INTO purchases 
           (purchase_number, vendor_id, subtotal, tax_amount, total_amount, purchase_date, status) 
           VALUES (?, ?, ?, ?, ?, CURDATE(), 'received')`,
          [purchase_number, vendor_id, subtotal, tax_amount, total_amount]
        );

        const purchaseId = purchaseResult.insertId;

        // Create purchase item
        await connection.execute(
          `INSERT INTO purchase_items 
           (purchase_id, product_name, quantity, unit_cost, total_cost, received_quantity) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [purchaseId, updates.name, updates.current_stock, updates.cost_price, subtotal, updates.current_stock]
        );

        await connection.commit();
        connection.release();

        console.log(`Purchase record created for updated product ${id} with vendor ${vendor_id}`);
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    }

    res.json({ 
      message: 'Product updated successfully',
      purchase_created: vendor_id ? true : false
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await req.db.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
    
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

    const [result] = await req.db.execute(query, values);

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
    const [products] = await req.db.execute(
      'SELECT * FROM products WHERE current_stock <= min_stock_level ORDER BY current_stock ASC'
    );
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
