const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const tenantAuth = require('../middleware/tenantAuth');

// Apply tenant authentication to all routes
router.use(tenantAuth);

// Get all users
router.get('/', async (req, res) => {
  try {
    const [users] = await req.db.execute(`
      SELECT id, username, email, role, status, created_at, updated_at, last_login
      FROM users 
      ORDER BY created_at DESC
    `);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const [users] = await req.db.execute(
      'SELECT id, username, email, role, status, created_at, updated_at, last_login FROM users WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user menu permissions
    const [menuPermissions] = await req.db.execute(
      'SELECT menu_key, is_visible, display_order, custom_label FROM menu_permissions WHERE user_id = ?',
      [req.params.id]
    );

    res.json({
      ...users[0],
      menu_permissions: menuPermissions
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new user
router.post('/', async (req, res) => {
  const {
    username,
    email,
    password,
    role = 'user',
    status = 'active',
    permissions = {}
  } = req.body;

  try {
    // Check if user already exists
    const [existingUsers] = await req.db.execute(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await req.db.execute(
      'INSERT INTO users (username, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, role, status]
    );

    const userId = result.insertId;

    // Note: Menu permissions are managed separately via the menu permissions endpoint

    res.json({
      message: 'User created successfully',
      id: userId
    });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'User already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  const { username, email, role, status, password, permissions } = req.body;

  try {
    const updates = [];
    const values = [];

    if (username !== undefined) {
      updates.push('username = ?');
      values.push(username);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      values.push(role);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (password !== undefined && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);

    await req.db.execute(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    // Note: Menu permissions are managed separately via the menu permissions endpoint

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    // Check if user exists
    const [users] = await req.db.execute('SELECT id FROM users WHERE id = ?', [req.params.id]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user menu permissions first
    await req.db.execute('DELETE FROM menu_permissions WHERE user_id = ?', [req.params.id]);

    // Delete user
    await req.db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all available menu keys (from default navigation)
router.get('/menu-permissions/list', async (req, res) => {
  try {
    // Get all menu keys from default navigation
    const menuKeys = [
      { key: 'dashboard', name: 'Dashboard' },
      { key: 'hr', name: 'HR Management' },
      { key: 'products', name: 'Product Management' },
      { key: 'customers', name: 'Customer Management' },
      { key: 'vendors', name: 'Vendor Management' },
      { key: 'vendor-payments', name: 'Vendor Payment Management' },
      { key: 'invoices', name: 'Invoice Management' },
      { key: 'purchases', name: 'Purchase Management' },
      { key: 'manufacturing', name: 'Manufacturing' },
      { key: 'banks', name: 'Bank Management' },
      { key: 'cheques', name: 'Cheque Management' },
      { key: 'payments', name: 'Customer Payment' },
      { key: 'daybook', name: 'Daybook' },
      { key: 'sales', name: 'Sales Management' },
      { key: 'pos', name: 'Point of Sale' },
      { key: 'pos-supermarket', name: 'Point of Sale Supermarket' },
      { key: 'users', name: 'User Management' },
      { key: 'reports', name: 'Reports' }
    ];

    res.json(menuKeys);
  } catch (error) {
    console.error('Error fetching menu keys list:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user menu permissions
router.get('/:id/menu-permissions', async (req, res) => {
  try {
    // Verify that the user exists in the tenant database users table
    // This ensures menu permissions are only for tenant DB users, not tenant_users
    const [users] = await req.db.execute(
      'SELECT id FROM users WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found in tenant database' });
    }

    const [menuPermissions] = await req.db.execute(
      'SELECT menu_key, is_visible, display_order, custom_label FROM menu_permissions WHERE user_id = ? ORDER BY display_order ASC',
      [req.params.id]
    );

    // Convert is_visible to boolean for consistency
    const formattedPermissions = menuPermissions.map(perm => ({
      ...perm,
      is_visible: perm.is_visible === 1 || perm.is_visible === true
    }));

    res.json(formattedPermissions);
  } catch (error) {
    console.error('Error fetching user menu permissions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user menu permissions
router.put('/:id/menu-permissions', async (req, res) => {
  const { menu_permissions } = req.body;

  try {
    // Verify that the user exists in the tenant database users table
    // This ensures menu permissions are only for tenant DB users, not tenant_users
    const [users] = await req.db.execute(
      'SELECT id FROM users WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found in tenant database. Menu permissions can only be assigned to tenant database users, not tenant_users.' });
    }

    // Delete existing menu permissions
    await req.db.execute('DELETE FROM menu_permissions WHERE user_id = ?', [req.params.id]);

    // Insert new menu permissions
    if (menu_permissions && Array.isArray(menu_permissions) && menu_permissions.length > 0) {
      const permissionEntries = menu_permissions.map(perm => [
        req.params.id,
        perm.menu_key,
        perm.is_visible !== undefined ? (perm.is_visible ? 1 : 0) : 1,
        perm.display_order || 0,
        perm.custom_label || null
      ]);

      if (permissionEntries.length > 0) {
        const placeholders = permissionEntries.map(() => '(?, ?, ?, ?, ?)').join(', ');
        const values = permissionEntries.flat();

        await req.db.execute(
          `INSERT INTO menu_permissions (user_id, menu_key, is_visible, display_order, custom_label) VALUES ${placeholders}`,
          values
        );
      }
    }

    res.json({ message: 'User menu permissions updated successfully' });
  } catch (error) {
    console.error('Error updating user menu permissions:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

