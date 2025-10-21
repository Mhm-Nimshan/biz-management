const db = require('../config/database');

const seedData = async () => {
  try {
    // Insert sample employees
    await db.execute(`
      INSERT IGNORE INTO employees 
      (employee_id, first_name, last_name, email, phone, department, position, salary, hire_date) 
      VALUES 
      ('EMP001', 'John', 'Doe', 'john.doe@company.com', '123-456-7890', 'Sales', 'Sales Manager', 60000, '2023-01-15'),
      ('EMP002', 'Jane', 'Smith', 'jane.smith@company.com', '123-456-7891', 'HR', 'HR Manager', 55000, '2023-02-20'),
      ('EMP003', 'Mike', 'Johnson', 'mike.johnson@company.com', '123-456-7892', 'IT', 'Developer', 70000, '2023-03-10')
    `);

    // Insert sample products
    await db.execute(`
      INSERT IGNORE INTO products 
      (sku, name, description, category, cost_price, selling_price, current_stock, min_stock_level) 
      VALUES 
      ('SKU001', 'Laptop', 'High-performance laptop', 'Electronics', 800, 1200, 50, 5),
      ('SKU002', 'Mouse', 'Wireless mouse', 'Electronics', 15, 25, 100, 10),
      ('SKU003', 'Keyboard', 'Mechanical keyboard', 'Electronics', 40, 70, 75, 8)
    `);

    console.log('Sample data inserted successfully');
  } catch (error) {
    console.error('Error seeding data:', error);
  }
};

module.exports = seedData;