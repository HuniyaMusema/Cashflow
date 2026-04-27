const Tesseract = require('tesseract.js');

/**
 * Run Tesseract OCR on a receipt image and extract invoice fields.
 * Supports bilingual Ethiopian receipts (English + Amharic).
 * Extracts: vendorName, tin, date, total, vat, mrc, fsNumber, vatRegNo
 */
async function extractInvoiceData(imagePath) {
  let text = await runOCR(imagePath, 'eng');
  let extracted = parseFields(text);

  // Retry with Amharic if critical fields missing
  if (!extracted.tin || !extracted.total) {
    console.log('Retrying OCR with eng+amh...');
    try {
      const text2 = await runOCR(imagePath, 'eng+amh');
      const retry  = parseFields(text2);
      extracted = {
        vendorName: extracted.vendorName || retry.vendorName,
        tin:        extracted.tin        || retry.tin,
        date:       extracted.date       || retry.date,
        total:      extracted.total      || retry.total,
        vat:        extracted.vat        || retry.vat,
        mrc:        extracted.mrc        || retry.mrc,
        fsNumber:   extracted.fsNumber   || retry.fsNumber,
        vatRegNo:   extracted.vatRegNo   || retry.vatRegNo,
        rawText:    text2,
      };
      text = text2;
    } catch {
      // amh lang pack not installed — use English result
    }
  }

  extracted.rawText = text;
  // Print full raw text for debugging
  console.log('=== RAW OCR TEXT ===');
  console.log(text);
  console.log('===================');
  console.log('Extracted fields:', {
    vendorName: extracted.vendorName,
    tin:        extracted.tin,
    date:       extracted.date,
    total:      extracted.total,
    vat:        extracted.vat,
    mrc:        extracted.mrc,
    fsNumber:   extracted.fsNumber,
    vatRegNo:   extracted.vatRegNo,
  });
  return extracted;
}

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

// ─── Field Extractors ────────────────────────────────────────────────────────

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

/**
 * MRC (Machine Readable Code) — ERA fiscal device identifier.
 * Handles OCR noise: O/0 confusion, l/1 confusion, spaces inserted by OCR
 * Formats: BEB0037731, BED0014703, BIA015612, ET BEB0037731
 */
function extractMRC(text) {
  // Normalize common OCR errors before matching
  const normalized = text
    .replace(/[oO]/g, '0')   // O → 0 in numeric parts (handled per-match below)
    .replace(/[lI]/g, '1');  // l/I → 1 in numeric parts

  const patterns = [
    // "ET BEB0037731" — Ethio Telecom fiscal device
    /\bET\s+([A-Z]{2,4}[\dOolI]{5,10})\b/i,
    // "MRC: BIA015612"
    /MRC[:\s#.]*([A-Z]{2,4}[\dOolI]{5,10})/i,
    // "ITEM# BEB0037731"
    /ITEM#?\s*([A-Z]{2,4}[\dOolI]{5,10})/i,
    // Standalone on own line
    /^([A-Z]{2,4}[\dOolI]{5,10})$/m,
    // Near fiscal keywords
    /(?:fiscal|receipt|MRC)[^\n]{0,40}([A-Z]{2,4}[\dOolI]{5,10})/i,
  ];

  for (const re of patterns) {
    // Try on both original and normalized text
    for (const t of [text, normalized]) {
      const m = t.match(re);
      if (m) {
        // Clean up: replace O→0, l/I→1 in the digit portion
        const raw = m[1].toUpperCase();
        const letters = raw.match(/^[A-Z]+/)?.[0] ?? '';
        const digits  = raw.slice(letters.length).replace(/O/g, '0').replace(/[lI]/g, '1');
        return letters + digits;
      }
    }
  }

  // Last resort: scan every line for anything that looks like a fiscal code
  for (const line of text.split('\n')) {
    const clean = line.trim().replace(/\s+/g, '');
    const m = clean.match(/^(?:ET)?([A-Z]{2,4}[\dOolI]{5,10})$/i);
    if (m) {
      const raw = m[1].toUpperCase();
      const letters = raw.match(/^[A-Z]+/)?.[0] ?? '';
      const digits  = raw.slice(letters.length).replace(/O/g, '0').replace(/[lI]/g, '1');
      return letters + digits;
    }
  }

  return null;
}

/**
 * FS Number (Fiscal Receipt Number) — e.g. FS00027761, FS No.00000738
 */
function extractFSNumber(text) {
  const patterns = [
    // "FS No.00000738" or "FS No. 00000738"
    /FS\s*No\.?\s*(\d{5,10})/i,
    // "Vat receipt number FS00027761"
    /(?:Vat\s*receipt\s*(?:number)?|Receipt\s*No\.?)[:\s#.]*([A-Z]{0,3}\d{5,10})/i,
    // Standalone FS number "FS00000731"
    /\b(FS\d{5,10})\b/i,
    // "No. 0337" style
    /N[oO°]\.?\s*(\d{4,8})\b/,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1].toUpperCase().trim();
  }
  return null;
}

/**
 * VAT Registration Number — e.g. "VAT Reg. No. 26383"
 */
function extractVATRegNo(text) {
  const m = text.match(/VAT\s*Reg(?:istration)?\s*(?:No\.?|Number)[:\s]*(\d{4,10})/i);
  if (m) return m[1].trim();
  return null;
}

/**
 * TIN: 10-digit number near "TIN", "T.I.N", "Buyer's TIN"
 * Also handles "TIN: 0039858666" format at top of receipt
 */
function extractTIN(text) {
  const patterns = [
    // "TIN: 0039858666" — most common on thermal receipts
    /TIN[:\s#.]+(\d{10})/i,
    // "Supplier's TIN No. 0001163960" or "Buyer's TIN: 0078119995"
    /(?:Supplier|Buyer|Customer|Seller)[''s]*\s*TIN[:\s#.]*(\d[\d\s]{8,11}\d)/i,
    // "TIN No. 0001 163 960" with spaces
    /(?:TIN|T\.I\.N)[^0-9]{0,10}(\d{4}[\s-]?\d{3}[\s-]?\d{3})/i,
    // Standalone 10-digit number
    /\b(\d{10})\b/,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const digits = m[1].replace(/\D/g, '');
      if (digits.length >= 9) return digits.slice(0, 10).padEnd(10, '0');
    }
  }
  return null;
}

/**
 * Date: handles DD/MM/YY, DD/MM/YYYY, YYYY-MM-DD, Ethiopian short dates
 */
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

/**
 * Total amount — handles Ethiopian dot-separated format: 388.238.39
 * Priority: TOTAL > Total Incl VAT > Total Price > largest amount
 */
function extractTotal(text) {
  const clean = text.replace(/ATTACHMENT|COPY|DUPLICATE/gi, '');

  const labeled = [
    // "TOTAL: *388.238.39" — thermal receipt format with asterisk
    /TOTAL\s*[:\*]+\s*\*?([\d.,]+)/i,
    /Total\s*\(?Incl\.?\s*VAT\)?\s*[:\-]?\s*([\d.,]+)/i,
    /Total\s*Price\s*[:\-]?\s*([\d.,]+)/i,
    /\bTotal\b[^0-9\n]{0,15}([\d.,]+)/i,
    /Grand\s*Total[^0-9]{0,10}([\d.,]+)/i,
  ];

  for (const re of labeled) {
    const m = clean.match(re);
    if (m) {
      // Handle Ethiopian dot-separated: 388.238.39 → 388238.39
      const raw = m[1].replace(/\*/g, '');
      const val = parseEthiopianNumber(raw);
      if (!isNaN(val) && val > 0) return val;
    }
  }

  // Fallback: largest amount — but exclude phone numbers (10 digits starting with 09)
  const amounts = [...clean.matchAll(/([\d.,]+)/g)]
    .map(m => ({ raw: m[1], val: parseEthiopianNumber(m[1]) }))
    .filter(({ raw, val }) => {
      if (isNaN(val) || val <= 100) return false;
      // Exclude phone numbers: 10 digits starting with 09 or 07
      const digits = raw.replace(/[.,]/g, '');
      if (/^0[79]\d{8}$/.test(digits)) return false;
      return true;
    })
    .map(({ val }) => val);
  return amounts.length ? Math.max(...amounts) : null;
}

/**
 * Parse Ethiopian number format:
 * "388.238.39" → 388238.39 (dots as thousands separators)
 * "337,598.60" → 337598.60 (comma as thousands separator)
 * "67,200"     → 67200
 */
function parseEthiopianNumber(str) {
  const s = str.replace(/\*/g, '').trim();
  // Count dots — if more than one dot, they're thousands separators
  const dots = (s.match(/\./g) || []).length;
  if (dots > 1) {
    // e.g. "388.238.39" — last segment is decimals
    const parts = s.split('.');
    const decimals = parts.pop();
    const integer = parts.join('');
    return parseFloat(`${integer}.${decimals}`);
  }
  // Standard: remove commas
  return parseFloat(s.replace(/,/g, ''));
}

/**
 * VAT amount — handles "VAT (15%)", "TAX1 15%", "TAX 15%"
 */
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

/**
 * Vendor name — prefer lines with business keywords
 */
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
