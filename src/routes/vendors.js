const express = require('express');
const router = express.Router();
const tenantAuth = require('../middleware/tenantAuth');

// Apply tenant authentication to all routes
router.use(tenantAuth);

// Get all vendors
router.get('/', async (req, res) => {
  try {
    const [vendors] = await req.db.execute(`
      SELECT v.*, 
             COALESCE(p_summary.total_bill_amount, 0) as total_bill_amount,
             COALESCE(p_summary.total_purchases, 0) as total_purchases,
             COALESCE(pr_summary.total_return_amount, 0) as total_return_amount,
             COALESCE(pr_summary.total_returns, 0) as total_returns,
             COALESCE(ic_summary.issued_cheques_amount, 0) as issued_cheques_amount,
             COALESCE(ic_summary.issued_cheques_count, 0) as issued_cheques_count,
             COALESCE(vcp_summary.cash_payments_amount, 0) as cash_payments_amount,
             COALESCE(vcp_summary.cash_payments_count, 0) as cash_payments_count,
             (COALESCE(v.opening_balance, 0) + 
              COALESCE(p_summary.total_bill_amount, 0) - 
              COALESCE(pr_summary.total_return_amount, 0) - 
              COALESCE(ic_summary.issued_cheques_amount, 0) - 
              COALESCE(vcp_summary.cash_payments_amount, 0)) as total_balance
      FROM vendors v
      LEFT JOIN (
        SELECT vendor_id, 
               SUM(total_amount) as total_bill_amount,
               COUNT(*) as total_purchases
        FROM purchases
        GROUP BY vendor_id
      ) p_summary ON v.id = p_summary.vendor_id
      LEFT JOIN (
        SELECT vendor_id, 
               SUM(total_amount) as total_return_amount,
               COUNT(*) as total_returns
        FROM purchase_returns
        GROUP BY vendor_id
      ) pr_summary ON v.id = pr_summary.vendor_id
      LEFT JOIN (
        SELECT ic.vendor_id, 
               COALESCE(
                 SUM(CASE 
                   WHEN ici.status = 'issued' THEN ici.amount 
                   WHEN ici.id IS NULL AND ic.status = 'issued' THEN ic.amount 
                   ELSE 0 
                 END), 
                 0
               ) as issued_cheques_amount,
               COUNT(CASE 
                 WHEN ici.status = 'issued' THEN ici.id 
                 WHEN ici.id IS NULL AND ic.status = 'issued' THEN ic.id 
                 ELSE NULL 
               END) as issued_cheques_count
        FROM issued_cheques ic
        LEFT JOIN issued_cheque_items ici ON ic.id = ici.issued_cheque_id
        WHERE ic.vendor_id IS NOT NULL
        GROUP BY ic.vendor_id
      ) ic_summary ON v.id = ic_summary.vendor_id
      LEFT JOIN (
        SELECT vendor_id,
               COALESCE(SUM(amount), 0) as cash_payments_amount,
               COUNT(*) as cash_payments_count
        FROM vendor_cash_payments
        GROUP BY vendor_id
      ) vcp_summary ON v.id = vcp_summary.vendor_id
      ORDER BY v.created_at DESC
    `);
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get vendor summary with purchases and returns (MUST come before /:id route)
router.get('/:id/summary', async (req, res) => {
  try {
    const vendorId = req.params.id;
    
    // Get vendor details
    const [vendors] = await req.db.execute('SELECT * FROM vendors WHERE id = ?', [vendorId]);
    if (vendors.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    const vendor = vendors[0];

    // Get purchases
    const [purchases] = await req.db.execute(`
      SELECT p.*, 
             COUNT(pi.id) as item_count
      FROM purchases p
      LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
      WHERE p.vendor_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [vendorId]);

    // Get purchase returns
    const [returns] = await req.db.execute(`
      SELECT pr.*, 
             COUNT(pri.id) as item_count,
             p.purchase_number
      FROM purchase_returns pr
      LEFT JOIN purchase_return_items pri ON pr.id = pri.return_id
      LEFT JOIN purchases p ON pr.purchase_id = p.id
      WHERE pr.vendor_id = ?
      GROUP BY pr.id
      ORDER BY pr.created_at DESC
    `, [vendorId]);

    // Get issued cheque items for this vendor (only outstanding/issued ones count toward net balance)
    // Check if issued_cheque_items table exists first
    let issuedChequeItems = [];
    let issuedChequesAmount = 0;
    
    try {
      const [tables] = await req.db.execute(`SHOW TABLES LIKE 'issued_cheque_items'`);
      if (tables.length > 0) {
        const [chequeItems] = await req.db.execute(`
          SELECT ici.*, 
                 ic.vendor_id,
                 ic.payee_name,
                 ic.description,
                 ba.account_name as bank_account_name,
                 ba.bank_name
          FROM issued_cheque_items ici
          INNER JOIN issued_cheques ic ON ici.issued_cheque_id = ic.id
          LEFT JOIN bank_accounts ba ON ic.bank_account_id = ba.id
          WHERE ic.vendor_id = ? AND ici.status = 'issued'
          ORDER BY ici.cheque_date DESC, ici.created_at DESC
        `, [vendorId]);
        
        issuedChequeItems = chequeItems;
        issuedChequesAmount = chequeItems.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
      } else {
        // Fallback to old structure if table doesn't exist
        const [issuedCheques] = await req.db.execute(`
          SELECT ic.*, 
                 ba.account_name as bank_account_name,
                 ba.bank_name
          FROM issued_cheques ic
          LEFT JOIN bank_accounts ba ON ic.bank_account_id = ba.id
          WHERE ic.vendor_id = ? AND ic.status = 'issued'
          ORDER BY ic.cheque_date DESC, ic.created_at DESC
        `, [vendorId]);
        
        issuedChequesAmount = issuedCheques.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
        // Convert to items format for compatibility
        issuedChequeItems = issuedCheques.map(c => ({
          id: c.id,
          cheque_number: c.cheque_number,
          cheque_date: c.cheque_date,
          amount: c.amount,
          payee_name: c.payee_name,
          bank_account_name: c.bank_account_name,
          bank_name: c.bank_name,
          status: c.status
        }));
      }
    } catch (error) {
      console.warn('Error fetching issued cheque items:', error.message);
    }

    // Get cash payments for this vendor
    let cashPayments = [];
    let cashPaymentsAmount = 0;
    
    try {
      const [tables] = await req.db.execute(`SHOW TABLES LIKE 'vendor_cash_payments'`);
      if (tables.length > 0) {
        const [cashPaymentsData] = await req.db.execute(`
          SELECT vcp.*,
                 ba.account_name as bank_account_name,
                 ba.bank_name
          FROM vendor_cash_payments vcp
          LEFT JOIN bank_accounts ba ON vcp.bank_account_id = ba.id
          WHERE vcp.vendor_id = ?
          ORDER BY vcp.payment_date DESC, vcp.created_at DESC
        `, [vendorId]);
        
        cashPayments = cashPaymentsData;
        cashPaymentsAmount = cashPaymentsData.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      }
    } catch (error) {
      console.warn('Error fetching cash payments:', error.message);
    }

    // Calculate totals
    const totalPurchases = purchases.reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0);
    const totalReturns = returns.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);
    const openingBalance = parseFloat(vendor.opening_balance || 0) || 0;
    const totalBalance = (openingBalance || 0) + (totalPurchases || 0) - (totalReturns || 0) - (issuedChequesAmount || 0) - (cashPaymentsAmount || 0);

    res.json({
      vendor,
      purchases,
      returns,
      issued_cheques: issuedChequeItems,
      cash_payments: cashPayments,
      summary: {
        opening_balance: openingBalance || 0,
        total_purchases: totalPurchases || 0,
        total_returns: totalReturns || 0,
        issued_cheques_amount: issuedChequesAmount || 0,
        cash_payments_amount: cashPaymentsAmount || 0,
        total_balance: totalBalance || 0,
        purchase_count: purchases.length || 0,
        return_count: returns.length || 0,
        issued_cheques_count: issuedChequeItems.length || 0,
        cash_payments_count: cashPayments.length || 0
      }
    });
  } catch (error) {
    console.error('Error fetching vendor summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get vendor by ID (must come after /:id/summary to avoid route conflict)
router.get('/:id', async (req, res) => {
  try {
    const [vendors] = await req.db.execute('SELECT * FROM vendors WHERE id = ?', [req.params.id]);

    if (vendors.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(vendors[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new vendor
router.post('/', async (req, res) => {
  const {
    name,
    email,
    phone,
    address,
    city,
    state,
    zip_code,
    country,
    contact_person,
    payment_terms,
    tax_id,
    status,
    opening_balance
  } = req.body;

  try {
    const [result] = await req.db.execute(
      `INSERT INTO vendors
       (name, email, phone, address, city, state, zip_code, country, contact_person, payment_terms, tax_id, status, opening_balance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, phone, address, city, state, zip_code, country, contact_person, payment_terms, tax_id, status, opening_balance || 0]
    );

    res.json({
      message: 'Vendor created successfully',
      id: result.insertId
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update vendor
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    const [result] = await req.db.execute(
      `UPDATE vendors SET ${fields} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json({ message: 'Vendor updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete vendor
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await req.db.execute('DELETE FROM vendors WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
