const express = require('express');
const router = express.Router();
const tenantAuth = require('../middleware/tenantAuth');
const {
  getCheques,
  getCheque,
  depositCheque,
  processHoldCheques,
  returnCheque
} = require('../controllers/chequesController');

// Apply tenant authentication to all routes
router.use(tenantAuth);

// Cheque routes
router.get('/', getCheques);
router.get('/:id', getCheque);
router.post('/:chequeId/deposit', depositCheque);
router.post('/process-hold', processHoldCheques);
router.post('/:chequeId/return', returnCheque);
module.exports = router;

