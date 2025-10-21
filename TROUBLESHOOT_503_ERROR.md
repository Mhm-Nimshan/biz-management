# 🚨 Troubleshooting 503 Error on Super Admin Login

## Problem
Getting "Error 503. Service Unavailable" when accessing `/super-admin/login` on your hosted environment.

## Root Cause
The backend Node.js server is not running or is failing to start. This is NOT a frontend issue.

---

## 🔧 Quick Fixes (Try These First)

### Fix 1: Restart Node.js Application
1. Log into **cPanel**
2. Go to **Setup Node.js App**
3. Click **Stop App** then **Start App**
4. Wait 30 seconds
5. Check application logs for errors

### Fix 2: Verify Database Connection
The most common cause is database connection failure during server startup.

1. Go to cPanel → **phpMyAdmin**
2. Verify database `nimsleas_bizmanager_main` exists
3. Test that you can log in with:
   - Username: `nimsleas_bizmanager_main`
   - Password: `L&X6e}a=khH&`

### Fix 3: Check Environment Variables
In cPanel → **Setup Node.js App** → Click on your app → **Environment Variables**

**Required variables:**
```
DB_HOST=localhost
DB_USER=nimsleas_bizmanager_main
DB_PASSWORD=L&X6e}a=khH&
DB_NAME=nimsleas_bizmanager_main
JWT_SECRET=(any random string, 32+ characters)
SUPER_ADMIN_JWT_SECRET=(different random string, 32+ characters)
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com (replace with YOUR domain)
```

---

## 🔍 Detailed Troubleshooting

### Step 1: Check Application Logs

**Via cPanel:**
1. Setup Node.js App → Click your app → **View Logs**
2. Look for errors like:
   - "Cannot connect to database"
   - "ECONNREFUSED"
   - "Access denied for user"
   - "Unknown database"

**Via SSH (if available):**
```bash
cd ~/backend
tail -100 $(ls -t logs/*.log 2>/dev/null | head -1)
# Or check passenger logs
cat $(passenger-status --show=log_path)
```

### Step 2: Test Database Connection Manually

**Via SSH:**
```bash
cd ~/backend

# Test database connection
node -e "
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: 'localhost',
  user: 'nimsleas_bizmanager_main',
  password: 'L&X6e}a=khH&',
  database: 'nimsleas_bizmanager_main'
});
pool.query('SELECT 1').then(() => {
  console.log('✅ Database connection successful!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Database connection failed:', err.message);
  process.exit(1);
});
"
```

### Step 3: Verify Node.js Dependencies

```bash
cd ~/backend

# Check if node_modules exists
ls -la node_modules

# If missing or incomplete, reinstall
rm -rf node_modules package-lock.json
npm install --production

# Restart app from cPanel
```

### Step 4: Check Application Root Path

In **Setup Node.js App**, the paths should be:
- **Application Root**: `/home/YOUR_USERNAME/backend` (full path)
- **Application Startup File**: `src/server.js` (relative to Application Root)

NOT:
- ❌ `~/backend` (don't use ~)
- ❌ `./backend` (don't use relative paths)
- ❌ `/backend/src/server.js` (don't include startup file in Application Root)

### Step 5: Test API Endpoint Directly

Try accessing the health check endpoint:
```
https://yourdomain.com/api/health
```

**Expected response:**
```json
{
  "status": "OK",
  "message": "Business Management System API is running",
  "environment": "production",
  "timestamp": "2025-10-20T..."
}
```

**If you get 404:** Your reverse proxy or routing is misconfigured.
**If you get 503:** Your Node.js app is not running.

---

## 🐛 Common Issues & Solutions

### Issue 1: "Cannot find module"
**Error in logs:** `Error: Cannot find module 'express'`

**Solution:**
```bash
cd ~/backend
npm install
# Then restart from cPanel
```

### Issue 2: "EADDRINUSE" (Port already in use)
**Error in logs:** `Error: listen EADDRINUSE: address already in use :::5000`

**Solution:**
- cPanel assigns ports automatically
- Don't set PORT in .env, or use a unique port
- OR kill the process using that port

### Issue 3: "Access denied for user"
**Error in logs:** `ER_ACCESS_DENIED_ERROR: Access denied for user 'nimsleas_bizmanager_main'@'localhost'`

**Solution:**
1. Verify password in .env (special characters like `&` might need escaping)
2. Check user has permissions on database in cPanel → **MySQL Databases**

### Issue 4: "Unknown database"
**Error in logs:** `ER_BAD_DB_ERROR: Unknown database 'nimsleas_bizmanager_main'`

**Solution:**
1. Go to cPanel → **MySQL Databases**
2. Verify database exists
3. Ensure user is assigned to database with ALL PRIVILEGES

### Issue 5: Database initialization failing
**Error in logs:** `Database initialization error`

**Solution:**
```bash
cd ~/backend

# Try to run setup manually
node src/models/setupDatabase.js

# If this fails, check the error message
# Common issue: permissions or connection
```

### Issue 6: CORS errors (after backend is running)
**Error in browser console:** `Access to fetch at 'https://...' has been blocked by CORS policy`

**Solution:**
Update `CORS_ORIGIN` in environment variables to match your domain EXACTLY:
```
CORS_ORIGIN=https://yourdomain.com
```
NOT:
- ❌ `https://yourdomain.com/` (no trailing slash)
- ❌ `http://yourdomain.com` (use https if you have SSL)
- ❌ `yourdomain.com` (include protocol)

---

## 📋 Complete Checklist

Before the app can work, verify ALL of these:

### Backend Setup
- [ ] Backend files uploaded to `~/backend`
- [ ] `package.json` exists in backend folder
- [ ] `.env` file created with correct values
- [ ] All environment variables added in cPanel Node.js App
- [ ] `npm install` completed successfully
- [ ] Node.js app configured in cPanel
- [ ] Application Root path is correct (absolute path)
- [ ] Application Startup File is `src/server.js`
- [ ] Node.js version is 18.x or higher
- [ ] Application shows as "Running" in cPanel

### Database Setup
- [ ] Database `nimsleas_bizmanager_main` exists
- [ ] User `nimsleas_bizmanager_main` has ALL PRIVILEGES on database
- [ ] Can connect to database via phpMyAdmin
- [ ] Database credentials in .env match cPanel database

### Security & Access
- [ ] JWT_SECRET is set (random string, 32+ chars)
- [ ] SUPER_ADMIN_JWT_SECRET is set (different random string)
- [ ] CORS_ORIGIN matches your domain exactly
- [ ] SSL certificate installed (if using https)
- [ ] File permissions: .env should be 600 or 644

### Testing
- [ ] Can access `https://yourdomain.com/api/health`
- [ ] Health check returns JSON response
- [ ] No errors in Node.js application logs
- [ ] Frontend loads (even if login fails)

---

## 🆘 Still Not Working?

### Get More Information

1. **Enable Debug Mode** (temporarily):
   - Add to environment variables: `DEBUG=*`
   - Restart app
   - Check logs for detailed error messages

2. **Check System Resources**:
   - Go to cPanel → **Resource Usage**
   - Ensure you haven't exceeded limits (CPU, memory, processes)

3. **Test with curl**:
```bash
curl -v https://yourdomain.com/api/health
```

### Contact Information Needed for Support

If you need to contact hosting support, provide:
- **Error message from logs** (copy exact text)
- **Node.js version** (from cPanel Node.js App)
- **Application Root path** (from cPanel Node.js App)
- **Database name and user** (nimsleas_bizmanager_main)
- **Domain name** where app is hosted
- **Output from** `curl -v https://yourdomain.com/api/health`

---

## 🎯 Expected Working State

When everything is configured correctly:

1. **Node.js App Status**: ✅ Running
2. **API Health**: `https://yourdomain.com/api/health` returns JSON
3. **Frontend**: `https://yourdomain.com` loads React app
4. **Super Admin Login**: `https://yourdomain.com/super-admin/login` shows login form
5. **Login works**: Can submit credentials (after creating super admin)

---

## 📝 Next Steps After Backend is Running

Once the backend starts successfully:

1. **Create Super Admin**:
```bash
cd ~/backend
npm run create-super-admin
# OR
node src/scripts/createSuperAdmin.js
```

2. **Test Login**:
   - Go to `https://yourdomain.com/super-admin/login`
   - Use credentials from previous step
   - Should redirect to Super Admin Dashboard

3. **Verify Tables Created**:
   - Go to phpMyAdmin
   - Check that tables were created automatically:
     - `super_admins`
     - `tenants`
     - `subscriptions`
     - `subscription_plans`
     - etc.

---

## 🔄 Quick Reference Commands

```bash
# Navigate to backend
cd ~/backend

# View logs (if available)
tail -f logs/*.log

# Check if node_modules exists
ls -la node_modules | head

# Reinstall dependencies
npm install --production

# Test database connection (MySQL client)
mysql -u nimsleas_bizmanager_main -p nimsleas_bizmanager_main
# Enter password when prompted: L&X6e}a=khH&

# Create super admin
npm run create-super-admin

# Check Node.js version
node --version

# Check if app is listening on port
netstat -tlnp | grep :5000
```

---

**Last Updated**: 2025-10-20
**For**: Business Management System v1.0

