import chalk from 'chalk';
import { getTasks, getArchivedTasks } from '../models/database.js';
import { normalizeStatus, parseDay, DAY_NAMES, DAY_NAMES_SHORT } from '../models/task.js';
import { createTaskTable, createSummaryHeader, info, warning } from '../utils/formatting.js';
import { parseKw, getCurrentKw, getCurrentYear, formatKwString } from '../utils/kw.js';
import { getDay } from 'date-fns';

/**
 * Get current day (1=Monday, 7=Sunday)
 */
function getCurrentDay() {
  const jsDay = getDay(new Date());
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * List command handler
 * @param {Object} options - Command options
 */
export function listCommand(options) {
  let tasks = options.archived ? getArchivedTasks() : getTasks();

  // Apply filters
  tasks = applyFilters(tasks, options);

  // Check if any tasks match
  if (tasks.length === 0) {
    if (hasFilters(options)) {
      console.log(warning('Keine Tasks gefunden, die den Filterkriterien entsprechen.'));
    } else {
      console.log(info('Keine Tasks vorhanden. Erstelle einen mit: task add "Beschreibung"'));
    }
    return;
  }

  // Sort tasks
  tasks = sortTasks(tasks, options);

  // Create title
  let title = options.archived ? 'Archivierte Tasks' : 'Tasks';
  if (options.kw) {
    const kw = parseKw(options.kw);
    title += ` - ${formatKwString(kw, options.year || getCurrentYear())}`;
  }
  if (options.day) {
    const day = parseDay(options.day);
    if (day) {
      title += ` - ${DAY_NAMES[day]}`;
    }
  }
  if (options.status) {
    title += ` (${options.status})`;
  }
  if (options.today) {
    title += ` - Heute (${DAY_NAMES[getCurrentDay()]})`;
  }

  // Output - grouped by day if viewing a KW
  if (options.byDay || (options.kw && !options.day && !options.compact)) {
    showByDay(tasks, title);
  } else {
    console.log(createSummaryHeader(title, tasks.length));
    console.log(createTaskTable(tasks, {
      showNotes: options.notes,
      showTags: !options.compact,
      showDay: true
    }));

    // Show summary by status
    if (!options.compact && tasks.length > 0) {
      showStatusSummary(tasks);
    }
  }
}

/**
 * Show tasks grouped by day
 */
function showByDay(tasks, title) {
  console.log(chalk.bold(`\n${title} (${tasks.length} Tasks)\n`));

  const currentDay = getCurrentDay();

  // Group by day
  const byDay = {};
  for (let d = 1; d <= 7; d++) {
    byDay[d] = tasks.filter(t => t.day === d);
  }

  // Also collect tasks without a day
  const noDay = tasks.filter(t => !t.day);

  // Display each day
  for (let d = 1; d <= 7; d++) {
    const dayTasks = byDay[d];
    const isToday = d === currentDay;
    const dayLabel = isToday
      ? chalk.cyan.bold(`📅 ${DAY_NAMES[d]} (heute)`)
      : chalk.bold(`   ${DAY_NAMES[d]}`);

    if (dayTasks.length > 0) {
      console.log(dayLabel);

      dayTasks.forEach(task => {
        const statusEmoji = { green: '🟢', yellow: '🟡', red: '🔴', white: '⚪' }[task.status] || '🟡';
        const prioMark = task.priority >= 3 ? chalk.red(' ⚡') : '';
        const statusColor = task.status === 'green' ? chalk.gray : chalk.white;

        console.log(`      ${statusEmoji} ${statusColor(task.description)}${prioMark}`);
      });
      console.log('');
    } else if (isToday) {
      console.log(dayLabel);
      console.log(chalk.gray('      (keine Tasks)'));
      console.log('');
    }
  }

  // Show tasks without day
  if (noDay.length > 0) {
    console.log(chalk.bold('   Ohne Tag'));
    noDay.forEach(task => {
      const statusEmoji = { green: '🟢', yellow: '🟡', red: '🔴', white: '⚪' }[task.status] || '🟡';
      console.log(`      ${statusEmoji} ${task.description}`);
    });
    console.log('');
  }

  // Summary
  showStatusSummary(tasks);
}

/**
 * Apply filters to tasks
 */
function applyFilters(tasks, options) {
  let filtered = tasks;

  // Filter by KW
  if (options.kw) {
    const kw = parseKw(options.kw);
    if (kw !== null) {
      const year = options.year ? parseInt(options.year, 10) : getCurrentYear();
      filtered = filtered.filter(t => t.kw === kw && t.year === year);
    }
  }

  // Filter by day
  if (options.day) {
    const day = parseDay(options.day);
    if (day !== null) {
      filtered = filtered.filter(t => t.day === day);
    }
  }

  // Filter by "today" (current KW and current day)
  if (options.today) {
    const currentKw = getCurrentKw();
    const currentYear = getCurrentYear();
    const currentDay = getCurrentDay();
    filtered = filtered.filter(t =>
      t.kw === currentKw && t.year === currentYear && t.day === currentDay
    );
  }

  // Filter by status
  if (options.status) {
    const status = normalizeStatus(options.status);
    if (status) {
      filtered = filtered.filter(t => t.status === status);
    }
  }

  // Filter by priority
  if (options.priority) {
    const prio = parseInt(options.priority, 10);
    if (!isNaN(prio)) {
      filtered = filtered.filter(t => t.priority === prio);
    }
  }

  // Filter by tag
  if (options.tag) {
    const tag = options.tag.replace(/^#/, '').toLowerCase();
    filtered = filtered.filter(t =>
      t.tags && t.tags.some(tt => tt.toLowerCase().includes(tag))
    );
  }

  // Filter by search query
  if (options.search) {
    const query = options.search.toLowerCase();
    filtered = filtered.filter(t =>
      t.description.toLowerCase().includes(query) ||
      (t.notes && t.notes.toLowerCase().includes(query)) ||
      (t.tags && t.tags.some(tag => tag.toLowerCase().includes(query)))
    );
  }

  return filtered;
}

/**
 * Sort tasks
 */
function sortTasks(tasks, options) {
  return tasks.slice().sort((a, b) => {
    // First by KW (ascending)
    if (a.year !== b.year) return a.year - b.year;
    if (a.kw !== b.kw) return a.kw - b.kw;

    // Then by day (ascending)
    const dayA = a.day || 8;
    const dayB = b.day || 8;
    if (dayA !== dayB) return dayA - dayB;

    // Then by priority (descending - high priority first)
    if (b.priority !== a.priority) return b.priority - a.priority;

    // Then by status (red first, then yellow, green, white)
    const statusOrder = { red: 0, yellow: 1, green: 2, white: 3 };
    const statusA = statusOrder[a.status] ?? 1;
    const statusB = statusOrder[b.status] ?? 1;
    if (statusA !== statusB) return statusA - statusB;

    // Finally by created date (newest first)
    return new Date(b.created) - new Date(a.created);
  });
}

/**
 * Check if any filters are applied
 */
function hasFilters(options) {
  return !!(options.kw || options.status || options.priority ||
            options.tag || options.search || options.today || options.day);
}

/**
 * Show status summary
 */
function showStatusSummary(tasks) {
  const counts = {
    green: tasks.filter(t => t.status === 'green').length,
    yellow: tasks.filter(t => t.status === 'yellow').length,
    red: tasks.filter(t => t.status === 'red').length,
    white: tasks.filter(t => t.status === 'white').length
  };

  console.log(`🟢 ${counts.green}  🟡 ${counts.yellow}  🔴 ${counts.red}  ⚪ ${counts.white}`);
}
