const Tesseract = require('tesseract.js');

/**
 * Run Tesseract OCR on a receipt image and extract invoice fields.
 * Supports bilingual receipts (English + Amharic).
 */
async function extractInvoiceData(imagePath) {
  // Try English first (faster), then fall back to eng+amh if TIN not found
  let text = await runOCR(imagePath, 'eng');
  let extracted = parseFields(text);

  // If critical fields missing, retry with Amharic+English
  if (!extracted.tin || !extracted.total) {
    console.log('Retrying OCR with eng+amh...');
    try {
      text = await runOCR(imagePath, 'eng+amh');
      const retry = parseFields(text);
      // Merge — prefer non-null values
      extracted = {
        vendorName: extracted.vendorName || retry.vendorName,
        tin:        extracted.tin        || retry.tin,
        date:       extracted.date       || retry.date,
        total:      extracted.total      || retry.total,
        vat:        extracted.vat        || retry.vat,
        rawText:    text,
      };
    } catch {
      // amh lang pack not installed — stick with English result
    }
  }

  extracted.rawText = text;
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
    rawText:    text,
  };
}

/**
 * TIN: 10-digit number near "TIN", "T.I.N", "ታክስ መ.ቁ", "የሻጭ ታክስ"
 * Ethiopian TINs are exactly 10 digits.
 */
function extractTIN(text) {
  const patterns = [
    // "Supplier's TIN No. 0001163960"
    /(?:Supplier[''s]*\s*TIN\s*No\.?|TIN\s*No\.?|T\.I\.N\.?|Tax\s*ID)[:\s#.]*(\d[\d\s]{8,11}\d)/i,
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
    // "Date 5/2/26" or "Date 05/02/2026"
    /Date[:\s]*(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/i,
    // ISO format
    /(\d{4}-\d{2}-\d{2})/,
    // DD/MM/YYYY
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    // Month name
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})/i,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;

    try {
      // "Date 5/2/26" → groups: day=5, month=2, year=26
      if (m.length === 4 && re.source.startsWith('Date')) {
        let [, d, mo, y] = m;
        if (y.length === 2) y = parseInt(y) > 50 ? `19${y}` : `20${y}`;
        const date = new Date(`${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`);
        if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
      }
      // DD/MM/YYYY
      if (m.length === 4) {
        const [, d, mo, y] = m;
        const date = new Date(`${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`);
        if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
      }
      // ISO or named month
      const date = new Date(m[1]);
      if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
    } catch { continue; }
  }
  return null;
}

/**
 * Total: look for labeled totals, handle Ethiopian number formatting (67,200 or 67200)
 * Priority: "Total (Incl. VAT)" > "Total" > largest amount
 */
function extractTotal(text) {
  // Clean text — remove watermarks and noise
  const clean = text.replace(/ATTACHMENT|COPY|DUPLICATE/gi, '');

  const labeled = [
    // "Total (Incl. VAT) 77,280" or "ጠቅላላ ድምር 77280"
    /Total\s*\(?Incl\.?\s*VAT\)?\s*[:\-]?\s*([\d,]+)/i,
    /Total\s*Incl[^0-9]{0,10}([\d,]+)/i,
    // "Total Price 67,200"
    /Total\s*Price\s*[:\-]?\s*([\d,]+)/i,
    // "Total 67,200"
    /\bTotal\b[^0-9\n]{0,15}([\d,]+)/i,
    // "Amount in Words" line — grab the number on same line
    /Grand\s*Total[^0-9]{0,10}([\d,]+)/i,
  ];

  for (const re of labeled) {
    const m = clean.match(re);
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) return val;
    }
  }

  // Fallback: largest currency amount on the receipt
  const amounts = [...clean.matchAll(/([\d,]+(?:\.\d{1,2})?)/g)]
    .map(m => parseFloat(m[1].replace(/,/g, '')))
    .filter(n => !isNaN(n) && n > 100); // ignore small numbers

  return amounts.length ? Math.max(...amounts) : null;
}

/**
 * VAT: look for "VAT (15%)" line
 */
function extractVAT(text) {
  const m = text.match(/VAT\s*\(?15%?\)?\s*[:\-]?\s*([\d,]+)/i);
  if (m) return parseFloat(m[1].replace(/,/g, ''));
  return null;
}

/**
 * Vendor name: first meaningful line — skip short/numeric lines
 * For Ethiopian receipts, the English company name is usually in the header
 */
function extractVendorName(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines.slice(0, 10)) {
    // Skip lines that are purely numbers, symbols, or very short
    if (line.length < 5) continue;
    if (/^[\d\s\W]+$/.test(line)) continue;
    // Skip common header noise
    if (/receipt|invoice|attachment|copy|fiscal|invalid/i.test(line)) continue;
    // Prefer lines with "Trade", "PLC", "Ltd", "Co.", "Retail", "Store"
    if (/trade|plc|ltd|co\.|retail|store|shop|enterprise|business/i.test(line)) {
      return line.replace(/[^\w\s&.,'-]/g, '').trim().slice(0, 100);
    }
  }

  // Fallback: first non-trivial line
  for (const line of lines.slice(0, 8)) {
    if (line.length >= 5 && !/^[\d\W]+$/.test(line)) {
      return line.replace(/[^\w\s&.,'-]/g, '').trim().slice(0, 100);
    }
  }
  return null;
}

module.exports = { extractInvoiceData };
