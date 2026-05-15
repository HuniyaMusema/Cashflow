'use strict';

const Tesseract = require('tesseract.js');
const sharp     = require('sharp');
const path      = require('path');
const fs        = require('fs');

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Ethiopian TIN: exactly 10 digits, no letters.
 * Validated strictly — never padded or guessed.
 */
const ETHIOPIAN_TIN_RE = /^\d{10}$/;

/**
 * Ethiopian MRC patterns from known fiscal cash register manufacturers:
 *   Daisy FX series:  BEB0037731, BED0014703, BIA015612
 *   Ethio Telecom ET: ET BEB0037731
 *   Generic:          CLC0002221, FP1234567, MERC1234567
 * Pattern: 2–4 uppercase letters + 5–10 digits
 */
const MRC_BODY_RE = /^[A-Z]{2,4}\d{5,10}$/;

// ─── 1. Image Pre-processing ──────────────────────────────────────────────────

/**
 * Enhance receipt image before OCR:
 *   - Convert to greyscale
 *   - Boost contrast (normalise)
 *   - Sharpen edges
 *   - Binarise (threshold) to make faint text crisp
 * Returns path to the processed temp file.
 */
async function preprocessImage(imagePath) {
  const ext      = path.extname(imagePath);
  const outPath  = imagePath.replace(ext, `_processed${ext}`);

  try {
    await sharp(imagePath)
      .greyscale()
      .normalise()                        // auto contrast stretch
      .sharpen({ sigma: 1.5 })           // edge sharpening
      .threshold(128)                    // binarise — black/white only
      .toFile(outPath);

    console.log('[OCR] Image preprocessed →', outPath);
    return outPath;
  } catch (err) {
    console.warn('[OCR] Preprocessing failed, using original:', err.message);
    return imagePath;                    // fall back to original
  }
}

// ─── 2. OCR Runner ────────────────────────────────────────────────────────────

async function runOCR(imagePath, lang) {
  const { data: { text } } = await Tesseract.recognize(imagePath, lang, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        process.stdout.write(`\rOCR [${lang}] ${Math.round(m.progress * 100)}%`);
      }
    },
  });
  console.log(`\nOCR [${lang}] complete.`);
  return text;
}

// ─── 3. Main Entry Point ──────────────────────────────────────────────────────

async function extractInvoiceData(imagePath) {
  // Step 1: preprocess image
  const processedPath = await preprocessImage(imagePath);

  // Step 2: run OCR (English first — faster)
  let text = await runOCR(processedPath, 'eng');
  let extracted = parseFields(text);

  // Step 3: retry with Amharic if critical fields still missing
  if (!extracted.tin || !extracted.total || !extracted.mrc) {
    console.log('[OCR] Retrying with eng+amh for missing fields...');
    try {
      const text2  = await runOCR(processedPath, 'eng+amh');
      const retry  = parseFields(text2);
      // Merge — prefer non-null values from either pass
      extracted = mergeExtracted(extracted, retry, text2);
      text = text2;
    } catch {
      console.warn('[OCR] Amharic lang pack not available — using English result');
    }
  }

  // Step 4: clean up temp file
  if (processedPath !== imagePath) {
    fs.unlink(processedPath, () => {});
  }

  extracted.rawText = text;

  // Step 5: validate and set confidence flags
  const validation = validateExtracted(extracted);
  extracted.needsReview  = validation.needsReview;
  extracted.reviewReason = validation.reasons;

  console.log('[OCR] Extracted:', {
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
  });

  return extracted;
}

function mergeExtracted(a, b, rawText) {
  return {
    vendorName: a.vendorName || b.vendorName,
    tin:        a.tin        || b.tin,
    date:       a.date       || b.date,
    total:      a.total      || b.total,
    vat:        a.vat        || b.vat,
    mrc:        a.mrc        || b.mrc,
    fsNumber:   a.fsNumber   || b.fsNumber,
    vatRegNo:   a.vatRegNo   || b.vatRegNo,
    rawText,
  };
}

// ─── 4. Validation ────────────────────────────────────────────────────────────

/**
 * Validate extracted fields.
 * If TIN is not exactly 10 digits, or MRC is missing → set needsReview = true.
 * Never crash — always return something the frontend can work with.
 */
function validateExtracted(extracted) {
  const reasons = [];

  const tinValid = extracted.tin && ETHIOPIAN_TIN_RE.test(extracted.tin);
  if (!tinValid) {
    reasons.push(extracted.tin
      ? `TIN "${extracted.tin}" is not exactly 10 digits`
      : 'TIN not found on receipt');
  }
  extracted.tinValid = !!tinValid;

  if (!extracted.mrc) {
    reasons.push('MRC (Machine Registration Code) not found');
  }

  if (!extracted.total) {
    reasons.push('Total amount not found');
  }

  return {
    needsReview: reasons.length > 0,
    reasons,
  };
}

// ─── 5. Field Parsers ─────────────────────────────────────────────────────────

function parseFields(text) {
  return {
    vendorName: extractVendorName(text),
    tin:        extractTIN(text),
    date:       extractDate(text),
    total:      extractTotal(text),
    vat:        extractVAT(text),
    mrc:        extractMRC(text),
    fsNumber:   extractFSNumber(text),
    vatRegNo:   extractVATRegNo(text),
    rawText:    text,
  };
}

// ─── TIN Extraction ───────────────────────────────────────────────────────────

/**
 * Strict Ethiopian TIN extraction.
 *
 * Priority order (highest confidence first):
 *   1. Amharic anchor: "የሻጭ ቲን" (Seller TIN) — most reliable
 *   2. English Supplier/Seller/Vendor anchor
 *   3. Generic "TIN:" label
 *   4. Reject Buyer TIN — do NOT return buyer's TIN as vendor TIN
 *
 * Final validation: must be exactly 10 digits (ETHIOPIAN_TIN_RE).
 */
function extractTIN(text) {
  // Normalise OCR noise: remove spaces inside digit sequences
  const clean = text.replace(/(\d)\s+(\d)/g, '$1$2');

  const vendorPatterns = [
    // Amharic: "የሻጭ ቲን" or "የሻጭ ታክስ" followed by 10 digits
    /(?:የሻጭ\s*(?:ቲን|ታክስ|TIN))[^\d]*(\d{10})/i,
    // English supplier anchors
    /(?:Supplier|Seller|Vendor)[''s]*\s*TIN\s*(?:No\.?)?[:\s#.]*(\d{10})/i,
    /(?:Supplier|Seller|Vendor)[''s]*\s*TIN[^\d]{0,15}(\d{10})/i,
    // "TIN: 0039858666" — label directly before number
    /\bTIN\s*[:\s#.]+(\d{10})\b/i,
    // "TIN No. 0001163960"
    /TIN\s*No\.?\s*[:\s]*(\d{10})/i,
  ];

  // Buyer TIN patterns — extract so we can EXCLUDE them
  const buyerPatterns = [
    /(?:Buyer|Customer|Purchaser)[''s]*\s*TIN[^\d]{0,15}(\d{10})/i,
    /(?:የገዢ|ገዢ)\s*(?:ቲን|TIN)[^\d]{0,15}(\d{10})/i,
  ];

  // Collect buyer TINs to exclude
  const buyerTINs = new Set();
  for (const re of buyerPatterns) {
    const m = clean.match(re);
    if (m) buyerTINs.add(m[1]);
  }

  // Try vendor patterns in priority order
  for (const re of vendorPatterns) {
    const m = clean.match(re);
    if (m) {
      const digits = m[1].replace(/\D/g, '');
      if (ETHIOPIAN_TIN_RE.test(digits) && !buyerTINs.has(digits)) {
        return digits;
      }
    }
  }

  // Last resort: first 10-digit number that is NOT a buyer TIN and NOT a phone number
  const allTens = [...clean.matchAll(/\b(\d{10})\b/g)].map(m => m[1]);
  for (const candidate of allTens) {
    if (buyerTINs.has(candidate)) continue;
    if (/^0[79]/.test(candidate)) continue;  // phone number
    if (ETHIOPIAN_TIN_RE.test(candidate)) return candidate;
  }

  return null;
}

// ─── MRC Extraction ───────────────────────────────────────────────────────────

/**
 * Strict MRC extraction for Ethiopian fiscal cash registers.
 *
 * Known formats:
 *   BEB0037731  (Daisy FX 1200 — Ethio Telecom)
 *   BED0014703  (Daisy FX series)
 *   BIA015612   (Daisy FX series)
 *   CLC0002221  (other brand)
 *   ET BEB0037731 (with ET prefix on receipt)
 *   FP1234567   (Fiscal Printer series)
 *   MERC1234567 (MERC series)
 *
 * Anchor keywords (EN + AM):
 *   MRC, M.R.C, Mach. No, Fiscal Printer, Machine No,
 *   የመሣሪያው መለያ ቁጥር, ITEM#, ET (Ethio Telecom prefix)
 */
function extractMRC(text) {
  // Normalise OCR noise: O→0, l/I→1 in digit positions
  const normalise = (s) => {
    const letters = s.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? '';
    const rest    = s.slice(letters.length)
      .replace(/O/g, '0')
      .replace(/[lI]/g, '1');
    return letters + rest;
  };

  const isValidMRC = (s) => MRC_BODY_RE.test(s);

  // Patterns with anchor keywords (highest confidence)
  const anchoredPatterns = [
    // Amharic: "የመሣሪያው መለያ ቁጥር" (Machine Registration Number)
    /(?:የመሣሪያው\s*መለያ\s*ቁጥር)[^\w]*([A-Z]{2,4}[\dOolI]{5,10})/i,
    // "MRC:" or "M.R.C:"
    /M\.?R\.?C\.?\s*[:\s#]*([A-Z]{2,4}[\dOolI]{5,10})/i,
    // "Mach. No" or "Machine No"
    /Mach(?:ine)?\s*\.?\s*No\.?\s*[:\s]*([A-Z]{2,4}[\dOolI]{5,10})/i,
    // "Fiscal Printer" followed by code
    /Fiscal\s*Printer\s*[:\s]*([A-Z]{2,4}[\dOolI]{5,10})/i,
    // "ET BEB0037731" — Ethio Telecom fiscal device prefix
    /\bET\s+([A-Z]{2,4}[\dOolI]{5,10})\b/i,
    // "ITEM#" line (common on Daisy FX receipts)
    /ITEM#?\s*([A-Z]{2,4}[\dOolI]{5,10})/i,
    // Daisy FX brand line
    /DAISY\s*FX[^\n]*\n[^\n]*?([A-Z]{2,4}[\dOolI]{5,10})/i,
  ];

  for (const re of anchoredPatterns) {
    const m = text.match(re);
    if (m) {
      const candidate = normalise(m[1].toUpperCase());
      if (isValidMRC(candidate)) return candidate;
    }
  }

  // Line-by-line scan: look for standalone MRC-like codes
  for (const line of text.split('\n')) {
    const trimmed = line.trim().replace(/\s+/g, '');
    // Strip "ET" prefix if present
    const stripped = trimmed.replace(/^ET/i, '');
    const candidate = normalise(stripped.toUpperCase());
    if (isValidMRC(candidate)) return candidate;
  }

  return null;
}

// ─── Other Field Extractors ───────────────────────────────────────────────────

function extractFSNumber(text) {
  const patterns = [
    /FS\s*No\.?\s*(\d{5,10})/i,
    /(?:Vat\s*receipt\s*(?:number)?|Receipt\s*No\.?)[:\s#.]*([A-Z]{0,3}\d{5,10})/i,
    /\b(FS\d{5,10})\b/i,
    /N[oO°]\.?\s*(\d{4,8})\b/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1].toUpperCase().trim();
  }
  return null;
}

function extractVATRegNo(text) {
  const m = text.match(/VAT\s*Reg(?:istration)?\s*(?:No\.?|Number)[:\s]*(\d{4,10})/i);
  return m ? m[1].trim() : null;
}

function extractDate(text) {
  const patterns = [
    /Date[:\s]*(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/i,
    /(\d{4}-\d{2}-\d{2})/,
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    try {
      if (m.length === 4 && re.source.startsWith('Date')) {
        let [, d, mo, y] = m;
        if (y.length === 2) y = parseInt(y) > 50 ? `19${y}` : `20${y}`;
        const date = new Date(`${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`);
        if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
      }
      if (m.length === 4) {
        const [, d, mo, y] = m;
        const date = new Date(`${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`);
        if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
      }
      const date = new Date(m[1]);
      if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
    } catch { continue; }
  }
  return null;
}

function extractTotal(text) {
  const clean = text.replace(/ATTACHMENT|COPY|DUPLICATE/gi, '');
  const labeled = [
    /TOTAL\s*[:\*]+\s*\*?([\d.,]+)/i,
    /Total\s*\(?Incl\.?\s*VAT\)?\s*[:\-]?\s*([\d.,]+)/i,
    /Total\s*Price\s*[:\-]?\s*([\d.,]+)/i,
    /\bTotal\b[^0-9\n]{0,15}([\d.,]+)/i,
    /Grand\s*Total[^0-9]{0,10}([\d.,]+)/i,
  ];
  for (const re of labeled) {
    const m = clean.match(re);
    if (m) {
      const val = parseEthiopianNumber(m[1].replace(/\*/g, ''));
      if (!isNaN(val) && val > 0) return val;
    }
  }
  // Fallback: largest amount, excluding phone numbers
  const amounts = [...clean.matchAll(/([\d.,]+)/g)]
    .map(m => ({ raw: m[1], val: parseEthiopianNumber(m[1]) }))
    .filter(({ raw, val }) => {
      if (isNaN(val) || val <= 100) return false;
      const digits = raw.replace(/[.,]/g, '');
      if (/^0[79]\d{8}$/.test(digits)) return false; // phone number
      if (/^\d{10}$/.test(digits)) return false;      // TIN-like number
      return true;
    })
    .map(({ val }) => val);
  return amounts.length ? Math.max(...amounts) : null;
}

function parseEthiopianNumber(str) {
  const s = str.replace(/\*/g, '').trim();
  const dots = (s.match(/\./g) || []).length;
  if (dots > 1) {
    const parts    = s.split('.');
    const decimals = parts.pop();
    return parseFloat(`${parts.join('')}.${decimals}`);
  }
  return parseFloat(s.replace(/,/g, ''));
}

function extractVAT(text) {
  const patterns = [
    /VAT\s*\(?15%?\)?\s*[:\-]?\s*\*?([\d.,]+)/i,
    /TAX1?\s*15%?\s*[:\-]?\s*\*?([\d.,]+)/i,
    /TAX\s*\(?15%?\)?\s*[:\-]?\s*\*?([\d.,]+)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return parseEthiopianNumber(m[1].replace(/\*/g, ''));
  }
  return null;
}

function extractVendorName(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 10)) {
    if (line.length < 5) continue;
    if (/^[\d\s\W]+$/.test(line)) continue;
    if (/receipt|invoice|attachment|copy|fiscal|invalid/i.test(line)) continue;
    if (/trade|plc|ltd|co\.|retail|store|shop|enterprise|business|service/i.test(line)) {
      return line.replace(/[^\w\s&.,'-]/g, '').trim().slice(0, 100);
    }
  }
  for (const line of lines.slice(0, 8)) {
    if (line.length >= 5 && !/^[\d\W]+$/.test(line)) {
      return line.replace(/[^\w\s&.,'-]/g, '').trim().slice(0, 100);
    }
  }
  return null;
}

module.exports = { extractInvoiceData };
