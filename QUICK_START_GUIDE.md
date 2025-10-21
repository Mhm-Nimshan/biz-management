# Quick Start Guide - Subscription System

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend  
cd frontend
npm install
```

### Step 2: Configure Environment
Create `backend/.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=bizmanager_main
PORT=5000
JWT_SECRET=your-secret-key-change-in-production
```

### Step 3: Start Backend
```bash
cd backend
npm run dev
```

The backend will automatically:
- ✅ Create all database tables
- ✅ Set up subscription plans
- ✅ Initialize the scheduler

### Step 4: Create Super Admin
```bash
cd backend
node src/scripts/createSuperAdmin.js
```

Enter your details:
- Email: `admin@example.com`
- Password: `YourSecurePassword123!`
- Name: `Admin User`

### Step 5: Start Frontend
```bash
cd frontend
npm start
```

## 🎯 Test the System

### Test Super Admin Access
1. Go to: `http://localhost:3000/super-admin/login`
2. Login with your super admin credentials
3. Explore the dashboard and tenant management

### Test User Signup
1. Go to: `http://localhost:3000/plans`
2. Select a plan (e.g., "Plus")
3. Click "Start Free Trial"
4. Fill in the signup form:
   - Business Name: `Test Company`
   - Your Name: `John Doe`
   - Email: `john@testcompany.com`
   - Password: `password123`
5. Submit and verify account creation

### Test Menu Permissions
1. Login as super admin
2. Go to "Tenants" → Find your test tenant
3. Click "Menu Permissions"
4. Hide "Vendor Management" and "Purchase Management"
5. Save changes
6. Logout and login as the tenant user
7. Verify those menus are hidden in the sidebar

## 📊 Default Subscription Plans

| Plan | Price | Trial |
|------|-------|-------|
| Simple Start | $1.90/mo | 7 days free |
| Essentials | $2.80/mo | 7 days free |
| Plus | $4.00/mo | 7 days free |
| Advanced | $7.60/mo | 7 days free |

## 🔑 Key URLs

- **Pricing Page**: `http://localhost:3000/plans`
- **Signup**: `http://localhost:3000/signup`
- **Super Admin Login**: `http://localhost:3000/super-admin/login`
- **Super Admin Dashboard**: `http://localhost:3000/super-admin/dashboard`
- **Tenant Dashboard**: `http://localhost:3000/`

## 🛠️ Common Tasks

### Create a New Tenant (as Super Admin)
```http
POST http://localhost:5000/api/super-admin/tenants
Authorization: Bearer {superAdminToken}
Content-Type: application/json

{
  "tenant_name": "New Business",
  "email": "contact@newbusiness.com",
  "owner_name": "Owner Name",
  "phone": "1234567890",
  "plan_id": 3,
  "start_trial": true
}
```

### Suspend a Tenant
```http
PUT http://localhost:5000/api/super-admin/tenants/{tenantId}/suspend
Authorization: Bearer {superAdminToken}
Content-Type: application/json

{
  "reason": "Non-payment"
}
```

### Check Subscription Status
```bash
cd backend
node -e "require('./src/services/subscriptionScheduler').checkSubscriptionStatus().then(r => console.log(r))"
```

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if MySQL is running
mysql -u root -p

# Check if port 5000 is available
lsof -i :5000
```

### Frontend won't connect to backend
Check `frontend/src/api/client.js` - make sure baseURL is correct:
```javascript
baseURL: 'http://localhost:5000/api'
```

### Can't login as super admin
```bash
# Recreate super admin
cd backend
node src/scripts/createSuperAdmin.js
```

### Menu permissions not working
```javascript
// In browser console
localStorage.getItem('token')  // Should return a token
```

## 8️⃣ Setup Point of Sale (POS)

### Add Products with Images

1. Go to **Product Management**
2. Click "Add Product"
3. Fill in product details:
   - Name, SKU, Category
   - **Image URL** - Add product image (use Imgur, Cloudinary, etc.)
   - Prices and stock
4. Save product

### Generate QR Codes

1. In Product Management, find your product
2. Click the **QR Code icon** (green) 🔍
3. Modal shows QR code with product info
4. Options:
   - **Download** - Save as PNG
   - **Print** - Print label
5. Attach QR codes to physical products

### Use Point of Sale

1. Navigate to: `http://localhost:3000/pos`
2. Two methods to add products:
   - **Scan QR**: Click "Scan QR" button, point camera at QR code
   - **Click & Search**: Search products and click to add
3. Manage cart:
   - Use +/- buttons to adjust quantities
   - Click trash icon to remove items
4. Apply discount/tax if needed
5. Click **"Proceed to Payment"**
6. Select payment method (Cash/Card)
7. For cash: Enter amount paid, system calculates change
8. Click **"Complete Sale"**
9. Receipt displays - Print or start new sale

**Perfect for:**
- 🛒 Supermarkets
- 🍽️ Hotels/Restaurants
- 🏪 Retail stores
- 📦 Wholesale businesses

## 📝 Next Steps

1. **Customize Plans**: Edit pricing in `subscription_plans` table
2. **Add Payment Gateway**: Integrate Stripe/PayPal
3. **Email Notifications**: Set up email service for trial expiry
4. **Customize Menus**: Add/remove menu items in Sidebar.jsx
5. **Branding**: Update colors and logos

## 🎉 You're Done!

Your complete business management system is now running. You can:
- ✅ Create and manage tenants as super admin
- ✅ Users can sign up with 7-day free trial
- ✅ Control menu permissions per tenant
- ✅ Track subscriptions and payments
- ✅ Automatic trial expiration and grace periods
- ✅ **Point of Sale with QR scanning**
- ✅ **HR Management with EPF/ETF**
- ✅ **Leave & Payroll System**
- ✅ **Bank & Cheque Management**

## 📚 Complete Documentation

- `IMPLEMENTATION_SUMMARY.md` - System overview
- `SUBSCRIPTION_SYSTEM_README.md` - Subscription guide
- `HR_MANAGEMENT_README.md` - HR, Leave, Salary
- **`POS_SYSTEM_README.md`** - Point of Sale guide
- `BANK_CHEQUE_SYSTEM_README.md` - Banking features

Happy selling! 💰🚀

