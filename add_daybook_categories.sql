-- SQL query to add new categories to daybook_categories table
-- This will insert the new categories, ignoring duplicates if they already exist

INSERT INTO daybook_categories (name) VALUES
  ('Meas & Tea Expenses'),
  ('Salary Advance'),
  ('Travelling Exp'),
  ('Factory Bun'),
  ('Showroom Cash')
ON DUPLICATE KEY UPDATE name = name;

-- Alternative query if you want to ensure all default categories exist:
-- This will insert all categories including defaults, ignoring duplicates

INSERT IGNORE INTO daybook_categories (name) VALUES
  ('Batta'),
  ('Drawing'),
  ('Factory Purchase'),
  ('Fuel'),
  ('Ration Items'),
  ('Cash Refund'),
  ('New Celebration'),
  ('Office Supplies'),
  ('Transport'),
  ('Maintenance'),
  ('Utilities'),
  ('Marketing'),
  ('Professional Services'),
  ('Opening Balance'),
  ('Other'),
  ('Meas & Tea Expenses'),
  ('Salary Advance'),
  ('Travelling Exp'),
  ('Factory Bun'),
  ('Showroom Cash');

