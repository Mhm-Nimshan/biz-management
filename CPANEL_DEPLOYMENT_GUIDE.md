# 🚀 cPanel Deployment Guide

This guide will help you deploy your Business Management System to cPanel hosting.

## 📋 Prerequisites

- cPanel hosting account with Node.js support
- Database credentials provided:
  - Database: `nimsleas_bizmanager_main`
  - Username: `nimsleas_bizmanager_main`
  - Password: `L&X6e}a=khH&`
- SSH access (recommended) or File Manager
- Your domain name

## 🗄️ Step 1: Database Setup

### 1.1 Verify Database
1. Log into cPanel
2. Go to **phpMyAdmin**
3. Verify that database `nimsleas_bizmanager_main` exists
4. Test connection with the provided credentials

### 1.2 Import Database Schema
The application will automatically create tables on first run, but you need to:
1. Ensure the database is empty or backed up
2. The app will run migrations automatically via `setupDatabase.js`

## 📦 Step 2: Backend Deployment

### 2.1 Upload Backend Files

**Option A: Using SSH (Recommended)**
```bash
# Connect to your server via SSH
ssh your-username@yourdomain.com

# Navigate to your home directory
cd ~/

# Create a backend directory
mkdir backend
cd backend

# Upload files (from your local machine)
# Use SCP or SFTP client like FileZilla
# Upload the entire backend/ folder contents
```

**Option B: Using File Manager**
1. In cPanel, open **File Manager**
2. Create a folder called `backend` in your home directory
3. Upload all files from your local `backend/` folder
4. Extract if uploaded as zip

### 2.2 Configure Backend

1. **Update .env file**
   - Navigate to `backend/.env`
   - The file is already configured with your database credentials
   - **IMPORTANT**: Change these values:
     ```
     JWT_SECRET=CHANGE-THIS-TO-A-RANDOM-STRING-123456789
     SUPER_ADMIN_JWT_SECRET=CHANGE-THIS-TO-ANOTHER-RANDOM-STRING-987654321
     CORS_ORIGIN=https://yourdomain.com
     ```

2. **Generate secure JWT secrets**
   ```bash
   # Run this in terminal to generate random strings
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

### 2.3 Install Backend Dependencies

```bash
cd ~/backend
npm install --production
```

### 2.4 Setup Node.js Application in cPanel

1. In cPanel, go to **Setup Node.js App**
2. Click **Create Application**
3. Configure:
   - **Node.js version**: 18.x or higher
   - **Application mode**: Production
   - **Application root**: `backend`
   - **Application URL**: Your domain or subdomain
   - **Application startup file**: `src/server.js`
   - **Environment variables**: Add all from .env file
4. Click **Create**
5. Copy the command to restart the application

### 2.5 Setup Environment Variables in cPanel

In the Node.js App interface, add these environment variables:
```
DB_HOST=localhost
DB_USER=nimsleas_bizmanager_main
DB_PASSWORD=L&X6e}a=khH&
DB_NAME=nimsleas_bizmanager_main
JWT_SECRET=(your-generated-secret)
SUPER_ADMIN_JWT_SECRET=(your-generated-secret)
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
```

### 2.6 Create Super Admin

```bash
cd ~/backend
npm run create-super-admin
# Follow the prompts to create your super admin account
```

## 🎨 Step 3: Frontend Deployment

### 3.1 Build Frontend Locally

Before uploading, build the React app on your local machine:

```bash
# On your local machine
cd frontend

# Update .env.production with your domain
# REACT_APP_API_URL=https://yourdomain.com/api

# Build for production
npm run build
```

This creates a `build/` folder with optimized static files.

### 3.2 Upload Frontend

**Option A: Upload to public_html (Main Domain)**
1. In cPanel **File Manager**, navigate to `public_html`
2. Delete default files (index.html, etc.) or backup
3. Upload all contents from `frontend/build/` folder
4. Make sure `index.html`, `static/` folder, etc. are directly in `public_html`

**Option B: Upload to Subdirectory**
1. Create a subfolder in `public_html` (e.g., `public_html/app`)
2. Upload `build/` contents to that folder

### 3.3 Configure .htaccess for React Router

Create/edit `.htaccess` in your frontend directory:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Enable CORS (if needed)
<IfModule mod_headers.c>
  Header set Access-Control-Allow-Origin "*"
</IfModule>

# Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType application/json "access plus 1 week"
</IfModule>
```

## 🔧 Step 4: Configure Reverse Proxy (Optional but Recommended)

If you want your API at `https://yourdomain.com/api`, add to your `.htaccess`:

```apache
# Proxy API requests to Node.js backend
RewriteEngine On
RewriteCond %{REQUEST_URI} ^/api/
RewriteRule ^api/(.*)$ http://localhost:5000/api/$1 [P,L]
```

**OR** configure in cPanel's **Setup Node.js App** by setting the Application URL to `/api`

## 🔐 Step 5: Security Configuration

### 5.1 Secure .env file
```bash
chmod 600 ~/backend/.env
```

### 5.2 Create .htaccess in backend folder
```apache
# Deny access to backend files from web
<FilesMatch "\.(env|js|json)$">
  Order allow,deny
  Deny from all
</FilesMatch>
```

### 5.3 SSL Certificate
1. In cPanel, go to **SSL/TLS Status**
2. Install Let's Encrypt SSL certificate for your domain
3. Enable **Force HTTPS Redirect**

## ✅ Step 6: Verify Deployment

### 6.1 Test Backend
```bash
# Test API health
curl https://yourdomain.com/api/health

# Or visit in browser
https://yourdomain.com/api/health
```

### 6.2 Test Frontend
- Visit `https://yourdomain.com`
- Try logging in with super admin credentials
- Check browser console for errors

### 6.3 Test Database Connection
- Log into Super Admin dashboard
- Create a test tenant
- Verify database tables are created

## 🐛 Troubleshooting

### Backend Issues

**"Cannot connect to database"**
```bash
# Verify database credentials in .env
# Check if MySQL is running in cPanel
# Verify user has permissions on database
```

**"Port already in use"**
- cPanel assigns ports automatically
- Use the port assigned by cPanel's Node.js App Manager

**"Module not found"**
```bash
cd ~/backend
npm install
# Restart the Node.js app from cPanel
```

### Frontend Issues

**"Failed to fetch" or CORS errors**
- Update `CORS_ORIGIN` in backend `.env`
- Add your domain to CORS configuration

**White screen / blank page**
- Check browser console for errors
- Verify `REACT_APP_API_URL` in `.env.production`
- Rebuild frontend: `npm run build`

**404 on refresh**
- Verify `.htaccess` is in place
- Check RewriteEngine is enabled

### Database Issues

**"Table doesn't exist"**
- The app creates tables automatically
- Check server logs: `~/backend/logs/` (if configured)
- Manually run: `node src/models/setupDatabase.js`

## 📊 Monitoring & Maintenance

### View Logs
```bash
# Node.js application logs (if configured in cPanel)
tail -f ~/backend/logs/app.log

# Or check cPanel's Node.js App logs
```

### Restart Application
```bash
# Use the restart command from cPanel Node.js App
# Or via SSH
cd ~/backend
touch tmp/restart.txt  # If using Passenger
```

### Backup Database
```bash
# Via cPanel phpMyAdmin - Export
# Or via command line
mysqldump -u nimsleas_bizmanager_main -p nimsleas_bizmanager_main > backup.sql
```

## 🔄 Updates & Redeployment

### Update Backend
```bash
# Backup first
cp -r ~/backend ~/backend_backup

# Upload new files
# Then:
cd ~/backend
npm install
# Restart from cPanel Node.js App Manager
```

### Update Frontend
```bash
# Build locally
npm run build

# Upload new build/ files to public_html
# Clear browser cache
```

## 📞 Support Checklist

Before seeking support, verify:
- [ ] Database credentials are correct
- [ ] .env file has correct values
- [ ] JWT secrets are properly generated
- [ ] SSL certificate is installed
- [ ] Node.js version is 18.x or higher
- [ ] All npm packages are installed
- [ ] CORS_ORIGIN matches your domain
- [ ] .htaccess files are in place
- [ ] File permissions are correct (644 for files, 755 for folders)

## 🎉 Success!

Your Business Management System should now be live at:
- **Frontend**: https://yourdomain.com
- **Backend API**: https://yourdomain.com/api
- **Super Admin**: https://yourdomain.com/super-admin/login

---

**Important URLs:**
- Super Admin Login: `/super-admin/login`
- Tenant Login: `/login`
- Subscription Plans: `/plans`

**Default Super Admin:**
- Created via: `npm run create-super-admin`
- Use credentials you set during creation

---

**Need Help?**
Check the other README files:
- `QUICK_START_GUIDE.md`
- `SUBSCRIPTION_SYSTEM_README.md`
- `HR_MANAGEMENT_README.md`
- `POS_SYSTEM_README.md`

