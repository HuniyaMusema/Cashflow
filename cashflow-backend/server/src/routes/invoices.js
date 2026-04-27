const router = require('express').Router();
const pool   = require('../db/pool');
const { auth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Tax calculation
function calcTax(taxable, type) {
  const vat = Math.round(taxable * 0.15 * 100) / 100;
  const wht = type === 'Purchase'
    ? Math.round(taxable * 0.02 * 100) / 100
    : Math.round(taxable * 0.03 * 100) / 100;
  return { vat, wht, total: Math.round((taxable + vat) * 100) / 100 };
}

// GET /api/v1/invoices
router.get('/', auth, async (req, res) => {
  const { type, status, tax_period, search, page = 1, per_page = 20 } = req.query;
  const companyId = req.companyId;
  const offset = (parseInt(page) - 1) * parseInt(per_page);

  let where = ['i.company_id = $1', 'i.deleted_at IS NULL'];
  const params = [companyId];
  let idx = 2;

  if (type)       { where.push(`i.type = $${idx++}`);        params.push(type); }
  if (status)     { where.push(`i.status = $${idx++}`);      params.push(status); }
  if (tax_period) { where.push(`i.tax_period = $${idx++}`);  params.push(tax_period); }
  if (search) {
    where.push(`(i.vendor_name ILIKE $${idx} OR i.invoice_number ILIKE $${idx} OR i.vendor_tin LIKE $${idx})`);
    params.push(`%${search}%`); idx++;
  }

  const whereStr = where.join(' AND ');

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM invoices i WHERE ${whereStr}`, params
  );
  const total = parseInt(countRes.rows[0].count);

  const dataRes = await pool.query(
    `SELECT i.*, u.name AS creator_name
     FROM invoices i LEFT JOIN users u ON u.id = i.created_by
     WHERE ${whereStr}
     ORDER BY i.invoice_date DESC, i.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, parseInt(per_page), offset]
  );

  const lastPage = Math.ceil(total / parseInt(per_page)) || 1;
  res.json({
    data: dataRes.rows,
    meta: { current_page: parseInt(page), last_page: lastPage, total, per_page: parseInt(per_page) },
  });
});

// POST /api/v1/invoices
router.post('/', auth, async (req, res) => {
  const { vendor_name, vendor_tin, invoice_date, taxable_amount, type, status = 'pending',
          source = 'manual', receipt_image_path, ocr_raw_data,
          mrc, fs_number, vat_reg_no } = req.body;

  if (!vendor_name || !vendor_tin || !invoice_date || !taxable_amount || !type) {
    return res.status(422).json({ message: 'Missing required fields.' });
  }

  const taxable = parseFloat(taxable_amount);
  const { vat, wht, total } = calcTax(taxable, type);
  const period = invoice_date.slice(0, 7);
  const invNum = 'INV-' + uuidv4().slice(0, 8).toUpperCase();

  const { rows } = await pool.query(`
    INSERT INTO invoices
      (company_id, created_by, invoice_number, vendor_name, vendor_tin,
       invoice_date, type, taxable_amount, vat_amount, withholding_amount,
       total_amount, status, source, receipt_image_path, ocr_raw_data,
       tax_period, mrc, fs_number, vat_reg_no)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    RETURNING *`,
    [req.companyId, req.user.id, invNum, vendor_name, vendor_tin,
     invoice_date, type, taxable, vat, wht, total,
     status, source, receipt_image_path || null,
     ocr_raw_data ? JSON.stringify(ocr_raw_data) : null, period,
     mrc || null, fs_number || null, vat_reg_no || null]
  );

  res.status(201).json(rows[0]);
});

// PATCH /api/v1/invoices/:id/status
router.patch('/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'verified', 'rejected'].includes(status)) {
    return res.status(422).json({ message: 'Invalid status.' });
  }

  const { rows } = await pool.query(
    `UPDATE invoices SET status=$1, updated_at=NOW()
     WHERE id=$2 AND company_id=$3 AND deleted_at IS NULL RETURNING *`,
    [status, req.params.id, req.companyId]
  );

  if (!rows.length) return res.status(404).json({ message: 'Invoice not found.' });
  res.json(rows[0]);
});

// DELETE /api/v1/invoices/:id
router.delete('/:id', auth, async (req, res) => {
  await pool.query(
    `UPDATE invoices SET deleted_at=NOW() WHERE id=$1 AND company_id=$2`,
    [req.params.id, req.companyId]
  );
  res.json({ message: 'Invoice deleted.' });
});

// Internal OCR submit (called by node-ocr service)
router.post('/ocr-submit', async (req, res) => {
  const token = req.headers['x-ocr-token'];
  if (token !== (process.env.OCR_INTERNAL_TOKEN || 'ocr-internal-secret-token')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { vendor_name, vendor_tin, invoice_date, taxable_amount, type,
          company_id, ocr_raw_data, receipt_image_path,
          mrc, fs_number, vat_reg_no } = req.body;

  const taxable = parseFloat(taxable_amount) || 0;
  const { vat, wht, total } = calcTax(taxable, type || 'Purchase');
  const period = (invoice_date || new Date().toISOString()).slice(0, 7);
  const invNum = 'INV-' + uuidv4().slice(0, 8).toUpperCase();

  const userRes = await pool.query(
    `SELECT id FROM users WHERE company_id=$1 LIMIT 1`, [company_id]
  );
  const userId = userRes.rows[0]?.id;

  const { rows } = await pool.query(`
    INSERT INTO invoices
      (company_id, created_by, invoice_number, vendor_name, vendor_tin,
       invoice_date, type, taxable_amount, vat_amount, withholding_amount,
       total_amount, status, source, receipt_image_path, ocr_raw_data,
       tax_period, mrc, fs_number, vat_reg_no)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending','ocr',$12,$13,$14,$15,$16,$17)
    RETURNING *`,
    [company_id, userId, invNum, vendor_name || 'Unknown', vendor_tin || '0000000000',
     invoice_date || new Date().toISOString().slice(0, 10),
     type || 'Purchase', taxable, vat, wht, total,
     receipt_image_path || null,
     ocr_raw_data ? JSON.stringify(ocr_raw_data) : null, period,
     mrc || null, fs_number || null, vat_reg_no || null]
  );

  res.status(201).json(rows[0]);
});

module.exports = router;
