const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'https://bizz.oxodigital.agency:3000',
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Business Management System API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Database setup
const setupDatabase = require('./models/setupDatabase');
const setupSubscriptionDatabase = require('./models/setupSubscriptionDatabase');
const setupHRDatabase = require('./models/setupHRDatabase');
const { initializeScheduler } = require('./services/subscriptionScheduler');

// Initialize databases
(async () => {
  try {
    await setupDatabase();
    await setupSubscriptionDatabase();
    await setupHRDatabase();
    console.log('All databases initialized successfully');
    
    // Initialize subscription scheduler
    initializeScheduler();
  } catch (error) {
    console.error('Database initialization error:', error);
  }
})();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/hr', require('./routes/hr'));
app.use('/api/products', require('./routes/products'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/daybook', require('./routes/daybook'));
app.use('/api/banks', require('./routes/banks'));
app.use('/api/cheques', require('./routes/cheques'));

// Subscription and Super Admin routes
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/super-admin', require('./routes/superAdmin'));

// Error handling middleware
app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});