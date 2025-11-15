const db = require('../config/database');

async function checkTables() {
  try {
    console.log('Checking database tables...\n');
    
    // Check if subscription tables exist
    const tablesToCheck = [
      'subscription_plans',
      'tenants',
      'tenant_users',
      'subscriptions',
      'subscription_history',
      'super_admins',
      'menu_permissions',
      'payment_transactions'
    ];
    
    for (const table of tablesToCheck) {
      try {
        const [rows] = await db.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`✅ Table '${table}' exists - ${rows[0].count} records`);
      } catch (error) {
        console.log(`❌ Table '${table}' DOES NOT exist or error: ${error.message}`);
      }
    }
    
    // Check if there are any tenants
    try {
      const [tenants] = await db.execute('SELECT id, tenant_name, email, status, is_setup_complete FROM tenants ORDER BY created_at DESC LIMIT 5');
      console.log('\n--- Recent Tenants ---');
      if (tenants.length === 0) {
        console.log('No tenants found');
      } else {
        tenants.forEach(t => {
          console.log(`ID: ${t.id}, Name: ${t.tenant_name}, Email: ${t.email}, Status: ${t.status}, Setup Complete: ${t.is_setup_complete}`);
        });
      }
    } catch (error) {
      console.log('Error checking tenants:', error.message);
    }
    
    // Check if there are any tenant_users
    try {
      const [users] = await db.execute('SELECT tu.*, t.tenant_name FROM tenant_users tu LEFT JOIN tenants t ON tu.tenant_id = t.id ORDER BY tu.created_at DESC LIMIT 5');
      console.log('\n--- Recent Tenant Users ---');
      if (users.length === 0) {
        console.log('No tenant users found');
      } else {
        users.forEach(u => {
          console.log(`ID: ${u.id}, Tenant: ${u.tenant_name || 'N/A'}, Email: ${u.email}, Role: ${u.role}, Active: ${u.is_active}`);
        });
      }
    } catch (error) {
      console.log('Error checking tenant users:', error.message);
    }
    
    // Check subscription plans
    try {
      const [plans] = await db.execute('SELECT * FROM subscription_plans WHERE is_active = TRUE');
      console.log('\n--- Subscription Plans ---');
      if (plans.length === 0) {
        console.log('⚠️  No subscription plans found! Run npm run setup-db');
      } else {
        plans.forEach(p => {
          console.log(`${p.display_name}: $${p.price}/month (${p.max_users} users, ${p.max_storage_gb}GB)`);
        });
      }
    } catch (error) {
      console.log('Error checking plans:', error.message);
    }
    
    // List all tenant databases
    try {
      const [databases] = await db.execute("SHOW DATABASES LIKE 'nimsleas_%'");
      console.log('\n--- Tenant Databases ---');
      if (databases.length === 0) {
        console.log('No tenant databases found');
      } else {
        databases.forEach(db => {
          console.log(`Database: ${Object.values(db)[0]}`);
        });
      }
    } catch (error) {
      console.log('Error listing databases:', error.message);
    }
    
    console.log('\n✅ Database check complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTables();

