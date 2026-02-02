import chalk from 'chalk';
import Table from 'cli-table3';
import { STATUS, PRIORITY } from '../config.js';
import { getShortId } from '../models/task.js';

/**
 * Get colored status display
 * @param {string} status - Status key
 * @returns {string} Colored status string
 */
export function formatStatus(status) {
  const statusInfo = STATUS[status] || STATUS.yellow;
  const colorFn = {
    green: chalk.green,
    yellow: chalk.yellow,
    red: chalk.red,
    white: chalk.gray
  }[statusInfo.color] || chalk.white;

  return `${statusInfo.emoji} ${colorFn(statusInfo.label)}`;
}

/**
 * Get colored priority display
 * @param {number} priority - Priority level
 * @returns {string} Colored priority string
 */
export function formatPriority(priority) {
  const prioInfo = PRIORITY[priority] || PRIORITY[2];
  const colorFn = {
    gray: chalk.gray,
    white: chalk.white,
    yellow: chalk.yellow,
    red: chalk.red
  }[prioInfo.color] || chalk.white;

  return colorFn(`P${priority}`);
}

/**
 * Format tags for display
 * @param {Array} tags - Array of tags
 * @returns {string} Formatted tags string
 */
export function formatTags(tags) {
  if (!tags || tags.length === 0) return chalk.gray('-');
  return tags.map(tag => chalk.cyan(`#${tag}`)).join(' ');
}

/**
 * Format KW display
 * @param {number} kw - Calendar week
 * @param {number} year - Year
 * @returns {string} Formatted KW string
 */
export function formatKw(kw, year) {
  return chalk.blue(`KW${String(kw).padStart(2, '0')}/${year}`);
}

/**
 * Create a table for task list display
 * @param {Array} tasks - Array of tasks
 * @param {Object} options - Display options
 * @returns {string} Formatted table string
 */
export function createTaskTable(tasks, options = {}) {
  const { showNotes = false, showTags = true } = options;

  const headers = ['ID', 'KW', 'Status', 'Prio', 'Beschreibung'];
  if (showTags) headers.push('Tags');
  if (showNotes) headers.push('Notizen');

  const table = new Table({
    head: headers.map(h => chalk.bold.white(h)),
    style: {
      head: [],
      border: ['gray']
    },
    colWidths: showNotes
      ? [10, 12, 14, 6, 35, 20, 20]
      : showTags
        ? [10, 12, 14, 6, 40, 25]
        : [10, 12, 14, 6, 50]
  });

  tasks.forEach(task => {
    const row = [
      chalk.gray(getShortId(task.id)),
      formatKw(task.kw, task.year),
      formatStatus(task.status),
      formatPriority(task.priority),
      task.description.length > 38
        ? task.description.substring(0, 35) + '...'
        : task.description
    ];

    if (showTags) {
      row.push(formatTags(task.tags));
    }

    if (showNotes) {
      const notes = task.notes || '-';
      row.push(notes.length > 18 ? notes.substring(0, 15) + '...' : notes);
    }

    table.push(row);
  });

  return table.toString();
}

/**
 * Create a summary header
 * @param {string} title - Summary title
 * @param {number} count - Task count
 * @returns {string} Formatted header
 */
export function createSummaryHeader(title, count) {
  return chalk.bold(`\n${title} (${count} Tasks)\n`);
}

/**
 * Format success message
 * @param {string} message - Message text
 * @returns {string} Formatted message
 */
export function success(message) {
  return chalk.green(`✓ ${message}`);
}

/**
 * Format error message
 * @param {string} message - Message text
 * @returns {string} Formatted message
 */
export function error(message) {
  return chalk.red(`✗ ${message}`);
}

/**
 * Format info message
 * @param {string} message - Message text
 * @returns {string} Formatted message
 */
export function info(message) {
  return chalk.blue(`ℹ ${message}`);
}

/**
 * Format warning message
 * @param {string} message - Message text
 * @returns {string} Formatted message
 */
export function warning(message) {
  return chalk.yellow(`⚠ ${message}`);
}
