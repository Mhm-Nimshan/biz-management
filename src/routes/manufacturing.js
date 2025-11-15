const express = require('express');
const router = express.Router();
const tenantAuth = require('../middleware/tenantAuth');

// Apply tenant authentication to all routes
router.use(tenantAuth);

// Get all manufacturing units
router.get('/units', async (req, res) => {
  try {
    // Check if database connection exists
    if (!req.db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    // Check if manufacturing_units table exists, create if not
    const [tables] = await req.db.execute(`SHOW TABLES LIKE 'manufacturing_units'`);
    if (tables.length === 0) {
      await req.db.execute(`
        CREATE TABLE IF NOT EXISTS manufacturing_units (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          location VARCHAR(255),
          capacity INT DEFAULT 0,
          status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
    }

    const [units] = await req.db.execute(`
      SELECT * FROM manufacturing_units 
      ORDER BY name ASC
    `);
    res.json(units);
  } catch (error) {
    console.error('Error fetching manufacturing units:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create manufacturing unit
router.post('/units', async (req, res) => {
  const { name, description, location, capacity, status } = req.body;
  
  try {
    // Check if database connection exists
    if (!req.db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    const [result] = await req.db.execute(`
      INSERT INTO manufacturing_units (name, description, location, capacity, status)
      VALUES (?, ?, ?, ?, ?)
    `, [name, description, location, capacity, status || 'active']);
    
    res.json({ id: result.insertId, message: 'Manufacturing unit created successfully' });
  } catch (error) {
    console.error('Error creating manufacturing unit:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update manufacturing unit
router.put('/units/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, location, capacity, status } = req.body;
  
  try {
    await req.db.execute(`
      UPDATE manufacturing_units 
      SET name = ?, description = ?, location = ?, capacity = ?, status = ?
      WHERE id = ?
    `, [name, description, location, capacity, status, id]);
    
    res.json({ message: 'Manufacturing unit updated successfully' });
  } catch (error) {
    console.error('Error updating manufacturing unit:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete manufacturing unit
router.delete('/units/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    await req.db.execute(`DELETE FROM manufacturing_units WHERE id = ?`, [id]);
    res.json({ message: 'Manufacturing unit deleted successfully' });
  } catch (error) {
    console.error('Error deleting manufacturing unit:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all manufacturing products
router.get('/products', async (req, res) => {
  try {
    // Check if database connection exists
    if (!req.db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    console.log('Fetching manufacturing products...');
    // Check if manufacturing_products table exists, create if not
    const [tables] = await req.db.execute(`SHOW TABLES LIKE 'manufacturing_products'`);
    console.log('Manufacturing products table exists:', tables.length > 0);
    if (tables.length === 0) {
      console.log('Creating manufacturing tables...');
      // Create manufacturing tables if they don't exist
      await req.db.execute(`
        CREATE TABLE IF NOT EXISTS manufacturing_units (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          location VARCHAR(255),
          capacity INT DEFAULT 0,
          status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      await req.db.execute(`
        CREATE TABLE IF NOT EXISTS manufacturing_products (
          id INT PRIMARY KEY AUTO_INCREMENT,
          product_name VARCHAR(255) NOT NULL,
          product_sku VARCHAR(100),
          description TEXT,
          category VARCHAR(100),
          manufacturing_unit_id INT,
          final_cost DECIMAL(10,2) NOT NULL,
          selling_price DECIMAL(10,2),
          manufacturing_date DATE,
          quantity INT DEFAULT 1,
          status ENUM('active', 'inactive', 'discontinued') DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (manufacturing_unit_id) REFERENCES manufacturing_units(id) ON DELETE SET NULL,
          INDEX idx_product_sku (product_sku),
          INDEX idx_manufacturing_date (manufacturing_date),
          INDEX idx_manufacturing_unit_id (manufacturing_unit_id),
          INDEX idx_status (status)
        )
      `);
      console.log('Manufacturing tables created successfully');
    } else {
      // Table exists - migrate to add new columns and remove unique constraint
      console.log('Migrating existing manufacturing_products table...');
      
      // Add manufacturing_date column if it doesn't exist
      try {
        await req.db.execute(`ALTER TABLE manufacturing_products ADD COLUMN manufacturing_date DATE`);
        console.log('Added manufacturing_date column');
      } catch (e) {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
        // Column already exists, ignore
      }
      
      // Add quantity column if it doesn't exist
      try {
        await req.db.execute(`ALTER TABLE manufacturing_products ADD COLUMN quantity INT DEFAULT 1`);
        console.log('Added quantity column');
      } catch (e) {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
        // Column already exists, ignore
      }
      
      // Remove UNIQUE constraint from product_sku if it exists
      try {
        // First check what indexes exist
        const [indexes] = await req.db.execute(`SHOW INDEX FROM manufacturing_products WHERE Column_name = 'product_sku' AND Non_unique = 0`);
        if (indexes.length > 0) {
          // Drop the unique index
          const indexName = indexes[0].Key_name;
          await req.db.execute(`ALTER TABLE manufacturing_products DROP INDEX ${indexName}`);
          console.log(`Removed unique constraint from product_sku (index: ${indexName})`);
        }
      } catch (e) {
        // Index doesn't exist or couldn't be dropped, that's okay
        console.log('Note: Could not remove unique constraint on product_sku:', e.message);
      }
    }
    
    // Create other manufacturing tables if they don't exist (always run)
    await req.db.execute(`
      CREATE TABLE IF NOT EXISTS manufacturing_processes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        manufacturing_product_id INT NOT NULL,
        process_name VARCHAR(255) NOT NULL,
        process_order INT NOT NULL,
        description TEXT,
        estimated_duration_hours DECIMAL(5,2) DEFAULT 0,
        required_equipment TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (manufacturing_product_id) REFERENCES manufacturing_products(id) ON DELETE CASCADE,
        INDEX idx_manufacturing_product_id (manufacturing_product_id),
        INDEX idx_process_order (process_order)
      )
    `);
    
    await req.db.execute(`
      CREATE TABLE IF NOT EXISTS manufacturing_raw_materials (
        id INT PRIMARY KEY AUTO_INCREMENT,
        manufacturing_product_id INT NOT NULL,
        purchase_item_id INT,
        product_name VARCHAR(255) NOT NULL,
        quantity_required DECIMAL(10,2) NOT NULL,
        unit_of_measure VARCHAR(50) DEFAULT 'pieces',
        unit_cost DECIMAL(10,2) NOT NULL,
        total_cost DECIMAL(10,2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (manufacturing_product_id) REFERENCES manufacturing_products(id) ON DELETE CASCADE,
        FOREIGN KEY (purchase_item_id) REFERENCES purchase_items(id) ON DELETE SET NULL,
        INDEX idx_manufacturing_product_id (manufacturing_product_id),
        INDEX idx_purchase_item_id (purchase_item_id)
      )
    `);
    
    await req.db.execute(`
      CREATE TABLE IF NOT EXISTS manufacturing_orders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        manufacturing_product_id INT NOT NULL,
        quantity_to_produce INT NOT NULL,
        status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
        start_date DATE,
        expected_completion_date DATE,
        actual_completion_date DATE,
        total_cost DECIMAL(12,2) NOT NULL,
        notes TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (manufacturing_product_id) REFERENCES manufacturing_products(id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL,
        INDEX idx_order_number (order_number),
        INDEX idx_manufacturing_product_id (manufacturing_product_id),
        INDEX idx_status (status)
      )
    `);

    const [products] = await req.db.execute(`
      SELECT mp.*, mu.name as unit_name
      FROM manufacturing_products mp
      LEFT JOIN manufacturing_units mu ON mp.manufacturing_unit_id = mu.id
      ORDER BY mp.product_name ASC
    `);
    console.log('Found', products.length, 'manufacturing products');
    res.json(products);
  } catch (error) {
    console.error('Error fetching manufacturing products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get manufacturing product by ID with details
router.get('/products/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get product details
    const [products] = await req.db.execute(`
      SELECT mp.*, mu.name as unit_name
      FROM manufacturing_products mp
      LEFT JOIN manufacturing_units mu ON mp.manufacturing_unit_id = mu.id
      WHERE mp.id = ?
    `, [id]);
    
    if (products.length === 0) {
      return res.status(404).json({ error: 'Manufacturing product not found' });
    }
    
    // Get processes
    const [processes] = await req.db.execute(`
      SELECT * FROM manufacturing_processes
      WHERE manufacturing_product_id = ?
      ORDER BY process_order ASC
    `, [id]);
    
    // Get raw materials
    const [rawMaterials] = await req.db.execute(`
      SELECT mrm.*, pi.product_name as purchase_product_name
      FROM manufacturing_raw_materials mrm
      LEFT JOIN purchase_items pi ON mrm.purchase_item_id = pi.id
      WHERE mrm.manufacturing_product_id = ?
      ORDER BY mrm.id ASC
    `, [id]);
    
    res.json({
      ...products[0],
      processes,
      rawMaterials
    });
  } catch (error) {
    console.error('Error fetching manufacturing product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create manufacturing product
router.post('/products', async (req, res) => {
  const {
    product_name,
    product_sku,
    description,
    category,
    manufacturing_unit_id,
    final_cost,
    selling_price,
    manufacturing_date,
    quantity = 1,
    processes = [],
    rawMaterials = []
  } = req.body;
  
  try {
    const connection = await req.db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Create manufacturing product
      const [productResult] = await connection.execute(`
        INSERT INTO manufacturing_products 
        (product_name, product_sku, description, category, manufacturing_unit_id, final_cost, selling_price, manufacturing_date, quantity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [product_name, product_sku, description, category, manufacturing_unit_id, final_cost, selling_price, manufacturing_date, quantity]);
      
      const productId = productResult.insertId;
      
      // Create processes
      for (const process of processes) {
        await connection.execute(`
          INSERT INTO manufacturing_processes 
          (manufacturing_product_id, process_name, process_order, description, estimated_duration_hours, required_equipment, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          productId,
          process.process_name,
          process.process_order,
          process.description,
          process.estimated_duration_hours,
          process.required_equipment,
          process.notes
        ]);
      }
      
      // Create raw materials
      for (const material of rawMaterials) {
        await connection.execute(`
          INSERT INTO manufacturing_raw_materials 
          (manufacturing_product_id, purchase_item_id, product_name, quantity_required, unit_of_measure, unit_cost, total_cost, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          productId,
          material.purchase_item_id || null,
          material.product_name,
          material.quantity_required,
          material.unit_of_measure,
          material.unit_cost,
          material.total_cost,
          material.notes
        ]);
      }
      
      // Save manufacturing quantity to products table current_stock
      // manufacturing_products.quantity -> products.current_stock
      let productTableId = null;
      const manufacturingQuantity = parseInt(quantity) || 1;
      try {
        // Create new product: Set current_stock = manufacturing_products.quantity
        const [productTableResult] = await connection.execute(`
          INSERT INTO products 
          (name, sku, description, category, cost_price, selling_price, current_stock, min_stock_level)
          VALUES (?, ?, ?, ?, ?, ?, ?, 5)
        `, [product_name, product_sku, description, category, final_cost, selling_price, manufacturingQuantity]);
        productTableId = productTableResult.insertId;
      } catch (productError) {
        // If SKU already exists: Add manufacturing quantity to existing current_stock
        if (productError.code === 'ER_DUP_ENTRY') {
          const [existingProducts] = await connection.execute(`
            SELECT id FROM products WHERE sku = ? LIMIT 1
          `, [product_sku]);
          if (existingProducts.length > 0) {
            productTableId = existingProducts[0].id;
            // Add manufacturing_products.quantity to products.current_stock
            await connection.execute(`
              UPDATE products 
              SET current_stock = current_stock + ?,
                  cost_price = ?,
                  selling_price = ?
              WHERE id = ?
            `, [manufacturingQuantity, final_cost, selling_price, productTableId]);
          }
        } else {
          throw productError;
        }
      }
      
      await connection.commit();
      res.json({ 
        id: productId, 
        product_table_id: productTableId,
        message: 'Manufacturing product created successfully' 
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating manufacturing product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update manufacturing product
router.put('/products/:id', async (req, res) => {
  const { id } = req.params;
  const {
    product_name,
    product_sku,
    description,
    category,
    manufacturing_unit_id,
    final_cost,
    selling_price,
    manufacturing_date,
    quantity = 1,
    processes = [],
    rawMaterials = []
  } = req.body;
  
  try {
    const connection = await req.db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Get old quantity from manufacturing_products table to calculate stock adjustment
      // When updating: adjust products.current_stock by the difference in manufacturing_products.quantity
      const [oldProduct] = await connection.execute(`
        SELECT quantity FROM manufacturing_products WHERE id = ?
      `, [id]);
      
      const oldQuantity = oldProduct.length > 0 ? (parseInt(oldProduct[0].quantity) || 1) : 1;
      const newQuantity = parseInt(quantity) || 1;
      // Calculate difference: new manufacturing_products.quantity - old manufacturing_products.quantity
      const quantityDifference = newQuantity - oldQuantity;
      
      // Update manufacturing product
      await connection.execute(`
        UPDATE manufacturing_products 
        SET product_name = ?, product_sku = ?, description = ?, category = ?, 
            manufacturing_unit_id = ?, final_cost = ?, selling_price = ?, 
            manufacturing_date = ?, quantity = ?
        WHERE id = ?
      `, [product_name, product_sku, description, category, manufacturing_unit_id, final_cost, selling_price, manufacturing_date, quantity, id]);
      
      // Delete existing processes and raw materials
      await connection.execute(`DELETE FROM manufacturing_processes WHERE manufacturing_product_id = ?`, [id]);
      await connection.execute(`DELETE FROM manufacturing_raw_materials WHERE manufacturing_product_id = ?`, [id]);
      
      // Create new processes
      for (const process of processes) {
        await connection.execute(`
          INSERT INTO manufacturing_processes 
          (manufacturing_product_id, process_name, process_order, description, estimated_duration_hours, required_equipment, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          id,
          process.process_name,
          process.process_order,
          process.description,
          process.estimated_duration_hours,
          process.required_equipment,
          process.notes
        ]);
      }
      
      // Create new raw materials
      for (const material of rawMaterials) {
        await connection.execute(`
          INSERT INTO manufacturing_raw_materials 
          (manufacturing_product_id, purchase_item_id, product_name, quantity_required, unit_of_measure, unit_cost, total_cost, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id,
          material.purchase_item_id || null,
          material.product_name,
          material.quantity_required,
          material.unit_of_measure,
          material.unit_cost,
          material.total_cost,
          material.notes
        ]);
      }
      
      // Update products table: Save manufacturing_products.quantity to products.current_stock
      // Find the product by SKU first
      const [existingProducts] = await connection.execute(`
        SELECT id FROM products WHERE sku = ? LIMIT 1
      `, [product_sku]);
      
      if (existingProducts.length > 0) {
        const productTableId = existingProducts[0].id;
        // Update products.current_stock by adding the difference in manufacturing_products.quantity
        // Example: If old quantity was 10 and new is 15, current_stock increases by 5
        await connection.execute(`
          UPDATE products 
          SET name = ?, sku = ?, description = ?, category = ?, cost_price = ?, selling_price = ?,
              current_stock = current_stock + ?
          WHERE id = ?
        `, [product_name, product_sku, description, category, final_cost, selling_price, quantityDifference, productTableId]);
      } else {
        // If product doesn't exist: Create with current_stock = new manufacturing_products.quantity
        await connection.execute(`
          INSERT INTO products 
          (name, sku, description, category, cost_price, selling_price, current_stock, min_stock_level)
          VALUES (?, ?, ?, ?, ?, ?, ?, 5)
        `, [product_name, product_sku, description, category, final_cost, selling_price, newQuantity]);
      }
      
      await connection.commit();
      res.json({ message: 'Manufacturing product updated successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating manufacturing product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete manufacturing product
router.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const connection = await req.db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Get product SKU to delete from products table
      const [products] = await connection.execute(`
        SELECT product_sku FROM manufacturing_products WHERE id = ?
      `, [id]);
      
      if (products.length > 0) {
        // Delete from products table
        await connection.execute(`DELETE FROM products WHERE sku = ?`, [products[0].product_sku]);
      }
      
      // Delete manufacturing product (cascades to processes and raw materials)
      await connection.execute(`DELETE FROM manufacturing_products WHERE id = ?`, [id]);
      
      await connection.commit();
      res.json({ message: 'Manufacturing product deleted successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error deleting manufacturing product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get available purchase items for raw materials
router.get('/purchase-items', async (req, res) => {
  try {
    // Check if database connection exists
    if (!req.db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    // Check if purchase_items table exists
    const [tables] = await req.db.execute(`SHOW TABLES LIKE 'purchase_items'`);
    if (tables.length === 0) {
      return res.json([]); // Return empty array if table doesn't exist
    }

    const [items] = await req.db.execute(`
      SELECT pi.*, p.purchase_number, p.purchase_date
      FROM purchase_items pi
      JOIN purchases p ON pi.purchase_id = p.id
      WHERE pi.received_quantity > 0
      ORDER BY p.purchase_date DESC, pi.product_name ASC
    `);
    res.json(items);
  } catch (error) {
    console.error('Error fetching purchase items:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get manufacturing orders
router.get('/orders', async (req, res) => {
  try {
    // Check if manufacturing_orders table exists
    const [tables] = await req.db.execute(`SHOW TABLES LIKE 'manufacturing_orders'`);
    if (tables.length === 0) {
      return res.json([]); // Return empty array if table doesn't exist
    }

    const [orders] = await req.db.execute(`
      SELECT mo.*, mp.product_name, mp.product_sku, e.first_name, e.last_name
      FROM manufacturing_orders mo
      JOIN manufacturing_products mp ON mo.manufacturing_product_id = mp.id
      LEFT JOIN employees e ON mo.created_by = e.id
      ORDER BY mo.created_at DESC
    `);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching manufacturing orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create manufacturing order
router.post('/orders', async (req, res) => {
  const {
    manufacturing_product_id,
    quantity_to_produce,
    start_date,
    expected_completion_date,
    notes
  } = req.body;
  
  try {
    // Get product details to calculate total cost
    const [products] = await req.db.execute(`
      SELECT final_cost FROM manufacturing_products WHERE id = ?
    `, [manufacturing_product_id]);
    
    if (products.length === 0) {
      return res.status(404).json({ error: 'Manufacturing product not found' });
    }
    
    const totalCost = products[0].final_cost * quantity_to_produce;
    const orderNumber = `MO-${Date.now()}`;
    
    const [result] = await req.db.execute(`
      INSERT INTO manufacturing_orders 
      (order_number, manufacturing_product_id, quantity_to_produce, start_date, expected_completion_date, total_cost, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [orderNumber, manufacturing_product_id, quantity_to_produce, start_date, expected_completion_date, totalCost, notes]);
    
    res.json({ id: result.insertId, message: 'Manufacturing order created successfully' });
  } catch (error) {
    console.error('Error creating manufacturing order:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
