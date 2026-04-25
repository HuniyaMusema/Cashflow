const router   = require('express').Router();
const pool     = require('../db/pool');
const { auth } = require('../middleware/auth');
const ExcelJS  = require('exceljs');

// GET /api/v1/reports/csv?tax_period=YYYY-MM
router.get('/csv', auth, async (req, res) => {
  const { tax_period } = req.query;
  if (!tax_period) return res.status(422).json({ message: 'tax_period required.' });

  const companyRes = await pool.query(`SELECT * FROM companies WHERE id=$1`, [req.companyId]);
  const company    = companyRes.rows[0];

  const { rows } = await pool.query(`
    SELECT * FROM invoices
    WHERE company_id=$1 AND tax_period=$2 AND status='verified' AND deleted_at IS NULL
    ORDER BY invoice_date ASC
  `, [req.companyId, tax_period]);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`e-Tax ${tax_period}`);

  // Header info
  ws.addRow(['ABZ Tax Platform — ERA e-Tax Export']);
  ws.addRow([`Company: ${company.name}`, `TIN: ${company.tin}`, `Period: ${tax_period}`]);
  ws.addRow([]);

  // Column headers
  ws.addRow([
    'Invoice Number', 'Vendor Name', 'Vendor TIN', 'Invoice Date',
    'Type', 'Taxable Amount (ETB)', 'VAT Amount (ETB)',
    'Withholding (ETB)', 'Total Amount (ETB)', 'Status',
  ]);

  // Style header row
  ws.getRow(4).font = { bold: true };
  ws.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
  ws.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Data rows
  let outputVat = 0, inputVat = 0, withholding = 0;
  for (const inv of rows) {
    ws.addRow([
      inv.invoice_number, inv.vendor_name, inv.vendor_tin,
      inv.invoice_date?.toISOString?.()?.slice(0, 10) || inv.invoice_date,
      inv.type,
      parseFloat(inv.taxable_amount),
      parseFloat(inv.vat_amount),
      parseFloat(inv.withholding_amount),
      parseFloat(inv.total_amount),
      inv.status,
    ]);
    if (inv.type === 'Sales')    outputVat   += parseFloat(inv.vat_amount);
    if (inv.type === 'Purchase') inputVat    += parseFloat(inv.vat_amount);
    withholding += parseFloat(inv.withholding_amount);
  }

  // Summary
  ws.addRow([]);
  ws.addRow(['SUMMARY']);
  ws.addRow(['Output VAT (Sales)',    '', '', '', '', '', outputVat]);
  ws.addRow(['Input VAT (Purchases)', '', '', '', '', '', inputVat]);
  ws.addRow(['Net VAT Payable',       '', '', '', '', '', outputVat - inputVat]);
  ws.addRow(['Total Withholding',     '', '', '', '', '', withholding]);

  // Column widths
  ws.columns = [
    { width: 18 }, { width: 35 }, { width: 14 }, { width: 14 },
    { width: 10 }, { width: 22 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 12 },
  ];

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="etax-${tax_period}.csv"`);

  await wb.csv.write(res);
});

module.exports = router;
