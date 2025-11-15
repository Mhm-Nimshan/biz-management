const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Tenant Database Connection Helper
 * Creates connection pools for tenant databases
 */

// Cache for tenant database connection pools
const tenantPools = new Map();

/**
 * Get or create a connection pool for a tenant database
 * @param {string} databaseName - The tenant's database name (e.g., 'biz_infinicodex-1761026390384')
 * @returns {Promise<Pool>} MySQL connection pool for the tenant database
 */
const getTenantPool = (databaseName) => {
  // Check if pool already exists in cache
  if (tenantPools.has(databaseName)) {
    return tenantPools.get(databaseName);
  }

  // Create new pool for this tenant database
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: databaseName,
    waitForConnections: true,
    connectionLimit: 5, // Lower limit per tenant
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  });

  // Cache the pool
  tenantPools.set(databaseName, pool);

  console.log(`✅ Created connection pool for tenant database: ${databaseName}`);

  return pool;
};

/**
 * Get a connection for a specific tenant database
 * @param {string} databaseName - The tenant's database name
 * @returns {Promise<Connection>} MySQL connection
 */
const getTenantConnection = async (databaseName) => {
  const pool = getTenantPool(databaseName);
  return await pool.getConnection();
};

/**
 * Execute a query on a tenant database
 * @param {string} databaseName - The tenant's database name
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
const executeTenantQuery = async (databaseName, query, params = []) => {
  const pool = getTenantPool(databaseName);
  return await pool.execute(query, params);
};

/**
 * Close a specific tenant pool (for cleanup)
 * @param {string} databaseName - The tenant's database name
 */
const closeTenantPool = async (databaseName) => {
  if (tenantPools.has(databaseName)) {
    const pool = tenantPools.get(databaseName);
    await pool.end();
    tenantPools.delete(databaseName);
    console.log(`✅ Closed connection pool for tenant database: ${databaseName}`);
  }
};

/**
 * Close all tenant pools (for graceful shutdown)
 */
const closeAllTenantPools = async () => {
  const closePromises = [];
  for (const [databaseName, pool] of tenantPools.entries()) {
    closePromises.push(
      pool.end().then(() => {
        console.log(`✅ Closed connection pool for tenant database: ${databaseName}`);
      })
    );
  }
  await Promise.all(closePromises);
  tenantPools.clear();
  console.log('✅ All tenant database pools closed');
};

module.exports = {
  getTenantPool,
  getTenantConnection,
  executeTenantQuery,
  closeTenantPool,
  closeAllTenantPools
};

