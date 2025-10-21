# Business Management System - Subscription & Multi-Tenancy Guide

## Overview

This comprehensive guide covers the subscription management system with multi-tenancy support, super admin dashboard, and dynamic menu permissions for your Business Management System.

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Setup Instructions](#setup-instructions)
4. [Super Admin Setup](#super-admin-setup)
5. [Subscription Plans](#subscription-plans)
6. [User Journey](#user-journey)
7. [API Endpoints](#api-endpoints)
8. [Database Schema](#database-schema)
9. [Scheduled Jobs](#scheduled-jobs)

---

## Features

### ✨ Multi-Tenancy
- Each tenant gets their own isolated database
- Automatic database creation upon signup
- Tenant-specific data separation

### 💳 Subscription Management
- **4 Pricing Plans:**
  - Simple Start: $1.90/month
  - Essentials: $2.80/month
  - Plus: $4.00/month
  - Advanced: $7.60/month
  
- **7-Day Free Trial** for all new signups
- **Grace Period:** 7 days after payment due date
- Automatic subscription cancellation after grace period
- Monthly billing cycles

### 👨‍💼 Super Admin Dashboard
- View all tenants and their subscription status
- Suspend/reactivate tenant accounts
- Cancel subscriptions immediately or at period end
- View payment history and subscription analytics
- Customize menu permissions per tenant

### 🎛️ Dynamic Menu Permissions
- Hide/show specific menu items per tenant
- Customize menu labels
- Control feature access based on subscription plan

---

## Architecture

### Backend Structure
```
backend/
├── src/
│   ├── controllers/
│   │   ├── superAdminController.js      # Super admin operations
│   │   └── subscriptionController.js    # Tenant subscription operations
│   ├── middleware/
│   │   ├── superAdminAuth.js           # Super admin authentication
│   │   ├── tenantAuth.js               # Tenant authentication
│   │   └── checkSubscription.js        # Subscription validation
│   ├── models/
│   │   ├── setupSubscriptionDatabase.js # Subscription tables
│   │   └── tenantDatabase.js           # Tenant database creation
│   ├── routes/
│   │   ├── superAdmin.js               # Super admin routes
│   │   └── subscriptions.js            # Subscription routes
│   ├── services/
│   │   └── subscriptionScheduler.js    # Automated subscription checks
│   └── scripts/
│       └── createSuperAdmin.js         # Create first super admin
```

### Frontend Structure
```
frontend/
├── src/
│   ├── api/
│   │   ├── superAdmin.js               # Super admin API calls
│   │   ├── subscriptions.js            # Subscription API calls
│   │   └── client.js                   # Axios client with interceptors
│   ├── pages/
│   │   ├── SuperAdminLogin.jsx         # Super admin login
│   │   ├── SuperAdminDashboard.jsx     # Super admin dashboard
│   │   ├── SuperAdminTenants.jsx       # Tenant management
│   │   ├── SuperAdminTenantDetail.jsx  # Tenant details
│   │   ├── SubscriptionPlans.jsx       # Public pricing page
│   │   └── SignupPage.jsx              # User signup
│   └── components/
│       ├── Layout/
│       │   ├── Layout.jsx              # Supports both layouts
│       │   └── Sidebar.jsx             # Dynamic menu loading
│       └── SuperAdmin/
│           └── MenuPermissionsModal.jsx # Menu permission editor
```

---

## Setup Instructions

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 2. Environment Variables

Create a `.env` file in the backend directory:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=bizmanager_main

# Server Configuration
PORT=5000

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Node Environment
NODE_ENV=development
```

### 3. Initialize Databases

Start your backend server - it will automatically create all necessary tables:

```bash
cd backend
npm run dev
```

The system will create:
- Main subscription database tables
- Subscription plans with default pricing
- All necessary indexes and relationships

### 4. Create First Super Admin

Run the super admin creation script:

```bash
cd backend
node src/scripts/createSuperAdmin.js
```

Follow the prompts to create your first super admin account.

**Example:**
```
=== Create Super Admin Account ===

Email: admin@bizmanager.com
Password: SecurePassword123!
Full Name: System Administrator

✓ Super admin account created successfully!
```

---

## Super Admin Setup

### Accessing Super Admin Portal

1. Navigate to: `http://localhost:3000/super-admin/login`
2. Login with your super admin credentials
3. You'll be redirected to the Super Admin Dashboard

### Super Admin Features

#### Dashboard Overview
- Total tenants by status (Active, Trial, Suspended, Cancelled)
- Monthly revenue statistics
- Subscription distribution by plan
- Recent activity log
- Trials expiring soon

#### Tenant Management

**View All Tenants**
- Search by name, email, or company
- Filter by status
- Pagination support
- Quick actions (Suspend, Reactivate, Cancel)

**Tenant Details**
- Overview: Company info, contact details, database name
- Users: List of all users in the tenant
- History: Subscription changes and actions
- Payments: Payment transaction history

**Suspend Tenant**
```javascript
// Suspends tenant immediately
// Users cannot login until reactivated
// Data is preserved
```

**Cancel Subscription**
- **Immediate Cancellation:** Tenant loses access immediately
- **End of Period:** Tenant can use service until period ends

#### Menu Permissions Management

Control which menu items are visible to each tenant:

1. Go to Tenant Detail page
2. Click "Menu Permissions" button
3. Configure visibility and custom labels
4. Save changes

**Available Menu Items:**
- Dashboard
- HR Management
- Product Management
- Customer Management
- Vendor Management
- Invoice Management
- Purchase Management
- Bank Management
- Payment (with sub-menus)
- Daybook
- Sales Management
- Point of Sale

---

## Subscription Plans

### Plan Details

| Plan | Price | Users | Storage | Features |
|------|-------|-------|---------|----------|
| **Simple Start** | $1.90/mo | 1 | 5GB | Basic Dashboard, Product Management, Customer Management, Basic Reports |
| **Essentials** | $2.80/mo | 3 | 10GB | All Simple Start + Invoice Management, Employee Management, Advanced Reports |
| **Plus** | $4.00/mo | 10 | 25GB | All Essentials + Vendor/Purchase/Bank/Cheque Management |
| **Advanced** | $7.60/mo | Unlimited | Unlimited | All Plus + Multi-location, Advanced Analytics, API Access, Priority Support |

### Modifying Plans

Plans are stored in the `subscription_plans` table. To modify:

```sql
UPDATE subscription_plans 
SET price = 2.50, 
    features = '["Feature 1", "Feature 2"]'
WHERE plan_name = 'simple_start';
```

---

## User Journey

### New User Signup Flow

1. **Visit Pricing Page**
   - URL: `/plans`
   - View all available plans
   - Select a plan

2. **Create Account**
   - URL: `/signup`
   - Fill in business details
   - Create password
   - Account is automatically created with trial status

3. **Trial Period**
   - 7 days of full access
   - All features unlocked
   - No credit card required

4. **Trial Expiration**
   - After 7 days, trial expires
   - 7-day grace period begins
   - Users can still access but see reminders

5. **Subscription Activation**
   - Super admin can activate subscription
   - Payment is recorded
   - Full access restored
   - Next billing date set

6. **Ongoing Subscription**
   - Monthly billing
   - Auto-renewal (manual in this system)
   - Can upgrade/downgrade plans

### Subscription States

```
trial → active → past_due → cancelled
  ↓       ↓         ↓
expired  suspended  expired
```

---

## API Endpoints

### Super Admin Endpoints

#### Authentication
```http
POST /api/super-admin/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password"
}

Response: { token, admin }
```

#### Dashboard Statistics
```http
GET /api/super-admin/dashboard/stats
Authorization: Bearer {superAdminToken}

Response: {
  statusCounts: [],
  revenue: {},
  planCounts: [],
  recentActivity: [],
  expiringTrials: []
}
```

#### Tenant Management
```http
# Get all tenants
GET /api/super-admin/tenants?search=&status=&page=1&limit=20

# Get tenant details
GET /api/super-admin/tenants/:tenantId

# Create tenant
POST /api/super-admin/tenants
Body: { tenant_name, email, plan_id, ... }

# Suspend tenant
PUT /api/super-admin/tenants/:tenantId/suspend
Body: { reason }

# Reactivate tenant
PUT /api/super-admin/tenants/:tenantId/reactivate

# Cancel subscription
DELETE /api/super-admin/tenants/:tenantId/subscription
Body: { immediately, reason }
```

#### Menu Permissions
```http
# Get menu permissions
GET /api/super-admin/tenants/:tenantId/menu-permissions

# Update menu permissions
PUT /api/super-admin/tenants/:tenantId/menu-permissions
Body: {
  permissions: [
    { menu_key, is_visible, display_order, custom_label }
  ]
}
```

### Tenant/Subscription Endpoints

#### Public
```http
# Get all plans
GET /api/subscriptions/plans

# Signup
POST /api/subscriptions/signup
Body: { tenant_name, email, password, owner_name, plan_id, ... }

# Login
POST /api/subscriptions/tenant-login
Body: { email, password }
```

#### Protected (Requires tenant auth)
```http
# Get current subscription
GET /api/subscriptions/current
Authorization: Bearer {tenantToken}

# Upgrade subscription
POST /api/subscriptions/upgrade
Body: { plan_id }

# Record payment
POST /api/subscriptions/payment
Body: { amount, payment_method, transaction_id }

# Get subscription history
GET /api/subscriptions/history

# Get menu permissions
GET /api/subscriptions/menu-permissions
```

---

## Database Schema

### Key Tables

#### tenants
Stores all tenant organizations
```sql
- id, tenant_name, tenant_slug, database_name
- email, phone, address, city, state, country
- owner_name, status, trial_ends_at
- is_setup_complete, created_at, updated_at
```

#### tenant_users
Users belonging to each tenant
```sql
- id, tenant_id, email, password_hash
- full_name, role, is_active
- last_login, created_at, updated_at
```

#### subscription_plans
Available subscription plans
```sql
- id, plan_name, display_name, price
- billing_cycle, max_users, max_storage_gb
- features (JSON), is_active
```

#### subscriptions
Active subscriptions
```sql
- id, tenant_id, plan_id, status
- current_period_start, current_period_end
- cancel_at_period_end, cancelled_at
- trial_start, trial_end, grace_period_ends_at
- payment_method, last_payment_date, next_billing_date
```

#### subscription_history
Audit log of all subscription changes
```sql
- id, subscription_id, tenant_id, plan_id
- action, amount, previous_status, new_status
- notes, performed_by, created_at
```

#### menu_permissions
Controls menu visibility per tenant
```sql
- id, tenant_id, menu_key
- is_visible, display_order, custom_label
```

#### super_admins
Super administrator accounts
```sql
- id, email, password_hash, full_name
- role, is_active, last_login
```

#### payment_transactions
Payment history
```sql
- id, tenant_id, subscription_id
- amount, currency, payment_method
- transaction_id, status, payment_date
```

---

## Scheduled Jobs

### Subscription Status Checker

Runs daily to:
1. **Expire Trials** - Mark trials as expired after 7 days
2. **Mark Past Due** - Set subscriptions to past_due when payment is overdue
3. **Start Grace Period** - Give 7 days grace period for payment
4. **Cancel Expired** - Cancel subscriptions after grace period ends
5. **Process Scheduled Cancellations** - Cancel subscriptions marked for end-of-period

### Manual Trigger

You can manually trigger the scheduler:

```javascript
const { checkSubscriptionStatus } = require('./src/services/subscriptionScheduler');

checkSubscriptionStatus()
  .then(result => console.log('Check completed:', result))
  .catch(err => console.error('Check failed:', err));
```

### Cron Job Setup (Production)

For production, use a cron job or task scheduler:

```bash
# Add to crontab (runs daily at midnight)
0 0 * * * cd /path/to/backend && node -e "require('./src/services/subscriptionScheduler').checkSubscriptionStatus()"
```

---

## Security Considerations

### JWT Tokens
- Separate tokens for super admins and tenants
- 7-day expiration for tenant tokens
- 24-hour expiration for super admin tokens

### Password Security
- Bcrypt hashing with salt rounds of 10
- Minimum 6 characters (increase in production)

### Database Security
- Each tenant has isolated database
- No cross-tenant data access
- Prepared statements prevent SQL injection

### API Security
- CORS enabled
- Helmet.js for HTTP headers
- Rate limiting recommended (not implemented)

---

## Testing

### Test Super Admin Access

1. Create super admin account
2. Login at `/super-admin/login`
3. Verify dashboard loads with statistics

### Test Tenant Signup

1. Visit `/plans`
2. Select a plan
3. Complete signup form
4. Verify account created with trial status
5. Check database creation (should see `biz_tenantslug_timestamp`)

### Test Menu Permissions

1. Login as super admin
2. Go to tenant details
3. Update menu permissions (hide some items)
4. Login as that tenant
5. Verify sidebar reflects changes

### Test Subscription Flow

1. Create tenant with trial
2. Wait for trial to expire (or manually update date)
3. Run subscription checker
4. Verify tenant marked as expired
5. Super admin reactivates
6. Verify access restored

---

## Troubleshooting

### Database Connection Issues
```bash
# Check MySQL is running
mysql -u root -p

# Verify database exists
SHOW DATABASES LIKE 'bizmanager%';
```

### Tenant Database Not Created
```bash
# Check logs for errors
npm run dev

# Manually create if needed
node -e "require('./src/models/tenantDatabase').createTenantDatabase('test-tenant')"
```

### Super Admin Can't Login
```bash
# Verify super admin exists
mysql> SELECT * FROM super_admins;

# Reset password if needed
node src/scripts/createSuperAdmin.js
```

### Menu Permissions Not Loading
```javascript
// Check API response
console.log(await subscriptionAPI.getMenuPermissions());

// Verify token in localStorage
console.log(localStorage.getItem('token'));
```

---

## Future Enhancements

### Payment Integration
- [ ] Stripe/PayPal integration
- [ ] Automatic payment processing
- [ ] Invoice generation
- [ ] Payment reminders

### Advanced Features
- [ ] Usage-based billing
- [ ] Custom plan creation
- [ ] Reseller/white-label support
- [ ] API rate limiting per plan
- [ ] Advanced analytics dashboard

### User Experience
- [ ] In-app notifications
- [ ] Email notifications for trial expiry
- [ ] Self-service plan upgrades
- [ ] Billing history export

---

## Support

For issues or questions:
- Check the troubleshooting section
- Review API documentation
- Examine server logs
- Contact: support@bizmanager.com

---

## License

© 2025 BizManager Pro. All rights reserved.

