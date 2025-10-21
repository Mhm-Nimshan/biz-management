# 📋 Deployment Checklist for cPanel

## Pre-Deployment

### Local Preparation
- [ ] Test application locally (frontend + backend)
- [ ] Verify all features work correctly
- [ ] Run `npm run build` in frontend folder
- [ ] Ensure no console errors in browser
- [ ] Test with production-like data

### Configuration Files
- [ ] Update `backend/.env` with production database credentials ✅
- [ ] Generate secure JWT_SECRET (64+ characters random string)
- [ ] Generate secure SUPER_ADMIN_JWT_SECRET
- [ ] Update `frontend/.env.production` with your domain URL
- [ ] Update CORS_ORIGIN in backend .env

## Backend Deployment

### File Upload
- [ ] Upload backend folder to cPanel (via SSH/FTP)
- [ ] Verify all files uploaded correctly
- [ ] Check file permissions (644 for files, 755 for folders)
- [ ] Secure .env file (`chmod 600 .env`)

### Dependencies & Setup
- [ ] SSH into server
- [ ] Navigate to backend folder (`cd ~/backend`)
- [ ] Run `npm install --production`
- [ ] Verify no installation errors
- [ ] Check Node.js version (18.x or higher)

### cPanel Configuration
- [ ] Open "Setup Node.js App" in cPanel
- [ ] Create new application
- [ ] Set Application Root to `backend`
- [ ] Set Startup File to `src/server.js`
- [ ] Set Node.js version (18.x+)
- [ ] Set Application Mode to "Production"
- [ ] Add all environment variables from .env
- [ ] Copy restart command for later use

### Database Setup
- [ ] Verify database exists in phpMyAdmin
- [ ] Test database connection with credentials
- [ ] Start the Node.js application
- [ ] Tables should auto-create on first run
- [ ] Verify tables exist in phpMyAdmin

### Super Admin Creation
- [ ] Run `npm run create-super-admin` in backend folder
- [ ] Enter super admin credentials
- [ ] Save credentials securely
- [ ] Test super admin login

## Frontend Deployment

### Build Verification
- [ ] Run `npm run build` locally
- [ ] Verify `build/` folder created
- [ ] Check build for errors
- [ ] Build size is reasonable (< 10MB)

### File Upload
- [ ] Navigate to `public_html` in cPanel File Manager
- [ ] Backup existing files (if any)
- [ ] Upload all contents from `frontend/build/`
- [ ] Verify `index.html` is in root of `public_html`
- [ ] Verify `static/` folder uploaded correctly

### Configuration
- [ ] Upload `.htaccess` file to `public_html`
- [ ] Verify RewriteEngine is enabled
- [ ] Test routing (refresh on any page should work)
- [ ] Check file permissions

## SSL & Security

### SSL Certificate
- [ ] Install SSL certificate (Let's Encrypt)
- [ ] Enable "Force HTTPS Redirect"
- [ ] Verify SSL is working (https://)
- [ ] Test mixed content warnings (browser console)

### Security Headers
- [ ] Verify .htaccess security headers
- [ ] Test CORS configuration
- [ ] Secure backend folder (deny web access)
- [ ] Verify .env file not accessible via web

## Testing

### Backend API Tests
- [ ] Test health endpoint: `https://yourdomain.com/api/health`
- [ ] Test login endpoint
- [ ] Check API response times
- [ ] Verify CORS headers
- [ ] Check error handling

### Frontend Tests
- [ ] Load homepage: `https://yourdomain.com`
- [ ] Test super admin login: `/super-admin/login`
- [ ] Test tenant login: `/login`
- [ ] Navigate through all pages
- [ ] Test form submissions
- [ ] Verify API calls work
- [ ] Check browser console for errors
- [ ] Test on mobile devices

### Feature Tests
- [ ] Create test tenant (super admin)
- [ ] Login as tenant
- [ ] Test menu permissions
- [ ] Create product with image
- [ ] Test POS system
- [ ] Scan barcode/QR code
- [ ] Process sale (cash & card)
- [ ] Verify daybook entry
- [ ] Test HR features
- [ ] Generate payslip
- [ ] Test invoice creation
- [ ] Process payment
- [ ] Check commission recording

### Database Tests
- [ ] Verify multi-tenant databases created
- [ ] Check data integrity
- [ ] Test transactions (rollback on error)
- [ ] Verify indexes created
- [ ] Check foreign key constraints

## Performance & Optimization

### Backend
- [ ] Enable Node.js production mode
- [ ] Check memory usage
- [ ] Monitor CPU usage
- [ ] Set up error logging
- [ ] Configure log rotation

### Frontend
- [ ] Enable gzip compression
- [ ] Verify browser caching
- [ ] Test load times (< 3 seconds)
- [ ] Check bundle size
- [ ] Optimize images
- [ ] Test on slow connections

## Monitoring & Logs

### Application Monitoring
- [ ] Set up error monitoring
- [ ] Configure logging
- [ ] Test log rotation
- [ ] Set up uptime monitoring
- [ ] Configure alerts

### Backup Strategy
- [ ] Database backup schedule
- [ ] File backup schedule
- [ ] Test restore procedure
- [ ] Document backup locations
- [ ] Set retention policy

## Documentation

### User Documentation
- [ ] Super admin user guide
- [ ] Tenant user guide
- [ ] POS system guide
- [ ] HR module guide
- [ ] Troubleshooting guide

### Technical Documentation
- [ ] API documentation
- [ ] Database schema
- [ ] Deployment process
- [ ] Rollback procedure
- [ ] Incident response plan

## Post-Deployment

### Immediate (First Hour)
- [ ] Monitor server logs
- [ ] Check error rates
- [ ] Verify all features working
- [ ] Test with real users
- [ ] Monitor performance metrics

### First Day
- [ ] Collect user feedback
- [ ] Fix critical bugs
- [ ] Monitor database growth
- [ ] Check API response times
- [ ] Verify backup ran successfully

### First Week
- [ ] Review error logs
- [ ] Optimize slow queries
- [ ] Fine-tune configuration
- [ ] Update documentation
- [ ] Plan for scaling

## Rollback Plan

### If Issues Occur
- [ ] Stop Node.js application
- [ ] Restore previous backend files
- [ ] Restore previous frontend files
- [ ] Restore database backup
- [ ] Restart application
- [ ] Notify users

## Success Criteria

✅ All endpoints responding correctly
✅ No critical errors in logs
✅ SSL certificate valid
✅ All features working
✅ Performance acceptable (< 3s load time)
✅ Super admin can manage tenants
✅ Tenants can use all features
✅ POS system working (barcode scanning)
✅ HR module functional
✅ Payments processing correctly
✅ Database backups running

---

## 🎉 Deployment Complete!

**Live URLs:**
- Frontend: https://yourdomain.com
- API: https://yourdomain.com/api
- Super Admin: https://yourdomain.com/super-admin/login

**Next Steps:**
1. Train super admin user
2. Create first tenant
3. Import initial data
4. Monitor for 24 hours
5. Collect user feedback

---

**Emergency Contacts:**
- Hosting Support: [Your hosting provider]
- Developer: [Your contact]
- Database Admin: [Your contact]

**Important Files:**
- Backend .env: `~/backend/.env`
- Frontend .htaccess: `~/public_html/.htaccess`
- Database: `nimsleas_bizmanager_main`
- Logs: `~/backend/logs/` (if configured)

