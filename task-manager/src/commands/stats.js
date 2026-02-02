import chalk from 'chalk';
import Table from 'cli-table3';
import { getTasks, getArchivedTasks } from '../models/database.js';
import { STATUS } from '../config.js';
import { info, warning } from '../utils/formatting.js';
import { parseKw, getCurrentKw, getCurrentYear, formatKwString, getKwDateRange } from '../utils/kw.js';

/**
 * Stats command handler
 * @param {Object} options - Command options
 */
export function statsCommand(options) {
  if (options.kw) {
    showKwStats(options);
  } else {
    showOverallStats(options);
  }
}

/**
 * Show overall statistics
 */
function showOverallStats(options) {
  const tasks = getTasks();
  const archived = getArchivedTasks();

  if (tasks.length === 0 && archived.length === 0) {
    console.log(info('Keine Tasks vorhanden.'));
    return;
  }

  console.log(chalk.bold('\n📊 Task-Statistik\n'));

  // Overall counts
  const statusCounts = countByStatus(tasks);
  const totalActive = tasks.length;
  const totalArchived = archived.length;

  console.log(chalk.bold('Aktive Tasks:'));
  console.log(`  🟢 Erledigt:   ${statusCounts.green}`);
  console.log(`  🟡 In Arbeit:  ${statusCounts.yellow}`);
  console.log(`  🔴 Blockiert:  ${statusCounts.red}`);
  console.log(`  ⚪ Verfallen:  ${statusCounts.white}`);
  console.log(`  ─────────────────`);
  console.log(`  Gesamt:        ${totalActive}`);
  console.log(`  Archiviert:    ${totalArchived}\n`);

  // Progress bar
  if (totalActive > 0) {
    const progress = (statusCounts.green / totalActive) * 100;
    console.log(chalk.bold('Fortschritt:'));
    console.log(`  ${createProgressBar(progress)} ${progress.toFixed(1)}%\n`);
  }

  // KW breakdown
  const kwGroups = groupByKw(tasks);
  const kwKeys = Object.keys(kwGroups).sort((a, b) => {
    const [kwA, yearA] = a.split('-').map(Number);
    const [kwB, yearB] = b.split('-').map(Number);
    if (yearA !== yearB) return yearA - yearB;
    return kwA - kwB;
  });

  if (kwKeys.length > 0) {
    console.log(chalk.bold('Nach Kalenderwoche:\n'));

    const table = new Table({
      head: ['KW', '🟢', '🟡', '🔴', '⚪', 'Gesamt', 'Fortschritt'].map(h => chalk.bold(h)),
      style: { head: [], border: ['gray'] }
    });

    kwKeys.forEach(kwKey => {
      const [kw, year] = kwKey.split('-').map(Number);
      const kwTasks = kwGroups[kwKey];
      const counts = countByStatus(kwTasks);
      const total = kwTasks.length;
      const progress = total > 0 ? (counts.green / total) * 100 : 0;

      const isCurrent = kw === getCurrentKw() && year === getCurrentYear();
      const kwLabel = isCurrent
        ? chalk.cyan(`${formatKwString(kw, year)} ★`)
        : formatKwString(kw, year);

      table.push([
        kwLabel,
        chalk.green(counts.green),
        chalk.yellow(counts.yellow),
        chalk.red(counts.red),
        chalk.gray(counts.white),
        total,
        createProgressBar(progress, 10) + ` ${progress.toFixed(0)}%`
      ]);
    });

    console.log(table.toString());
  }

  // Priority breakdown
  const prioCounts = countByPriority(tasks);
  if (Object.keys(prioCounts).some(k => prioCounts[k] > 0)) {
    console.log(chalk.bold('\nNach Priorität:'));
    console.log(`  P4 (Kritisch): ${chalk.red(prioCounts[4] || 0)}`);
    console.log(`  P3 (Hoch):     ${chalk.yellow(prioCounts[3] || 0)}`);
    console.log(`  P2 (Normal):   ${chalk.white(prioCounts[2] || 0)}`);
    console.log(`  P1 (Niedrig):  ${chalk.gray(prioCounts[1] || 0)}`);
  }

  console.log('');
}

/**
 * Show statistics for a specific KW
 */
function showKwStats(options) {
  const kw = parseKw(options.kw);
  if (kw === null) {
    console.log(warning(`Ungültige Kalenderwoche: ${options.kw}`));
    return;
  }

  const year = options.year ? parseInt(options.year, 10) : getCurrentYear();
  const tasks = getTasks().filter(t => t.kw === kw && t.year === year);

  if (tasks.length === 0) {
    console.log(info(`Keine Tasks in ${formatKwString(kw, year)}.`));
    return;
  }

  const dateRange = getKwDateRange(kw, year);
  const isCurrent = kw === getCurrentKw() && year === getCurrentYear();

  console.log(chalk.bold(`\n📊 Statistik ${formatKwString(kw, year)}${isCurrent ? ' (aktuell)' : ''}`));
  console.log(chalk.gray(`   ${dateRange.startFormatted} - ${dateRange.endFormatted}\n`));

  const statusCounts = countByStatus(tasks);
  const total = tasks.length;
  const progress = total > 0 ? (statusCounts.green / total) * 100 : 0;

  // Status breakdown
  console.log(chalk.bold('Status:'));
  console.log(`  🟢 Erledigt:   ${statusCounts.green} (${((statusCounts.green / total) * 100).toFixed(0)}%)`);
  console.log(`  🟡 In Arbeit:  ${statusCounts.yellow} (${((statusCounts.yellow / total) * 100).toFixed(0)}%)`);
  console.log(`  🔴 Blockiert:  ${statusCounts.red} (${((statusCounts.red / total) * 100).toFixed(0)}%)`);
  console.log(`  ⚪ Verfallen:  ${statusCounts.white} (${((statusCounts.white / total) * 100).toFixed(0)}%)`);
  console.log(`  ─────────────────`);
  console.log(`  Gesamt:        ${total}\n`);

  // Progress bar
  console.log(chalk.bold('Fortschritt:'));
  console.log(`  ${createProgressBar(progress, 30)} ${progress.toFixed(1)}%\n`);

  // Priority breakdown
  const prioCounts = countByPriority(tasks);
  console.log(chalk.bold('Priorität:'));
  console.log(`  P4 (Kritisch): ${chalk.red(prioCounts[4] || 0)}`);
  console.log(`  P3 (Hoch):     ${chalk.yellow(prioCounts[3] || 0)}`);
  console.log(`  P2 (Normal):   ${chalk.white(prioCounts[2] || 0)}`);
  console.log(`  P1 (Niedrig):  ${chalk.gray(prioCounts[1] || 0)}`);

  // Top tags
  const tagCounts = countTags(tasks);
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (topTags.length > 0) {
    console.log(chalk.bold('\nTop Tags:'));
    topTags.forEach(([tag, count]) => {
      console.log(`  ${chalk.cyan('#' + tag)}: ${count}`);
    });
  }

  console.log('');
}

// Helper functions

function countByStatus(tasks) {
  return {
    green: tasks.filter(t => t.status === 'green').length,
    yellow: tasks.filter(t => t.status === 'yellow').length,
    red: tasks.filter(t => t.status === 'red').length,
    white: tasks.filter(t => t.status === 'white').length
  };
}

function countByPriority(tasks) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  tasks.forEach(t => {
    if (counts[t.priority] !== undefined) {
      counts[t.priority]++;
    }
  });
  return counts;
}

function groupByKw(tasks) {
  const groups = {};
  tasks.forEach(t => {
    const key = `${t.kw}-${t.year}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });
  return groups;
}

function countTags(tasks) {
  const counts = {};
  tasks.forEach(t => {
    if (t.tags) {
      t.tags.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    }
  });
  return counts;
}

function createProgressBar(percentage, width = 20) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  return `[${bar}]`;
}
