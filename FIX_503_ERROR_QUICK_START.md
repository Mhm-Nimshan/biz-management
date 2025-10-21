# 🚨 QUICK FIX: 503 Error on Super Admin Login

## ⚡ Immediate Actions (Do These Now)

### 1. Check if Backend is Running (2 minutes)

**Via cPanel:**
1. Log into cPanel
2. Search for "Setup Node.js App" or "Node.js Selector"
3. Look for your backend application
4. **Status showing "Stopped"?** → Click "Start App"
5. **Status showing "Running"?** → Click "Restart App"

**Test immediately:**
- Visit: `https://yourdomain.com/api/health`
- **Expected:** JSON response `{"status":"OK",...}`
- **If 503:** Backend didn't start, continue to step 2

---

### 2. Create .env File (3 minutes)

**Via cPanel File Manager:**
1. Navigate to `/home/yourusername/backend/`
2. Click "New File"
3. Name it: `.env`
4. Edit the file and paste:

```env
DB_HOST=localhost
DB_USER=nimsleas_bizmanager_main
DB_PASSWORD=L&X6e}a=khH&
DB_NAME=nimsleas_bizmanager_main
JWT_SECRET=my-super-secret-jwt-key-at-least-32-characters-long-12345
SUPER_ADMIN_JWT_SECRET=my-other-super-secret-key-different-from-above-67890
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://bizz.oxodigital.agency
```

**IMPORTANT:** Replace `https://bizz.oxodigital.agency` with YOUR actual domain!

5. Save the file
6. Go back to "Setup Node.js App" → Restart App

**Test again:**
- Visit: `https://yourdomain.com/api/health`

---

### 3. Add Environment Variables in cPanel (2 minutes)

**If .env file doesn't work, add directly in cPanel:**

1. Go to "Setup Node.js App"
2. Click on your application
3. Scroll to "Environment Variables"
4. Add each variable:

| Variable Name | Value |
|---------------|-------|
| DB_HOST | localhost |
| DB_USER | nimsleas_bizmanager_main |
| DB_PASSWORD | L&X6e}a=khH& |
| DB_NAME | nimsleas_bizmanager_main |
| JWT_SECRET | (any random 32+ char string) |
| SUPER_ADMIN_JWT_SECRET | (different random 32+ char string) |
| PORT | 5000 |
| NODE_ENV | production |
| CORS_ORIGIN | https://yourdomain.com |

5. Click "Save"
6. Click "Restart App"

---

### 4. Run Diagnostics (3 minutes)

**Via SSH (if available):**
```bash
cd ~/backend
npm run diagnostics
```

This will tell you EXACTLY what's wrong.

**No SSH? Check logs in cPanel:**
1. Setup Node.js App → Your App → "View Logs"
2. Look for error messages

---

## 🎯 Most Common Fixes

### Fix A: Database Connection Failed
**Error in logs:** `Cannot connect to database` or `Access denied`

**Solution:**
1. Go to cPanel → **MySQL Databases**
2. Verify database `nimsleas_bizmanager_main` exists
3. Verify user `nimsleas_bizmanager_main` has ALL PRIVILEGES
4. If not, add user to database with ALL PRIVILEGES

### Fix B: Missing Dependencies
**Error in logs:** `Cannot find module 'express'`

**Solution:**
```bash
cd ~/backend
rm -rf node_modules package-lock.json
npm install
# Then restart from cPanel
```

### Fix C: Wrong Application Path
**Status:** App won't start, no clear error

**Solution in cPanel Node.js App:**
- **Application Root:** `/home/YOURUSERNAME/backend` (use your actual username)
- **Application Startup File:** `src/server.js`
- **NOT:** `~/backend` or `/backend/src/server.js`

### Fix D: Port Conflict
**Error in logs:** `EADDRINUSE` or `Port already in use`

**Solution:**
1. Let cPanel assign the port automatically
2. Remove `PORT=5000` from environment variables
3. OR change to a unique port like `PORT=5001`

---

## ✅ Success Checklist

After fixes, verify these work:

1. [ ] `https://yourdomain.com/api/health` → Returns JSON (not 503)
2. [ ] cPanel Node.js App shows status: "Running"
3. [ ] `https://yourdomain.com` → Shows React app (not 503)
4. [ ] `https://yourdomain.com/super-admin/login` → Shows login form

---

## 🆘 Still Getting 503?

### Check These:

1. **Is Node.js installed?**
   - cPanel → Setup Node.js App
   - If not available, contact hosting support

2. **Is your hosting account active?**
   - Check for suspension/limits exceeded

3. **Are logs showing errors?**
   - Setup Node.js App → View Logs
   - Look for red error messages
   - Google the error message

4. **Is the database accessible?**
   - cPanel → phpMyAdmin
   - Try to log in to database `nimsleas_bizmanager_main`

### Get Help:

If still not working after trying all fixes:

1. **Run diagnostics** and save output:
   ```bash
   npm run diagnostics > diagnostics-output.txt
   ```

2. **Get logs:**
   - Copy logs from cPanel Node.js App
   - Or via SSH: `cat ~/backend/logs/*.log`

3. **Share this info:**
   - Diagnostics output
   - Error logs
   - Your domain name
   - Hosting provider

---

## 🚀 After Backend Starts Successfully

### Create Super Admin:

```bash
cd ~/backend
npm run create-super-admin
```

Follow prompts to create your account.

### Test Login:

1. Go to `https://yourdomain.com/super-admin/login`
2. Enter credentials from previous step
3. Should redirect to Super Admin Dashboard

---

## 📞 Need More Help?

See detailed guides:
- **TROUBLESHOOT_503_ERROR.md** - Comprehensive troubleshooting
- **CPANEL_DEPLOYMENT_GUIDE.md** - Full deployment guide
- **QUICK_START_GUIDE.md** - General setup

---

**Quick Command Reference:**

```bash
# Navigate to backend
cd ~/backend

# Check what's wrong
npm run diagnostics

# Install dependencies
npm install

# Create super admin
npm run create-super-admin

# Test database
npm run test-db

# View package info
cat package.json
```

---

**Last Updated:** 2025-10-20

