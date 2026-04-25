const router = require('express').Router();
const pool   = require('../db/pool');
const { auth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// GET /api/v1/declarations
router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM tax_declarations WHERE company_id=$1 ORDER BY tax_period DESC`,
    [req.companyId]
  );
  res.json(rows);
});

// POST /api/v1/declarations/generate
router.post('/generate', auth, async (req, res) => {
  const { tax_period } = req.body;
  if (!tax_period) return res.status(422).json({ message: 'tax_period required.' });

  const companyId = req.companyId;

  const invRes = await pool.query(`
    SELECT type, vat_amount, withholding_amount
    FROM invoices
    WHERE company_id=$1 AND tax_period=$2 AND status='verified' AND deleted_at IS NULL
  `, [companyId, tax_period]);

  const invoices    = invRes.rows;
  const outputVat   = invoices.filter(i => i.type === 'Sales').reduce((s, i) => s + parseFloat(i.vat_amount), 0);
  const inputVat    = invoices.filter(i => i.type === 'Purchase').reduce((s, i) => s + parseFloat(i.vat_amount), 0);
  const withholding = invoices.reduce((s, i) => s + parseFloat(i.withholding_amount), 0);
  const netVat      = outputVat - inputVat;
  const declNum     = 'DEC-' + uuidv4().slice(0, 8).toUpperCase();

  const { rows } = await pool.query(`
    INSERT INTO tax_declarations
      (company_id, generated_by, declaration_number, tax_period,
       total_output_vat, total_input_vat, net_vat_payable, total_withholding, status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft')
    ON CONFLICT (company_id, tax_period) DO UPDATE SET
      total_output_vat=$5, total_input_vat=$6, net_vat_payable=$7,
      total_withholding=$8, updated_at=NOW()
    RETURNING *
  `, [companyId, req.user.id, declNum, tax_period,
      outputVat, inputVat, netVat, withholding]);

  res.status(201).json({ declaration: rows[0], invoice_count: invoices.length });
});

module.exports = router;
