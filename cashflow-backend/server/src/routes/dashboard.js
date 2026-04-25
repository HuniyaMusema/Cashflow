const router = require('express').Router();
const pool   = require('../db/pool');
const { auth } = require('../middleware/auth');

// GET /api/v1/dashboard?tax_period=YYYY-MM
router.get('/', auth, async (req, res) => {
  const companyId = req.companyId;
  const period    = req.query.tax_period || new Date().toISOString().slice(0, 7);

  // Current period totals
  const totalsRes = await pool.query(`
    SELECT
      COALESCE(SUM(CASE WHEN type='Sales'    THEN vat_amount ELSE 0 END), 0) AS output_vat,
      COALESCE(SUM(CASE WHEN type='Purchase' THEN vat_amount ELSE 0 END), 0) AS input_vat,
      COALESCE(SUM(withholding_amount), 0)                                    AS total_withholding,
      COUNT(*)                                                                AS invoice_count
    FROM invoices
    WHERE company_id=$1 AND tax_period=$2 AND status != 'rejected' AND deleted_at IS NULL
  `, [companyId, period]);

  const t = totalsRes.rows[0];
  const netVat = parseFloat(t.output_vat) - parseFloat(t.input_vat);

  // Monthly trend (last 7 months)
  const trendRes = await pool.query(`
    SELECT
      tax_period,
      COALESCE(SUM(CASE WHEN type='Sales'    THEN vat_amount ELSE 0 END), 0) AS output_vat,
      COALESCE(SUM(CASE WHEN type='Purchase' THEN vat_amount ELSE 0 END), 0) AS input_vat
    FROM invoices
    WHERE company_id=$1
      AND status != 'rejected'
      AND deleted_at IS NULL
      AND invoice_date >= NOW() - INTERVAL '6 months'
    GROUP BY tax_period
    ORDER BY tax_period ASC
  `, [companyId]);

  // Recent invoices
  const recentRes = await pool.query(`
    SELECT id, invoice_number, vendor_name, invoice_date, total_amount, vat_amount, status, type
    FROM invoices
    WHERE company_id=$1 AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 5
  `, [companyId]);

  res.json({
    period,
    output_vat:        parseFloat(t.output_vat),
    input_vat:         parseFloat(t.input_vat),
    net_vat_payable:   Math.round(netVat * 100) / 100,
    total_withholding: parseFloat(t.total_withholding),
    invoice_count:     parseInt(t.invoice_count),
    monthly_trend:     trendRes.rows,
    recent_invoices:   recentRes.rows,
  });
});

module.exports = router;
