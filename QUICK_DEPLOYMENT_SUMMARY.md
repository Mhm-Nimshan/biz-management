# ⚡ Quick Deployment Summary for cPanel

## 🎯 Your Database Credentials (Already Configured)
```
Database: nimsleas_bizmanager_main
Username: nimsleas_bizmanager_main
Password: L&X6e}a=khH&
Host: localhost
```

## ✅ Files Created/Updated

### Backend
- ✅ `backend/.env.production` - Production environment with your DB credentials
- ✅ `backend/.env.example` - Template for local development
- ✅ `backend/.gitignore` - Prevents committing sensitive files

### Frontend
- ✅ `frontend/.env.production` - Production API URL (needs your domain)
- ✅ `frontend/.htaccess` - React Router & performance optimization

### Documentation
- ✅ `CPANEL_DEPLOYMENT_GUIDE.md` - Complete deployment guide
- ✅ `DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist

## 🚀 Quick Deployment Steps

### 1️⃣ Before Upload - IMPORTANT CHANGES NEEDED

#### Backend (.env.production)
Open `backend/.env.production` and change:
```bash
# Generate secure secrets (run in terminal):
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Then update:
JWT_SECRET=<paste-generated-secret-here>
SUPER_ADMIN_JWT_SECRET=<paste-another-generated-secret-here>
CORS_ORIGIN=https://YOUR-ACTUAL-DOMAIN.com
```

#### Frontend (.env.production)
Open `frontend/.env.production` and change:
```bash
REACT_APP_API_URL=https://YOUR-ACTUAL-DOMAIN.com/api
```

### 2️⃣ Build Frontend
```bash
cd frontend
npm install
npm run build
# This creates a 'build/' folder
```

### 3️⃣ Upload to cPanel

#### Backend Upload:
1. Connect via FTP/SSH to your cPanel
2. Upload entire `backend/` folder to `~/backend/`
3. SSH into server:
   ```bash
   cd ~/backend
   npm install --production
   ```

#### Frontend Upload:
1. In cPanel File Manager, go to `public_html`
2. Upload all contents from `frontend/build/` folder
3. Upload `frontend/.htaccess` to `public_html/`

### 4️⃣ Setup Node.js in cPanel
1. Go to **Setup Node.js App** in cPanel
2. Click **Create Application**
3. Settings:
   - Node.js version: 18.x or higher
   - Application mode: Production
   - Application root: `backend`
   - Startup file: `src/server.js`
4. Add environment variables (copy from .env.production)
5. Click Create & Start

### 5️⃣ Create Super Admin
```bash
cd ~/backend
npm run create-super-admin
# Follow prompts to create admin account
```

### 6️⃣ Install SSL
1. cPanel → **SSL/TLS Status**
2. Install Let's Encrypt certificate
3. Enable Force HTTPS

## 🧪 Testing

Visit your site:
- **Frontend**: https://yourdomain.com
- **API Test**: https://yourdomain.com/api/health
- **Super Admin**: https://yourdomain.com/super-admin/login

## 📊 File Structure After Deployment

```
Your cPanel Account
├── public_html/              (Frontend - React App)
│   ├── index.html
│   ├── .htaccess
│   └── static/
│       ├── css/
│       └── js/
│
└── backend/                  (Backend - Node.js API)
    ├── .env.production       (RENAME to .env after upload)
    ├── package.json
    ├── node_modules/
    └── src/
        ├── server.js
        ├── config/
        ├── controllers/
        ├── models/
        └── routes/
```

## ⚠️ IMPORTANT Security Steps

1. **After uploading backend to cPanel:**
   ```bash
   # Rename .env.production to .env
   mv ~/backend/.env.production ~/backend/.env
   
   # Secure it
   chmod 600 ~/backend/.env
   ```

2. **Protect backend folder from web access:**
   Create `~/backend/.htaccess`:
   ```apache
   Order deny,allow
   Deny from all
   ```

3. **Generate strong JWT secrets** (required!):
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

## 🔧 Common Issues & Solutions

### "Cannot connect to database"
- Verify DB credentials in .env
- Check database exists in phpMyAdmin
- Ensure DB user has all privileges

### "CORS Error"
- Update `CORS_ORIGIN` in backend .env to match your domain
- Don't include trailing slash: `https://yourdomain.com` ✅
- Not: `https://yourdomain.com/` ❌

### "404 on page refresh"
- Verify `.htaccess` is in `public_html`
- Check RewriteEngine is enabled in cPanel

### "White screen / blank page"
- Check browser console for errors
- Verify `REACT_APP_API_URL` in frontend .env.production
- Rebuild frontend: `npm run build`

## 📱 Environment Variables Reference

### Backend Environment Variables
Add these in cPanel Node.js App Manager:

| Variable | Value | Required |
|----------|-------|----------|
| DB_HOST | localhost | ✅ |
| DB_USER | nimsleas_bizmanager_main | ✅ |
| DB_PASSWORD | L&X6e}a=khH& | ✅ |
| DB_NAME | nimsleas_bizmanager_main | ✅ |
| JWT_SECRET | (generated secret) | ✅ |
| SUPER_ADMIN_JWT_SECRET | (generated secret) | ✅ |
| PORT | 5000 | ✅ |
| NODE_ENV | production | ✅ |
| CORS_ORIGIN | https://yourdomain.com | ✅ |

## 🎉 Success Indicators

✅ Frontend loads at https://yourdomain.com
✅ No console errors in browser
✅ API responds at https://yourdomain.com/api/health
✅ Can login to super admin dashboard
✅ Can create and login as tenant
✅ All features working (POS, HR, etc.)
✅ SSL certificate valid (green padlock)

## 📞 Need Help?

Refer to detailed guides:
- **Complete Guide**: `CPANEL_DEPLOYMENT_GUIDE.md`
- **Checklist**: `DEPLOYMENT_CHECKLIST.md`
- **Subscription System**: `SUBSCRIPTION_SYSTEM_README.md`
- **HR Module**: `HR_MANAGEMENT_README.md`
- **POS System**: `POS_SYSTEM_README.md`

---

## 🔐 Production Security Checklist

- [ ] Changed default JWT secrets
- [ ] Changed super admin JWT secret
- [ ] Installed SSL certificate
- [ ] Enabled HTTPS redirect
- [ ] Secured .env file (chmod 600)
- [ ] Protected backend folder from web access
- [ ] Updated CORS_ORIGIN to actual domain
- [ ] Removed .env.example from production
- [ ] Disabled directory listing
- [ ] Set up regular database backups

---

**Last Updated**: 2025-10-20
**Database**: nimsleas_bizmanager_main ✅ Configured

