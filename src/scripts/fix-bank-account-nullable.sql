-- Fix database schema to allow NULL values for bank_account_id columns
-- Run this script in your database management tool (phpMyAdmin, MySQL Workbench, etc.)

-- For each tenant database, run these commands:

-- 1. Fix payment_cheques table
ALTER TABLE payment_cheques 
MODIFY COLUMN bank_account_id INT NULL;

-- Drop existing foreign key constraint (adjust constraint name if different)
ALTER TABLE payment_cheques 
DROP FOREIGN KEY payment_cheques_ibfk_2;

-- Add new foreign key constraint with SET NULL on delete
ALTER TABLE payment_cheques 
ADD CONSTRAINT payment_cheques_ibfk_2 
FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL;

-- 2. Fix invoice_payments table
ALTER TABLE invoice_payments 
MODIFY COLUMN bank_account_id INT NULL;

-- Drop existing foreign key constraint (adjust constraint name if different)
ALTER TABLE invoice_payments 
DROP FOREIGN KEY invoice_payments_ibfk_3;

-- Add new foreign key constraint with SET NULL on delete
ALTER TABLE invoice_payments 
ADD CONSTRAINT invoice_payments_ibfk_3 
FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL;

-- 3. Also fix cheque_id to be nullable
ALTER TABLE invoice_payments 
MODIFY COLUMN cheque_id INT NULL;

-- Drop existing foreign key constraint (adjust constraint name if different)
ALTER TABLE invoice_payments 
DROP FOREIGN KEY invoice_payments_ibfk_4;

-- Add new foreign key constraint with SET NULL on delete
ALTER TABLE invoice_payments 
ADD CONSTRAINT invoice_payments_ibfk_4 
FOREIGN KEY (cheque_id) REFERENCES payment_cheques(id) ON DELETE SET NULL;

-- Note: Run these commands for each tenant database (biz_*)
-- You can find all tenant databases with: SHOW DATABASES LIKE 'biz_%';
