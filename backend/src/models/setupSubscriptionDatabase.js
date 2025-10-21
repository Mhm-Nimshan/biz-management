const db = require('../config/database');

const setupSubscriptionDatabase = async () => {
  try {
    // Subscription Plans table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id INT PRIMARY KEY AUTO_INCREMENT,
        plan_name VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(100) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        billing_cycle ENUM('monthly', 'yearly') DEFAULT 'monthly',
        max_users INT DEFAULT 1,
        max_storage_gb INT DEFAULT 10,
        features JSON,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_plan_name (plan_name)
      )
    `);

    // Tenants (Organizations/Users) table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS tenants (
        id INT PRIMARY KEY AUTO_INCREMENT,
        tenant_name VARCHAR(255) NOT NULL,
        tenant_slug VARCHAR(100) UNIQUE NOT NULL,
        database_name VARCHAR(100) UNIQUE NOT NULL,
        company_name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100),
        owner_name VARCHAR(255),
        status ENUM('trial', 'active', 'suspended', 'cancelled', 'expired') DEFAULT 'trial',
        is_setup_complete BOOLEAN DEFAULT FALSE,
        trial_ends_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tenant_slug (tenant_slug),
        INDEX idx_email (email),
        INDEX idx_status (status)
      )
    `);

    // Tenant Users table (for multi-user tenants)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS tenant_users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        tenant_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        role ENUM('owner', 'admin', 'user') DEFAULT 'user',
        is_active BOOLEAN DEFAULT TRUE,
        last_login DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        UNIQUE KEY unique_tenant_email (tenant_id, email),
        INDEX idx_tenant_id (tenant_id),
        INDEX idx_email (email)
      )
    `);

    // Subscriptions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        tenant_id INT NOT NULL,
        plan_id INT NOT NULL,
        status ENUM('active', 'cancelled', 'suspended', 'past_due', 'expired') DEFAULT 'active',
        current_period_start DATETIME NOT NULL,
        current_period_end DATETIME NOT NULL,
        cancel_at_period_end BOOLEAN DEFAULT FALSE,
        cancelled_at DATETIME,
        trial_start DATETIME,
        trial_end DATETIME,
        grace_period_ends_at DATETIME,
        payment_method ENUM('credit_card', 'bank_transfer', 'cash', 'other') DEFAULT 'credit_card',
        last_payment_date DATETIME,
        next_billing_date DATETIME,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT,
        INDEX idx_tenant_id (tenant_id),
        INDEX idx_plan_id (plan_id),
        INDEX idx_status (status),
        INDEX idx_next_billing_date (next_billing_date),
        INDEX idx_grace_period_ends_at (grace_period_ends_at)
      )
    `);

    // Subscription History table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS subscription_history (
        id INT PRIMARY KEY AUTO_INCREMENT,
        subscription_id INT NOT NULL,
        tenant_id INT NOT NULL,
        plan_id INT NOT NULL,
        action ENUM('created', 'upgraded', 'downgraded', 'renewed', 'suspended', 'cancelled', 'reactivated', 'expired') NOT NULL,
        amount DECIMAL(10,2),
        previous_status VARCHAR(50),
        new_status VARCHAR(50),
        notes TEXT,
        performed_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT,
        INDEX idx_subscription_id (subscription_id),
        INDEX idx_tenant_id (tenant_id),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at)
      )
    `);

    // Menu Permissions table (for controlling sidebar menus per tenant)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS menu_permissions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        tenant_id INT NOT NULL,
        menu_key VARCHAR(100) NOT NULL,
        is_visible BOOLEAN DEFAULT TRUE,
        display_order INT DEFAULT 0,
        custom_label VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        UNIQUE KEY unique_tenant_menu (tenant_id, menu_key),
        INDEX idx_tenant_id (tenant_id),
        INDEX idx_menu_key (menu_key)
      )
    `);

    // Super Admins table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS super_admins (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role ENUM('super_admin', 'admin', 'support') DEFAULT 'admin',
        is_active BOOLEAN DEFAULT TRUE,
        last_login DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role)
      )
    `);

    // Payment Transactions table (for tracking payments)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        tenant_id INT NOT NULL,
        subscription_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        payment_method ENUM('credit_card', 'bank_transfer', 'cash', 'other') DEFAULT 'credit_card',
        transaction_id VARCHAR(255),
        status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
        payment_date DATETIME,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
        INDEX idx_tenant_id (tenant_id),
        INDEX idx_subscription_id (subscription_id),
        INDEX idx_status (status),
        INDEX idx_payment_date (payment_date)
      )
    `);

    // Insert default subscription plans
    await db.execute(`
      INSERT INTO subscription_plans (plan_name, display_name, price, billing_cycle, max_users, max_storage_gb, features)
      VALUES 
        ('simple_start', 'Simple Start', 1.90, 'monthly', 1, 5, '["Basic Dashboard", "Product Management", "Customer Management", "Basic Reports"]'),
        ('essentials', 'Essentials', 2.80, 'monthly', 3, 10, '["All Simple Start Features", "Invoice Management", "Employee Management", "Advanced Reports"]'),
        ('plus', 'Plus', 4.00, 'monthly', 10, 25, '["All Essentials Features", "Vendor Management", "Purchase Management", "Bank Management", "Cheque Management"]'),
        ('advanced', 'Advanced', 7.60, 'monthly', -1, -1, '["All Plus Features", "Multi-location", "Advanced Analytics", "API Access", "Priority Support"]')
      ON DUPLICATE KEY UPDATE 
        display_name = VALUES(display_name),
        price = VALUES(price),
        max_users = VALUES(max_users),
        max_storage_gb = VALUES(max_storage_gb),
        features = VALUES(features)
    `);

    console.log('Subscription database tables created successfully');
  } catch (error) {
    console.error('Subscription database setup error:', error);
    throw error;
  }
};

module.exports = setupSubscriptionDatabase;

