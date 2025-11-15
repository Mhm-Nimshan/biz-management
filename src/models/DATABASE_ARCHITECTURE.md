# Database Architecture

This document explains the multi-tenant database architecture for the Business Management System.

## Overview

The system uses a **database-per-tenant** architecture where:
- **One main database** contains super admin and tenant management tables
- **Each tenant gets their own separate database** with business-specific tables

## Database Structure

### 1. Main Database (Super Admin Database)

**File:** `setupSubscriptionDatabase.js`

This database contains ONLY super admin and tenant management tables:

#### Tables:
- `subscription_plans` - Available subscription plans
- `tenants` - All registered tenants/organizations
- `tenant_users` - User accounts for each tenant
- `subscriptions` - Active subscriptions
- `subscription_history` - Subscription change history
- `menu_permissions` - Custom menu permissions per tenant
- `super_admins` - Super admin user accounts
- `payment_transactions` - Subscription payment records

**Purpose:** Manage the SaaS platform, tenants, subscriptions, and billing.

---

### 2. Tenant Databases (Business Databases)

**File:** `tenantDatabase.js`

Each tenant gets a separate database (named `biz_<tenant_slug>`) containing their business data:

#### Business Tables:
- `employees` - Employee records
- `products` - Product catalog
- `customers` - Customer information
- `vendors` - Vendor/supplier information
- `invoices` - Sales invoices
- `invoice_items` - Invoice line items
- `sales` - POS sales transactions
- `sale_items` - Sale line items
- `purchases` - Purchase orders
- `purchase_items` - Purchase line items
- `accounts` - Chart of accounts
- `daybook_entries` - Daily income/expense entries

#### Financial Tables:
- `bank_accounts` - Bank account information
- `bank_transactions` - Bank transaction history
- `payment_cheques` - Cheque payment tracking
- `invoice_payments` - Invoice payment records

#### HR & Payroll Tables:
- `employee_leaves` - Leave requests
- `employee_leave_balance` - Leave balance tracking
- `employee_commissions` - Sales commissions
- `payroll` - Payroll processing records
- `payslips` - Detailed payslip records
- `salary_advances` - Salary advance tracking

**Purpose:** Store all business operations data for each tenant independently.

---

## File Roles

### Active Files:

1. **`setupDatabase.js`**
   - Entry point for database setup
   - Creates super admin database tables
   - Calls `setupSubscriptionDatabase.js`

2. **`setupSubscriptionDatabase.js`**
   - Creates super admin tables
   - Seeds default subscription plans
   - Should ONLY be run once for the main database

3. **`tenantDatabase.js`**
   - Creates individual tenant databases
   - Sets up all business tables for each tenant
   - Called automatically when a new tenant signs up

### Deprecated Files:

4. **`setupHRDatabase.js`** ⚠️ DEPRECATED
   - HR tables are now created in tenant databases
   - Kept only for reference
   - Do not use

5. **`seedData.js`** ⚠️ DEPRECATED
   - Business seed data should be added through the application
   - Subscription plans are auto-seeded in setupSubscriptionDatabase.js
   - Do not use

---

## Setup Process

### Initial Setup (One Time):

```bash
# 1. Create main database in cPanel/phpMyAdmin
# Database name: your_main_db_name

# 2. Configure .env file
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_main_db_name

# 3. Run database setup
node backend/src/models/setupDatabase.js
```

This will:
- Create super admin tables
- Seed default subscription plans
- Create super admin account

### Tenant Creation (Automatic):

When a new tenant signs up:
1. System creates a new database: `biz_<tenant_slug>`
2. System runs `tenantDatabase.createTenantDatabase()`
3. All business tables are created in the new database
4. Tenant can start using the system

---

## Database Naming Convention

- **Main Database:** As defined in `.env` (e.g., `bizmanager_main`)
- **Tenant Databases:** `biz_<tenant_slug>` (e.g., `biz_acme_corp`)

---

## Key Points

✅ **DO:**
- Create super admin tables in the main database
- Create business tables in tenant databases
- Use `tenantDatabase.js` for new tenants

❌ **DON'T:**
- Create business tables in the main database
- Use deprecated files (`setupHRDatabase.js`, `seedData.js`)
- Mix super admin and business data

---

## Tenant Isolation

Each tenant's data is completely isolated:
- Separate database per tenant
- No cross-tenant data access
- Independent backups possible
- Scalable architecture

---

## Migration Notes

If you have existing business tables in the main database:
1. They will be ignored (no conflicts)
2. New tenants will use their own databases
3. You can safely drop the old business tables from the main database after confirming all tenants are migrated

---

## Questions?

- Main database issues? Check `setupSubscriptionDatabase.js`
- Tenant database issues? Check `tenantDatabase.js`
- Need to add tables? Update the appropriate file based on whether it's super admin or tenant data

