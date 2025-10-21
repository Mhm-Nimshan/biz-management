# Bank Account & Cheque Management System

A comprehensive banking and cheque management system integrated with invoice payments. This system allows administrators to manage bank accounts, track cheque payments, and handle post-dated cheques with automatic balance updates.

## 🎯 Features Overview

### 1. **Bank Account Management**
- Create multiple bank accounts with opening balances
- Track current balance for each account
- View complete transaction history
- Support for different account types (Savings, Current, Business, Other)
- Support for multiple currencies
- Set account status (Active, Inactive, Closed)
- Automatic balance calculations

### 2. **Cheque Payment Tracking**
- Record cheque payments linked to invoices
- Track cheque dates vs received dates vs deposit dates
- Automatic status management (Pending, Deposited, On Hold, Cleared, Returned)
- Post-dated cheque support with automatic hold functionality
- Cheque return functionality with reason tracking
- Bulk processing of held cheques

### 3. **Invoice Payment Integration**
- Add payments to invoices (Cash, Cheque, Bank Transfer, Card)
- Option to deposit cash directly to bank accounts
- Automatic invoice status updates when fully paid
- Support for partial payments
- Link cheques to specific invoices and bank accounts

### 4. **Transaction Management**
- Complete transaction history for each bank account
- Track deposits, withdrawals, cheque deposits, and returns
- Value date tracking for post-dated cheques
- Balance before/after tracking
- Link transactions to invoices and cheques

## 📊 Database Schema

### New Tables Created

#### `bank_accounts`
- Stores bank account information
- Fields: account_name, account_number, bank_name, branch_name, account_type, opening_balance, current_balance, currency, status, description

#### `bank_transactions`
- Records all bank account transactions
- Fields: bank_account_id, transaction_type, amount, balance_before, balance_after, transaction_date, value_date, reference_number, description, related_invoice_id, related_cheque_id

#### `payment_cheques`
- Tracks all cheque payments
- Fields: cheque_number, invoice_id, bank_account_id, amount, cheque_date, received_date, deposited_date, cleared_date, status, return_reason, payer_name, payer_bank, payer_account, notes

#### `invoice_payments`
- Links payments to invoices
- Fields: invoice_id, payment_type, amount, payment_date, bank_account_id, cheque_id, reference_number, notes

## 🔄 Cheque Status Flow

### Status Definitions

1. **PENDING** - Cheque received but not yet deposited
2. **DEPOSITED** - Cheque deposited, waiting for clearance (post-dated)
3. **ON HOLD** - Post-dated cheque waiting for the cheque date to arrive
4. **CLEARED** - Cheque cleared and amount added to bank balance
5. **RETURNED** - Cheque bounced/returned with reason
6. **CANCELLED** - Cheque cancelled by admin

### Automatic Processing Logic

```
When depositing a cheque:
├── IF cheque_date <= deposit_date
│   ├── Status: CLEARED
│   ├── Update bank balance immediately
│   └── Record transaction with value_date = cheque_date
└── IF cheque_date > deposit_date (POST-DATED)
    ├── Status: ON_HOLD
    ├── Do NOT update bank balance
    └── Wait for automatic processing or manual trigger

When processing held cheques:
├── Check all cheques with status = ON_HOLD
├── WHERE cheque_date <= CURRENT_DATE
├── FOR EACH cheque:
│   ├── Update bank balance
│   ├── Create transaction record
│   └── Status: CLEARED

When returning a cheque:
├── IF status = CLEARED
│   ├── Reverse the transaction
│   ├── Deduct amount from bank balance
│   └── Record reversal transaction
├── Status: RETURNED
└── Save return_reason
```

## 🚀 How to Use

### Setting Up Bank Accounts

1. Navigate to **Bank Management** from the sidebar
2. Click **"Add Bank Account"**
3. Fill in the details:
   - Account Name (e.g., "Main Business Account")
   - Account Number
   - Bank Name
   - Branch Name (optional)
   - Account Type (Savings/Current/Business/Other)
   - Opening Balance (cannot be changed later)
   - Currency
   - Description (optional)
4. Click **"Save"**
5. The opening balance will be recorded as the first transaction

### Adding Payment to an Invoice

1. Navigate to **Invoice Management**
2. Find the invoice you want to add payment for
3. Click the **💰 Payment icon** (purple bank notes icon)
4. Select payment type:
   - **Cash**: Enter amount and optionally select bank account to deposit
   - **Cheque**: Fill in all cheque details
   - **Bank Transfer/Card/Other**: Enter payment details
5. For cheque payments:
   - Enter cheque number (required)
   - Enter cheque date (required)
   - Enter received date (required)
   - Select bank account to deposit (required)
   - Fill payer details (optional but recommended)
   - Add notes if needed
6. Click **"Add Payment"**

### Managing Cheques

#### Depositing a Cheque

1. Navigate to **Cheque Management**
2. Find the cheque with status **PENDING**
3. Click **"Deposit"**
4. Select deposit date
5. System automatically:
   - If cheque is post-dated: Sets status to **ON_HOLD**
   - If cheque date has passed: Sets status to **CLEARED** and updates bank balance

#### Processing Held Cheques

1. Navigate to **Cheque Management**
2. Click **"Process Hold Cheques"** button (shows count of held cheques)
3. Confirm the action
4. System will:
   - Find all cheques with status **ON_HOLD** where cheque_date <= today
   - Update bank balances for each
   - Change status to **CLEARED**
   - Create transaction records

#### Returning a Cheque

1. Navigate to **Cheque Management**
2. Find the cheque to return
3. Click **"Return"**
4. Enter return reason (required)
   - Common reasons: Insufficient funds, Signature mismatch, Account closed, Stop payment
5. Click **"Return Cheque"**
6. System will:
   - If cheque was CLEARED: Reverse the transaction and deduct from bank balance
   - Set status to **RETURNED**
   - Save the return reason

### Viewing Bank Transactions

1. Navigate to **Bank Management**
2. Click the **👁️ View icon** on any bank account
3. View complete transaction history including:
   - Transaction type and date
   - Value date (for cheques)
   - Amount and running balance
   - Related invoice/cheque references
   - Description and reference numbers

## 📁 File Structure

### Backend Files
```
backend/
├── src/
│   ├── models/
│   │   └── setupDatabase.js          # Database schema with new tables
│   ├── controllers/
│   │   ├── banksController.js        # Bank account CRUD and transactions
│   │   └── chequesController.js      # Cheque management logic
│   ├── routes/
│   │   ├── banks.js                  # Bank API routes
│   │   ├── cheques.js                # Cheque API routes
│   │   └── invoices.js               # Updated with payment endpoints
│   └── server.js                     # Added new routes
```

### Frontend Files
```
frontend/
├── src/
│   ├── api/
│   │   ├── banks.js                  # Bank API client
│   │   ├── cheques.js                # Cheque API client
│   │   └── invoices.js               # Updated with payment methods
│   ├── pages/
│   │   ├── BankManagement.jsx        # Bank account management page
│   │   ├── ChequeManagement.jsx      # Cheque tracking page
│   │   └── InvoiceManagement.jsx     # Updated with payment button
│   ├── components/
│   │   ├── Banks/
│   │   │   ├── BankForm.jsx          # Add/Edit bank account
│   │   │   └── BankTransactionHistory.jsx  # View transactions
│   │   ├── Cheques/
│   │   │   ├── ChequeDepositModal.jsx      # Deposit cheque
│   │   │   └── ChequeReturnModal.jsx       # Return cheque
│   │   └── Invoices/
│   │       └── InvoicePaymentModal.jsx     # Add payment to invoice
│   ├── App.jsx                       # Added new routes
│   └── components/Layout/Sidebar.jsx # Added navigation links
```

## 🔐 API Endpoints

### Bank Management
```
GET    /api/banks                      # Get all bank accounts
GET    /api/banks/:id                  # Get single bank account
POST   /api/banks                      # Create bank account
PUT    /api/banks/:id                  # Update bank account
DELETE /api/banks/:id                  # Delete bank account
GET    /api/banks/:id/transactions     # Get bank transactions
POST   /api/banks/deposit-cash         # Deposit cash to bank
```

### Cheque Management
```
GET    /api/cheques                    # Get all cheques (filter by status)
GET    /api/cheques/:id                # Get single cheque
POST   /api/cheques/:id/deposit        # Deposit a cheque
POST   /api/cheques/process-hold       # Process all held cheques
POST   /api/cheques/:id/return         # Return a cheque
```

### Invoice Payments
```
POST   /api/invoices/:id/payment       # Add payment to invoice
GET    /api/invoices/:id/payments      # Get invoice payments
```

## 💡 Key Business Rules

1. **Opening Balance**: Set only when creating a bank account, cannot be modified later
2. **Post-Dated Cheques**: Automatically held until cheque date arrives
3. **Bank Balance**: Only updated when cheques are cleared, not when deposited
4. **Cheque Returns**: If a cleared cheque is returned, the amount is automatically deducted from the bank balance
5. **Invoice Status**: Automatically updated to "paid" when total payments >= invoice amount
6. **Partial Payments**: System supports multiple payments per invoice
7. **Transaction Tracking**: Every balance change is recorded with before/after amounts
8. **Value Date**: Post-dated cheques use the cheque date as the value date when cleared

## 🎨 UI Features

### Statistics Dashboard
- Total bank accounts and active accounts
- Total balance across all accounts
- Cheque statistics (Pending, On Hold, Cleared, Returned)
- Total cheque amounts

### Visual Indicators
- Color-coded status badges
- Warning for post-dated cheques
- Success indicators for cleared transactions
- Alert messages for reversals

### Filters and Actions
- Filter cheques by status
- Bulk processing of held cheques
- Quick action buttons for deposit and return
- Transaction history with detailed breakdowns

## 🔧 Setup Instructions

1. **Database Setup**: The tables will be created automatically when you start the backend server
2. **Backend**: Ensure all dependencies are installed and server is running
3. **Frontend**: No additional configuration needed
4. **Navigation**: Access via sidebar menu:
   - Bank Management
   - Cheque Management
   - Invoice Management (updated with payment button)

## 📝 Example Workflow

### Scenario: Customer pays with a post-dated cheque

1. **Create Invoice** (existing feature)
   - Create invoice for customer
   - Invoice status: DRAFT or SENT

2. **Add Cheque Payment**
   - Go to Invoice Management
   - Click payment icon for the invoice
   - Select "Cheque" as payment type
   - Fill in cheque details:
     - Cheque Number: 123456
     - Cheque Date: 2025/10/20 (future date)
     - Received Date: 2025/10/19 (today)
     - Amount: $500
     - Select bank account
   - Click "Add Payment"
   - Cheque status: PENDING

3. **Deposit Cheque**
   - Go to Cheque Management
   - Find cheque #123456
   - Click "Deposit"
   - Select deposit date: 2025/10/19
   - System detects post-dated cheque
   - Cheque status: ON_HOLD
   - Bank balance: NOT updated yet

4. **Automatic Processing** (on 2025/10/20)
   - Admin clicks "Process Hold Cheques"
   - System finds cheque #123456 (date has arrived)
   - Updates bank balance: +$500
   - Creates transaction record with value_date = 2025/10/20
   - Cheque status: CLEARED
   - Invoice status: PAID

5. **If Cheque Bounces**
   - Admin clicks "Return" on cheque #123456
   - Enters reason: "Insufficient funds"
   - System reverses transaction: -$500 from bank
   - Cheque status: RETURNED
   - Invoice status: Reverts to SENT

## 🎯 Success Criteria

✅ Bank accounts can be created with opening balances  
✅ Multiple bank accounts supported  
✅ Cash payments can be deposited to banks  
✅ Cheque payments linked to invoices and banks  
✅ Post-dated cheques automatically held  
✅ Bank balance only updates on cheque date  
✅ Cheques can be returned with reasons  
✅ Complete transaction history available  
✅ Invoice status updates automatically  
✅ All transactions properly tracked

## 🐛 Testing Checklist

- [ ] Create bank account with opening balance
- [ ] Add cash payment to invoice and deposit to bank
- [ ] Add cheque payment with current date
- [ ] Add post-dated cheque payment
- [ ] Deposit current-dated cheque (should clear immediately)
- [ ] Deposit post-dated cheque (should go on hold)
- [ ] Process held cheques manually
- [ ] Return a pending cheque
- [ ] Return a cleared cheque (should reverse balance)
- [ ] View bank transaction history
- [ ] Check invoice status after payment
- [ ] Filter cheques by status
- [ ] Verify balance calculations

---

## 📞 Support

For issues or questions about this feature, please refer to the source code comments or contact the development team.

**Built with:** React, Node.js, Express, MySQL  
**Version:** 1.0.0  
**Last Updated:** October 2025

