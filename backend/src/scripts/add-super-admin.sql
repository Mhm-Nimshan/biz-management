-- ============================================================================
-- Add Super Admin Account - SQL Script
-- ============================================================================
-- Run this script in phpMyAdmin or MySQL console to create a super admin
-- Database: nimsleas_bizmanager_main
-- ============================================================================

-- First, check if super_admins table exists
-- If you get an error, run: npm run setup-db first

-- ============================================================================
-- OPTION 1: Create Super Admin with email: admin@gmail.com
-- ============================================================================
-- Password: Nimshan@12
-- The password hash below is for: Nimshan@12
-- Generated using bcrypt with 10 rounds

INSERT INTO super_admins (email, password_hash, full_name, role, is_active, created_at)
VALUES (
    'admin@gmail.com',
    '$2b$10$wVSO/aD9963WUn7n2xcIDe0nDR13bvGPc7Nd3chgtm7YLWw8q4F0S',
    'Super Administrator',
    'super_admin',
    TRUE,
    NOW()
);

-- ============================================================================
-- OPTION 2: Create Super Admin with different email
-- ============================================================================
-- Uncomment and modify the line below if you want a different email
-- Replace the password_hash with one generated from the script below

-- INSERT INTO super_admins (email, password_hash, full_name, role, is_active, created_at)
-- VALUES (
--     'your-email@example.com',
--     'your-bcrypt-hash-here',
--     'Your Name',
--     'super_admin',
--     TRUE,
--     NOW()
-- );

-- ============================================================================
-- OPTION 3: Multiple Super Admins
-- ============================================================================
-- You can create multiple super admin accounts

-- INSERT INTO super_admins (email, password_hash, full_name, role, is_active, created_at)
-- VALUES 
--     ('admin1@example.com', 'hash1', 'Admin One', 'super_admin', TRUE, NOW()),
--     ('admin2@example.com', 'hash2', 'Admin Two', 'super_admin', TRUE, NOW()),
--     ('support@example.com', 'hash3', 'Support Team', 'support', TRUE, NOW());

-- ============================================================================
-- To generate password hash for a different password:
-- Run this in terminal:
-- node -e "console.log(require('bcryptjs').hashSync('YourPassword', 10))"
-- Then replace the password_hash value above
-- ============================================================================

-- ============================================================================
-- Verify the account was created:
-- ============================================================================
-- SELECT * FROM super_admins WHERE email = 'admin@gmail.com';

-- ============================================================================
-- To update password for existing account:
-- ============================================================================
-- UPDATE super_admins 
-- SET password_hash = '$2a$10$NewHashHere' 
-- WHERE email = 'admin@gmail.com';

-- ============================================================================
-- To activate/deactivate account:
-- ============================================================================
-- UPDATE super_admins SET is_active = 1 WHERE email = 'admin@gmail.com'; -- Activate
-- UPDATE super_admins SET is_active = 0 WHERE email = 'admin@gmail.com'; -- Deactivate

-- ============================================================================
-- To delete account (be careful!):
-- ============================================================================
-- DELETE FROM super_admins WHERE email = 'admin@gmail.com';

-- ============================================================================

