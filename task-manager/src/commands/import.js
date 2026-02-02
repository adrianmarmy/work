import { readFileSync, existsSync } from 'fs';
import chalk from 'chalk';
import { addTask } from '../models/database.js';
import { createTask, normalizeStatus } from '../models/task.js';
import { success, error, info, warning } from '../utils/formatting.js';
import { parseKw, getCurrentYear } from '../utils/kw.js';

/**
 * Import command handler
 * @param {Object} options - Command options
 */
export function importCommand(options) {
  if (options.file) {
    importFromFile(options.file, options);
  } else if (options.text) {
    importFromText(options.text, options);
  } else {
    showImportHelp();
  }
}

/**
 * Import from JSON file
 */
function importFromFile(filePath, options) {
  if (!existsSync(filePath)) {
    console.log(error(`Datei nicht gefunden: ${filePath}`));
    process.exit(1);
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const ext = filePath.toLowerCase().split('.').pop();

    if (ext === 'json') {
      importFromJson(content, options);
    } else if (ext === 'txt' || ext === 'md') {
      importFromTextFile(content, options);
    } else {
      console.log(error(`Unbekanntes Dateiformat: .${ext}`));
      console.log(info('Unterstützt: .json, .txt, .md'));
    }
  } catch (err) {
    console.log(error(`Fehler beim Lesen der Datei: ${err.message}`));
    process.exit(1);
  }
}

/**
 * Import from JSON content
 */
function importFromJson(content, options) {
  let data;
  try {
    data = JSON.parse(content);
  } catch (err) {
    console.log(error('Ungültiges JSON-Format'));
    process.exit(1);
  }

  // Support both array of tasks and { tasks: [...] } format
  const tasks = Array.isArray(data) ? data : (data.tasks || []);

  if (tasks.length === 0) {
    console.log(warning('Keine Tasks in der Datei gefunden.'));
    return;
  }

  let imported = 0;
  let skipped = 0;

  for (const taskData of tasks) {
    try {
      const task = createTask({
        description: taskData.description || taskData.text || taskData.title,
        kw: taskData.kw || parseKw(taskData.week) || null,
        year: taskData.year || getCurrentYear(),
        status: normalizeStatus(taskData.status || taskData.color) || 'yellow',
        priority: taskData.priority || taskData.prio || 2,
        tags: taskData.tags || [],
        notes: taskData.notes || taskData.note || ''
      });

      addTask(task);
      imported++;
    } catch (err) {
      skipped++;
    }
  }

  console.log(success(`${imported} Tasks importiert.`));
  if (skipped > 0) {
    console.log(warning(`${skipped} Tasks übersprungen (Fehler).`));
  }
}

/**
 * Import from text file (one task per line)
 */
function importFromTextFile(content, options) {
  const lines = content.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));

  if (lines.length === 0) {
    console.log(warning('Keine Tasks in der Datei gefunden.'));
    return;
  }

  const kw = options.kw ? parseKw(options.kw) : null;
  const year = options.year ? parseInt(options.year, 10) : getCurrentYear();
  const status = options.status ? normalizeStatus(options.status) : 'yellow';

  let imported = 0;

  for (const line of lines) {
    // Parse line format: "- [ ] Task description #tag1 #tag2" or just "Task description"
    const parsed = parseTaskLine(line);

    const task = createTask({
      description: parsed.description,
      kw: parsed.kw || kw,
      year: parsed.year || year,
      status: parsed.status || status,
      priority: parsed.priority || 2,
      tags: parsed.tags || [],
      notes: ''
    });

    addTask(task);
    imported++;
  }

  console.log(success(`${imported} Tasks importiert.`));
  if (kw) {
    console.log(info(`Alle Tasks wurden KW${kw} zugeordnet.`));
  }
}

/**
 * Import from command line text
 */
function importFromText(text, options) {
  const kw = options.kw ? parseKw(options.kw) : null;
  const year = options.year ? parseInt(options.year, 10) : getCurrentYear();
  const status = options.status ? normalizeStatus(options.status) : 'yellow';

  // Split by semicolon or newline
  const items = text.split(/[;\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  let imported = 0;

  for (const item of items) {
    const parsed = parseTaskLine(item);

    const task = createTask({
      description: parsed.description,
      kw: parsed.kw || kw,
      year: year,
      status: parsed.status || status,
      priority: parsed.priority || 2,
      tags: parsed.tags || [],
      notes: ''
    });

    addTask(task);
    imported++;
  }

  console.log(success(`${imported} Tasks importiert.`));
}

/**
 * Parse a single task line
 * Formats supported:
 * - "Task description"
 * - "- Task description"
 * - "- [ ] Task description"
 * - "- [x] Task description" (completed)
 * - "🟢 Task description" (with status emoji)
 * - "Task description #tag1 #tag2"
 * - "KW5: Task description"
 */
function parseTaskLine(line) {
  let description = line;
  let status = null;
  let kw = null;
  let priority = null;
  let tags = [];

  // Remove list markers
  description = description.replace(/^[-*•]\s*/, '');

  // Check for checkbox
  if (description.match(/^\[x\]\s*/i)) {
    status = 'green';
    description = description.replace(/^\[x\]\s*/i, '');
  } else if (description.match(/^\[\s*\]\s*/)) {
    status = 'yellow';
    description = description.replace(/^\[\s*\]\s*/, '');
  }

  // Check for status emoji at start
  const emojiMatch = description.match(/^(🟢|🟡|🔴|⚪)\s*/);
  if (emojiMatch) {
    const emojiMap = { '🟢': 'green', '🟡': 'yellow', '🔴': 'red', '⚪': 'white' };
    status = emojiMap[emojiMatch[1]] || status;
    description = description.replace(/^(🟢|🟡|🔴|⚪)\s*/, '');
  }

  // Check for KW prefix
  const kwMatch = description.match(/^KW\s*(\d+):?\s*/i);
  if (kwMatch) {
    kw = parseInt(kwMatch[1], 10);
    description = description.replace(/^KW\s*\d+:?\s*/i, '');
  }

  // Check for priority marker [P1], [P2], etc.
  const prioMatch = description.match(/\[P([1-4])\]/i);
  if (prioMatch) {
    priority = parseInt(prioMatch[1], 10);
    description = description.replace(/\[P[1-4]\]/i, '').trim();
  }

  // Extract hashtags
  const tagMatches = description.match(/#[\w-]+/g);
  if (tagMatches) {
    tags = tagMatches.map(t => t.replace('#', ''));
    description = description.replace(/#[\w-]+/g, '').trim();
  }

  // Clean up description
  description = description.replace(/\s+/g, ' ').trim();

  return { description, status, kw, priority, tags };
}

/**
 * Show import help
 */
function showImportHelp() {
  console.log(chalk.bold('\n📥 Task Import\n'));

  console.log(chalk.bold('Aus Datei importieren:'));
  console.log('  task import --file tasks.json');
  console.log('  task import --file liste.txt --kw 5');
  console.log('  task import --file notes.md --kw 3 --status green\n');

  console.log(chalk.bold('Direkt importieren:'));
  console.log('  task import --text "Task 1; Task 2; Task 3" --kw 5');
  console.log('  task import --text "Erledigt #arbeit" --status green\n');

  console.log(chalk.bold('Unterstützte Formate:'));
  console.log('  • JSON: [{"description": "...", "kw": 5, "status": "green"}]');
  console.log('  • TXT/MD: Eine Zeile pro Task\n');

  console.log(chalk.bold('Text-Format Beispiele:'));
  console.log('  - [ ] Offener Task');
  console.log('  - [x] Erledigter Task');
  console.log('  🟢 Task mit Status-Emoji');
  console.log('  KW5: Task für KW5');
  console.log('  Task beschreibung #tag1 #tag2');
  console.log('  [P3] Hohe Priorität Task\n');

  console.log(chalk.bold('Optionen:'));
  console.log('  --kw <nummer>      Standard-KW für alle Tasks');
  console.log('  --year <jahr>      Jahr (Standard: aktuell)');
  console.log('  --status <status>  Standard-Status (yellow, green, etc.)\n');
}
