const router   = require('express').Router();
const pool     = require('../db/pool');
const jwt      = require('jsonwebtoken');

// Allow token via query param for direct browser downloads
async function authDownload(req, res, next) {
  const token = req.headers.authorization?.slice(7) || req.query.token;
  if (!token) return res.status(401).json({ message: 'Unauthenticated.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'abz-tax-secret');
    const { rows } = await pool.query(
      `SELECT u.*, c.id AS cid FROM users u JOIN companies c ON c.id = u.company_id WHERE u.id = $1`,
      [payload.userId]
    );
    if (!rows.length) return res.status(401).json({ message: 'Unauthenticated.' });
    req.user      = rows[0];
    req.companyId = rows[0].cid;
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthenticated.' });
  }
}

// Format date as dd/mm/yyyy for ERA
function toERADate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// ERA Sales CSV headers (exact match to official format)
const SALES_HEADERS = [
  'VAT CATEGORY\n (G=GOODS;S=SERVICES)',
  'CALENDAR TYPE\n(E=ETHIOPIAN;G=GREGORIAN)',
  'Types of Sale\n1=Taxable Sale(Line no.5)\n2=Zero Rated Sale(Line no.15)\n3=Tax Exempted Sale(Line no.20)\n\n (Please type 1 or 2 or 3 ).This field is mandatory.',
  'Buyer TIN..This field\n is not mandatory.',
  'Buyer name (if buyer has no TIN or item is  sold out of Ethiopia)\nThis field is not mandatory.',
  'Date of Sale.(Please use  dd/mm/yyyy date format). This field is mandatory.',
  'MRC Number.This field is not mandatory.',
  'Vat receipt number.This field is mandatory.',
  'Description.This field is mandatory.',
  'Unit of Measure (type ID 2-10).\n2 KG\n3 ML\n4 GM\n5 LIT\n6 MT\n7 PCS\n8 CT\n9 OTHER\n10 PC\nThis field is mandatory.',
  'Quantity.\nEnter number.Don\'t use comma (,) or Quatation ("")\nThis field is  mandatory.',
  'Unit Price.\nEnter number only .Don\'t use comma (,) or Quatation ("")\nThis field is  mandatory.',
  'Total value',
  'vat',
  'value after vat',
];

// ERA Purchase CSV headers (exact match to official format)
const PURCHASE_HEADERS = [
  'VAT CATEGORY\n (G=GOODS;S=SERVICES)',
  'CALENDAR TYPE\n(E=ETHIOPIAN;G=GREGORIAN)',
  'Types of purchase.\n1 = Taxable-local Purchase of Capital Assets (Line No. 65)\n2 = Taxable-imported Purchase of Capital Assets (Line No. 75)\n3 = Taxable-local Purchase of Inputs (Line No. 100)\n4 = Taxable-imported Purchase of Inputs (Line No. 110)\n5 = Taxable-general Expense Inputs Purchase (Line No. 120)\n6= Tax Exempted-purchase with no vat or uncollectible inputs (Line no. 85 or Line no. 130) \n\n (Please type 1 or 2 or 3 or 4 or 5 or 6).This field is mandatory.',
  'TIN..This field\n is not mandatory.',
  'Seller name (if Seller has no TIN or item is not locally purchased)\nThis field is not mandatory.',
  'Date of purchase/Customs Declaration No.\n Dispatched Date (Please use  dd/mm/yyyy date format). \nThis field is mandatory.',
  'MRC Number..This field is mandatory.',
  'Vat receipt number/ Customs Declaration Number.This field is mandatory.',
  'Description.This field is mandatory.',
  'Unit of Measure (type ID 2-10).\n2 KG\n3 ML\n4 GM\n5 LIT\n6 MT\n7 PCS\n8 CT\n9 OTHER\n10 PC\nThis field is mandatory.',
  'Quantity.\nEnter number.Don\'t use comma (,) or Quatation ("")\nThis field is  mandatory.',
  ' Unit Price.\nEnter number only .Don\'t use comma (,) or Quatation ("")\nThis field is  mandatory. ',
  '  Total value  ',
  '  vat  ',
  'value after vat',
];

function buildCSVRow(fields) {
  return fields.map(f => {
    const s = String(f ?? '');
    // Quote fields that contain commas, newlines or quotes
    if (s.includes(',') || s.includes('\n') || s.includes('"')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }).join(',');
}

function buildCSV(headers, rows, totals) {
  const lines = [];
  lines.push(buildCSVRow(headers));
  for (const row of rows) lines.push(buildCSVRow(row));
  if (totals) lines.push(buildCSVRow(totals));
  return lines.join('\r\n');
}

// GET /api/v1/reports/csv?tax_period=YYYY-MM&type=Sales|Purchase&token=JWT
router.get('/csv', authDownload, async (req, res) => {
  const { tax_period, type = 'Sales' } = req.query;
  if (!tax_period) return res.status(422).json({ message: 'tax_period required.' });

  const { rows } = await pool.query(`
    SELECT * FROM invoices
    WHERE company_id=$1 AND tax_period=$2 AND type=$3
      AND status='verified' AND deleted_at IS NULL
    ORDER BY invoice_date ASC
  `, [req.companyId, tax_period, type]);

  let totalValue = 0, totalVat = 0;
  const dataRows = rows.map(inv => {
    const taxable = parseFloat(inv.taxable_amount);
    const vat     = parseFloat(inv.vat_amount);
    const total   = parseFloat(inv.total_amount);
    totalValue += taxable;
    totalVat   += vat;

    if (type === 'Sales') {
      return [
        'G',                          // VAT Category (G=Goods)
        'G',                          // Calendar Type (G=Gregorian)
        '1',                          // Type of Sale: 1=Taxable
        inv.vendor_tin || '',         // Buyer TIN
        inv.vendor_name || '',        // Buyer Name
        toERADate(inv.invoice_date),  // Date dd/mm/yyyy
        '',                           // MRC Number
        inv.invoice_number || '',     // VAT Receipt Number
        'Sales',                      // Description
        '7',                          // Unit of Measure: 7=PCS
        '1',                          // Quantity
        taxable,                      // Unit Price
        taxable,                      // Total Value
        vat,                          // VAT
        total,                        // Value After VAT
      ];
    } else {
      return [
        'G',                          // VAT Category
        'G',                          // Calendar Type
        '5',                          // Type of Purchase: 5=General Expense
        inv.vendor_tin || '',         // Seller TIN
        inv.vendor_name || '',        // Seller Name
        toERADate(inv.invoice_date),  // Date dd/mm/yyyy
        '',                           // MRC Number
        inv.invoice_number || '',     // VAT Receipt / FS Number
        'Purchase',                   // Description
        '7',                          // Unit of Measure: 7=PCS
        '1',                          // Quantity
        taxable,                      // Unit Price
        taxable,                      // Total Value
        vat,                          // VAT
        total,                        // Value After VAT
      ];
    }
  });

  // Totals row (matches ERA format — empty leading cols, then totals)
  const totalsRow = type === 'Sales'
    ? ['G', '', '', '', '', '', '', '', '', '', '', '', totalValue.toFixed(2), totalVat.toFixed(2), '']
    : ['', '', '', '', '', '', '', '', '', '', '', '', totalValue.toFixed(2), totalVat.toFixed(2), ''];

  const headers = type === 'Sales' ? SALES_HEADERS : PURCHASE_HEADERS;
  const csv     = buildCSV(headers, dataRows, totalsRow);

  const filename = `etax-${type.toLowerCase()}-${tax_period}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  // BOM for Excel to correctly read UTF-8
  res.send('\uFEFF' + csv);
});

// GET /api/v1/reports/csv/sales   — shortcut
router.get('/csv/sales', authDownload, (req, res) => {
  req.query.type = 'Sales';
  res.redirect(307, `/api/v1/reports/csv?tax_period=${req.query.tax_period}&type=Sales&token=${req.query.token}`);
});

// GET /api/v1/reports/csv/purchases — shortcut
router.get('/csv/purchases', authDownload, (req, res) => {
  req.query.type = 'Purchase';
  res.redirect(307, `/api/v1/reports/csv?tax_period=${req.query.tax_period}&type=Purchase&token=${req.query.token}`);
});

module.exports = router;
