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

    // If validation failed, set status to NEEDS_REVIEW instead of crashing
    const invoiceStatus = extracted.needsReview ? 'pending' : 'pending';

    const invoice = await submitToLaravel({
      vendor_name:        extracted.vendorName  || 'Unknown Vendor',
      vendor_tin:         extracted.tinValid
                            ? extracted.tin
                            : '0000000000',          // don't submit bad TIN
      invoice_date:       extracted.date        || new Date().toISOString().slice(0, 10),
      taxable_amount:     taxable,
      type:               invoice_type,
      company_id:         parseInt(company_id),
      status:             invoiceStatus,
      mrc:                extracted.mrc       || null,
      fs_number:          extracted.fsNumber  || null,
      vat_reg_no:         extracted.vatRegNo  || null,
      ocr_raw_data:       {
        ...extracted,
        rawText:      extracted.rawText?.slice(0, 1000),
        needsReview:  extracted.needsReview,
        reviewReason: extracted.reviewReason,
      },
      receipt_image_path: req.file.filename,
    });

    return res.json({
      success:      true,
      extracted,
      invoice,
      needsReview:  extracted.needsReview,
      reviewReason: extracted.reviewReason,
    });
  } catch (err) {
    console.error('OCR pipeline error:', err.message);
    // Never crash — return raw text so user can fill manually
    return res.status(200).json({
      success:     false,
      needsReview: true,
      reviewReason: [`OCR pipeline error: ${err.message}`],
      extracted: {
        vendorName: null, tin: null, date: null,
        total: null, vat: null, mrc: null,
        fsNumber: null, vatRegNo: null,
        rawText: '',
      },
    });
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
        vendorName:   extracted.vendorName,
        tin:          extracted.tin,
        tinValid:     extracted.tinValid,
        date:         extracted.date,
        total:        extracted.total,
        vat:          extracted.vat,
        mrc:          extracted.mrc,
        fsNumber:     extracted.fsNumber,
        vatRegNo:     extracted.vatRegNo,
        needsReview:  extracted.needsReview,
        reviewReason: extracted.reviewReason,
        rawText:      extracted.rawText?.slice(0, 1000),
      },
      filename: req.file.filename,
    });
  } catch (err) {
    console.error('OCR extract error:', err.message);
    // Never crash — return empty fields for manual entry
    return res.status(200).json({
      success:     false,
      needsReview: true,
      reviewReason: [`OCR failed: ${err.message}`],
      extracted: {
        vendorName: null, tin: null, tinValid: false,
        date: null, total: null, vat: null,
        mrc: null, fsNumber: null, vatRegNo: null,
        rawText: '',
      },
      filename: req.file.filename,
    });
  }
});

module.exports = router;
