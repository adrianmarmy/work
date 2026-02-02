import { archiveTasksByKw, getTasks, getConfig } from '../models/database.js';
import { success, error, warning, info, formatKw } from '../utils/formatting.js';
import { parseKw, getCurrentKw, getCurrentYear, getOldKws, formatKwString } from '../utils/kw.js';

/**
 * Archive command handler
 * @param {Object} options - Command options
 */
export function archiveCommand(options) {
  if (options.auto) {
    autoArchive(options);
  } else if (options.kw) {
    archiveByKw(options);
  } else {
    console.log(error('Bitte gib eine KW an (--kw) oder verwende --auto für automatische Archivierung.'));
    console.log('Beispiele:');
    console.log('  task archive --kw 5        Archiviert alle Tasks aus KW05');
    console.log('  task archive --auto        Archiviert alle alten KWs automatisch');
    process.exit(1);
  }
}

/**
 * Archive tasks by specific KW
 */
function archiveByKw(options) {
  const kw = parseKw(options.kw);
  if (kw === null) {
    console.log(error(`Ungültige Kalenderwoche: ${options.kw}`));
    process.exit(1);
  }

  const year = options.year ? parseInt(options.year, 10) : getCurrentYear();

  // Check if trying to archive current KW
  if (kw === getCurrentKw() && year === getCurrentYear() && !options.force) {
    console.log(warning(`KW${kw} ist die aktuelle Woche. Verwende --force um trotzdem zu archivieren.`));
    return;
  }

  const count = archiveTasksByKw(kw, year);

  if (count === 0) {
    console.log(info(`Keine Tasks in ${formatKwString(kw, year)} zum Archivieren gefunden.`));
  } else {
    console.log(success(`${count} Tasks aus ${formatKwString(kw, year)} archiviert.`));
  }
}

/**
 * Automatically archive old KWs
 */
function autoArchive(options) {
  const config = getConfig();
  const weeksBack = options.weeks ? parseInt(options.weeks, 10) : config.autoArchiveWeeks;

  const currentKw = getCurrentKw();
  const currentYear = getCurrentYear();

  // Get all tasks and find unique KWs that are old
  const tasks = getTasks();
  const kwsInTasks = new Set(tasks.map(t => `${t.kw}-${t.year}`));

  let totalArchived = 0;
  const archivedKws = [];

  // Iterate through unique KWs in tasks
  for (const kwKey of kwsInTasks) {
    const [kw, year] = kwKey.split('-').map(Number);

    // Check if this KW is old enough to archive
    const weeksDiff = calculateWeeksDiff(kw, year, currentKw, currentYear);

    if (weeksDiff >= weeksBack) {
      const count = archiveTasksByKw(kw, year);
      if (count > 0) {
        totalArchived += count;
        archivedKws.push({ kw, year, count });
      }
    }
  }

  if (totalArchived === 0) {
    console.log(info(`Keine Tasks zum Archivieren gefunden (älter als ${weeksBack} Wochen).`));
  } else {
    console.log(success(`${totalArchived} Tasks archiviert:`));
    archivedKws.forEach(({ kw, year, count }) => {
      console.log(`  • ${formatKwString(kw, year)}: ${count} Tasks`);
    });
  }
}

/**
 * Calculate the difference in weeks between two KWs
 */
function calculateWeeksDiff(kw1, year1, kw2, year2) {
  // Simple calculation: assume 52 weeks per year
  const totalWeeks1 = year1 * 52 + kw1;
  const totalWeeks2 = year2 * 52 + kw2;
  return totalWeeks2 - totalWeeks1;
}
