const express = require('express');
const router = express.Router();
const {
  getBankAccounts,
  getBankAccount,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  getBankTransactions,
  depositCash
} = require('../controllers/banksController');

// Bank account routes
router.get('/', getBankAccounts);
router.get('/:id', getBankAccount);
router.post('/', createBankAccount);
router.put('/:id', updateBankAccount);
router.delete('/:id', deleteBankAccount);

// Transaction routes
router.get('/:bankAccountId/transactions', getBankTransactions);
router.post('/deposit-cash', depositCash);

module.exports = router;

