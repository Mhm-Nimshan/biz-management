const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const superAdminAuth = require('../middleware/superAdminAuth');


// Public routes
router.post('/login', superAdminController.login);

// Protected routes (require super admin authentication)
router.use(superAdminAuth);

// Dashboard
router.get('/dashboard/stats', superAdminController.getDashboardStats);

// Tenants
router.get('/tenants', superAdminController.getAllTenants);
router.get('/tenants/:tenantId', superAdminController.getTenantDetails);
router.post('/tenants', superAdminController.createTenant);
router.put('/tenants/:tenantId/suspend', superAdminController.suspendTenant);
router.put('/tenants/:tenantId/reactivate', superAdminController.reactivateTenant);
router.delete('/tenants/:tenantId/subscription', superAdminController.cancelSubscription);
router.delete('/tenants/:tenantId', superAdminController.deleteTenant);

// Menu permissions
router.get('/tenants/:tenantId/menu-permissions', superAdminController.getMenuPermissions);
router.put('/tenants/:tenantId/menu-permissions', superAdminController.updateMenuPermissions);

// Tenant user permissions
router.get('/permissions/available', superAdminController.getAvailablePermissions);
router.get('/tenants/:tenantId/users', superAdminController.getTenantUsers);
router.get('/tenants/:tenantId/users/:userId/permissions', superAdminController.getTenantUserPermissions);
router.put('/tenants/:tenantId/users/:userId/permissions', superAdminController.updateTenantUserPermissions);

// Subscription plans
router.get('/plans', superAdminController.getSubscriptionPlans);

module.exports = router;

