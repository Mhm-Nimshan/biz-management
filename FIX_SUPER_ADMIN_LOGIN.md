# 🔐 Fix Super Admin Login (401 Error)

## Problem
Getting "401 Unauthorized" when trying to log in with:
- Email: `admin@gmail.com`
- Password: `Nimshan@12`

## Root Cause
The super admin account either:
1. Doesn't exist in the database
2. Has a different email
3. Has a different password
4. Is not active

---

## ✅ Solution Steps

### Step 1: Check if Super Admin Exists

**On your server (SSH or cPanel Terminal):**

```bash
cd ~/backend
npm run check-super-admin
```

**This will show:**
- All super admin accounts in the database
- Their email addresses
- Whether they're active
- Last login time

---

### Step 2: Verify the Email

**If the script shows a different email:**
- Use that email to log in instead
- OR create a new super admin with your preferred email

**If no super admins found:**
- You need to create one (see Step 3)

---

### Step 3: Create Super Admin (If Needed)

**On your server:**

```bash
cd ~/backend
npm run create-super-admin
```

**When prompted, enter:**
- **Email:** `admin@gmail.com`
- **Password:** `Nimshan@12` (or any password you want)
- **Full Name:** `Super Administrator`

**Save these credentials securely!**

---

### Step 4: Test Login Again

1. Go to: `https://bizz.oxodigital.agency/super-admin/login`
2. Enter the exact email from Step 1 or 3
3. Enter the correct password
4. Click "Sign in"

**Should work now! ✅**

---

## 🔍 Manual Database Check

If you want to check directly in the database:

### Via phpMyAdmin

1. Open **phpMyAdmin** in cPanel
2. Select database: `nimsleas_bizmanager_main`
3. Click on `super_admins` table
4. Click "Browse"
5. You'll see all super admin accounts with their emails

**Note:** Passwords are hashed, so you can't see them directly.

---

## 🐛 Common Issues

### Issue 1: Table "super_admins" doesn't exist

**Solution:**
```bash
cd ~/backend
npm run setup-db
```

This creates all required tables including `super_admins`.

---

### Issue 2: Account exists but wrong password

**You have 2 options:**

**Option A: Create new super admin with different email**
```bash
npm run create-super-admin
# Use: admin2@gmail.com or similar
```

**Option B: Update password in database directly**
```sql
-- In phpMyAdmin, run this SQL:
-- First, generate password hash locally:
-- node -e "console.log(require('bcryptjs').hashSync('Nimshan@12', 10))"
-- Then update:
UPDATE super_admins 
SET password_hash = '<paste hash here>' 
WHERE email = 'admin@gmail.com';
```

---

### Issue 3: Account exists but inactive

**Check in phpMyAdmin:**
```sql
SELECT email, is_active FROM super_admins WHERE email = 'admin@gmail.com';
```

**If `is_active` is 0, activate it:**
```sql
UPDATE super_admins SET is_active = 1 WHERE email = 'admin@gmail.com';
```

---

## 📝 Quick Commands Reference

```bash
# Check what super admins exist
npm run check-super-admin

# Create new super admin
npm run create-super-admin

# Check all database tables
npm run check-tables

# Run diagnostics
npm run diagnostics

# Setup database (if tables missing)
npm run setup-db
```

---

## 🧪 Test the Super Admin Endpoint

### Test via Browser/Postman

**Endpoint:** `https://backbizz.oxodigital.agency/api/super-admin/login`

**Method:** POST

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "admin@gmail.com",
  "password": "Nimshan@12"
}
```

**Expected Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": 1,
    "email": "admin@gmail.com",
    "full_name": "Super Administrator",
    "role": "super_admin"
  }
}
```

**Error Response (401):**
```json
{
  "error": "Invalid credentials"
}
```

---

## ✅ Verification Checklist

Before trying to log in, ensure:

- [ ] Backend is running (`npm start` or started in cPanel)
- [ ] Database connection works
- [ ] `super_admins` table exists
- [ ] At least one super admin account exists
- [ ] You know the exact email (case-sensitive)
- [ ] You know the correct password
- [ ] Account is active (`is_active = 1`)
- [ ] No typos in email or password

---

## 🎯 Most Likely Solution

**Your issue is probably:**
1. **No super admin exists** - Run `npm run create-super-admin`
2. **Different email** - Check with `npm run check-super-admin`
3. **Wrong password** - Remember what you used when creating it

---

## 📞 Still Not Working?

### Collect This Information

1. **Run check command:**
   ```bash
   npm run check-super-admin
   ```
   Save the output.

2. **Check backend logs:**
   - In cPanel: Node.js App → View logs
   - Look for login attempt errors

3. **Check database:**
   ```sql
   SELECT * FROM super_admins;
   ```
   Take a screenshot (hide password_hash column)

4. **Test backend endpoint:**
   ```bash
   curl -X POST https://backbizz.oxodigital.agency/api/super-admin/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@gmail.com","password":"Nimshan@12"}'
   ```

With this information, you can identify the exact issue.

---

## 💡 Pro Tips

1. **Use strong passwords** - Mix of uppercase, lowercase, numbers, symbols
2. **Remember credentials** - Save in password manager
3. **Test locally first** - Easier to debug
4. **Check backend logs** - They show the actual error
5. **Case-sensitive** - Email must match exactly

---

## 🚀 Quick Fix (90% of cases)

**Just run these 2 commands:**

```bash
cd ~/backend

# Check if admin exists
npm run check-super-admin

# If not found, create one
npm run create-super-admin
```

**Then try logging in with the email you just saw/created!**

---

**Last Updated:** 2025-10-20

