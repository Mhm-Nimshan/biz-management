# 🚀 Deploy in 30 Simple Steps

## Quick deployment guide for production hosting.

**Target:**
- Backend: `backbizz.oxodigital.agency`
- Frontend: `bizz.oxodigital.agency`

---

## BACKEND (Steps 1-15)

### 1. **Create Subdomain**
   - cPanel → Subdomains → Create `backbizz`

### 2. **Setup Node.js App**
   - cPanel → Setup Node.js App → Create
   - Version: 18.x
   - Root: `backend`
   - URL: `backbizz.oxodigital.agency`
   - Startup: `src/server.js`

### 3. **Generate JWT Secrets**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Run twice, save both secrets

### 4. **Edit backend/.env**
   - Update database credentials
   - Add JWT secrets
   - Set `CORS_ORIGIN=https://bizz.oxodigital.agency`

### 5. **Zip Backend Folder**
   - Exclude `node_modules`

### 6. **Upload to cPanel**
   - File Manager → Upload backend.zip
   - Extract to `/home/username/backend`

### 7. **Add Environment Variables**
   - Node.js App → Your app → Environment Variables
   - Add all 9 variables from .env

### 8. **Install Dependencies**
   - Terminal: `cd ~/backend`
   - Run: `npm install --production`

### 9. **Setup Database**
   - Run: `npm run setup-db`

### 10. **Verify Tables**
   - phpMyAdmin → Check tables exist

### 11. **Create Super Admin**
   - Run: `npm run create-super-admin`
   - Save credentials

### 12. **Start Backend**
   - Node.js App → Start/Restart

### 13. **Install SSL**
   - SSL/TLS Status → AutoSSL for subdomain

### 14. **Test Health Endpoint**
   - Visit: `https://backbizz.oxodigital.agency/api/health`

### 15. **Test Plans Endpoint**
   - Visit: `https://backbizz.oxodigital.agency/api/subscriptions/plans`

---

## FRONTEND (Steps 16-30)

### 16. **Create .env.production**
   ```
   REACT_APP_API_URL=https://backbizz.oxodigital.agency/api
   ```

### 17. **Build Frontend**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

### 18. **Backup public_html**
   - Download existing files if any

### 19. **Clear public_html**
   - Delete old files

### 20. **Upload Build Files**
   - Upload all from `frontend/build/` to `/public_html`

### 21. **Create .htaccess**
   - Create in `/public_html`
   - Add React Router rules

### 22. **Install SSL**
   - SSL/TLS Status → AutoSSL for main domain

### 23. **Test Homepage**
   - Visit: `https://bizz.oxodigital.agency`

### 24. **Test Plans Page**
   - Visit: `https://bizz.oxodigital.agency/plans`

### 25. **Test Page Refresh**
   - Refresh on different routes

### 26. **Open Browser Console**
   - F12 → Check for errors

### 27. **Test Signup**
   - Fill form and create account

### 28. **Verify in Database**
   - phpMyAdmin → Check tenant created

### 29. **Test Login**
   - Login with created account

### 30. **Test Super Admin**
   - Visit: `/super-admin/login`

---

## ✅ Done!

**Your application is now live!**

- Frontend: https://bizz.oxodigital.agency
- Backend: https://backbizz.oxodigital.agency
- Super Admin: https://bizz.oxodigital.agency/super-admin/login

---

## Quick Troubleshooting

**503 Error?**
- Check Node.js app is running
- View logs for errors

**CORS Error?**
- Check CORS_ORIGIN matches
- Restart backend

**Plans Not Loading?**
- Test backend endpoint directly
- Check npm run setup-db ran

**404 on Refresh?**
- Check .htaccess exists
- Verify rewrite rules

---

For detailed instructions, see `PRODUCTION_DEPLOYMENT_GUIDE.md`

