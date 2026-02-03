import { v4 as uuidv4 } from 'uuid';
import { getWeek, getYear, getDay } from 'date-fns';

// Day names in German
export const DAY_NAMES = {
  1: 'Montag',
  2: 'Dienstag',
  3: 'Mittwoch',
  4: 'Donnerstag',
  5: 'Freitag',
  6: 'Samstag',
  7: 'Sonntag'
};

export const DAY_NAMES_SHORT = {
  1: 'Mo',
  2: 'Di',
  3: 'Mi',
  4: 'Do',
  5: 'Fr',
  6: 'Sa',
  7: 'So'
};

/**
 * Create a new task object
 * @param {Object} params - Task parameters
 * @returns {Object} Task object
 */
export function createTask({
  description,
  kw = null,
  year = null,
  day = null,
  status = 'yellow',
  priority = 2,
  tags = [],
  notes = ''
}) {
  const now = new Date();

  // Default to current week if not specified
  const taskKw = kw !== null ? kw : getWeek(now, { weekStartsOn: 1 });
  const taskYear = year !== null ? year : getYear(now);

  // Default to current day if not specified (1=Monday, 7=Sunday)
  let taskDay = day;
  if (taskDay === null) {
    const jsDay = getDay(now); // 0=Sunday, 1=Monday, etc.
    taskDay = jsDay === 0 ? 7 : jsDay; // Convert to 1=Monday format
  }

  return {
    id: uuidv4(),
    description,
    kw: taskKw,
    year: taskYear,
    day: taskDay,
    status,
    priority,
    tags: Array.isArray(tags) ? tags : [tags].filter(Boolean),
    notes,
    created: now.toISOString(),
    updated: now.toISOString()
  };
}

/**
 * Parse day input (number or name)
 * @param {string|number} input - Day input
 * @returns {number|null} Day number (1-7) or null
 */
export function parseDay(input) {
  if (typeof input === 'number') {
    return input >= 1 && input <= 7 ? input : null;
  }

  const str = String(input).toLowerCase().trim();

  // Try parsing as number
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1 && num <= 7) {
    return num;
  }

  // Parse day names
  const dayMap = {
    'mo': 1, 'mon': 1, 'montag': 1, 'monday': 1,
    'di': 2, 'die': 2, 'dienstag': 2, 'tuesday': 2, 'tue': 2,
    'mi': 3, 'mit': 3, 'mittwoch': 3, 'wednesday': 3, 'wed': 3,
    'do': 4, 'don': 4, 'donnerstag': 4, 'thursday': 4, 'thu': 4,
    'fr': 5, 'fre': 5, 'freitag': 5, 'friday': 5, 'fri': 5,
    'sa': 6, 'sam': 6, 'samstag': 6, 'saturday': 6, 'sat': 6,
    'so': 7, 'son': 7, 'sonntag': 7, 'sunday': 7, 'sun': 7,
    // Special
    'heute': null, // Will be calculated
    'today': null,
    'morgen': null,
    'tomorrow': null
  };

  if (str === 'heute' || str === 'today') {
    const jsDay = getDay(new Date());
    return jsDay === 0 ? 7 : jsDay;
  }

  if (str === 'morgen' || str === 'tomorrow') {
    const jsDay = getDay(new Date());
    const tomorrow = jsDay === 0 ? 1 : (jsDay === 6 ? 7 : jsDay + 1);
    return tomorrow > 7 ? 1 : tomorrow;
  }

  return dayMap[str] || null;
}

/**
 * Check if day is valid
 * @param {number} day - Day number
 * @returns {boolean}
 */
export function isValidDay(day) {
  return Number.isInteger(day) && day >= 1 && day <= 7;
}

/**
 * Validate task status
 * @param {string} status - Status to validate
 * @returns {boolean} True if valid
 */
export function isValidStatus(status) {
  return ['green', 'yellow', 'red', 'white'].includes(status);
}

/**
 * Validate priority
 * @param {number} priority - Priority to validate
 * @returns {boolean} True if valid
 */
export function isValidPriority(priority) {
  return [1, 2, 3, 4].includes(priority);
}

/**
 * Get status from color name or alias
 * @param {string} input - Color name or alias
 * @returns {string|null} Normalized status or null if invalid
 */
export function normalizeStatus(input) {
  const statusMap = {
    // Direct colors
    green: 'green',
    yellow: 'yellow',
    red: 'red',
    white: 'white',

    // German aliases
    erledigt: 'green',
    done: 'green',
    fertig: 'green',

    offen: 'yellow',
    open: 'yellow',
    'in-arbeit': 'yellow',
    inprogress: 'yellow',
    progress: 'yellow',

    blockiert: 'red',
    blocked: 'red',
    dringend: 'red',
    urgent: 'red',

    verfallen: 'white',
    abgebrochen: 'white',
    cancelled: 'white',
    canceled: 'white'
  };

  const normalized = input?.toLowerCase().replace(/\s+/g, '-');
  return statusMap[normalized] || null;
}

/**
 * Get short ID for display (first 8 characters)
 * @param {string} id - Full UUID
 * @returns {string} Short ID
 */
export function getShortId(id) {
  return id.substring(0, 8);
}
