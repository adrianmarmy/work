import { addTask } from '../models/database.js';
import { createTask, normalizeStatus, isValidPriority, getShortId } from '../models/task.js';
import { success, error, formatStatus, formatKw } from '../utils/formatting.js';
import { parseKw, getCurrentKw, getCurrentYear } from '../utils/kw.js';

/**
 * Add command handler
 * @param {string} description - Task description
 * @param {Object} options - Command options
 */
export function addCommand(description, options) {
  // Validate description
  if (!description || description.trim().length === 0) {
    console.log(error('Beschreibung darf nicht leer sein.'));
    process.exit(1);
  }

  // Parse and validate KW
  let kw = getCurrentKw();
  let year = getCurrentYear();

  if (options.kw) {
    const parsedKw = parseKw(options.kw);
    if (parsedKw === null) {
      console.log(error(`Ungültige Kalenderwoche: ${options.kw}`));
      process.exit(1);
    }
    kw = parsedKw;
  }

  if (options.year) {
    const parsedYear = parseInt(options.year, 10);
    if (isNaN(parsedYear) || parsedYear < 2020 || parsedYear > 2100) {
      console.log(error(`Ungültiges Jahr: ${options.year}`));
      process.exit(1);
    }
    year = parsedYear;
  }

  // Parse and validate status/color
  let status = 'yellow';
  if (options.color || options.status) {
    const normalizedStatus = normalizeStatus(options.color || options.status);
    if (!normalizedStatus) {
      console.log(error(`Ungültiger Status: ${options.color || options.status}`));
      console.log('Gültige Werte: green, yellow, red, white (oder: erledigt, offen, blockiert, verfallen)');
      process.exit(1);
    }
    status = normalizedStatus;
  }

  // Parse and validate priority
  let priority = 2;
  if (options.priority) {
    priority = parseInt(options.priority, 10);
    if (!isValidPriority(priority)) {
      console.log(error(`Ungültige Priorität: ${options.priority}`));
      console.log('Gültige Werte: 1 (niedrig), 2 (normal), 3 (hoch), 4 (kritisch)');
      process.exit(1);
    }
  }

  // Parse tags
  let tags = [];
  if (options.tag) {
    tags = Array.isArray(options.tag) ? options.tag : [options.tag];
    tags = tags.map(t => t.replace(/^#/, '').trim()).filter(Boolean);
  }

  // Create and save task
  const task = createTask({
    description: description.trim(),
    kw,
    year,
    status,
    priority,
    tags,
    notes: options.notes || ''
  });

  addTask(task);

  // Output success message
  console.log(success('Task erstellt:'));
  console.log(`  ID:     ${getShortId(task.id)}`);
  console.log(`  KW:     ${formatKw(task.kw, task.year)}`);
  console.log(`  Status: ${formatStatus(task.status)}`);
  console.log(`  Prio:   P${task.priority}`);
  console.log(`  Task:   ${task.description}`);

  if (tags.length > 0) {
    console.log(`  Tags:   ${tags.map(t => '#' + t).join(', ')}`);
  }

  if (task.notes) {
    console.log(`  Notiz:  ${task.notes}`);
  }
}
