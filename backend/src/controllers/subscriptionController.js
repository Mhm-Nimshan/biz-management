const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { createTenantDatabase } = require('../models/tenantDatabase');

// Tenant Signup
exports.signup = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      tenant_name,
      company_name,
      email,
      password,
      phone,
      address,
      city,
      state,
      country,
      owner_name,
      plan_id
    } = req.body;

    // Validate required fields
    if (!tenant_name || !email || !password || !owner_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create tenant slug
    const tenant_slug = tenant_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const timestamp = Date.now();
    const uniqueSlug = `${tenant_slug}-${timestamp}`;
    
    // Check if email already exists
    const [existing] = await connection.execute(
      'SELECT id FROM tenants WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Calculate trial end date (7 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    // Create tenant
    const [tenantResult] = await connection.execute(
      `INSERT INTO tenants (tenant_name, tenant_slug, database_name, company_name, email, phone, address, city, state, country, owner_name, status, trial_ends_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'trial', ?)`,
      [tenant_name, uniqueSlug, `biz_${uniqueSlug}`, company_name || tenant_name, email, phone, address, city, state, country, owner_name, trialEndsAt]
    );

    const tenantId = tenantResult.insertId;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create tenant user (owner)
    const [userResult] = await connection.execute(
      `INSERT INTO tenant_users (tenant_id, email, password_hash, full_name, role, is_active)
       VALUES (?, ?, ?, ?, 'owner', TRUE)`,
      [tenantId, email, passwordHash, owner_name]
    );

    const userId = userResult.insertId;

    // If plan selected, create subscription (otherwise trial)
    if (plan_id) {
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

      const [subscriptionResult] = await connection.execute(
        `INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end, next_billing_date)
         VALUES (?, ?, 'active', ?, ?, ?)`,
        [tenantId, plan_id, currentPeriodStart, currentPeriodEnd, currentPeriodEnd]
      );

      // Update tenant status
      await connection.execute(
        'UPDATE tenants SET status = "active" WHERE id = ?',
        [tenantId]
      );

      // Add subscription history
      await connection.execute(
        `INSERT INTO subscription_history (subscription_id, tenant_id, plan_id, action, new_status, performed_by)
         VALUES (?, ?, ?, 'created', 'active', ?)`,
        [subscriptionResult.insertId, tenantId, plan_id, email]
      );
    }

    await connection.commit();

    // Create tenant database (async)
    createTenantDatabase(uniqueSlug).then(() => {
      db.execute('UPDATE tenants SET is_setup_complete = TRUE WHERE id = ?', [tenantId]);
    }).catch(err => {
      console.error('Error creating tenant database:', err);
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: userId, email, tenantId, tenantSlug: uniqueSlug, role: 'owner' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: userId,
        email,
        full_name: owner_name,
        role: 'owner',
        tenant_id: tenantId,
        tenant_slug: uniqueSlug,
        tenant_name,
        status: plan_id ? 'active' : 'trial',
        trial_ends_at: trialEndsAt
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  } finally {
    connection.release();
  }
};

// Tenant Login
exports.tenantLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Try to find user by email OR full_name
    const [users] = await db.execute(
      `SELECT tu.*, t.tenant_slug, t.tenant_name, t.database_name, t.status as tenant_status, t.trial_ends_at
       FROM tenant_users tu
       JOIN tenants t ON tu.tenant_id = t.id
       WHERE (tu.email = ? OR tu.full_name = ?) AND tu.is_active = TRUE`,
      [email, email] // email parameter is used for both email and full_name search
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if tenant is suspended or cancelled
    if (user.tenant_status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended. Please contact support.' });
    }

    if (user.tenant_status === 'cancelled' || user.tenant_status === 'expired') {
      return res.status(403).json({ error: 'Subscription expired. Please renew your subscription.' });
    }

    // Update last login
    await db.execute(
      'UPDATE tenant_users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id, email: user.email, tenantId: user.tenant_id, tenantSlug: user.tenant_slug, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        tenant_id: user.tenant_id,
        tenant_slug: user.tenant_slug,
        tenant_name: user.tenant_name,
        status: user.tenant_status,
        trial_ends_at: user.trial_ends_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Get all subscription plans
exports.getPlans = async (req, res) => {
  try {
    const [plans] = await db.execute(
      'SELECT * FROM subscription_plans WHERE is_active = TRUE ORDER BY price'
    );

    res.json({ plans });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
};

// Get current subscription
exports.getCurrentSubscription = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    const [subscriptions] = await db.execute(
      `SELECT 
        s.*,
        sp.plan_name,
        sp.display_name,
        sp.price,
        sp.features,
        sp.max_users,
        sp.max_storage_gb,
        t.status as tenant_status,
        t.trial_ends_at
      FROM subscriptions s
      JOIN subscription_plans sp ON s.plan_id = sp.id
      JOIN tenants t ON s.tenant_id = t.id
      WHERE s.tenant_id = ? AND s.status IN ('active', 'past_due')
      ORDER BY s.created_at DESC
      LIMIT 1`,
      [tenantId]
    );

    if (subscriptions.length === 0) {
      // Check if in trial
      const [tenant] = await db.execute(
        'SELECT status, trial_ends_at FROM tenants WHERE id = ?',
        [tenantId]
      );

      if (tenant.length > 0 && tenant[0].status === 'trial') {
        return res.json({
          subscription: null,
          trial: {
            status: 'trial',
            trial_ends_at: tenant[0].trial_ends_at
          }
        });
      }

      return res.status(404).json({ error: 'No active subscription found' });
    }

    res.json({ subscription: subscriptions[0] });
  } catch (error) {
    console.error('Get current subscription error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
};

// Upgrade subscription
exports.upgradeSubscription = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const tenantId = req.tenantId;
    const { plan_id } = req.body;

    // Get current subscription
    const [currentSub] = await connection.execute(
      'SELECT * FROM subscriptions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1',
      [tenantId]
    );

    if (currentSub.length > 0) {
      // Update existing subscription
      await connection.execute(
        'UPDATE subscriptions SET plan_id = ?, updated_at = NOW() WHERE id = ?',
        [plan_id, currentSub[0].id]
      );

      // Log to history
      await connection.execute(
        `INSERT INTO subscription_history (subscription_id, tenant_id, plan_id, action, performed_by)
         VALUES (?, ?, ?, 'upgraded', ?)`,
        [currentSub[0].id, tenantId, plan_id, req.tenantUser.email]
      );
    } else {
      // Create new subscription (upgrade from trial)
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

      const [subscriptionResult] = await connection.execute(
        `INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end, next_billing_date)
         VALUES (?, ?, 'active', ?, ?, ?)`,
        [tenantId, plan_id, currentPeriodStart, currentPeriodEnd, currentPeriodEnd]
      );

      // Update tenant status
      await connection.execute(
        'UPDATE tenants SET status = "active" WHERE id = ?',
        [tenantId]
      );

      // Log to history
      await connection.execute(
        `INSERT INTO subscription_history (subscription_id, tenant_id, plan_id, action, new_status, performed_by)
         VALUES (?, ?, ?, 'created', 'active', ?)`,
        [subscriptionResult.insertId, tenantId, plan_id, req.tenantUser.email]
      );
    }

    await connection.commit();

    res.json({ message: 'Subscription upgraded successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Upgrade subscription error:', error);
    res.status(500).json({ error: 'Failed to upgrade subscription' });
  } finally {
    connection.release();
  }
};

// Record payment
exports.recordPayment = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const tenantId = req.tenantId;
    const { amount, payment_method, transaction_id, notes } = req.body;

    // Get current subscription
    const [subscription] = await connection.execute(
      'SELECT * FROM subscriptions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1',
      [tenantId]
    );

    if (subscription.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'No subscription found' });
    }

    const subscriptionId = subscription[0].id;

    // Record payment
    await connection.execute(
      `INSERT INTO payment_transactions (tenant_id, subscription_id, amount, payment_method, transaction_id, status, payment_date, notes)
       VALUES (?, ?, ?, ?, ?, 'completed', NOW(), ?)`,
      [tenantId, subscriptionId, amount, payment_method, transaction_id, notes]
    );

    // Update subscription
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    await connection.execute(
      'UPDATE subscriptions SET last_payment_date = NOW(), next_billing_date = ?, status = "active" WHERE id = ?',
      [nextBillingDate, subscriptionId]
    );

    // Update tenant status if needed
    await connection.execute(
      'UPDATE tenants SET status = "active" WHERE id = ?',
      [tenantId]
    );

    await connection.commit();

    res.json({ message: 'Payment recorded successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  } finally {
    connection.release();
  }
};

// Get subscription history
exports.getSubscriptionHistory = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    const [history] = await db.execute(
      `SELECT 
        sh.*,
        sp.display_name as plan_name,
        sp.price
      FROM subscription_history sh
      JOIN subscription_plans sp ON sh.plan_id = sp.id
      WHERE sh.tenant_id = ?
      ORDER BY sh.created_at DESC`,
      [tenantId]
    );

    const [payments] = await db.execute(
      'SELECT * FROM payment_transactions WHERE tenant_id = ? ORDER BY created_at DESC',
      [tenantId]
    );

    res.json({ history, payments });
  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription history' });
  }
};

// Get menu permissions for current tenant
exports.getMenuPermissions = async (req, res) => {
  try {
    const tenantId = req.tenantId;

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

