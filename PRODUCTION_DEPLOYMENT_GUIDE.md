# 🚀 Production Deployment Guide

## Deployment Architecture

- **Backend API:** `https://backbizz.oxodigital.agency`
- **Frontend:** `https://bizz.oxodigital.agency`
- **Database:** `nimsleas_bizmanager_main` (already exists in cPanel)

---

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ cPanel access credentials
- ✅ Database credentials:
  - Database: `nimsleas_bizmanager_main`
  - Username: `nimsleas_bizmanager_main`
  - Password: `L&X6e}a=khH&`
- ✅ FTP/SSH access (optional but recommended)
- ✅ Both domains pointing to your cPanel hosting

---

# PART 1: BACKEND DEPLOYMENT (backbizz.oxodigital.agency)

## Step 1: Setup Backend Subdomain

### 1.1 Create Subdomain in cPanel

1. **Log into cPanel**
2. Search for **"Subdomains"** and click it
3. Fill in the form:
   - **Subdomain:** `backbizz`
   - **Domain:** `oxodigital.agency`
   - **Document Root:** `/public_html/backbizz` (or custom path)
4. Click **"Create"**

**Expected Result:**
- Subdomain created: `backbizz.oxodigital.agency`
- Directory created in File Manager

---

## Step 2: Setup Node.js Application in cPanel

### 2.1 Access Node.js Setup

1. In cPanel, search for **"Setup Node.js App"** or **"Node.js Selector"**
2. Click on it
3. Click **"Create Application"**

### 2.2 Configure Node.js Application

Fill in the application settings:

**Application Settings:**
- **Node.js version:** `18.x` (or latest available)
- **Application mode:** `Production`
- **Application root:** `backend` (or full path: `/home/username/backend`)
- **Application URL:** `backbizz.oxodigital.agency`
- **Application startup file:** `src/server.js`
- **Passenger log file:** (leave default or custom)

Click **"Create"**

**IMPORTANT:** Copy the command shown for restarting the application. You'll need it later.

---

## Step 3: Prepare Backend Files Locally

### 3.1 Update Backend Configuration

**Edit:** `backend/.env`

```env
# Database Configuration (Production)
DB_HOST=localhost
DB_USER=nimsleas_bizmanager_main
DB_PASSWORD=L&X6e}a=khH&
DB_NAME=nimsleas_bizmanager_main

# JWT Secrets - GENERATE NEW RANDOM STRINGS!
JWT_SECRET=CHANGE_THIS_TO_A_STRONG_RANDOM_STRING_MIN_64_CHARS
SUPER_ADMIN_JWT_SECRET=CHANGE_THIS_TO_ANOTHER_STRONG_RANDOM_STRING_MIN_64_CHARS

# Server Configuration
PORT=5000
NODE_ENV=production

# CORS Configuration - MUST MATCH FRONTEND DOMAIN!
CORS_ORIGIN=https://bizz.oxodigital.agency
```

### 3.2 Generate Secure JWT Secrets

**On your local machine, open terminal:**

```bash
# Generate first secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate second secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Copy these secrets and paste them into your .env file!**

### 3.3 Test Locally (Optional but Recommended)

```bash
cd backend
npm install
npm start
```

Make sure there are no errors before deploying.

---

## Step 4: Upload Backend Files to cPanel

### Option A: Using File Manager (Easier)

1. **In cPanel, open File Manager**
2. Navigate to `/home/username/` (or create `/home/username/backend`)
3. Click **"Upload"**
4. **Create a ZIP file of backend folder** (excluding node_modules!)
   ```bash
   # On your computer
   cd D:\5. Infinicodex\1. Projects\business_management_system
   # Zip backend folder WITHOUT node_modules
   ```
5. Upload the ZIP file
6. Right-click the ZIP → **"Extract"**
7. Delete the ZIP file after extraction

### Option B: Using FTP Client (FileZilla)

1. Open FileZilla (download from https://filezilla-project.org/)
2. Connect to your server:
   - Host: `ftp.oxodigital.agency` or your server IP
   - Username: Your cPanel username
   - Password: Your cPanel password
   - Port: 21
3. Navigate to `/home/username/` on server (right side)
4. Navigate to your local `backend` folder (left side)
5. Upload all backend files (may take several minutes)

### Option C: Using SSH (Advanced)

```bash
# From your local machine
scp -r backend/ username@backbizz.oxodigital.agency:~/backend/
```

**IMPORTANT:** Do NOT upload `node_modules` folder! It will be installed on the server.

---

## Step 5: Configure Environment Variables in cPanel

### 5.1 Add Environment Variables

1. Go back to **"Setup Node.js App"**
2. Click on your application (backbizz.oxodigital.agency)
3. Scroll to **"Environment variables"**
4. Add each variable by clicking **"+ Add Variable"**

**Add these variables:**

| Variable Name | Value |
|---------------|-------|
| `DB_HOST` | `localhost` |
| `DB_USER` | `nimsleas_bizmanager_main` |
| `DB_PASSWORD` | `L&X6e}a=khH&` |
| `DB_NAME` | `nimsleas_bizmanager_main` |
| `JWT_SECRET` | (paste your generated secret) |
| `SUPER_ADMIN_JWT_SECRET` | (paste your other generated secret) |
| `PORT` | `5000` |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://bizz.oxodigital.agency` |

5. Click **"Save"** after adding each variable

---

## Step 6: Install Dependencies on Server

### 6.1 Via cPanel Terminal (if available)

1. In cPanel, search for **"Terminal"**
2. Click to open terminal
3. Run these commands:

```bash
cd ~/backend
npm install --production
```

### 6.2 Via SSH

```bash
ssh username@backbizz.oxodigital.agency
cd ~/backend
npm install --production
```

### 6.3 Via Node.js App Manager

1. Go to **"Setup Node.js App"**
2. Click on your application
3. In the **"Detected modules"** section
4. Click **"Run NPM Install"**

**Wait for installation to complete** (may take 2-5 minutes)

---

## Step 7: Setup Database Tables

### 7.1 Via Terminal/SSH

```bash
cd ~/backend
node src/models/setupDatabase.js
node src/models/setupSubscriptionDatabase.js
node src/models/setupHRDatabase.js
```

**Or use the npm script:**
```bash
npm run setup-db
```

**Expected Output:**
```
Main database tables created successfully
Subscription database tables created successfully
HR database tables created successfully
```

### 7.2 Verify Tables in phpMyAdmin

1. In cPanel, open **phpMyAdmin**
2. Select database: `nimsleas_bizmanager_main`
3. You should see these tables:
   - `subscription_plans` (4 records)
   - `tenants`
   - `tenant_users`
   - `subscriptions`
   - `super_admins`
   - `employees`
   - `products`
   - etc.

---

## Step 8: Create Super Admin Account

### Via Terminal/SSH:

```bash
cd ~/backend
npm run create-super-admin
```

**Follow the prompts:**
- Email: `admin@oxodigital.agency`
- Password: `YourStrongPassword123!`
- Full Name: `Super Administrator`
- Role: `super_admin`

**Save these credentials securely!**

---

## Step 9: Start the Backend Application

### 9.1 Start Application

1. Go to **"Setup Node.js App"**
2. Find your application (backbizz.oxodigital.agency)
3. Click **"Start App"** or **"Restart"**

### 9.2 Check Application Status

- Status should show: **"Running"** (green)
- If it shows "Stopped" (red), click **"Start App"**

### 9.3 View Logs (if needed)

Click **"Open logs"** or **"View logs"** to check for errors

---

## Step 10: Configure SSL Certificate

### 10.1 Install SSL for Backend

1. In cPanel, search for **"SSL/TLS Status"**
2. Find `backbizz.oxodigital.agency`
3. Click **"Run AutoSSL"** or **"Install SSL"**
4. Wait for Let's Encrypt certificate to be installed

**Result:** Your backend will be accessible via HTTPS

---

## Step 11: Test Backend API

### 11.1 Test Health Endpoint

**Open in browser:**
```
https://backbizz.oxodigital.agency/api/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "message": "Business Management System API is running",
  "environment": "production",
  "timestamp": "2025-10-20T..."
}
```

### 11.2 Test Subscription Plans Endpoint

```
https://backbizz.oxodigital.agency/api/subscriptions/plans
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

### 11.3 Test Super Admin Login Endpoint

```
https://backbizz.oxodigital.agency/api/super-admin/login
```

**Should return:** Method not allowed (GET) - This is correct! POST works.

---

## ✅ Backend Deployment Checklist

- [ ] Subdomain `backbizz.oxodigital.agency` created in cPanel
- [ ] Node.js application configured and created
- [ ] Backend files uploaded (without node_modules)
- [ ] Environment variables configured in cPanel
- [ ] `npm install` completed successfully
- [ ] Database tables created (`npm run setup-db`)
- [ ] Super admin account created
- [ ] Application status shows "Running"
- [ ] SSL certificate installed and active
- [ ] `/api/health` endpoint returns JSON
- [ ] `/api/subscriptions/plans` returns 4 plans
- [ ] No errors in application logs

**If all checked ✅, proceed to Frontend Deployment!**

---

# PART 2: FRONTEND DEPLOYMENT (bizz.oxodigital.agency)

## Step 12: Prepare Frontend Build

### 12.1 Update Frontend Configuration

**Create/Edit:** `frontend/.env.production`

```env
REACT_APP_API_URL=https://backbizz.oxodigital.agency/api
```

**IMPORTANT:** No trailing slash on the URL!

### 12.2 Build Frontend Locally

**On your local machine:**

```bash
cd frontend
npm install
npm run build
```

**This creates a `build/` folder with optimized production files.**

**Expected output:**
```
Creating an optimized production build...
Compiled successfully.

File sizes after gzip:
  XX KB  build/static/js/main.xxxxx.js
  XX KB  build/static/css/main.xxxxx.css

The build folder is ready to be deployed.
```

---

## Step 13: Upload Frontend to cPanel

### 13.1 Access Main Domain Directory

1. In cPanel, open **File Manager**
2. Navigate to `/public_html` (this is your main domain: bizz.oxodigital.agency)
3. **Backup existing files** (if any):
   - Select all files
   - Click "Compress" → Create backup.zip
   - Download it

### 13.2 Clear Old Files (if needed)

If there are existing files:
1. Select all files/folders in `public_html`
2. Click **"Delete"**
3. Confirm deletion

**OR** deploy to subfolder: `/public_html/app` (then update domain root)

### 13.3 Upload Build Files

**Option A: Using File Manager**

1. Stay in `/public_html`
2. Click **"Upload"**
3. Upload the entire `build/` folder contents:
   - `index.html`
   - `asset-manifest.json`
   - `manifest.json`
   - `favicon.ico`
   - `robots.txt`
   - `static/` folder (entire folder)

**OR zip the build folder first:**
```bash
# On your computer
cd frontend/build
# Create zip of contents (not the build folder itself)
```

Upload zip, then extract in `/public_html`

**Option B: Using FTP**

1. Connect via FileZilla
2. Navigate to `/public_html/` on server
3. Upload all contents from `frontend/build/` folder
   - Upload `index.html`
   - Upload `static/` folder
   - Upload all other files

---

## Step 14: Configure .htaccess for React Router

### 14.1 Create/Edit .htaccess

**In cPanel File Manager:**

1. Navigate to `/public_html`
2. Check if `.htaccess` exists
   - If not, click **"+ File"** → name it `.htaccess`
3. Right-click `.htaccess` → **"Edit"**

### 14.2 Add React Router Configuration

**Paste this content:**

```apache
# Enable Rewrite Engine
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Don't rewrite files or directories
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  
  # Rewrite all other URLs to index.html
  RewriteRule . /index.html [L]
</IfModule>

# Force HTTPS
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>

# Compression for better performance
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json application/x-javascript
</IfModule>

# Browser Caching
<IfModule mod_expires.c>
  ExpiresActive On
  
  # Images
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  
  # CSS and JavaScript
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType text/javascript "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  
  # Others
  ExpiresByType application/pdf "access plus 1 month"
  ExpiresByType application/x-shockwave-flash "access plus 1 month"
</IfModule>

# Security Headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>
```

**Click "Save Changes"**

---

## Step 15: Install SSL Certificate for Frontend

### 15.1 Install SSL

1. In cPanel, go to **"SSL/TLS Status"**
2. Find `bizz.oxodigital.agency`
3. Click **"Run AutoSSL"** or **"Install SSL Certificate"**
4. Wait for Let's Encrypt to install (1-2 minutes)

**Result:** Green padlock appears next to domain

---

## Step 16: Verify Frontend Deployment

### 16.1 Test Frontend Access

**Open in browser:**
```
https://bizz.oxodigital.agency
```

**Expected Result:**
- ✅ React app loads
- ✅ No SSL warnings
- ✅ HTTPS padlock visible
- ✅ Homepage or login page displays

### 16.2 Test Page Refresh

1. Navigate to any route (e.g., `/plans`, `/login`)
2. Press **F5** or refresh button
3. Page should reload correctly (not 404)

**If you get 404:** .htaccess configuration issue

### 16.3 Test API Connection

1. Open browser console (**F12** → Console tab)
2. Navigate to `/plans` page
3. Check if plans are loading
4. No CORS errors should appear

---

## Step 17: Test Complete Application Flow

### 17.1 Test Subscription Plans Page

**Visit:** `https://bizz.oxodigital.agency/plans`

**Expected:**
- ✅ 4 subscription plan cards visible
- ✅ Prices showing correctly
- ✅ Features listed
- ✅ "Start Free Trial" buttons work

### 17.2 Test Signup Flow

1. Click "Start Free Trial" on any plan
2. Fill in signup form:
   - Tenant Name: `Test Company`
   - Email: `test@example.com`
   - Password: `Test123!`
   - Owner Name: `Test User`
3. Click "Sign Up"

**Expected:**
- ✅ Account created successfully
- ✅ Logged in automatically
- ✅ Redirected to dashboard

### 17.3 Test Super Admin Login

**Visit:** `https://bizz.oxodigital.agency/super-admin/login`

**Login with:**
- Email: `admin@oxodigital.agency` (or what you set)
- Password: (your super admin password)

**Expected:**
- ✅ Login successful
- ✅ Redirected to Super Admin Dashboard
- ✅ Can see all tenants

### 17.4 Test Regular Tenant Login

**Visit:** `https://bizz.oxodigital.agency/login`

**Login with:**
- Email/Username: `test@example.com`
- Password: `Test123!`

**Expected:**
- ✅ Login successful
- ✅ Dashboard loads
- ✅ Can access features

---

## ✅ Complete Deployment Checklist

### Backend Checklist
- [ ] `backbizz.oxodigital.agency` subdomain created
- [ ] Node.js app configured (version 18.x, production mode)
- [ ] Backend files uploaded
- [ ] `.env` configured with production values
- [ ] Environment variables added in cPanel
- [ ] `npm install` completed
- [ ] Database tables created
- [ ] Super admin account created
- [ ] SSL certificate installed
- [ ] Application running (green status)
- [ ] Health endpoint works: `/api/health`
- [ ] Plans endpoint works: `/api/subscriptions/plans`
- [ ] No errors in logs

### Frontend Checklist
- [ ] `frontend/.env.production` configured
- [ ] Build created: `npm run build`
- [ ] Build files uploaded to `/public_html`
- [ ] `.htaccess` configured for React Router
- [ ] SSL certificate installed
- [ ] Main page loads: `https://bizz.oxodigital.agency`
- [ ] All routes work (no 404 on refresh)
- [ ] Plans page loads with 4 plans
- [ ] No CORS errors in console
- [ ] Signup form works
- [ ] Login works
- [ ] Super admin login works
- [ ] Dashboard displays correctly

### Final Verification
- [ ] Can create new account
- [ ] Account saved in database (check phpMyAdmin)
- [ ] Tenant database created
- [ ] Can log in with new account
- [ ] All features accessible
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Fast loading times

---

## 🐛 Common Deployment Issues

### Issue 1: Backend Returns 503 Error

**Symptoms:** `/api/health` shows 503 or Can't GET

**Solutions:**
1. Check application status in "Setup Node.js App" → Should be "Running"
2. Click "Restart" if stopped
3. Check logs for errors
4. Verify `src/server.js` path is correct
5. Ensure `npm install` completed

### Issue 2: CORS Errors

**Symptoms:** Browser console shows CORS policy error

**Solutions:**
1. Verify `CORS_ORIGIN` in backend environment variables
2. Must be exactly: `https://bizz.oxodigital.agency` (no trailing slash!)
3. Restart backend after changing
4. Clear browser cache

### Issue 3: Frontend Shows Blank Page

**Symptoms:** White screen, no errors

**Solutions:**
1. Check browser console (F12) for JavaScript errors
2. Verify `REACT_APP_API_URL` in build was correct
3. Rebuild: `npm run build` with correct .env
4. Re-upload build files
5. Clear browser cache (Ctrl+Shift+Delete)

### Issue 4: 404 on Page Refresh

**Symptoms:** Direct URL or refresh shows 404

**Solutions:**
1. Check `.htaccess` exists in `/public_html`
2. Verify `.htaccess` has React Router rewrite rules
3. Check file permissions (644 for .htaccess)
4. Verify mod_rewrite is enabled (usually is on cPanel)

### Issue 5: Database Connection Error

**Symptoms:** Backend logs show "Access denied" or "Cannot connect"

**Solutions:**
1. Verify database credentials in environment variables
2. Check database exists in phpMyAdmin
3. Verify user has permissions on database
4. Special characters in password may need escaping

### Issue 6: Plans Not Loading

**Symptoms:** Empty plans page or error

**Solutions:**
1. Verify backend is running
2. Test `/api/subscriptions/plans` directly
3. Check subscription_plans table has 4 records
4. If empty, run: `npm run setup-db` on server
5. Check CORS configuration

### Issue 7: Signup Fails

**Symptoms:** Error when creating account

**Solutions:**
1. Check backend logs for specific error
2. Verify all tables exist (run `npm run check-tables`)
3. Check MySQL user has CREATE DATABASE permission
4. Test with different tenant name (no special characters)

---

## 🔄 Updating the Application

### Update Backend

```bash
# Via SSH or Terminal
cd ~/backend
git pull  # or upload new files
npm install
# Restart from cPanel Node.js App Manager
```

### Update Frontend

```bash
# On local machine
cd frontend
git pull  # or update files
npm run build
# Upload new build/ contents to cPanel
# Clear browser cache
```

---

## 📊 Monitoring

### Check Backend Status
1. cPanel → Setup Node.js App
2. Should show "Running" status
3. Click "View logs" to check for errors

### Check Application Logs
```bash
# Via SSH
cd ~/backend
tail -f logs/*.log  # if logging is configured
```

### Check Database
1. cPanel → phpMyAdmin
2. Browse tables for data
3. Check for new tenants after signup

---

## 🆘 Getting Help

If deployment fails:

1. **Collect Information:**
   - Error messages from logs
   - Browser console errors (F12)
   - Node.js app status
   - Database connection test results

2. **Common Log Locations:**
   - cPanel: Setup Node.js App → View logs
   - SSH: `~/backend/logs/`
   - Browser: F12 → Console tab

3. **Test Checklist:**
   - [ ] Backend health: `https://backbizz.oxodigital.agency/api/health`
   - [ ] Backend plans: `https://backbizz.oxodigital.agency/api/subscriptions/plans`
   - [ ] Frontend loads: `https://bizz.oxodigital.agency`
   - [ ] No CORS errors in console
   - [ ] SSL certificates installed

---

## 🎉 Success!

Your application should now be live at:
- **Frontend:** https://bizz.oxodigital.agency
- **Backend API:** https://backbizz.oxodigital.agency
- **Super Admin:** https://bizz.oxodigital.agency/super-admin/login

**Next Steps:**
1. Create your actual super admin account
2. Test all features thoroughly
3. Create test tenant accounts
4. Configure payment integration (if needed)
5. Set up backups
6. Monitor performance

---

**Deployment completed successfully! 🚀**

Last Updated: 2025-10-20

