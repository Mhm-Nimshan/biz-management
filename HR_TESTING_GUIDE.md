# HR Management System - Testing Guide

## Prerequisites

Before testing the HR features, ensure:
1. Backend server is running (`npm start` in backend folder)
2. Frontend server is running (`npm start` in frontend folder)
3. Database is initialized with HR tables
4. At least one employee exists with role "salesman" and commission rate set

## Setup Steps

### 1. Initialize HR Database

```bash
cd backend
npm start
```

The HR tables will be automatically created on server start.

### 2. Create Test Employees

Navigate to Employee Management and create:

**Employee 1: Salesman**
- Name: John Doe
- Role: Salesman
- Department: Sales
- Salary: 50000
- Commission Rate: 5%
- Status: Active

**Employee 2: Manager**
- Name: Jane Smith
- Role: Manager
- Department: Administration
- Salary: 75000
- Status: Active

## Test Scenarios

### Test 1: Leave Management

#### 1.1 Apply for Leave
1. Go to Employee Management → Leave Management tab
2. Click "Apply Leave"
3. Fill in:
   - Employee: John Doe
   - Leave Type: Annual Leave
   - Start Date: Today
   - End Date: +2 days from today
   - Days will auto-calculate to 3
   - Reason: "Personal work"
4. Submit
5. **Expected**: Leave application created with "pending" status

#### 1.2 Check Leave Balance
1. Select "John Doe" from employee dropdown
2. **Expected**: See leave balances:
   - Annual Leave: 14/14 (if first time)
   - Sick Leave: 7/7
   - Casual Leave: 7/7

#### 1.3 Approve Leave
1. Find the pending leave in the table
2. Click the green checkmark (✓) button
3. **Expected**: 
   - Status changes to "approved"
   - Leave balance updates to 11/14 (14 - 3 days)

#### 1.4 Apply for No-Pay Leave
1. Apply new leave:
   - Employee: John Doe
   - Leave Type: No Pay Leave
   - Dates: +5 days from today for 2 days
   - Reason: "Extended leave"
2. Approve the leave
3. **Expected**: No-pay leave approved (will be used in salary calculation)

### Test 2: Commission Tracking

#### 2.1 Create Invoice with Salesman
1. Go to Invoice Management
2. Create new invoice:
   - Customer: Any customer
   - Salesman: John Doe
   - Items: Add products
   - Total: Rs. 10,000
3. Save invoice
4. **Expected**: Commission calculated: Rs. 500 (5% of 10,000)

#### 2.2 Pay Invoice
1. Open the invoice
2. Add payment:
   - Payment Type: Cash or Bank Transfer
   - Amount: Rs. 10,000
   - Payment Date: Today
3. Submit payment
4. **Expected**: 
   - Invoice status changes to "paid"
   - Commission automatically recorded in system

#### 2.3 Verify Commission
1. Go to Employee Management → Leave Management tab
2. (Commission viewing is in Salary Calculator tab)
3. **Expected**: Commission visible in salary calculation

### Test 3: Salary Calculation

#### 3.1 Calculate Salary for Employee with Commission
1. Go to Salary Calculator tab
2. Select:
   - Employee: John Doe
   - Period Start: 1st of current month
   - Period End: Last day of current month
3. Click "Calculate Salary"
4. **Expected Results**:
   ```
   Basic Salary: Rs. 50,000.00
   Commission: Rs. 500.00 (from paid invoice)
   No-Pay Deduction: Rs. XXXX (2 days if approved)
   
   Gross Salary: Rs. (50,000 + 500 - no_pay_deduction)
   
   EPF Employee (8%): Rs. (Gross × 0.08)
   
   Total Deductions: Rs. (EPF Employee)
   Net Salary: Rs. (Gross - Deductions)
   
   Employer Contributions:
   EPF Employer (12%): Rs. (Gross × 0.12)
   ETF Employer (3%): Rs. (Gross × 0.03)
   Total Employer Cost: Rs. (Gross + EPF Employer + ETF Employer)
   ```

#### 3.2 Verify No-Pay Deduction
1. If 2 no-pay days approved:
   - Days in month: 30 (example)
   - Daily rate: 50,000 / 30 = Rs. 1,666.67
   - No-pay deduction: 1,666.67 × 2 = Rs. 3,333.34
2. **Expected**: No-pay deduction shown in calculation

### Test 4: Payroll Processing

#### 4.1 Process Payroll
1. After calculating salary (Test 3)
2. Review all amounts carefully
3. Click "Process Payroll & Generate Payslip"
4. **Expected**:
   - Success message: "Payroll processed successfully!"
   - Message: "Generating payslip..."
   - Success message: "Payslip generated successfully!"
   - Calculation form clears
   - Employee selection resets

#### 4.2 Verify Payroll Creation
Check database:
```sql
SELECT * FROM payroll WHERE employee_id = [John_Doe_ID] ORDER BY created_at DESC LIMIT 1;
```
**Expected**: New payroll record with status "processed"

#### 4.3 Verify Commission Status Update
Check database:
```sql
SELECT * FROM employee_commissions WHERE employee_id = [John_Doe_ID];
```
**Expected**: Commission status changed from "pending" to "paid"

### Test 5: Payslip Viewing & Printing

#### 5.1 View Payslips
1. Go to Payslips tab
2. Filter:
   - Employee: John Doe
   - Month: Current month
   - Year: Current year
3. **Expected**: See the generated payslip in table

#### 5.2 View Payslip Details
1. Click the blue document icon (👁️) on the payslip
2. **Expected**: Modal opens showing:
   - Payslip number (format: PS-{emp_id}-{timestamp})
   - Employee details
   - Pay period
   - Salary breakdown
   - Deductions
   - Net salary (highlighted in green)
   - Employer contributions

#### 5.3 Print Payslip
1. Click the green printer icon (🖨️) or Print button in modal
2. **Expected**: 
   - New window opens with print-friendly format
   - Professional payslip design
   - All details clearly visible
   - Ready to print or save as PDF

### Test 6: Duplicate Prevention

#### 6.1 Try Duplicate Payroll
1. Go to Salary Calculator
2. Select same employee (John Doe)
3. Select same pay period as before
4. Calculate salary
5. Try to process payroll again
6. **Expected**: Error message about duplicate payroll for the period

### Test 7: Multiple Employees

#### 7.1 Process Salary for Manager (No Commission)
1. Go to Salary Calculator
2. Select: Jane Smith (Manager)
3. Select current month period
4. Calculate
5. **Expected**:
   ```
   Basic Salary: Rs. 75,000.00
   Commission: Rs. 0.00 (no commission for managers)
   No-Pay Deduction: Rs. 0.00 (no leaves)
   
   Gross Salary: Rs. 75,000.00
   EPF Employee (8%): Rs. 6,000.00
   Net Salary: Rs. 69,000.00
   
   EPF Employer (12%): Rs. 9,000.00
   ETF Employer (3%): Rs. 2,250.00
   Total Employer Cost: Rs. 86,250.00
   ```

### Test 8: Leave Balance for New Year

#### 8.1 Test Year Rollover
1. Select an employee in Leave Management
2. Change system date to next year (or manually test)
3. **Expected**: System creates new leave balance entry for the new year with default balances

## Verification Checklist

### Database Verification

After each test, verify in database:

```sql
-- Check HR tables exist
SHOW TABLES LIKE 'employee_%';
SHOW TABLES LIKE 'payroll';
SHOW TABLES LIKE 'payslips';

-- Check leave balances
SELECT * FROM employee_leave_balance;

-- Check leave applications
SELECT * FROM employee_leaves ORDER BY created_at DESC;

-- Check commissions
SELECT * FROM employee_commissions ORDER BY created_at DESC;

-- Check payroll records
SELECT * FROM payroll ORDER BY created_at DESC;

-- Check payslips
SELECT * FROM payslips ORDER BY created_at DESC;
```

### Frontend Verification

- [ ] All tabs visible in Employee Management
- [ ] Leave balance displays correctly
- [ ] Leave application form works
- [ ] Approve/Reject buttons functional
- [ ] Salary calculator shows all components
- [ ] EPF/ETF calculations are correct
- [ ] Payslip modal displays properly
- [ ] Print functionality works
- [ ] No console errors

### Calculation Verification

#### EPF/ETF Calculations
For Gross Salary of Rs. 50,000:
- EPF Employee (8%): Rs. 4,000
- EPF Employer (12%): Rs. 6,000
- ETF Employer (3%): Rs. 1,500
- Net Salary: Rs. 46,000
- Total Employer Cost: Rs. 57,500

Verify these calculations match in the system.

## Edge Cases to Test

### 1. Insufficient Leave Balance
1. Apply for more days than available
2. **Expected**: Error message about insufficient balance

### 2. Zero Commission Rate
1. Create salesman with 0% commission rate
2. Create and pay invoice
3. **Expected**: No commission recorded

### 3. Multiple Commissions in Month
1. Create and pay 3 invoices for same salesman
2. Calculate salary
3. **Expected**: All 3 commissions aggregated

### 4. No Leaves in Month
1. Process salary for employee with no leaves
2. **Expected**: No-pay deduction = Rs. 0.00

### 5. Future-Dated Payroll
1. Try to process payroll for future month
2. **Expected**: Works, but pay date should be set appropriately

## Performance Testing

### Load Test Scenarios
1. Create 50 employees
2. Apply 100 leaves
3. Create 50 invoices with commissions
4. Process payroll for all 50 employees
5. **Expected**: All operations complete within reasonable time

## Bug Reporting

If you find any issues during testing, report with:
1. Test scenario number
2. Steps to reproduce
3. Expected result
4. Actual result
5. Screenshots (if applicable)
6. Console errors (if any)
7. Database state (if relevant)

## Common Issues & Solutions

### Issue 1: Commissions Not Showing
- **Check**: Invoice must be in "paid" status
- **Check**: Salesman must have commission_rate > 0
- **Solution**: Pay the invoice first

### Issue 2: Leave Balance Not Updating
- **Check**: Leave must be in "approved" status
- **Solution**: Approve the leave application

### Issue 3: Payroll Process Failed
- **Check**: Basic salary must be set in employee profile
- **Check**: Pay period dates must be valid
- **Solution**: Update employee salary field

### Issue 4: Print Not Working
- **Check**: Browser popup blocker
- **Solution**: Allow popups for the application

## Success Criteria

The HR Management System test is successful if:

✅ All test scenarios pass
✅ Calculations are mathematically correct
✅ EPF/ETF percentages match requirements
✅ No-pay deductions work correctly
✅ Commissions aggregate properly
✅ Payslips generate and print correctly
✅ No console errors
✅ No database errors
✅ Professional UI/UX
✅ Data integrity maintained

## Next Steps After Testing

1. ✅ Test all scenarios
2. ✅ Fix any found bugs
3. ✅ Verify calculations
4. ✅ Test with real data
5. ✅ User acceptance testing
6. ✅ Deploy to production

## Conclusion

This comprehensive HR Management System provides all necessary features for employee management, leave tracking, salary calculation with EPF/ETF compliance, commission management, and professional payslip generation. 

Happy Testing! 🎉

