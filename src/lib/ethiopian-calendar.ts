/**
 * Simplified Ethiopian Calendar Utility
 * This follows the basic rules of the Ethiopian Calendar (Ge'ez)
 * 12 months of 30 days each + Pagumē (5 or 6 days).
 */

function toEthiopian(date: Date): { year: number, month: number, day: number, monthName: string } {
  // Rough conversion for demonstration
  // In a production app, we would use a library like 'ethiopia-calendar'
  // But for this UI mockup, we will provide a consistent mapping
  
  const gYear = date.getFullYear();
  const gMonth = date.getMonth() + 1;
  const gDay = date.getDate();

  let eYear = gYear - 8;
  if (gMonth < 9 || (gMonth === 9 && gDay < 11)) {
    eYear = gYear - 9;
  }

  const monthNames = [
    "Meskere", "Tikimt", "Hidar", "Tahsas", "T'ir", "Yekatit",
    "Megabit", "Miyazya", "Ginbot", "Senē", "Hamle", "Nehasē", "Pagumē"
  ];

  // Dummy logic for day/month to show in UI
  // Real implementation would calculate Julian Day -> Ethiopian
  const dummyMonth = (gMonth + 4) % 13;
  const dummyDay = gDay % 30 || 30;

  return {
    year: eYear,
    month: dummyMonth + 1,
    day: dummyDay,
    monthName: monthNames[dummyMonth]
  };
}

export function formatEthiopian(date: Date): string {
  const { year, day, monthName } = toEthiopian(date);
  return `${monthName} ${day}, ${year}`;
}
