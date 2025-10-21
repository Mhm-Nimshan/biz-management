# 🏠 Setup Local Development Environment

## Problem Identified
You're using **production cPanel credentials** in your local `.env` file. These only work on the server!

---

## ✅ Solution: Setup Local MySQL

### Step 1: Install MySQL Locally

**Choose ONE:**

**Option A: XAMPP (Recommended for Windows)**
1. Download: https://www.apachefriends.org/
2. Install XAMPP
3. Open XAMPP Control Panel
4. Start "MySQL" module
5. Default credentials: `root` / (no password)

**Option B: MySQL Server**
1. Download: https://dev.mysql.com/downloads/mysql/
2. Install MySQL
3. Remember the root password you set

**Option C: Use Docker**
```bash
docker run --name mysql-bizmanager -e MYSQL_ROOT_PASSWORD=root123 -p 3306:3306 -d mysql:8
```

---

### Step 2: Create Local Database

**Via XAMPP phpMyAdmin:**
1. Open http://localhost/phpmyadmin
2. Click "New" in left sidebar
3. Database name: `business_management`
4. Collation: `utf8mb4_unicode_ci`
5. Click "Create"

**Via MySQL Command Line:**
```sql
mysql -u root -p
CREATE DATABASE business_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

---

### Step 3: Update Backend .env for Local Development

**Edit:** `backend/.env`

**Replace with:**
```env
# Database Configuration (LOCAL DEVELOPMENT)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=business_management

# JWT Secrets
JWT_SECRET=local-dev-jwt-secret-minimum-32-characters-long-12345
SUPER_ADMIN_JWT_SECRET=local-dev-super-admin-secret-minimum-32-chars-67890

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration (Allow frontend)
CORS_ORIGIN=http://localhost:3000
```

**Important:**
- If using XAMPP with no password: `DB_PASSWORD=` (leave empty)
- If you set a MySQL password: `DB_PASSWORD=your_actual_password`

---

### Step 4: Setup Database Tables

```bash
cd backend

# Install dependencies (if not already)
npm install

# Create all database tables and insert default data
npm run setup-db

# Verify tables were created
npm run check-tables
```

**Expected output:**
```
✅ Table 'subscription_plans' exists - 4 records
✅ Table 'tenants' exists - 0 records
✅ Table 'tenant_users' exists - 0 records
...
```

---

### Step 5: Create Super Admin

```bash
npm run create-super-admin
```

Follow prompts:
- Email: `admin@example.com`
- Password: `admin123` (or any password)
- Name: `Super Admin`

---

### Step 6: Start Backend

```bash
npm start
```

**Expected output:**
```
Server running on port 5000
All databases initialized successfully
```

---

### Step 7: Verify Backend is Working

**Test in browser:**
1. http://localhost:5000/api/health → Should show `{"status":"OK",...}`
2. http://localhost:5000/api/subscriptions/plans → Should show 4 plans

---

### Step 8: Configure Frontend

**Create:** `frontend/.env.local`

```env
REACT_APP_API_URL=http://localhost:5000/api
```

**Restart frontend:**
```bash
cd frontend
npm start
```

---

### Step 9: Test Signup Flow

1. Go to http://localhost:3000/plans
2. Click "Start Free Trial" on any plan
3. Fill in signup form:
   - Tenant Name: `My Business`
   - Email: `owner@mybusiness.com`
   - Password: `password123`
   - Owner Name: `John Doe`
4. Click "Sign Up"

**What happens:**
✅ Creates record in `tenants` table
✅ Creates record in `tenant_users` table
✅ Creates separate database: `biz_my-business-1234567890`
✅ Logs you in automatically

---

## 🔍 Verify Everything Works

### Check Tables Were Created

```bash
cd backend
npm run check-tables
```

**Should show:**
- ✅ All tables exist
- ✅ 4 subscription plans
- ✅ Your tenant record
- ✅ Your tenant user record
- ✅ New tenant database created

### Check Database Directly

**Via phpMyAdmin:**
1. Open http://localhost/phpmyadmin
2. Select `business_management` database
3. Browse `tenants` table → Should see your tenant
4. Browse `tenant_users` table → Should see your user
5. Check left sidebar → Should see `biz_my-business-1234567890` database

---

## 🎉 Success Checklist

After setup, verify:

- [ ] MySQL running locally
- [ ] Local database `business_management` created
- [ ] Backend `.env` uses local credentials
- [ ] `npm run setup-db` completed successfully
- [ ] `npm run check-tables` shows all tables exist
- [ ] Backend starts without errors
- [ ] Health check works: http://localhost:5000/api/health
- [ ] Plans API works: http://localhost:5000/api/subscriptions/plans
- [ ] Frontend loads without errors
- [ ] Can see 4 subscription plans
- [ ] Can create a new account via signup
- [ ] After signup, tenant and user records exist
- [ ] Separate tenant database is created

---

## 🌐 For Production (cPanel)

Keep separate `.env` files:

### backend/.env.development (Local)
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_local_password
DB_NAME=business_management
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

### backend/.env.production (cPanel)
```env
DB_HOST=localhost
DB_USER=nimsleas_bizmanager_main
DB_PASSWORD=L&X6e}a=khH&
DB_NAME=nimsleas_bizmanager_main
CORS_ORIGIN=https://bizz.oxodigital.agency
NODE_ENV=production
```

**Then:**
- Local: Copy `.env.development` to `.env`
- Production: Upload `.env.production` as `.env` to cPanel

---

## 🐛 Troubleshooting

### Error: "Access denied for user 'root'"
**Fix:** Wrong password in `.env`. Update `DB_PASSWORD`

### Error: "Unknown database 'business_management'"
**Fix:** Database not created. Run:
```sql
CREATE DATABASE business_management;
```

### Error: "Table 'subscription_plans' doesn't exist"
**Fix:** Tables not created. Run:
```bash
npm run setup-db
```

### No tenant database created after signup
**Check backend terminal for errors like:**
- "Access denied" → MySQL user doesn't have CREATE DATABASE permission
- "Database exists" → Database creation succeeded

**Fix:** Grant permissions to MySQL user:
```sql
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

### CORS errors in browser
**Fix:** Update `backend/.env`:
```env
CORS_ORIGIN=http://localhost:3000
```

---

## 📞 Quick Commands Reference

```bash
# Check if MySQL is running
mysql -u root -p

# Start MySQL (XAMPP)
# Open XAMPP Control Panel → Start MySQL

# Check database tables
cd backend
npm run check-tables

# Setup/reset database
npm run setup-db

# Create super admin
npm run create-super-admin

# Start backend
npm start

# Test backend
curl http://localhost:5000/api/health
```

---

**You need LOCAL MySQL for local development!**
**The cPanel credentials ONLY work on the production server!**

