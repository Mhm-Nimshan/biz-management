# 💻 Local Development Setup Guide

## Problem: Database Connection Refused

You're seeing `ECONNREFUSED` because you're trying to connect to a cPanel database from your local machine, which won't work.

## Solution: Setup Local MySQL

### Option 1: Install XAMPP (Easiest for Windows)

1. **Download XAMPP**: https://www.apachefriends.org/
2. **Install** and start **MySQL** from XAMPP Control Panel
3. **Create local database**:
   - Open http://localhost/phpmyadmin
   - Click "New" to create database
   - Database name: `business_management_local`
   - Click "Create"

### Option 2: Install MySQL Server Directly

1. **Download MySQL**: https://dev.mysql.com/downloads/mysql/
2. **Install** with default settings
3. **Create database** using MySQL Workbench or command line

---

## 🔧 Configure Local Environment

### 1. Update your `.env` file for local development:

```env
# LOCAL DEVELOPMENT DATABASE
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=business_management_local

# JWT Secrets (can be anything for local dev)
JWT_SECRET=local-dev-jwt-secret-12345
SUPER_ADMIN_JWT_SECRET=local-dev-super-admin-secret-67890

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Origin
CORS_ORIGIN=http://localhost:3000
```

### 2. Test Database Connection:

```bash
cd backend
npm run test-db
```

You should see:
```
✅ MySQL connection successful!
✅ Database exists (or created)
✅ Connected to database successfully!
```

### 3. Start the Backend Server:

```bash
npm start
```

Tables will be created automatically!

### 4. Create Super Admin:

```bash
npm run create-super-admin
```

---

## 🚀 For Production (cPanel)

### Your cPanel Database Credentials (Already Configured):

```
Database: nimsleas_bizmanager_main
Username: nimsleas_bizmanager_main
Password: L&X6e}a=khH&
Host: localhost  (this is correct for cPanel server)
```

**Important**: 
- `localhost` in cPanel means the MySQL server on **that cPanel server**
- You **cannot** connect to the cPanel database from your local machine
- The cPanel database is only accessible when your code runs **on the cPanel server**

### Two Separate Environments:

| Environment | Database Location | .env File |
|-------------|-------------------|-----------|
| **Local Dev** | Your computer (MySQL/XAMPP) | `.env` (local settings) |
| **Production** | cPanel server | `.env.production` (cPanel settings) |

---

## 📝 Workflow

### For Local Development:

1. Use local MySQL database
2. Edit code on your computer
3. Test locally
4. When ready, deploy to cPanel

### For Production Deployment:

1. Build/upload to cPanel
2. Rename `.env.production` to `.env` on server
3. Server connects to cPanel MySQL
4. Everything works!

---

## ✅ Quick Start (Local Development)

```bash
# 1. Install XAMPP and start MySQL

# 2. Create database in phpMyAdmin:
#    - Name: business_management_local

# 3. Update backend/.env with local settings

# 4. Test connection
cd backend
npm run test-db

# 5. Start backend (creates tables automatically)
npm start

# 6. In another terminal, start frontend
cd ../frontend
npm start

# 7. Open browser: http://localhost:3000
```

---

## 🐛 Troubleshooting

### "ECONNREFUSED" Error
- ❌ MySQL is not running
- ✅ Start MySQL from XAMPP Control Panel
- ✅ Or start MySQL service

### "Access Denied" Error
- ❌ Wrong username/password in .env
- ✅ For XAMPP, use: user=`root`, password=``(empty)
- ✅ Check MySQL user permissions

### "Database does not exist" Error
- ❌ Database not created
- ✅ Create database in phpMyAdmin
- ✅ Or grant CREATE DATABASE permission

---

## 📊 Database Structure

After starting the server, these tables will be created automatically:
- employees
- products
- customers
- sales
- invoices
- vendors
- purchases
- accounts
- daybook_entries
- banks
- cheques
- And more...

---

## 🎯 Summary

**Problem**: Trying to use cPanel database locally
**Solution**: Use local MySQL for development, cPanel MySQL for production
**Result**: Separate databases for dev and production (this is standard practice!)

---

**Need Help?**
- MySQL not starting: Check XAMPP/MySQL service status
- Connection errors: Run `npm run test-db` to diagnose
- Tables not creating: Check server console logs

