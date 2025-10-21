# HR Management System

## Overview

The HR Management System is a comprehensive employee management solution integrated into the business management platform. It includes leave management, salary calculation with EPF/ETF, commission tracking, and payslip generation.

## Features

### 1. Employee Leave Management

#### Leave Types
- **Annual Leave**: 14 days per year (default)
- **Sick Leave**: 7 days per year (default)
- **Casual Leave**: 7 days per year (default)
- **No-Pay Leave**: Unlimited (deducted from salary)
- **Maternity Leave**: Special leave type
- **Other**: Custom leave types

#### Leave Workflow
1. Employee/Manager applies for leave
2. System checks leave balance
3. Manager approves or rejects leave
4. Leave balance is automatically updated upon approval
5. No-pay leaves are tracked for salary deductions

#### Features
- Automatic leave balance tracking per employee per year
- Leave balance initialization for new years
- Approval workflow with notes
- Leave history and status tracking
- Real-time leave balance display

### 2. Commission Management

#### Automatic Commission Recording
- Commissions are automatically recorded when invoices are paid
- Commission rates are set per salesman in the employee profile
- Commission calculation: `(Total Amount × Commission Rate) / 100`

#### Commission Tracking
- View pending commissions by employee
- Filter by month, year, and status
- Track commission dates and invoice references
- Commissions are marked as "paid" when included in payroll

#### Commission Status
- **Pending**: Commission earned but not yet paid
- **Paid**: Commission included in payslip
- **Cancelled**: Commission cancelled (e.g., invoice cancelled)

### 3. Salary Calculation & EPF/ETF

#### Salary Components

##### Earnings
- **Basic Salary**: Employee's base salary
- **Commission**: Total pending commissions for the pay period
- **Allowances**: Additional allowances (if any)
- **Gross Salary**: Basic Salary + Commission - No-Pay Deduction

##### Deductions
- **EPF - Employee (8%)**: 8% of gross salary contributed by employee
- **No-Pay Deduction**: Calculated based on no-pay leave days

##### Employer Contributions
- **EPF - Employer (12%)**: 12% of gross salary
- **ETF - Employer (3%)**: 3% of gross salary

#### Calculation Formula

```
Gross Salary = Basic Salary + Commission - No-Pay Deduction

No-Pay Deduction = (Basic Salary / Days in Month) × No-Pay Days

EPF Employee (8%) = Gross Salary × 0.08
EPF Employer (12%) = Gross Salary × 0.12
ETF Employer (3%) = Gross Salary × 0.03

Total Deductions = EPF Employee

Net Salary (Take Home) = Gross Salary - Total Deductions

Total Employer Cost = Gross Salary + EPF Employer + ETF Employer
```

### 4. Payroll Processing

#### Process Flow
1. **Calculate Salary**: Select employee and pay period, system calculates all components
2. **Review**: Verify all amounts, commissions, and deductions
3. **Process Payroll**: Create payroll record in the system
4. **Generate Payslip**: Automatically generate payslip document
5. **Mark Commissions as Paid**: All commissions in the period are marked as paid

#### Features
- Monthly payroll processing
- Automatic commission aggregation
- No-pay day calculation from approved leaves
- Prevent duplicate payroll for same period
- Track payroll status (draft, processed, paid)

### 5. Payslip Generation

#### Payslip Information
- Unique payslip number
- Employee details (name, ID, department, position)
- Pay period and pay date
- Earnings breakdown
- Deductions breakdown
- Net salary
- Employer contributions (EPF & ETF)
- Working days vs worked days

#### Features
- View payslips by employee and month/year
- Print-friendly format
- Automatic calculation summary
- Professional payslip design
- PDF-ready format

## Database Schema

### employee_leaves
- Stores all leave applications
- Links to employee and approver
- Tracks leave status and dates

### employee_leave_balance
- Tracks annual leave balance per employee per year
- Separate tracking for annual, sick, and casual leave
- Automatically updated on leave approval

### employee_commissions
- Records all commissions earned
- Links to invoices and employees
- Tracks payment status

### payroll
- Stores processed payroll records
- Complete salary breakdown
- EPF/ETF calculations
- Links to employee and processor

### payslips
- Detailed payslip records
- Generated from payroll data
- Printable format information

### salary_advances
- Track salary advances (for future implementation)
- Recovery tracking

## API Endpoints

### Leave Management
```
POST   /api/hr/leaves                  - Apply for leave
GET    /api/hr/leaves                  - Get all leaves (with filters)
GET    /api/hr/leaves/balance          - Get leave balance
PUT    /api/hr/leaves/:id/status       - Approve/Reject leave
```

### Commission Management
```
POST   /api/hr/commissions             - Record commission manually
GET    /api/hr/commissions             - Get commissions (with filters)
```

### Payroll & Salary
```
POST   /api/hr/salary/calculate        - Calculate salary for employee
POST   /api/hr/payroll                 - Process payroll
POST   /api/hr/payroll/:id/payslip     - Generate payslip
GET    /api/hr/payslips                - Get payslips (with filters)
```

## Usage Guide

### For Employees/Managers

#### Apply for Leave
1. Go to Employee Management → Leave Management tab
2. Click "Apply Leave"
3. Select employee, leave type, and dates
4. System auto-calculates days
5. Enter reason and submit

#### Check Leave Balance
1. Select employee from dropdown
2. View remaining leave balance for each type
3. See used vs total leaves

### For HR/Admin

#### Approve/Reject Leaves
1. View all pending leaves in the table
2. Click approve ✓ or reject ✗ button
3. For rejection, provide reason
4. Leave balance updates automatically

#### Calculate Salary
1. Go to Salary Calculator tab
2. Select employee
3. Select pay period (start and end date)
4. Click "Calculate Salary"
5. Review breakdown:
   - Basic salary
   - Commissions earned in period
   - No-pay deductions
   - EPF/ETF calculations
   - Net salary

#### Process Payroll
1. After calculating salary, review all details
2. Click "Process Payroll & Generate Payslip"
3. System creates payroll record
4. Automatically generates payslip
5. Marks commissions as paid
6. Prevents duplicate processing

#### View & Print Payslips
1. Go to Payslips tab
2. Filter by employee, month, year
3. Click view icon to see details
4. Click print icon to print
5. Print format is professional and PDF-ready

### Automatic Commission Recording

Commissions are automatically recorded when:
1. An invoice is created with a salesman assigned
2. The invoice is paid (status changes to "paid")
3. The salesman has a commission rate > 0

The commission appears in:
- Commission Management tab (status: pending)
- Salary calculation for that month
- Payslip after payroll processing

## Best Practices

### Leave Management
1. Apply leaves in advance for proper planning
2. Approve/reject leaves promptly
3. Review leave balances before approving
4. Use "no-pay" leave type when balance exhausted

### Commission Management
1. Set commission rates in employee profiles
2. Verify commission rates before invoice creation
3. Review pending commissions before salary processing
4. Reconcile commissions monthly

### Payroll Processing
1. Process payroll at the end of each month
2. Verify no-pay days before processing
3. Review commission totals
4. Backup payroll records regularly
5. Generate payslips immediately after processing
6. Never process duplicate payroll for same period

### EPF/ETF Compliance
1. Employee EPF (8%) is deducted from salary
2. Employer must contribute EPF (12%) + ETF (3%)
3. Total employer cost includes gross salary + 15%
4. Keep records for statutory compliance
5. File EPF/ETF returns as per regulations

## Integration with Other Modules

### Invoice Module
- Automatic commission recording on payment
- Commission rate from employee profile
- Links to invoice for audit trail

### Employee Module
- Leave balance tracking
- Commission rate settings
- Salary information
- No-pay day tracking

### Banking Module
- Salary payments tracking (future)
- Bank transfer records (future)

## Reports & Analytics

### Available Metrics
- Total employees and active count
- Salesman count
- Average commission rate
- Monthly payroll summary
- Leave utilization rates
- Commission payout trends

### Future Enhancements
- Detailed payroll reports
- EPF/ETF statutory reports
- Leave analytics and trends
- Commission performance reports
- Salary history reports
- Year-end tax reports

## Security & Permissions

### Role-Based Access
- **Admin/Manager**: Full access to all HR features
- **Employee**: Can view own records (future)
- **Accountant**: Payroll and payment access (future)

### Data Protection
- Salary information is sensitive
- Leave records are confidential
- Payslips are private documents
- Commission data is protected

## Troubleshooting

### Common Issues

#### Leave Balance Not Updating
- **Cause**: Leave not approved
- **Solution**: Approve the leave application

#### Commission Not Appearing
- **Cause**: Invoice not marked as paid
- **Solution**: Process invoice payment

#### Salary Calculation Error
- **Cause**: Missing basic salary in employee profile
- **Solution**: Update employee salary field

#### Duplicate Payroll Error
- **Cause**: Payroll already processed for period
- **Solution**: Check existing payroll records first

#### No-Pay Days Not Calculating
- **Cause**: Leaves not in approved status
- **Solution**: Ensure leaves are approved before payroll

## Technical Notes

### Database Transactions
- All payroll processing uses database transactions
- Ensures data integrity
- Rollback on errors

### Automatic Calculations
- EPF/ETF calculated automatically
- No manual intervention needed
- Formula-based calculations

### Commission Linking
- Commissions linked to invoices
- Prevents duplicate commission records
- Tracks payment status

### Payslip Numbering
- Format: `PS-{employee_id}-{timestamp}`
- Unique for each payslip
- Sortable and trackable

## Support & Maintenance

### Regular Tasks
1. **Monthly**: Process payroll for all employees
2. **Monthly**: Review and approve pending leaves
3. **Quarterly**: Verify EPF/ETF calculations
4. **Annually**: Initialize leave balances for new year
5. **Annually**: Review and update leave policies

### Backup Recommendations
- Daily backup of payroll data
- Secure storage of payslips
- Archive old payroll records
- Maintain audit trails

## Conclusion

The HR Management System provides a complete solution for managing employees, leaves, salaries, and commissions. With automatic EPF/ETF calculations, commission tracking, and professional payslip generation, it streamlines the entire payroll process while ensuring compliance with statutory requirements.

For technical support or feature requests, please contact the system administrator.

