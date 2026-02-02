import { v4 as uuidv4 } from 'uuid';
import { getWeek, getYear } from 'date-fns';

/**
 * Create a new task object
 * @param {Object} params - Task parameters
 * @returns {Object} Task object
 */
export function createTask({
  description,
  kw = null,
  year = null,
  status = 'yellow',
  priority = 2,
  tags = [],
  notes = ''
}) {
  const now = new Date();

  // Default to current week if not specified
  const taskKw = kw !== null ? kw : getWeek(now, { weekStartsOn: 1 });
  const taskYear = year !== null ? year : getYear(now);

  return {
    id: uuidv4(),
    description,
    kw: taskKw,
    year: taskYear,
    status,
    priority,
    tags: Array.isArray(tags) ? tags : [tags].filter(Boolean),
    notes,
    created: now.toISOString(),
    updated: now.toISOString()
  };
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
