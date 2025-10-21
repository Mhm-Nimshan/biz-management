const jwt = require('jsonwebtoken');
const db = require('../config/database');

const superAdminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check if user is a super admin
    const [admins] = await db.execute(
      'SELECT * FROM super_admins WHERE id = ? AND is_active = TRUE',
      [decoded.id]
    );

    if (admins.length === 0) {
      return res.status(403).json({ error: 'Access denied. Super admin privileges required.' });
    }

    req.superAdmin = admins[0];
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = superAdminAuth;

