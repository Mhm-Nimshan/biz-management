const express = require('express');
const router = express.Router();
const {
  getCheques,
  getCheque,
  depositCheque,
  processHoldCheques,
  returnCheque
} = require('../controllers/chequesController');

// Cheque routes
router.get('/', getCheques);
router.get('/:id', getCheque);
router.post('/:chequeId/deposit', depositCheque);
router.post('/process-hold', processHoldCheques);
router.post('/:chequeId/return', returnCheque);

module.exports = router;

