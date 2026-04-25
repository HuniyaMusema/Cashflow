/**
 * Ethiopian Calendar (Ge'ez / Ethiopic) converter.
 *
 * Algorithm: Gregorian → Julian Day Number → Ethiopian
 * The Ethiopian calendar has 13 months: 12 × 30 days + Pagumē (5 or 6 days).
 * Ethiopian New Year (Enkutatash) falls on 11 September (12 Sep in Gregorian leap year eve).
 *
 * Reference: Dershowitz & Reingold "Calendrical Calculations" + Ethiopian epoch JDN 1724221
 */

const ETHIOPIAN_EPOCH = 1723856; // Verified: Sep 11 2025 = Meskerem 1, 2018 EC

const MONTH_NAMES_EN = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas',
  'Tir',      'Yekatit', 'Megabit', 'Miyazya',
  'Ginbot',   'Sene',   'Hamle',  'Nehase', 'Pagume',
];

const MONTH_NAMES_AM = [
  'መስከረም', 'ጥቅምት', 'ህዳር',   'ታህሳስ',
  'ጥር',    'የካቲት', 'መጋቢት', 'ሚያዚያ',
  'ግንቦት',  'ሰኔ',   'ሐምሌ',  'ነሐሴ',  'ጳጉሜ',
];

/** Gregorian date → Julian Day Number */
function gregorianToJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/** Julian Day Number → Ethiopian date */
function jdnToEthiopian(jdn: number): { year: number; month: number; day: number } {
  const r = (jdn - ETHIOPIAN_EPOCH) % 1461;
  const n = r % 365 + 365 * Math.floor(r / 1460);
  const year = 4 * Math.floor((jdn - ETHIOPIAN_EPOCH) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  return { year, month, day };
}

export interface EthiopianDate {
  year:      number;
  month:     number;
  day:       number;
  monthNameEn: string;
  monthNameAm: string;
}

export function toEthiopian(date: Date): EthiopianDate {
  const jdn = gregorianToJDN(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const { year, month, day } = jdnToEthiopian(jdn);
  const idx = Math.min(month - 1, 12); // clamp to 0-12
  return {
    year,
    month,
    day,
    monthNameEn: MONTH_NAMES_EN[idx],
    monthNameAm: MONTH_NAMES_AM[idx],
  };
}

/**
 * Format an Ethiopian date string.
 * @param date  Gregorian Date object
 * @param lang  'en' | 'am'  — controls month name language
 */
export function formatEthiopian(date: Date, lang: 'en' | 'am' = 'en'): string {
  const eth = toEthiopian(date);
  const monthName = lang === 'am' ? eth.monthNameAm : eth.monthNameEn;
  return `${monthName} ${eth.day}, ${eth.year}`;
}

/**
 * Get current Ethiopian year
 */
export function getCurrentEthiopianYear(): number {
  return toEthiopian(new Date()).year;
}

/**
 * Format a tax period (YYYY-MM) in Ethiopian calendar
 */
export function formatEthiopianPeriod(gregorianPeriod: string, lang: 'en' | 'am' = 'en'): string {
  const [year, month] = gregorianPeriod.split('-').map(Number);
  // Use the 15th of the month as representative date
  const eth = toEthiopian(new Date(year, month - 1, 15));
  const monthName = lang === 'am' ? eth.monthNameAm : eth.monthNameEn;
  return `${monthName} ${eth.year}`;
}
