# 🔍 Test Backend Connection & Fix "Plans Not Loading"

## Problem
Subscription plans are not loading on the `/plans` page.

## Root Cause
**The backend server is not running** (503 error), so API calls fail.

---

## 🎯 Quick Test: Is Backend Running?

### Test 1: Health Check
Open your browser and visit:
```
http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "message": "Business Management System API is running",
  "environment": "development",
  "timestamp": "2025-10-20T..."
}
```

**If you see this:** ✅ Backend is running! Skip to "Plans Not Loading Fix" section below.

**If you get an error:** ❌ Backend is not running. Continue to "Start Backend" section.

---

## 🚀 Start Backend (Local Development)

### Step 1: Navigate to Backend
```bash
cd backend
```

### Step 2: Check if Dependencies are Installed
```bash
ls node_modules
```

**If folder is empty or doesn't exist:**
```bash
npm install
```

### Step 3: Create .env File
Create a file named `.env` in the `backend` folder:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=business_management

# JWT Secrets (change these!)
JWT_SECRET=my-super-secret-jwt-key-at-least-32-characters-long-12345
SUPER_ADMIN_JWT_SECRET=my-other-super-secret-key-different-from-above-67890

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

**IMPORTANT:** Update `DB_PASSWORD` with your actual MySQL password!

### Step 4: Start MySQL
Make sure MySQL is running:

**Windows:**
- Open Services → Find MySQL → Start it
- Or use XAMPP/WAMP/MAMP control panel

**Mac:**
```bash
mysql.server start
```

**Linux:**
```bash
sudo systemctl start mysql
```

### Step 5: Run Diagnostics
```bash
npm run diagnostics
```

This will check:
- ✓ Environment variables
- ✓ Database connection
- ✓ Required files
- ✓ Dependencies

**Fix any errors shown before proceeding!**

### Step 6: Start Backend
```bash
npm start
```

**Expected Output:**
```
Server running on port 5000
All databases initialized successfully
```

### Step 7: Verify Backend is Running
In a new terminal or browser:
```bash
curl http://localhost:5000/api/health
```

Or visit: http://localhost:5000/api/health

---

## 🔧 Plans Not Loading Fix (After Backend is Running)

If backend is running but plans still don't load:

### Fix 1: Check Database for Plans
```bash
cd backend
npm run test-db
```

Then manually check:
```sql
mysql -u root -p
USE business_management;
SELECT * FROM subscription_plans;
```

**If table is empty:**
```sql
-- Run this to add default plans
INSERT INTO subscription_plans (plan_name, display_name, price, billing_cycle, max_users, max_storage_gb, features)
VALUES 
  ('simple_start', 'Simple Start', 1.90, 'monthly', 1, 5, '["Basic Dashboard", "Product Management", "Customer Management", "Basic Reports"]'),
  ('essentials', 'Essentials', 2.80, 'monthly', 3, 10, '["All Simple Start Features", "Invoice Management", "Employee Management", "Advanced Reports"]'),
  ('plus', 'Plus', 4.00, 'monthly', 10, 25, '["All Plus Features", "Vendor Management", "Purchase Management", "Bank Management", "Cheque Management"]'),
  ('advanced', 'Advanced', 7.60, 'monthly', -1, -1, '["All Plus Features", "Multi-location", "Advanced Analytics", "API Access", "Priority Support"]');
```

### Fix 2: Test API Endpoint Directly
```bash
curl http://localhost:5000/api/subscriptions/plans
```

**Expected Response:**
```json
{
  "plans": [
    {
      "id": 1,
      "plan_name": "simple_start",
      "display_name": "Simple Start",
      "price": "1.90",
      ...
    },
    ...
  ]
}
```

### Fix 3: Configure Frontend API URL
Create `frontend/.env.development`:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

Then restart your frontend:
```bash
cd frontend
npm start
```

### Fix 4: Clear Browser Cache
1. Open DevTools (F12)
2. Right-click on refresh button
3. Select "Empty Cache and Hard Reload"

---

## 🌐 For Production/Hosted Environment

### Test Backend (Replace with your domain)
```bash
curl https://yourdomain.com/api/health
```

### If 503 Error
1. Follow: **FIX_503_ERROR_QUICK_START.md**
2. Ensure backend is started in cPanel
3. Check environment variables
4. Verify database connection

### Update Frontend .env
In `frontend/.env.production`:
```env
REACT_APP_API_URL=https://yourdomain.com/api
```

Then rebuild:
```bash
cd frontend
npm run build
# Upload build/ folder to cPanel
```

---

## 🐛 Common Issues

### Issue 1: "Network Error" in Console
**Cause:** Backend not running or wrong API URL

**Fix:**
- Check backend is running
- Verify `REACT_APP_API_URL` in `.env`
- Check browser console for actual URL being called

### Issue 2: CORS Error
**Error:** `Access to fetch at 'http://localhost:5000/api/subscriptions/plans' has been blocked by CORS`

**Fix:**
Update `backend/.env`:
```env
CORS_ORIGIN=http://localhost:3000
```

### Issue 3: Database Connection Error
**Error:** `Cannot connect to database`

**Fix:**
- Ensure MySQL is running
- Check database credentials in `backend/.env`
- Create database if it doesn't exist:
  ```sql
  CREATE DATABASE business_management;
  ```

### Issue 4: Empty Plans Array
**Symptom:** API returns `{"plans": []}`

**Fix:**
- Run database setup: `npm run setup-db`
- Or manually insert plans (see SQL above)

---

## 📊 Debug Tools

### 1. Check Backend Logs
```bash
cd backend
npm start
# Watch for errors in console
```

### 2. Check Frontend Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for red errors
4. Check Network tab for failed requests

### 3. Test Each Component

**Test Database:**
```bash
cd backend
npm run test-db
```

**Test API (with curl):**
```bash
# Health check
curl http://localhost:5000/api/health

# Get plans
curl http://localhost:5000/api/subscriptions/plans
```

**Test Frontend:**
1. Open http://localhost:3000/plans
2. Open DevTools → Console
3. Look for error messages
4. Check Network tab → Find failed requests

---

## ✅ Success Checklist

When everything is working correctly:

- [ ] ✅ Backend running: `npm start` shows no errors
- [ ] ✅ MySQL running and connected
- [ ] ✅ Health check works: http://localhost:5000/api/health
- [ ] ✅ Plans API works: http://localhost:5000/api/subscriptions/plans
- [ ] ✅ Database has 4 default plans
- [ ] ✅ Frontend loads without errors
- [ ] ✅ Plans page shows 4 subscription plans
- [ ] ✅ No errors in browser console

---

## 📞 Still Not Working?

1. **Run diagnostics:**
   ```bash
   cd backend
   npm run diagnostics
   ```

2. **Check full error logs:**
   - Backend terminal output
   - Browser console (F12)
   - MySQL error logs

3. **Provide this info when asking for help:**
   - Output of `npm run diagnostics`
   - Browser console errors
   - Backend terminal output
   - Your .env configuration (without secrets)

---

**Related Guides:**
- `FIX_503_ERROR_QUICK_START.md` - For 503 errors
- `TROUBLESHOOT_503_ERROR.md` - Detailed troubleshooting
- `CPANEL_DEPLOYMENT_GUIDE.md` - Production deployment

**Last Updated:** 2025-10-20

