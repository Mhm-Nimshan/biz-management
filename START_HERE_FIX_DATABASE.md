# 🚀 START HERE: Fix Database & Account Creation

## 🔴 Your Problem

**You're using PRODUCTION database credentials for LOCAL development!**

This is why:
- ❌ Backend won't start
- ❌ Plans don't load
- ❌ Account creation fails
- ❌ No data gets saved

---

## ✅ Quick Fix (5 Minutes)

### Step 1: Install XAMPP (if not already installed)

**Download:** https://www.apachefriends.org/

**Install and:**
1. Open XAMPP Control Panel
2. Click "Start" next to "MySQL"
3. Green background = MySQL is running ✅

---

### Step 2: Create Database

1. Open: http://localhost/phpmyadmin
2. Click "New" in left sidebar
3. Database name: `business_management`
4. Click "Create"

---

### Step 3: Update Backend Configuration

**File:** `backend/.env`

**Change lines 2-5 from:**
```env
DB_HOST=localhost
DB_USER=nimsleas_bizmanager_main
DB_PASSWORD=L&X6e}a=khH&
DB_NAME=nimsleas_bizmanager_main
```

**To:**
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=business_management
```

**Also change line 14 from:**
```env
CORS_ORIGIN=https://bizz.oxodigital.agency/
```

**To:**
```env
CORS_ORIGIN=http://localhost:3000
```

**Save the file!**

---

### Step 4: Setup Database Tables

**Open terminal in project folder:**

```bash
cd backend
npm install
npm run setup-db
```

**Expected output:**
```
Main database tables created successfully
Subscription database tables created successfully
HR database tables created successfully
```

---

### Step 5: Verify Setup

```bash
npm run check-tables
```

**Should show:**
```
✅ Table 'subscription_plans' exists - 4 records
✅ Table 'tenants' exists - 0 records
✅ Table 'tenant_users' exists - 0 records
...
```

---

### Step 6: Start Backend

```bash
npm start
```

**Expected:**
```
Server running on port 5000
All databases initialized successfully
```

**Keep this terminal open!**

---

### Step 7: Test in Browser

**Open:** http://localhost:5000/api/health

**Should see:**
```json
{"status":"OK","message":"Business Management System API is running",...}
```

**Open:** http://localhost:5000/api/subscriptions/plans

**Should see:** 4 subscription plans

---

### Step 8: Test Frontend

1. Go to: http://localhost:3000/plans
2. **You should now see 4 subscription plan cards!** 🎉
3. Click "Start Free Trial" on any plan
4. Fill in the signup form:
   - Tenant Name: `Test Business`
   - Email: `owner@test.com`
   - Password: `password123`
   - Owner Name: `Test Owner`
5. Click "Sign Up"

**Expected:**
- ✅ Success message
- ✅ Logged in automatically
- ✅ Redirected to dashboard

---

### Step 9: Verify Account Was Created

```bash
cd backend
npm run check-tables
```

**Should show:**
```
✅ Table 'tenants' exists - 1 records          ← Your account!
✅ Table 'tenant_users' exists - 1 records     ← Your user!

--- Tenant Databases ---
Database: biz_test-business-1234567890         ← Separate database!
```

---

## ✅ Success Checklist

- [ ] XAMPP installed, MySQL running (green in control panel)
- [ ] Database `business_management` created in phpMyAdmin
- [ ] `backend/.env` updated with local credentials
- [ ] `npm run setup-db` completed successfully
- [ ] `npm run check-tables` shows 4 subscription plans
- [ ] Backend running: `npm start` (no errors)
- [ ] http://localhost:5000/api/health returns JSON
- [ ] http://localhost:5000/api/subscriptions/plans shows 4 plans
- [ ] Frontend shows 4 plan cards at /plans page
- [ ] Can create account via signup form
- [ ] After signup, account exists in database

---

## 🐛 If Something Goes Wrong

### Error: "Access denied for user 'root'"

**If XAMPP has password:**
Update `backend/.env`:
```env
DB_PASSWORD=your_xampp_password
```

### Error: "Unknown database 'business_management'"

Database not created. Go back to Step 2.

### Backend won't start

```bash
cd backend
npm run diagnostics
```

Fix any errors shown, then try `npm start` again.

### Plans still don't load

1. Make sure backend is running (terminal should show "Server running on port 5000")
2. Check: http://localhost:5000/api/subscriptions/plans in browser
3. If 404, backend route problem
4. If CORS error, check `CORS_ORIGIN` in `.env` is `http://localhost:3000`

### Account created but no tenant database

**Check backend terminal for errors**

Common issue: MySQL user doesn't have permission to create databases.

**Fix:**
```sql
mysql -u root -p
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
EXIT;
```

Then restart backend and try signup again.

---

## 📚 More Help

- **Full guide:** `SETUP_LOCAL_DEVELOPMENT.md`
- **Why this happens:** `WHY_ACCOUNT_CREATION_FAILS.md`
- **Production deployment:** `CPANEL_DEPLOYMENT_GUIDE.md`
- **Backend issues:** `FIX_503_ERROR_QUICK_START.md`

---

## 💡 Understanding the Fix

**Before (NOT WORKING):**
```
Your Computer → Tries to connect to cPanel database → ❌ Access Denied
```

**After (WORKING):**
```
Your Computer → Connects to local MySQL → ✅ Success!
```

---

**That's it! Your backend should now work, plans should load, and account creation should save data to the database!** 🚀

---

**Current .env configuration:**
- ❌ Production (cPanel) - Only works on server
- ✅ Local (your computer) - Works for development

**When you deploy to production**, upload a DIFFERENT `.env` with production credentials!

