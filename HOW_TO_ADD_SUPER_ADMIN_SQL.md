# 🔐 Add Super Admin Using SQL

## Quick Method: Direct SQL Insert

I've created a ready-to-use SQL script for you!

---

## 📄 SQL File Created

**File:** `backend/src/scripts/add-super-admin.sql`

**Pre-configured Credentials:**
- **Email:** `admin@gmail.com`
- **Password:** `Nimshan@12`
- **Name:** `Super Administrator`

---

## 🚀 How to Use (3 Methods)

### **Method 1: Via phpMyAdmin (Easiest)**

1. **Log into cPanel**
2. **Open phpMyAdmin**
3. **Select database:** `nimsleas_bizmanager_main`
4. **Click "SQL" tab** at the top
5. **Copy and paste** this SQL:

```sql
INSERT INTO super_admins (email, password_hash, full_name, role, is_active, created_at)
VALUES (
    'admin@gmail.com',
    '$2b$10$wVSO/aD9963WUn7n2xcIDe0nDR13bvGPc7Nd3chgtm7YLWw8q4F0S',
    'Super Administrator',
    'super_admin',
    TRUE,
    NOW()
);
```

6. **Click "Go"** button
7. **Success!** You should see "1 row inserted"

---

### **Method 2: Via MySQL Command Line**

```bash
# Connect to MySQL
mysql -u nimsleas_bizmanager_main -p nimsleas_bizmanager_main

# Enter password: L&X6e}a=khH&

# Paste the INSERT statement above and press Enter
```

---

### **Method 3: Upload SQL File**

1. **Open phpMyAdmin**
2. **Select database:** `nimsleas_bizmanager_main`
3. **Click "Import" tab**
4. **Choose File:** Upload `backend/src/scripts/add-super-admin.sql`
5. **Click "Go"**

---

## ✅ Verify It Worked

### **Check in phpMyAdmin:**

1. Click on `super_admins` table
2. Click "Browse"
3. You should see your account:
   - Email: `admin@gmail.com`
   - Name: `Super Administrator`
   - Active: ✓

### **Or run this SQL:**

```sql
SELECT * FROM super_admins WHERE email = 'admin@gmail.com';
```

---

## 🧪 Test Login

**Now try logging in:**

1. **Go to:** `https://bizz.oxodigital.agency/super-admin/login`
2. **Email:** `admin@gmail.com`
3. **Password:** `Nimshan@12`
4. **Click "Sign in"**

**✅ Should work now!**

---

## 🔧 Create Different Password

If you want a different password:

### **Generate Hash:**

```bash
cd backend
node -e "console.log(require('bcryptjs').hashSync('YourNewPassword', 10))"
```

**Or use the helper script:**

```bash
node src/scripts/generatePasswordHash.js
```

### **Then update SQL:**

Replace the `password_hash` value with your generated hash.

---

## 📝 Multiple Super Admins

You can create multiple accounts:

```sql
INSERT INTO super_admins (email, password_hash, full_name, role, is_active, created_at)
VALUES 
    ('admin1@gmail.com', '$2b$10$hash1...', 'Admin One', 'super_admin', TRUE, NOW()),
    ('admin2@gmail.com', '$2b$10$hash2...', 'Admin Two', 'super_admin', TRUE, NOW()),
    ('support@gmail.com', '$2b$10$hash3...', 'Support Team', 'support', TRUE, NOW());
```

---

## 🔄 Update Existing Password

If account exists but you forgot the password:

```sql
UPDATE super_admins 
SET password_hash = '$2b$10$wVSO/aD9963WUn7n2xcIDe0nDR13bvGPc7Nd3chgtm7YLWw8q4F0S' 
WHERE email = 'admin@gmail.com';
```

This sets password to: `Nimshan@12`

---

## 🗑️ Delete Super Admin (Careful!)

```sql
DELETE FROM super_admins WHERE email = 'admin@gmail.com';
```

---

## ⚠️ Important Notes

1. **Password is hashed** - You can't see the actual password in the database
2. **Email must be unique** - Can't have duplicate emails
3. **Case-sensitive** - Email must match exactly when logging in
4. **role field** - Can be:
   - `super_admin` - Full access
   - `admin` - Admin access
   - `support` - Support access

---

## 🐛 Common Errors

### Error: "Duplicate entry for key 'email'"

**Meaning:** Account with this email already exists

**Solution:**
```sql
-- Either delete the existing one:
DELETE FROM super_admins WHERE email = 'admin@gmail.com';

-- Or use a different email:
-- Change 'admin@gmail.com' to 'admin2@gmail.com'
```

---

### Error: "Table 'super_admins' doesn't exist"

**Meaning:** Database tables not created yet

**Solution:**
```bash
cd ~/backend
npm run setup-db
```

Then try the INSERT again.

---

### Error: "Unknown database"

**Meaning:** Database doesn't exist

**Solution:**
Create it in phpMyAdmin or:
```sql
CREATE DATABASE nimsleas_bizmanager_main;
```

---

## 📊 Pre-Generated Hashes

Here are some pre-generated password hashes you can use:

| Password | Hash |
|----------|------|
| `Nimshan@12` | `$2b$10$wVSO/aD9963WUn7n2xcIDe0nDR13bvGPc7Nd3chgtm7YLWw8q4F0S` |
| `Admin@123` | Generate with: `node -e "console.log(require('bcryptjs').hashSync('Admin@123', 10))"` |
| `Password@123` | Generate with: `node -e "console.log(require('bcryptjs').hashSync('Password@123', 10))"` |

---

## ✅ Complete SQL Script (Copy-Paste Ready)

```sql
-- Add Super Admin Account
-- Email: admin@gmail.com
-- Password: Nimshan@12

INSERT INTO super_admins (email, password_hash, full_name, role, is_active, created_at)
VALUES (
    'admin@gmail.com',
    '$2b$10$wVSO/aD9963WUn7n2xcIDe0nDR13bvGPc7Nd3chgtm7YLWw8q4F0S',
    'Super Administrator',
    'super_admin',
    TRUE,
    NOW()
);

-- Verify it was created
SELECT id, email, full_name, role, is_active, created_at 
FROM super_admins 
WHERE email = 'admin@gmail.com';
```

---

## 🎯 After Adding Super Admin

1. **Test login** at: `https://bizz.oxodigital.agency/super-admin/login`
2. **Email:** `admin@gmail.com`
3. **Password:** `Nimshan@12`
4. **Should work!** ✅

---

## 🆘 Still Getting 401 Error?

1. **Double-check email** - Must be exactly `admin@gmail.com`
2. **Double-check password** - Must be exactly `Nimshan@12`
3. **Check if active** - Run: `SELECT is_active FROM super_admins WHERE email = 'admin@gmail.com';`
4. **Clear browser cache** - Ctrl+Shift+Delete
5. **Check backend logs** - Look for authentication errors

---

**That's it! Your super admin account is now ready to use!** 🎉

---

**Last Updated:** 2025-10-20

