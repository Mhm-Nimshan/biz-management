const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { createTenantDatabase, dropTenantDatabase } = require('../models/tenantDatabase');

// Super Admin Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const [admins] = await db.execute(
      'SELECT * FROM super_admins WHERE email = ? AND is_active = TRUE',
      [email]
    );

    if (admins.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = admins[0];
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await db.execute(
      'UPDATE super_admins SET last_login = NOW() WHERE id = ?',
      [admin.id]
    );

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role, isSuperAdmin: true },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Super admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Get all tenants with subscription info
exports.getAllTenants = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        t.*,
        s.id as subscription_id,
        s.status as subscription_status,
        s.current_period_end,
        s.next_billing_date,
        sp.plan_name,
        sp.display_name as plan_display_name,
        sp.price as plan_price,
        COUNT(DISTINCT tu.id) as user_count
      FROM tenants t
      LEFT JOIN subscriptions s ON t.id = s.tenant_id AND s.status IN ('active', 'past_due', 'cancelled')
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
      LEFT JOIN tenant_users tu ON t.id = tu.tenant_id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (t.tenant_name LIKE ? OR t.email LIKE ? OR t.company_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' GROUP BY t.id ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [tenants] = await db.execute(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(DISTINCT t.id) as total FROM tenants t WHERE 1=1';
    const countParams = [];

    if (status) {
      countQuery += ' AND t.status = ?';
      countParams.push(status);
    }

    if (search) {
      countQuery += ' AND (t.tenant_name LIKE ? OR t.email LIKE ? OR t.company_name LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      tenants,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all tenants error:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
};

// Get tenant details
exports.getTenantDetails = async (req, res) => {
  try {
    const { tenantId } = req.params;

    const [tenants] = await db.execute(
      `SELECT 
        t.*,
        s.id as subscription_id,
        s.status as subscription_status,
        s.current_period_start,
        s.current_period_end,
        s.next_billing_date,
        s.grace_period_ends_at,
        sp.plan_name,
        sp.display_name as plan_display_name,
        sp.price as plan_price
      FROM tenants t
      LEFT JOIN subscriptions s ON t.id = s.tenant_id
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE t.id = ?
      ORDER BY s.created_at DESC
      LIMIT 1`,
      [tenantId]
    );

    if (tenants.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Get users
    const [users] = await db.execute(
      'SELECT id, email, full_name, role, is_active, last_login, created_at FROM tenant_users WHERE tenant_id = ?',
      [tenantId]
    );

    // Get subscription history
    const [history] = await db.execute(
      `SELECT 
        sh.*,
        sp.display_name as plan_name
      FROM subscription_history sh
      LEFT JOIN subscription_plans sp ON sh.plan_id = sp.id
      WHERE sh.tenant_id = ?
      ORDER BY sh.created_at DESC
      LIMIT 20`,
      [tenantId]
    );

    // Get payment transactions
    const [payments] = await db.execute(
      'SELECT * FROM payment_transactions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 10',
      [tenantId]
    );

    res.json({
      tenant: tenants[0],
      users,
      history,
      payments
    });
  } catch (error) {
    console.error('Get tenant details error:', error);
    res.status(500).json({ error: 'Failed to fetch tenant details' });
  }
};

// Create new tenant with subscription
exports.createTenant = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      tenant_name,
      company_name,
      email,
      phone,
      address,
      city,
      state,
      country,
      owner_name,
      plan_id,
      start_trial = true
    } = req.body;

    // Create tenant slug
    const tenant_slug = tenant_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    // Check if slug already exists
    const [existing] = await connection.execute(
      'SELECT id FROM tenants WHERE tenant_slug = ? OR email = ?',
      [tenant_slug, email]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Tenant with this name or email already exists' });
    }

    // Calculate trial end date (7 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    // Create tenant
    const [tenantResult] = await connection.execute(
      `INSERT INTO tenants (tenant_name, tenant_slug, database_name, company_name, email, phone, address, city, state, country, owner_name, status, trial_ends_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenant_name, tenant_slug, `nimsleas_${tenant_slug}`, company_name, email, phone, address, city, state, country, owner_name, start_trial ? 'trial' : 'active', trialEndsAt]
    );

    const tenantId = tenantResult.insertId;

    // Create subscription if not trial
    if (!start_trial && plan_id) {
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

      const [subscriptionResult] = await connection.execute(
        `INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end, next_billing_date)
         VALUES (?, ?, 'active', ?, ?, ?)`,
        [tenantId, plan_id, currentPeriodStart, currentPeriodEnd, currentPeriodEnd]
      );

      // Add subscription history
      await connection.execute(
        `INSERT INTO subscription_history (subscription_id, tenant_id, plan_id, action, new_status, performed_by)
         VALUES (?, ?, ?, 'created', 'active', ?)`,
        [subscriptionResult.insertId, tenantId, plan_id, req.superAdmin.email]
      );
    }

    await connection.commit();

    // Create tenant database (async, doesn't block response)
    createTenantDatabase(tenant_slug).then(() => {
      // Update tenant as setup complete
      db.execute('UPDATE tenants SET is_setup_complete = TRUE WHERE id = ?', [tenantId]);
    }).catch(err => {
      console.error('Error creating tenant database:', err);
    });

    res.status(201).json({
      message: 'Tenant created successfully',
      tenantId,
      tenant_slug
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create tenant error:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  } finally {
    connection.release();
  }
};

// Suspend tenant
exports.suspendTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { reason } = req.body;

    await db.execute(
      'UPDATE tenants SET status = "suspended", updated_at = NOW() WHERE id = ?',
      [tenantId]
    );

    await db.execute(
      'UPDATE subscriptions SET status = "suspended" WHERE tenant_id = ? AND status = "active"',
      [tenantId]
    );

    // Log to history
    const [subscription] = await db.execute(
      'SELECT id, plan_id FROM subscriptions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1',
      [tenantId]
    );

    if (subscription.length > 0) {
      await db.execute(
        `INSERT INTO subscription_history (subscription_id, tenant_id, plan_id, action, previous_status, new_status, notes, performed_by)
         VALUES (?, ?, ?, 'suspended', 'active', 'suspended', ?, ?)`,
        [subscription[0].id, tenantId, subscription[0].plan_id, reason || 'Suspended by admin', req.superAdmin.email]
      );
    }

    res.json({ message: 'Tenant suspended successfully' });
  } catch (error) {
    console.error('Suspend tenant error:', error);
    res.status(500).json({ error: 'Failed to suspend tenant' });
  }
};

// Reactivate tenant
exports.reactivateTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;

    await db.execute(
      'UPDATE tenants SET status = "active", updated_at = NOW() WHERE id = ?',
      [tenantId]
    );

    await db.execute(
      'UPDATE subscriptions SET status = "active" WHERE tenant_id = ? AND status = "suspended"',
      [tenantId]
    );

    // Log to history
    const [subscription] = await db.execute(
      'SELECT id, plan_id FROM subscriptions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1',
      [tenantId]
    );

    if (subscription.length > 0) {
      await db.execute(
        `INSERT INTO subscription_history (subscription_id, tenant_id, plan_id, action, previous_status, new_status, performed_by)
         VALUES (?, ?, ?, 'reactivated', 'suspended', 'active', ?)`,
        [subscription[0].id, tenantId, subscription[0].plan_id, req.superAdmin.email]
      );
    }

    res.json({ message: 'Tenant reactivated successfully' });
  } catch (error) {
    console.error('Reactivate tenant error:', error);
    res.status(500).json({ error: 'Failed to reactivate tenant' });
  }
};

// Cancel subscription
exports.cancelSubscription = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { immediately = false, reason } = req.body;

    if (immediately) {
      await db.execute(
        'UPDATE tenants SET status = "cancelled" WHERE id = ?',
        [tenantId]
      );

      await db.execute(
        'UPDATE subscriptions SET status = "cancelled", cancelled_at = NOW() WHERE tenant_id = ?',
        [tenantId]
      );
    } else {
      await db.execute(
        'UPDATE subscriptions SET cancel_at_period_end = TRUE WHERE tenant_id = ? AND status = "active"',
        [tenantId]
      );
    }

    // Log to history
    const [subscription] = await db.execute(
      'SELECT id, plan_id FROM subscriptions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1',
      [tenantId]
    );

    if (subscription.length > 0) {
      await db.execute(
        `INSERT INTO subscription_history (subscription_id, tenant_id, plan_id, action, new_status, notes, performed_by)
         VALUES (?, ?, ?, 'cancelled', 'cancelled', ?, ?)`,
        [subscription[0].id, tenantId, subscription[0].plan_id, reason || 'Cancelled by admin', req.superAdmin.email]
      );
    }

    res.json({ 
      message: immediately 
        ? 'Subscription cancelled immediately' 
        : 'Subscription will be cancelled at the end of billing period' 
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

// Get menu permissions for tenant
exports.getMenuPermissions = async (req, res) => {
  try {
    const { tenantId } = req.params;

    const [permissions] = await db.execute(
      'SELECT menu_key, is_visible, display_order, custom_label FROM menu_permissions WHERE tenant_id = ? ORDER BY display_order',
      [tenantId]
    );

    // Convert is_visible from TINYINT (0/1) to boolean
    const formattedPermissions = permissions.map(p => ({
      ...p,
      is_visible: Boolean(p.is_visible)
    }));

    res.json({ permissions: formattedPermissions });
  } catch (error) {
    console.error('Get menu permissions error:', error);
    res.status(500).json({ error: 'Failed to fetch menu permissions' });
  }
};

// Get available permissions list (same as tenant database users)
exports.getAvailablePermissions = async (req, res) => {
  try {
    const permissions = [
      { key: 'dashboard.view', name: 'View Dashboard', category: 'Dashboard' },
      { key: 'employees.create', name: 'Create Employees', category: 'HR' },
      { key: 'employees.edit', name: 'Edit Employees', category: 'HR' },
      { key: 'employees.delete', name: 'Delete Employees', category: 'HR' },
      { key: 'employees.view', name: 'View Employees', category: 'HR' },
      { key: 'products.create', name: 'Create Products', category: 'Inventory' },
      { key: 'products.edit', name: 'Edit Products', category: 'Inventory' },
      { key: 'products.delete', name: 'Delete Products', category: 'Inventory' },
      { key: 'products.view', name: 'View Products', category: 'Inventory' },
      { key: 'customers.create', name: 'Create Customers', category: 'Sales' },
      { key: 'customers.edit', name: 'Edit Customers', category: 'Sales' },
      { key: 'customers.delete', name: 'Delete Customers', category: 'Sales' },
      { key: 'customers.view', name: 'View Customers', category: 'Sales' },
      { key: 'invoices.create', name: 'Create Invoices', category: 'Sales' },
      { key: 'invoices.edit', name: 'Edit Invoices', category: 'Sales' },
      { key: 'invoices.delete', name: 'Delete Invoices', category: 'Sales' },
      { key: 'invoices.view', name: 'View Invoices', category: 'Sales' },
      { key: 'sales.create', name: 'Create Sales', category: 'Sales' },
      { key: 'sales.edit', name: 'Edit Sales', category: 'Sales' },
      { key: 'sales.view', name: 'View Sales', category: 'Sales' },
      { key: 'purchases.create', name: 'Create Purchases', category: 'Purchasing' },
      { key: 'purchases.edit', name: 'Edit Purchases', category: 'Purchasing' },
      { key: 'purchases.delete', name: 'Delete Purchases', category: 'Purchasing' },
      { key: 'purchases.view', name: 'View Purchases', category: 'Purchasing' },
      { key: 'vendors.create', name: 'Create Vendors', category: 'Purchasing' },
      { key: 'vendors.edit', name: 'Edit Vendors', category: 'Purchasing' },
      { key: 'vendors.delete', name: 'Delete Vendors', category: 'Purchasing' },
      { key: 'vendors.view', name: 'View Vendors', category: 'Purchasing' },
      { key: 'daybook.create', name: 'Create Daybook Entries', category: 'Accounting' },
      { key: 'daybook.edit', name: 'Edit Daybook Entries', category: 'Accounting' },
      { key: 'daybook.delete', name: 'Delete Daybook Entries', category: 'Accounting' },
      { key: 'daybook.view', name: 'View Daybook', category: 'Accounting' },
      { key: 'banks.create', name: 'Create Bank Accounts', category: 'Finance' },
      { key: 'banks.edit', name: 'Edit Bank Accounts', category: 'Finance' },
      { key: 'banks.delete', name: 'Delete Bank Accounts', category: 'Finance' },
      { key: 'banks.view', name: 'View Bank Accounts', category: 'Finance' },
      { key: 'cheques.create', name: 'Create Cheques', category: 'Finance' },
      { key: 'cheques.edit', name: 'Edit Cheques', category: 'Finance' },
      { key: 'cheques.delete', name: 'Delete Cheques', category: 'Finance' },
      { key: 'cheques.view', name: 'View Cheques', category: 'Finance' },
      { key: 'pos.access', name: 'Access Point of Sale', category: 'Sales' },
      { key: 'reports.view', name: 'View Reports', category: 'Reports' },
      { key: 'reports.export', name: 'Export Reports', category: 'Reports' },
    ];

    res.json(permissions);
  } catch (error) {
    console.error('Get available permissions error:', error);
    res.status(500).json({ error: 'Failed to fetch available permissions' });
  }
};

// Update menu permissions for tenant
exports.updateMenuPermissions = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { permissions } = req.body; // Array of {menu_key, is_visible, display_order, custom_label}

    // Delete existing permissions
    await db.execute('DELETE FROM menu_permissions WHERE tenant_id = ?', [tenantId]);

    // Insert new permissions (including hidden ones)
    if (permissions && permissions.length > 0) {
      const values = permissions.map(p => [
        tenantId,
        p.menu_key,
        p.is_visible !== undefined ? (p.is_visible ? 1 : 0) : 1, // Ensure boolean is stored as int
        p.display_order || 0,
        p.custom_label || null
      ]);

      const placeholders = values.map(() => '(?, ?, ?, ?, ?)').join(', ');
      const flatValues = values.flat();

      await db.execute(
        `INSERT INTO menu_permissions (tenant_id, menu_key, is_visible, display_order, custom_label) VALUES ${placeholders}`,
        flatValues
      );
    }

    res.json({ 
      message: 'Menu permissions updated successfully',
      updatedCount: permissions.length
    });
  } catch (error) {
    console.error('Update menu permissions error:', error);
    res.status(500).json({ error: 'Failed to update menu permissions' });
  }
};

// Get tenant users for a tenant
exports.getTenantUsers = async (req, res) => {
  try {
    const { tenantId } = req.params;

    const [users] = await db.execute(
      `SELECT id, email, full_name, role, is_active, last_login, created_at
       FROM tenant_users 
       WHERE tenant_id = ?
       ORDER BY created_at DESC`,
      [tenantId]
    );

    res.json({ users });
  } catch (error) {
    console.error('Get tenant users error:', error);
    res.status(500).json({ error: 'Failed to fetch tenant users' });
  }
};

// Get tenant user permissions
exports.getTenantUserPermissions = async (req, res) => {
  try {
    const { tenantId, userId } = req.params;

    // Verify user belongs to tenant
    const [users] = await db.execute(
      'SELECT id FROM tenant_users WHERE id = ? AND tenant_id = ?',
      [userId, tenantId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Tenant user not found' });
    }

    const [permissions] = await db.execute(
      'SELECT permission_key, is_granted FROM tenant_user_permissions WHERE tenant_user_id = ?',
      [userId]
    );

    const permissionsObj = permissions.reduce((acc, p) => {
      acc[p.permission_key] = p.is_granted === 1;
      return acc;
    }, {});

    res.json({ permissions: permissionsObj });
  } catch (error) {
    console.error('Get tenant user permissions error:', error);
    res.status(500).json({ error: 'Failed to fetch tenant user permissions' });
  }
};

// Update tenant user permissions
exports.updateTenantUserPermissions = async (req, res) => {
  try {
    const { tenantId, userId } = req.params;
    const { permissions } = req.body;

    // Verify user belongs to tenant
    const [users] = await db.execute(
      'SELECT id FROM tenant_users WHERE id = ? AND tenant_id = ?',
      [userId, tenantId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Tenant user not found' });
    }

    // Delete existing permissions
    await db.execute('DELETE FROM tenant_user_permissions WHERE tenant_user_id = ?', [userId]);

    // Insert new permissions
    if (permissions && Object.keys(permissions).length > 0) {
      const permissionEntries = Object.entries(permissions)
        .filter(([_, granted]) => granted !== undefined)
        .map(([key, granted]) => ({
          tenant_user_id: parseInt(userId),
          tenant_id: parseInt(tenantId),
          permission_key: key,
          is_granted: granted ? 1 : 0
        }));

      if (permissionEntries.length > 0) {
        const placeholders = permissionEntries.map(() => '(?, ?, ?, ?)').join(', ');
        const values = permissionEntries.flatMap(entry => [
          entry.tenant_user_id,
          entry.tenant_id,
          entry.permission_key,
          entry.is_granted
        ]);

        await db.execute(
          `INSERT INTO tenant_user_permissions (tenant_user_id, tenant_id, permission_key, is_granted) VALUES ${placeholders}`,
          values
        );
      }
    }

    res.json({ 
      message: 'Tenant user permissions updated successfully',
      updatedCount: permissions ? Object.keys(permissions).length : 0
    });
  } catch (error) {
    console.error('Update tenant user permissions error:', error);
    res.status(500).json({ error: 'Failed to update tenant user permissions' });
  }
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Total tenants by status
    const [statusCounts] = await db.execute(`
      SELECT status, COUNT(*) as count
      FROM tenants
      GROUP BY status
    `);

    // Total revenue this month
    const [revenueResult] = await db.execute(`
      SELECT 
        SUM(amount) as total_revenue,
        COUNT(*) as payment_count
      FROM payment_transactions
      WHERE status = 'completed' 
        AND DATE_FORMAT(payment_date, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
    `);

    // Subscriptions by plan
    const [planCounts] = await db.execute(`
      SELECT 
        sp.display_name,
        COUNT(s.id) as count,
        SUM(sp.price) as monthly_revenue
      FROM subscriptions s
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.status = 'active'
      GROUP BY sp.id
    `);

    // Recent activity
    const [recentActivity] = await db.execute(`
      SELECT 
        sh.*,
        t.tenant_name,
        sp.display_name as plan_name
      FROM subscription_history sh
      JOIN tenants t ON sh.tenant_id = t.id
      JOIN subscription_plans sp ON sh.plan_id = sp.id
      ORDER BY sh.created_at DESC
      LIMIT 10
    `);

    // Expiring trials
    const [expiringTrials] = await db.execute(`
      SELECT 
        t.*,
        DATEDIFF(t.trial_ends_at, NOW()) as days_remaining
      FROM tenants t
      WHERE t.status = 'trial'
        AND t.trial_ends_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY)
      ORDER BY t.trial_ends_at
    `);

    res.json({
      statusCounts,
      revenue: revenueResult[0],
      planCounts,
      recentActivity,
      expiringTrials
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};

// Delete tenant
exports.deleteTenant = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { tenantId } = req.params;

    // Get tenant info before deletion
    const [tenants] = await connection.execute(
      'SELECT database_name, tenant_name, email FROM tenants WHERE id = ?',
      [tenantId]
    );

    if (tenants.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = tenants[0];
    const databaseName = tenant.database_name;

    // Delete tenant (cascade will delete related records)
    await connection.execute('DELETE FROM tenants WHERE id = ?', [tenantId]);

    await connection.commit();

    // Drop tenant database (async, doesn't block response)
    if (databaseName) {
      const { dropTenantDatabase } = require('../models/tenantDatabase');
      dropTenantDatabase(databaseName).then(() => {
        console.log(`Database ${databaseName} dropped successfully for tenant ${tenant.tenant_name}`);
      }).catch(err => {
        console.error(`Error dropping database ${databaseName}:`, err);
      });
    }

    res.json({ 
      message: 'Tenant deleted successfully',
      deletedTenant: {
        name: tenant.tenant_name,
        email: tenant.email
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Delete tenant error:', error);
    res.status(500).json({ error: 'Failed to delete tenant' });
  } finally {
    connection.release();
  }
};

// Get all subscription plans
exports.getSubscriptionPlans = async (req, res) => {
  try {
    const [plans] = await db.execute(
      'SELECT * FROM subscription_plans WHERE is_active = TRUE ORDER BY price'
    );

    res.json({ plans });
  } catch (error) {
    console.error('Get subscription plans error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription plans' });
  }
};

