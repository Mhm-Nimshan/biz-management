-- Fix database permissions for tenant creation
-- Run this as MySQL root user

-- Grant CREATE privilege to the user
GRANT CREATE ON *.* TO 'bizmanager_main'@'localhost';

-- Grant all privileges on the main database
GRANT ALL PRIVILEGES ON business_management.* TO 'root'@'localhost';

-- Grant privileges to create and manage tenant databases
-- This allows the user to create databases with the pattern 'biz_*'
GRANT CREATE ON `bizmanager_%`.* TO 'root'@'localhost';

-- Alternative: Grant CREATE on all databases (more permissive)
-- GRANT CREATE ON *.* TO 'nimsleas_bizmanager_main'@'localhost';

-- Flush privileges to apply changes
FLUSH PRIVILEGES;

-- Verify the user's privileges
SHOW GRANTS FOR 'root'@'localhost';
