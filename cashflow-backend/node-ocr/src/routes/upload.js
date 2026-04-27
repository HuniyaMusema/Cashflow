const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const { extractInvoiceData } = require('../services/ocr');
const { submitToLaravel }    = require('../services/laravelClient');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '../../uploads');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/jpg'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are accepted (jpeg, png, webp, tiff)'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 15 * 1024 * 1024 } });

/** Compute taxable amount from total (strip VAT if present) */
function computeTaxable(total, vat) {
  if (vat && vat > 0) return parseFloat((total - vat).toFixed(2));
  return parseFloat((total / 1.15).toFixed(2));
}

/**
 * POST /api/ocr/upload — extract + submit to Laravel
 */
router.post('/upload', upload.single('receipt'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { company_id, invoice_type = 'Purchase' } = req.body;
  if (!company_id) return res.status(400).json({ error: 'company_id is required' });

  try {
    const extracted = await extractInvoiceData(req.file.path);
    console.log('Extracted:', JSON.stringify({ ...extracted, rawText: '...' }, null, 2));

    const taxable = extracted.total
      ? computeTaxable(extracted.total, extracted.vat)
      : 0;

    const invoice = await submitToLaravel({
      vendor_name:        extracted.vendorName  || 'Unknown Vendor',
      vendor_tin:         (extracted.tin || '0000000000').replace(/\D/g,'').padEnd(10,'0').slice(0,10),
      invoice_date:       extracted.date        || new Date().toISOString().slice(0, 10),
      taxable_amount:     taxable,
      type:               invoice_type,
      company_id:         parseInt(company_id),
      mrc:                extracted.mrc       || null,
      fs_number:          extracted.fsNumber  || null,
      vat_reg_no:         extracted.vatRegNo  || null,
      ocr_raw_data:       { ...extracted, rawText: extracted.rawText?.slice(0, 500) },
      receipt_image_path: req.file.filename,
    });

    return res.json({ success: true, extracted, invoice });
  } catch (err) {
    console.error('OCR pipeline error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ocr/extract-only — extract only, no Laravel submit
 */
router.post('/extract-only', upload.single('receipt'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const extracted = await extractInvoiceData(req.file.path);
    console.log('Extracted:', JSON.stringify({ ...extracted, rawText: '...' }, null, 2));
    return res.json({
      success: true,
      extracted: {
        vendorName: extracted.vendorName,
        tin:        extracted.tin,
        date:       extracted.date,
        total:      extracted.total,
        vat:        extracted.vat,
        mrc:        extracted.mrc,
        fsNumber:   extracted.fsNumber,
        vatRegNo:   extracted.vatRegNo,
      },
      filename: req.file.filename,
    });
  } catch (err) {
    console.error('OCR extract error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
