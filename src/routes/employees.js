const express = require('express');
const router = express.Router();
const tenantAuth = require('../middleware/tenantAuth');

// Apply tenant authentication to all routes
router.use(tenantAuth);

// Get all employees
router.get('/', async (req, res) => {
  try {
    const [employees] = await req.db.execute('SELECT * FROM employees ORDER BY created_at DESC');
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get salesmen only
router.get('/salesmen', async (req, res) => {
  try {
    console.log('Fetching salesmen...');
    const [salesmen] = await req.db.execute(
      'SELECT * FROM employees WHERE role = "salesman" AND status = "active" ORDER BY first_name, last_name'
    );
    console.log('Found salesmen:', salesmen);
    res.json(salesmen);
  } catch (error) {
    console.error('Error fetching salesmen:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get employee by ID
router.get('/:id', async (req, res) => {
  try {
    const [employees] = await req.db.execute('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(employees[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new employee
router.post('/', async (req, res) => {
  const {
    employee_id,
    first_name,
    last_name,
    email,
    phone,
    department,
    position,
    role = 'employee',
    salary,
    commission_rate = 0,
    hire_date
  } = req.body;

  try {
    const [result] = await req.db.execute(
      `INSERT INTO employees 
       (employee_id, first_name, last_name, email, phone, department, position, role, salary, commission_rate, hire_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [employee_id, first_name, last_name, email, phone, department, position, role, salary, commission_rate, hire_date]
    );

    res.json({ 
      message: 'Employee created successfully', 
      id: result.insertId 
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Employee ID or Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update employee
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  try {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    const [result] = await req.db.execute(
      `UPDATE employees SET ${fields} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ message: 'Employee updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete employee
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await req.db.execute('DELETE FROM employees WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update commission rate for salesman
router.patch('/:id/commission', async (req, res) => {
  const { id } = req.params;
  const { commission_rate } = req.body;

  try {
    // Verify employee is a salesman
    const [employee] = await req.db.execute(
      'SELECT role FROM employees WHERE id = ?',
      [id]
    );

    if (employee.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    if (employee[0].role !== 'salesman') {
      return res.status(400).json({ error: 'Employee is not a salesman' });
    }

    const [result] = await req.db.execute(
      'UPDATE employees SET commission_rate = ? WHERE id = ?',
      [commission_rate, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ message: 'Commission rate updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;