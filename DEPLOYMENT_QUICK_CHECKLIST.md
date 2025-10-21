# ✅ Production Deployment Quick Checklist

Use this checklist while deploying to track your progress.

---

## Pre-Deployment Preparation

### Local Setup
- [ ] Node.js installed locally (v18+)
- [ ] All code tested locally
- [ ] No errors in local environment
- [ ] Git committed (optional but recommended)

### cPanel Access
- [ ] cPanel login credentials ready
- [ ] Database credentials confirmed:
  - User: `nimsleas_bizmanager_main`
  - Password: `L&X6e}a=khH&`
  - Database: `nimsleas_bizmanager_main`

---

## BACKEND DEPLOYMENT (backbizz.oxodigital.agency)

### Step 1: Domain & Node.js Setup
- [ ] Create subdomain `backbizz.oxodigital.agency` in cPanel
- [ ] Setup Node.js App in cPanel:
  - [ ] Node.js version: 18.x
  - [ ] Application mode: Production
  - [ ] Application root: `backend`
  - [ ] Application URL: `backbizz.oxodigital.agency`
  - [ ] Startup file: `src/server.js`

### Step 2: Backend Configuration
- [ ] Generate JWT secrets:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- [ ] Update `backend/.env`:
  - [ ] DB credentials (production)
  - [ ] JWT secrets (newly generated)
  - [ ] `CORS_ORIGIN=https://bizz.oxodigital.agency`
  - [ ] `NODE_ENV=production`

### Step 3: Upload Files
- [ ] Create ZIP of backend folder (exclude node_modules)
- [ ] Upload ZIP to cPanel File Manager
- [ ] Extract to `/home/username/backend`
- [ ] Delete ZIP file

### Step 4: Environment Variables
Add in cPanel Node.js App:
- [ ] `DB_HOST=localhost`
- [ ] `DB_USER=nimsleas_bizmanager_main`
- [ ] `DB_PASSWORD=L&X6e}a=khH&`
- [ ] `DB_NAME=nimsleas_bizmanager_main`
- [ ] `JWT_SECRET=(generated)`
- [ ] `SUPER_ADMIN_JWT_SECRET=(generated)`
- [ ] `PORT=5000`
- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGIN=https://bizz.oxodigital.agency`

### Step 5: Install Dependencies
Via Terminal/SSH or cPanel:
- [ ] Run: `npm install --production`
- [ ] Wait for completion (2-5 min)
- [ ] No errors shown

### Step 6: Database Setup
- [ ] Run: `npm run setup-db`
- [ ] Verify tables created in phpMyAdmin:
  - [ ] `subscription_plans` (4 records)
  - [ ] `tenants`
  - [ ] `tenant_users`
  - [ ] `subscriptions`
  - [ ] `super_admins`

### Step 7: Create Admin
- [ ] Run: `npm run create-super-admin`
- [ ] Save credentials securely:
  - Email: ___________________
  - Password: ___________________

### Step 8: Start Backend
- [ ] Click "Start App" in Node.js App Manager
- [ ] Status shows "Running" (green)
- [ ] No errors in logs

### Step 9: SSL Certificate
- [ ] Install SSL for `backbizz.oxodigital.agency`
- [ ] SSL/TLS Status → Run AutoSSL
- [ ] Green padlock confirmed

### Step 10: Test Backend
- [ ] Test: `https://backbizz.oxodigital.agency/api/health`
  - Expected: `{"status":"OK",...}`
- [ ] Test: `https://backbizz.oxodigital.agency/api/subscriptions/plans`
  - Expected: 4 subscription plans
- [ ] No errors in browser console

---

## FRONTEND DEPLOYMENT (bizz.oxodigital.agency)

### Step 11: Frontend Configuration
- [ ] Create `frontend/.env.production`:
  ```
  REACT_APP_API_URL=https://backbizz.oxodigital.agency/api
  ```

### Step 12: Build Frontend
On local machine:
- [ ] Run: `cd frontend`
- [ ] Run: `npm install`
- [ ] Run: `npm run build`
- [ ] Build folder created successfully
- [ ] No errors during build

### Step 13: Upload Frontend
- [ ] Backup existing `/public_html` files (if any)
- [ ] Clear `/public_html` directory
- [ ] Upload all files from `frontend/build/` to `/public_html`:
  - [ ] `index.html`
  - [ ] `static/` folder
  - [ ] `asset-manifest.json`
  - [ ] `manifest.json`
  - [ ] `favicon.ico`
  - [ ] `robots.txt`

### Step 14: Configure .htaccess
- [ ] Create/edit `/public_html/.htaccess`
- [ ] Add React Router rewrite rules
- [ ] Add HTTPS redirect
- [ ] Add caching rules
- [ ] Save file

### Step 15: SSL Certificate
- [ ] Install SSL for `bizz.oxodigital.agency`
- [ ] SSL/TLS Status → Run AutoSSL
- [ ] Green padlock confirmed

### Step 16: Test Frontend
- [ ] Visit: `https://bizz.oxodigital.agency`
  - [ ] React app loads
  - [ ] HTTPS active (padlock visible)
  - [ ] No console errors
- [ ] Test page refresh on different routes
  - [ ] `/plans` - works
  - [ ] `/login` - works
  - [ ] No 404 errors

---

## FINAL TESTING

### Functional Tests
- [ ] Plans page shows 4 subscription plans
- [ ] No CORS errors in browser console
- [ ] "Start Free Trial" button works
- [ ] Signup form accessible

### Signup Flow Test
- [ ] Fill signup form with test data
- [ ] Click "Sign Up"
- [ ] Account created successfully
- [ ] Auto-login works
- [ ] Dashboard loads
- [ ] Check phpMyAdmin:
  - [ ] Record in `tenants` table
  - [ ] Record in `tenant_users` table
  - [ ] New database created (e.g., `biz_test-company-123`)

### Login Tests
- [ ] Tenant login works (`/login`)
- [ ] Super admin login works (`/super-admin/login`)
- [ ] Dashboard displays correctly
- [ ] Can navigate to different pages

### Mobile Test
- [ ] Open on mobile browser
- [ ] Responsive design works
- [ ] All features accessible

---

## POST-DEPLOYMENT

### Security
- [ ] Change default admin password
- [ ] Verify JWT secrets are strong and unique
- [ ] Test different user roles
- [ ] Verify tenant data isolation

### Performance
- [ ] Page load speed acceptable
- [ ] API response times good
- [ ] Images loading correctly
- [ ] No slow queries

### Backup
- [ ] Setup database backup schedule in cPanel
- [ ] Backup `/home/username/backend` directory
- [ ] Backup `/public_html` directory
- [ ] Document backup procedure

### Monitoring
- [ ] Check backend logs regularly
- [ ] Monitor application status
- [ ] Set up error notifications (optional)

### Documentation
- [ ] Document admin credentials (securely)
- [ ] Note deployment date: _______________
- [ ] List any custom configurations
- [ ] Create user guide for clients

---

## TROUBLESHOOTING CHECKLIST

If something doesn't work:

### Backend Issues
- [ ] Check Node.js app status (should be "Running")
- [ ] View application logs for errors
- [ ] Test database connection
- [ ] Verify environment variables
- [ ] Check file permissions
- [ ] Restart application

### Frontend Issues
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Check browser console for errors (F12)
- [ ] Verify .htaccess exists and correct
- [ ] Check API URL in build
- [ ] Test on different browser
- [ ] Verify SSL certificate active

### API Connection Issues
- [ ] Check CORS_ORIGIN matches frontend domain
- [ ] Test backend endpoints directly
- [ ] Verify both SSL certificates active
- [ ] Check network tab in browser (F12)

### Database Issues
- [ ] Verify credentials in environment variables
- [ ] Check database exists in phpMyAdmin
- [ ] Verify tables created
- [ ] Check MySQL user permissions
- [ ] Test connection from terminal

---

## DEPLOYMENT COMPLETE! 🎉

**Application URLs:**
- Frontend: https://bizz.oxodigital.agency
- Backend API: https://backbizz.oxodigital.agency/api
- Super Admin: https://bizz.oxodigital.agency/super-admin/login

**Credentials:**
- Super Admin Email: _______________________
- Super Admin Password: _______________________

**Deployment Date:** _______________________

**Deployed By:** _______________________

**Notes:**
___________________________________________
___________________________________________
___________________________________________

---

## Next Steps

1. Create real super admin account (delete test account)
2. Test all features thoroughly
3. Create sample tenant for demo
4. Configure payment gateway (if needed)
5. Set up email notifications (optional)
6. Create backup schedule
7. Document any issues encountered
8. Train users

---

**Keep this checklist for future updates and maintenance!**

