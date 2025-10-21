const express = require('express');
const router = express.Router();
const hrController = require('../controllers/hrController');

// Leave Management Routes
router.post('/leaves', hrController.applyLeave);
router.get('/leaves', hrController.getEmployeeLeaves);
router.get('/leaves/balance', hrController.getLeaveBalance);
router.put('/leaves/:leaveId/status', hrController.updateLeaveStatus);

// Commission Management Routes
router.post('/commissions', hrController.recordCommission);
router.get('/commissions', hrController.getEmployeeCommissions);

// Payroll & Salary Routes
router.post('/salary/calculate', hrController.calculateSalary);
router.post('/payroll', hrController.processPayroll);
router.post('/payroll/:payroll_id/payslip', hrController.generatePayslip);
router.get('/payslips', hrController.getPayslips);

module.exports = router;

