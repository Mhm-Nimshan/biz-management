const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const tenantAuth = require('../middleware/tenantAuth');

// Public routes (for signup)
router.post('/signup', subscriptionController.signup);
router.post('/tenant-login', subscriptionController.tenantLogin);
router.get('/plans', subscriptionController.getPlans);

// Protected routes (require tenant authentication)
router.use(tenantAuth);

router.get('/current', subscriptionController.getCurrentSubscription);
router.post('/upgrade', subscriptionController.upgradeSubscription);
router.post('/payment', subscriptionController.recordPayment);
router.get('/history', subscriptionController.getSubscriptionHistory);
router.get('/menu-permissions', subscriptionController.getMenuPermissions);

module.exports = router;

