const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { getTenantPool } = require('../config/tenantDbConnection');

const tenantAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check tenant user in MAIN database
    const [users] = await db.execute(
      'SELECT tu.*, t.tenant_slug, t.database_name, t.status as tenant_status FROM tenant_users tu JOIN tenants t ON tu.tenant_id = t.id WHERE tu.id = ? AND tu.is_active = TRUE',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(403).json({ error: 'Access denied. Invalid tenant user.' });
    }

    const user = users[0];

    // Check tenant subscription status
    if (user.tenant_status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended. Please contact support.' });
    }

    if (user.tenant_status === 'cancelled' || user.tenant_status === 'expired') {
      return res.status(403).json({ error: 'Subscription expired. Please renew your subscription.' });
    }

    // Set tenant info on request
    req.tenantUser = user;
    req.tenantId = user.tenant_id;
    req.tenantSlug = user.tenant_slug;
    req.tenantDatabase = user.database_name;
    
    // CRITICAL: Provide tenant database connection
    // This ensures all queries use the tenant's database, not the main database
    req.db = getTenantPool(user.database_name);
    
    console.log(`🔐 Tenant authenticated: ${user.tenant_slug} → Database: ${user.database_name}`);
    
    next();
  } catch (error) {
    console.error('Tenant auth error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = tenantAuth;

