# Tenant Database Routes Fix Guide

## Problem

All business routes were saving data to the **super admin database** instead of the **tenant-specific databases** because:
1. Routes were not using `tenantAuth` middleware
2. Routes were using the main `db` connection instead of tenant-specific connection

## Solution

Each tenant business route file needs TWO changes:

### Change 1: Add tenantAuth Middleware

```javascript
// BEFORE:
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// AFTER:
const express = require('express');
const router = express.Router();
const tenantAuth = require('../middleware/tenantAuth');

// Apply tenant authentication to all routes
router.use(tenantAuth);
```

### Change 2: Replace `db` with `req.db`

```javascript
// BEFORE:
const [products] = await db.execute('SELECT * FROM products');

// AFTER:
const [products] = await req.db.execute('SELECT * FROM products');
```

```javascript
// BEFORE:
const connection = await db.getConnection();

// AFTER:
const connection = await req.db.getConnection();
```

---

## Route Files That Need Fixing

### ✅ Already Fixed:
- [x] `products.js` - DONE
- [x] `subscriptions.js` - Already had tenantAuth

### ❌ Need to Fix:

#### Business Routes (CRITICAL):
- [ ] `customers.js`
- [ ] `employees.js`
- [ ] `invoices.js`
- [ ] `sales.js`
- [ ] `vendors.js`
- [ ] `purchases.js`

#### Financial Routes (CRITICAL):
- [ ] `banks.js`
- [ ] `cheques.js`
- [ ] `accounts.js`
- [ ] `daybook.js`

#### HR Routes (CRITICAL):
- [ ] `hr.js`

### ℹ️ Routes That Should NOT Change:
- `auth.js` - General authentication (not tenant-specific)
- `superAdmin.js` - Super admin routes (uses main database)
- `subscriptions.js` - Already correct with tenantAuth

---

## Step-by-Step Fix for Each Route File

### Step 1: Open the route file

```bash
backend/src/routes/[filename].js
```

### Step 2: Replace imports

```javascript
// OLD:
const db = require('../config/database');

// NEW:
const tenantAuth = require('../middleware/tenantAuth');
```

### Step 3: Add middleware

Add this line right after `const router = express.Router();`:

```javascript
// Apply tenant authentication to all routes
router.use(tenantAuth);
```

### Step 4: Replace all database calls

Use Find & Replace in your editor:

**Find:** `db.execute`  
**Replace:** `req.db.execute`

**Find:** `db.getConnection`  
**Replace:** `req.db.getConnection`

### Step 5: Test

After fixing each route:
1. Restart the backend server
2. Log in as a tenant
3. Test the functionality
4. Verify data is saved in the tenant database (e.g., `biz_infinicodex-1761026390384`)

---

## Example Fix: customers.js

### BEFORE:
```javascript
const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  const [customers] = await db.execute('SELECT * FROM customers');
  res.json(customers);
});

router.post('/', async (req, res) => {
  const { name, email } = req.body;
  const [result] = await db.execute(
    'INSERT INTO customers (name, email) VALUES (?, ?)',
    [name, email]
  );
  res.json({ id: result.insertId });
});

module.exports = router;
```

### AFTER:
```javascript
const express = require('express');
const router = express.Router();
const tenantAuth = require('../middleware/tenantAuth');

// Apply tenant authentication to all routes
router.use(tenantAuth);

router.get('/', async (req, res) => {
  const [customers] = await req.db.execute('SELECT * FROM customers');
  res.json(customers);
});

router.post('/', async (req, res) => {
  const { name, email } = req.body;
  const [result] = await req.db.execute(
    'INSERT INTO customers (name, email) VALUES (?, ?)',
    [name, email]
  );
  res.json({ id: result.insertId });
});

module.exports = router;
```

---

##  Verification

After fixing all routes, verify:

1. **Login as tenant** using the tenant login endpoint
2. **Create test data** (product, customer, invoice, etc.)
3. **Check database:**
   ```sql
   -- Should be EMPTY or OLD DATA:
   SELECT * FROM business_management.products;
   
   -- Should have NEW DATA:
   SELECT * FROM biz_infinicodex-1761026390384.products;
   ```

---

## Quick Fix Script

For each file in the list above, run this replacement pattern:

```bash
# 1. Add import at top
# 2. Add router.use(tenantAuth); after router creation
# 3. Replace all db. with req.db.
```

---

## Common Issues

### Issue: "req.db is undefined"
**Cause:** Route doesn't have `router.use(tenantAuth);`  
**Fix:** Add the middleware

### Issue: "Cannot read property 'execute' of undefined"
**Cause:** Forgot to replace `db.execute` with `req.db.execute`  
**Fix:** Find and replace all instances

### Issue: Data still going to main database
**Cause:** Server not restarted after changes  
**Fix:** Restart the backend server

---

## Testing Checklist

After fixing all routes:

- [ ] Products: Create, Read, Update, Delete
- [ ] Customers: Create, Read, Update, Delete  
- [ ] Employees: Create, Read, Update, Delete
- [ ] Invoices: Create, Read, Update, Delete
- [ ] Sales: Create, Read, Update, Delete
- [ ] Vendors: Create, Read, Update, Delete
- [ ] Purchases: Create, Read, Update, Delete
- [ ] Banks: Create, Read, Update, Delete
- [ ] Cheques: Create, Read, Update, Delete
- [ ] Daybook: Create, Read entries
- [ ] HR: Leaves, Payroll, etc.

For each test:
1. Log in as tenant
2. Perform operation
3. Verify data in correct tenant database
4. Verify data NOT in main database

---

## Complete!

Once all routes are fixed:
- ✅ Tenant data goes to tenant databases
- ✅ Super admin data goes to main database
- ✅ Perfect multi-tenant isolation
- ✅ Production ready!

