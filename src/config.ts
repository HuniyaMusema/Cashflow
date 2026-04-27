/**
 * ABZ Tax Platform — Central Configuration
 * Update BASE_URL to point to your Node.js backend.
 */

const BASE_URL  = import.meta.env.VITE_API_URL  || '/api/v1';
const OCR_URL   = import.meta.env.VITE_OCR_URL  || '/api/ocr';

export const config = {
  api: {
    baseUrl:  BASE_URL,
    ocrUrl:   OCR_URL,
    timeout:  30_000,
    ocrTimeout: 90_000,
  },
  tax: {
    vatRate:          0.15,   // 15%
    withholdingSales: 0.03,   // 3% on sales
    withholdingPurchase: 0.02, // 2% on purchases
    currency: 'ETB',
  },
  ethiopianMonths: [
    { value: '01', en: 'Meskerem', am: 'መስከረም' },
    { value: '02', en: 'Tikimt',   am: 'ጥቅምት'  },
    { value: '03', en: 'Hidar',    am: 'ህዳር'    },
    { value: '04', en: 'Tahsas',   am: 'ታህሳስ'  },
    { value: '05', en: 'Tir',      am: 'ጥር'     },
    { value: '06', en: 'Yekatit',  am: 'የካቲት'  },
    { value: '07', en: 'Megabit',  am: 'መጋቢት'  },
    { value: '08', en: 'Miyazya',  am: 'ሚያዚያ'  },
    { value: '09', en: 'Ginbot',   am: 'ግንቦት'  },
    { value: '10', en: 'Sene',     am: 'ሰኔ'     },
    { value: '11', en: 'Hamle',    am: 'ሐምሌ'   },
    { value: '12', en: 'Nehase',   am: 'ነሐሴ'   },
    { value: '13', en: 'Pagume',   am: 'ጳጉሜ'   },
  ],
} as const;

/** Format ETB currency */
export function formatETB(amount: number | string): string {
  return `ETB ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
