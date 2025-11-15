const express = require('express');
const router = express.Router();
const tenantAuth = require('../middleware/tenantAuth');

// Apply tenant authentication to all routes
router.use(tenantAuth);

// Generate purchase number
const generatePurchaseNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PO-${timestamp}-${random}`;
};

// Get all purchases
router.get('/', async (req, res) => {
  try {
    const [purchases] = await req.db.execute(`
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

// Get purchase returns (MUST come before /:id route to avoid route conflict)
router.get('/returns', async (req, res) => {
  try {
    const [returns] = await req.db.execute(`
      SELECT pr.*, 
             p.purchase_number,
             v.name as vendor_name, v.email as vendor_email
      FROM purchase_returns pr
      LEFT JOIN purchases p ON pr.purchase_id = p.id
      LEFT JOIN vendors v ON pr.vendor_id = v.id
      ORDER BY pr.created_at DESC
    `);

    // Fetch items for each return
    const returnsWithItems = await Promise.all(returns.map(async (returnItem) => {
      const [items] = await req.db.execute(`
        SELECT pri.*
        FROM purchase_return_items pri
        WHERE pri.return_id = ?
        ORDER BY pri.id
      `, [returnItem.id]);

      return {
        ...returnItem,
        items: items
      };
    }));

    res.json(returnsWithItems);
  } catch (error) {
    console.error('Error fetching purchase returns:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create purchase return (MUST come before /:id route to avoid route conflict)
router.post('/returns', async (req, res) => {
  const connection = await req.db.getConnection();
  try {
    await connection.beginTransaction();
    
    const {
      purchase_id,
      vendor_id,
      items,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      return_reason,
      return_date,
      notes
    } = req.body;

    // Validate required fields
    if (!vendor_id || !items || items.length === 0 || !return_reason) {
      await connection.rollback();
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate return number
    const return_number = `RPO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create purchase return record
    const [returnResult] = await connection.execute(
      `INSERT INTO purchase_returns 
       (purchase_id, vendor_id, return_number, subtotal, tax_amount, discount_amount, 
        total_amount, return_reason, return_date, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [purchase_id || null, vendor_id, return_number, subtotal, tax_amount, discount_amount, 
       total_amount, return_reason, return_date, notes]
    );

    const returnId = returnResult.insertId;

    // Create return items
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const { product_name, quantity, unit_cost, total_cost } = item;
        
        await connection.execute(
          `INSERT INTO purchase_return_items (return_id, product_name, quantity, unit_cost, total_cost) 
           VALUES (?, ?, ?, ?, ?)`,
          [returnId, product_name, quantity, unit_cost, total_cost]
        );
      }
    }

    // Note: Vendor balance is calculated dynamically from purchases and returns
    // No need to update a balance column as it doesn't exist in the vendors table

    await connection.commit();
    res.json({ 
      message: 'Purchase return created successfully', 
      id: returnId,
      return_number: return_number
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating purchase return:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Get purchase return by ID (MUST come before /:id route)
router.get('/returns/:id', async (req, res) => {
  try {
    const [returns] = await req.db.execute(`
      SELECT pr.*, 
             p.purchase_number,
             v.name as vendor_name, v.email as vendor_email
      FROM purchase_returns pr
      LEFT JOIN purchases p ON pr.purchase_id = p.id
      LEFT JOIN vendors v ON pr.vendor_id = v.id
      WHERE pr.id = ?
    `, [req.params.id]);

    if (returns.length === 0) {
      return res.status(404).json({ error: 'Purchase return not found' });
    }

    // Fetch items for the return
    const [items] = await req.db.execute(`
      SELECT pri.*
      FROM purchase_return_items pri
      WHERE pri.return_id = ?
      ORDER BY pri.id
    `, [req.params.id]);

    res.json({
      ...returns[0],
      items: items
    });
  } catch (error) {
    console.error('Error fetching purchase return:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get purchase by ID (must come after /returns routes to avoid route conflict)
router.get('/:id', async (req, res) => {
  try {
    const [purchases] = await req.db.execute(`
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
    const [items] = await req.db.execute(`
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
  const connection = await req.db.getConnection();
  
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
    await connection.beginTransaction();

    // Check if item_type column exists in purchase_items table, add if not
    try {
      const [columns] = await connection.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'purchase_items' 
         AND COLUMN_NAME = 'item_type'`
      );
      if (columns.length === 0) {
        await connection.execute(
          `ALTER TABLE purchase_items 
           ADD COLUMN item_type ENUM('raw_material', 'product') DEFAULT 'raw_material' 
           AFTER total_cost`
        );
        console.log('✅ Added item_type column to purchase_items table');
      }
    } catch (alterError) {
      console.error('Error checking/adding item_type column:', alterError);
      // Continue anyway - column might already exist or table might not exist yet
    }

    // Create purchase
    const purchase_number = generatePurchaseNumber();
    const [purchaseResult] = await connection.execute(
      `INSERT INTO purchases 
       (purchase_number, vendor_id, employee_id, subtotal, tax_amount, discount_amount, 
        total_amount, purchase_date, expected_delivery_date, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        purchase_number, 
        vendor_id, 
        employee_id || null, 
        subtotal, 
        tax_amount || 0, 
        discount_amount || 0, 
        total_amount, 
        purchase_date, 
        expected_delivery_date || null, 
        notes || null
      ]
    );

    const purchaseId = purchaseResult.insertId;

    // Create purchase items and products (if item_type is 'product')
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const { product_name, quantity, unit_cost, total_cost, item_type } = item;
        
        // Create purchase item
        await connection.execute(
          `INSERT INTO purchase_items (purchase_id, product_name, quantity, unit_cost, total_cost, item_type) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            purchaseId, 
            product_name || '', 
            quantity || 0, 
            unit_cost || 0, 
            total_cost || 0,
            item_type || 'raw_material'
          ]
        );

        // If item_type is 'product', create/update product in products table
        if (item_type === 'product' && product_name) {
          try {
            // Generate SKU from product name (simplified)
            const sku = `PRD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            
            // Check if product with same name already exists
            const [existingProducts] = await connection.execute(
              'SELECT id FROM products WHERE name = ? LIMIT 1',
              [product_name]
            );

            if (existingProducts.length > 0) {
              // Update existing product - add to stock
              const productId = existingProducts[0].id;
              await connection.execute(
                `UPDATE products 
                 SET current_stock = current_stock + ?, 
                     cost_price = ?,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [quantity || 0, unit_cost || 0, productId]
              );
              console.log(`Updated existing product ${productId} with stock from purchase`);
            } else {
              // Create new product
              const [productResult] = await connection.execute(
                `INSERT INTO products 
                 (name, description, selling_price, cost_price, category, sku, current_stock, min_stock_level, supplier_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  product_name,
                  `Product purchased from ${purchase_number}`,
                  (unit_cost || 0) * 1.2, // Default selling price: 20% markup
                  unit_cost || 0,
                  'General',
                  sku,
                  quantity || 0,
                  10, // Default min stock level
                  vendor_id || null
                ]
              );
              console.log(`Created new product ${productResult.insertId} from purchase`);
            }
          } catch (productError) {
            console.error('Error creating/updating product:', productError);
            // Continue with purchase even if product creation fails
            // Don't throw error, just log it
          }
        }
      }
    }

    await connection.commit();
    connection.release();

    res.json({ 
      message: 'Purchase created successfully', 
      id: purchaseId,
      purchase_number: purchase_number
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
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
  const connection = await req.db.getConnection();
  
  console.log('Update purchase request body:', req.body);
  console.log('Request headers:', req.headers);
  
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
    await connection.beginTransaction();

    // Check if item_type column exists in purchase_items table, add if not
    try {
      const [columns] = await connection.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'purchase_items' 
         AND COLUMN_NAME = 'item_type'`
      );
      if (columns.length === 0) {
        await connection.execute(
          `ALTER TABLE purchase_items 
           ADD COLUMN item_type ENUM('raw_material', 'product') DEFAULT 'raw_material' 
           AFTER total_cost`
        );
        console.log('✅ Added item_type column to purchase_items table');
      }
    } catch (alterError) {
      console.error('Error checking/adding item_type column:', alterError);
      // Continue anyway - column might already exist or table might not exist yet
    }

    // Get purchase number for product descriptions
    const [purchases] = await connection.execute(
      'SELECT purchase_number FROM purchases WHERE id = ?',
      [id]
    );
    const purchase_number = purchases.length > 0 ? purchases[0].purchase_number : '';

    // Update purchase
    await connection.execute(
      `UPDATE purchases SET 
       vendor_id = ?, employee_id = ?, subtotal = ?, tax_amount = ?, discount_amount = ?, 
       total_amount = ?, purchase_date = ?, expected_delivery_date = ?, notes = ?, status = ?
       WHERE id = ?`,
      [
        vendor_id, 
        employee_id || null, 
        subtotal, 
        tax_amount || 0, 
        discount_amount || 0, 
        total_amount, 
        purchase_date, 
        expected_delivery_date || null, 
        notes || null, 
        status || 'pending', 
        id
      ]
    );

    // Update purchase items (delete existing and insert new)
    if (items && Array.isArray(items)) {
      // Delete existing items
      await connection.execute('DELETE FROM purchase_items WHERE purchase_id = ?', [id]);
      
      // Insert new items and handle products
      for (const item of items) {
        const { product_name, quantity, unit_cost, total_cost, item_type } = item;
        
        // Create purchase item
        await connection.execute(
          `INSERT INTO purchase_items (purchase_id, product_name, quantity, unit_cost, total_cost, item_type) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            id, 
            product_name || '', 
            quantity || 0, 
            unit_cost || 0, 
            total_cost || 0,
            item_type || 'raw_material'
          ]
        );

        // If item_type is 'product', create/update product in products table
        if (item_type === 'product' && product_name) {
          try {
            // Generate SKU from product name (simplified)
            const sku = `PRD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            
            // Check if product with same name already exists
            const [existingProducts] = await connection.execute(
              'SELECT id FROM products WHERE name = ? LIMIT 1',
              [product_name]
            );

            if (existingProducts.length > 0) {
              // Update existing product - add to stock
              const productId = existingProducts[0].id;
              await connection.execute(
                `UPDATE products 
                 SET current_stock = current_stock + ?, 
                     cost_price = ?,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [quantity || 0, unit_cost || 0, productId]
              );
              console.log(`Updated existing product ${productId} with stock from purchase update`);
            } else {
              // Create new product
              const [productResult] = await connection.execute(
                `INSERT INTO products 
                 (name, description, selling_price, cost_price, category, sku, current_stock, min_stock_level, supplier_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  product_name,
                  `Product purchased from ${purchase_number || 'Purchase Order'}`,
                  (unit_cost || 0) * 1.2, // Default selling price: 20% markup
                  unit_cost || 0,
                  'General',
                  sku,
                  quantity || 0,
                  10, // Default min stock level
                  vendor_id || null
                ]
              );
              console.log(`Created new product ${productResult.insertId} from purchase update`);
            }
          } catch (productError) {
            console.error('Error creating/updating product:', productError);
            // Continue with purchase update even if product creation fails
            // Don't throw error, just log it
          }
        }
      }
    }

    await connection.commit();
    connection.release();

    res.json({ message: 'Purchase updated successfully' });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error updating purchase:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete purchase
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await req.db.execute('DELETE FROM purchases WHERE id = ?', [req.params.id]);

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
    const [items] = await req.db.execute(`
      SELECT pi.*
      FROM purchase_items pi
      WHERE pi.purchase_id = ?
    `, [req.params.id]);

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update purchase status only
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'received', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      });
    }

    // Update status
    const [result] = await req.db.execute(
      'UPDATE purchases SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // If status is 'received', update received_date
    if (status === 'received') {
      await req.db.execute(
        'UPDATE purchases SET received_date = CURRENT_DATE WHERE id = ?',
        [id]
      );
    }

    res.json({ message: 'Purchase status updated successfully', status });
  } catch (error) {
    console.error('Error updating purchase status:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
