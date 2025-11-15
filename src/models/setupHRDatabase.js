/**
 * HR Database Setup
 * 
 * NOTE: This file is DEPRECATED and kept only for reference.
 * 
 * HR tables are automatically created in each tenant's database
 * by the tenantDatabase.js module when a new tenant signs up.
 * 
 * HR tables are tenant-specific and should NOT be created in the main database.
 * 
 * HR Tables included in tenant databases:
 * - employee_leaves
 * - employee_leave_balance
 * - employee_commissions
 * - payroll
 * - payslips
 * - salary_advances
 * 
 * See backend/src/models/tenantDatabase.js for the actual implementation.
 */

const setupHRDatabase = async () => {
  console.log('⚠️  WARNING: setupHRDatabase is deprecated!');
  console.log('ℹ️  HR tables are automatically created in tenant databases.');
  console.log('ℹ️  See backend/src/models/tenantDatabase.js for implementation.\n');
  
  // This function does nothing - HR tables are created in tenant databases
  return Promise.resolve();
};

module.exports = setupHRDatabase;

