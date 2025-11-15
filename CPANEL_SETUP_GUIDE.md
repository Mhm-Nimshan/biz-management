# cPanel Database Setup Guide

This guide will help you set up tenant databases in cPanel's MySQL Databases section.

## Prerequisites

- Access to cPanel
- MySQL Databases section available
- User `nimsleas_bizmanager_main` already exists

## Step-by-Step Setup

### Step 1: Create Database in cPanel

1. **Login to cPanel**
   - Go to your hosting control panel
   - Login with your credentials

2. **Navigate to MySQL Databases**
   - Find "MySQL Databases" in the Database section
   - Click on it

3. **Create New Database**
   - In the "Create New Database" section
   - Enter database name: `nimsleas_[tenant_name]`
   - Example: `nimsleas_company-abc-1234567890`
   - Click "Create Database"

### Step 2: Add User to Database

1. **Scroll down to "Add User To Database"**
   - Select User: `nimsleas_bizmanager_main`
   - Select Database: `nimsleas_[tenant_name]` (the one you just created)
   - Click "Add"

2. **Grant Privileges**
   - In the "Manage User Privileges" section
   - Check "All Privileges" checkbox
   - Click "Make Changes"

### Step 3: Create Tables

After creating the database and assigning the user, run the table creation script:

```bash
cd backend
node src/scripts/create-tables-only.js nimsleas_[tenant_name]
```

Replace `[tenant_name]` with your actual tenant name.

### Step 4: Verify Setup

1. **Check in phpMyAdmin**
   - Go to phpMyAdmin in cPanel
   - Select your new database
   - Verify all tables are created

2. **Test Application**
   - Try creating a new tenant in your application
   - Check if the tenant database works correctly

## Troubleshooting

### Database Created but No Tables

If the database exists but tables are missing:

```bash
# Run the table creation script
node src/scripts/create-tables-only.js nimsleas_[tenant_name]
```

### Permission Denied Error

If you get permission errors:

1. Check that the user `nimsleas_bizmanager_main` has "All Privileges" on the database
2. Verify the database name is correct
3. Ensure the user exists and has the correct password

### User Not Found

If the user `nimsleas_bizmanager_main` doesn't exist:

1. Go to "MySQL Users" in cPanel
2. Create a new user with the name `nimsleas_bizmanager_main`
3. Set a strong password
4. Add the user to your databases

## Automated Setup (Alternative)

If you prefer automated setup, run:

```bash
cd backend
node src/scripts/cpanel-setup-guide.js
```

This will guide you through the process and attempt to create the database automatically.

## Database Naming Convention

- Main database: `nimsleas_bizmanager_main`
- Tenant databases: `nimsleas_[tenant_slug]`
- Example: `nimsleas_company-abc-1234567890`

## Security Notes

- Always use strong passwords
- Grant only necessary privileges
- Regularly backup your databases
- Monitor database usage

## Support

If you encounter issues:

1. Check the error messages carefully
2. Verify all steps were completed
3. Check cPanel error logs
4. Contact your hosting provider if needed
