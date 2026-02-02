import { getWeek, getYear, startOfWeek, endOfWeek, addWeeks, subWeeks, format } from 'date-fns';
import { de } from 'date-fns/locale';

/**
 * Get current calendar week (ISO week)
 * @returns {number} Current week number
 */
export function getCurrentKw() {
  return getWeek(new Date(), { weekStartsOn: 1 });
}

/**
 * Get current year
 * @returns {number} Current year
 */
export function getCurrentYear() {
  return getYear(new Date());
}

/**
 * Get the date range for a specific KW
 * @param {number} kw - Calendar week
 * @param {number} year - Year
 * @returns {Object} Object with start and end dates
 */
export function getKwDateRange(kw, year) {
  // Create a date in the specified year
  const jan1 = new Date(year, 0, 1);

  // Find the first Monday of the year
  let firstMonday = startOfWeek(jan1, { weekStartsOn: 1 });
  if (getWeek(firstMonday, { weekStartsOn: 1 }) !== 1) {
    firstMonday = addWeeks(firstMonday, 1);
  }

  // Calculate the start of the requested week
  const weekStart = addWeeks(firstMonday, kw - 1);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  return {
    start: weekStart,
    end: weekEnd,
    startFormatted: format(weekStart, 'dd.MM.yyyy', { locale: de }),
    endFormatted: format(weekEnd, 'dd.MM.yyyy', { locale: de })
  };
}

/**
 * Parse KW string (e.g., "6", "06", "KW6", "KW06")
 * @param {string} input - KW string
 * @returns {number|null} Week number or null if invalid
 */
export function parseKw(input) {
  if (typeof input === 'number') return input;

  const str = String(input).toLowerCase().replace('kw', '').trim();
  const num = parseInt(str, 10);

  if (isNaN(num) || num < 1 || num > 53) {
    return null;
  }

  return num;
}

/**
 * Get KWs that should be auto-archived
 * @param {number} weeksBack - How many weeks back to consider as "old"
 * @returns {Array} Array of { kw, year } objects
 */
export function getOldKws(weeksBack = 4) {
  const now = new Date();
  const currentKw = getCurrentKw();
  const currentYear = getCurrentYear();

  const oldKws = [];

  for (let i = weeksBack; i > 0; i--) {
    const pastDate = subWeeks(now, i);
    const pastKw = getWeek(pastDate, { weekStartsOn: 1 });
    const pastYear = getYear(pastDate);

    // Don't include current week
    if (!(pastKw === currentKw && pastYear === currentYear)) {
      oldKws.push({ kw: pastKw, year: pastYear });
    }
  }

  return oldKws;
}

/**
 * Check if a KW is in the past
 * @param {number} kw - Calendar week
 * @param {number} year - Year
 * @returns {boolean} True if the KW is in the past
 */
export function isKwPast(kw, year) {
  const currentKw = getCurrentKw();
  const currentYear = getCurrentYear();

  if (year < currentYear) return true;
  if (year > currentYear) return false;

  return kw < currentKw;
}

/**
 * Check if a KW is current
 * @param {number} kw - Calendar week
 * @param {number} year - Year
 * @returns {boolean} True if the KW is current
 */
export function isKwCurrent(kw, year) {
  return kw === getCurrentKw() && year === getCurrentYear();
}

/**
 * Format KW for display
 * @param {number} kw - Calendar week
 * @param {number} year - Year (optional, defaults to current)
 * @returns {string} Formatted KW string
 */
export function formatKwString(kw, year = getCurrentYear()) {
  return `KW${String(kw).padStart(2, '0')}/${year}`;
}
