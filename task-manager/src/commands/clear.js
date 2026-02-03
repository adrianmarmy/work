import chalk from 'chalk';
import { getTasks, loadDatabase, saveDatabase } from '../models/database.js';
import { success, error, info, warning } from '../utils/formatting.js';
import { parseKw, getCurrentYear } from '../utils/kw.js';
import { parseDay } from '../models/task.js';

/**
 * Clear command handler - delete multiple tasks at once
 * @param {Object} options - Command options
 */
export function clearCommand(options) {
  const db = loadDatabase();
  const originalCount = db.tasks.length;

  if (originalCount === 0) {
    console.log(info('Keine Tasks vorhanden.'));
    return;
  }

  let toDelete = [];
  let description = '';

  if (options.all) {
    // Delete all tasks
    toDelete = db.tasks;
    description = 'alle Tasks';
  } else if (options.noDay) {
    // Delete tasks without a day
    toDelete = db.tasks.filter(t => !t.day);
    description = 'Tasks ohne Tag';
  } else if (options.kw) {
    // Delete tasks from specific KW
    const kw = parseKw(options.kw);
    const year = options.year ? parseInt(options.year, 10) : getCurrentYear();
    toDelete = db.tasks.filter(t => t.kw === kw && t.year === year);
    description = `Tasks aus KW${kw}/${year}`;
  } else if (options.day) {
    // Delete tasks from specific day
    const day = parseDay(options.day);
    toDelete = db.tasks.filter(t => t.day === day);
    description = `Tasks von Tag ${day}`;
  } else if (options.status) {
    // Delete tasks with specific status
    toDelete = db.tasks.filter(t => t.status === options.status);
    description = `Tasks mit Status "${options.status}"`;
  } else if (options.invalid) {
    // Delete tasks that are missing required fields
    toDelete = db.tasks.filter(t =>
      !t.description ||
      !t.kw ||
      !t.day ||
      !t.status ||
      !['green', 'yellow', 'red', 'white'].includes(t.status)
    );
    description = 'ungültige/unvollständige Tasks';
  } else {
    // Show help
    showClearHelp();
    return;
  }

  if (toDelete.length === 0) {
    console.log(info(`Keine ${description} gefunden.`));
    return;
  }

  // Confirm unless --force
  if (!options.force) {
    console.log(warning(`${toDelete.length} ${description} werden gelöscht:`));
    toDelete.slice(0, 5).forEach(t => {
      console.log(chalk.gray(`  - ${t.description}`));
    });
    if (toDelete.length > 5) {
      console.log(chalk.gray(`  ... und ${toDelete.length - 5} weitere`));
    }
    console.log('');
    console.log(info('Verwende --force um zu bestätigen.'));
    return;
  }

  // Delete tasks
  const idsToDelete = new Set(toDelete.map(t => t.id));
  db.tasks = db.tasks.filter(t => !idsToDelete.has(t.id));
  saveDatabase(db);

  console.log(success(`${toDelete.length} ${description} gelöscht.`));
  console.log(info(`${db.tasks.length} Tasks verbleibend.`));
}

/**
 * Show clear help
 */
function showClearHelp() {
  console.log(chalk.bold('\n🗑️  Tasks löschen\n'));

  console.log(chalk.bold('Optionen:'));
  console.log('  --all           Alle Tasks löschen');
  console.log('  --no-day        Tasks ohne Wochentag löschen');
  console.log('  --invalid       Ungültige/unvollständige Tasks löschen');
  console.log('  --kw <nummer>   Tasks einer KW löschen');
  console.log('  --day <tag>     Tasks eines Tages löschen');
  console.log('  --status <s>    Tasks mit bestimmtem Status löschen');
  console.log('  --force         Ohne Bestätigung löschen');

  console.log(chalk.bold('\nBeispiele:'));
  console.log('  task clear --all --force          # Alles löschen');
  console.log('  task clear --no-day --force       # Ohne Tag löschen');
  console.log('  task clear --invalid --force      # Ungültige löschen');
  console.log('  task clear --kw 5 --force         # KW5 löschen');
  console.log('  task clear --status green --force # Erledigte löschen\n');
}
