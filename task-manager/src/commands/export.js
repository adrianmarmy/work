import { getTasks, getArchivedTasks } from '../models/database.js';
import { exportToMarkdown, exportToDocx, exportToJson, saveExport } from '../utils/export.js';
import { success, error, info, warning } from '../utils/formatting.js';
import { parseKw, getCurrentKw, getCurrentYear, formatKwString } from '../utils/kw.js';

/**
 * Export command handler
 * @param {Object} options - Command options
 */
export async function exportCommand(options) {
  // Get tasks
  let tasks = options.all
    ? [...getTasks(), ...getArchivedTasks()]
    : getTasks();

  // Filter by KW if specified
  if (options.kw) {
    const kw = parseKw(options.kw);
    if (kw === null) {
      console.log(error(`Ungültige Kalenderwoche: ${options.kw}`));
      process.exit(1);
    }
    const year = options.year ? parseInt(options.year, 10) : getCurrentYear();
    tasks = tasks.filter(t => t.kw === kw && t.year === year);
  }

  if (tasks.length === 0) {
    console.log(warning('Keine Tasks zum Exportieren gefunden.'));
    return;
  }

  // Determine format
  const format = (options.format || 'md').toLowerCase();

  if (!['md', 'markdown', 'docx', 'json'].includes(format)) {
    console.log(error(`Unbekanntes Format: ${format}`));
    console.log('Gültige Formate: md, docx, json');
    process.exit(1);
  }

  // Generate filename
  const timestamp = new Date().toISOString().split('T')[0];
  let filename = options.output;

  if (!filename) {
    if (options.kw) {
      const kw = parseKw(options.kw);
      const year = options.year || getCurrentYear();
      filename = `tasks-KW${String(kw).padStart(2, '0')}-${year}`;
    } else {
      filename = `tasks-export-${timestamp}`;
    }
  }

  // Remove extension if present
  filename = filename.replace(/\.(md|docx|json)$/i, '');

  // Create title
  let title = 'Task-Liste';
  if (options.kw) {
    const kw = parseKw(options.kw);
    const year = options.year || getCurrentYear();
    title = `Tasks ${formatKwString(kw, year)}`;
  }

  try {
    let content;
    let normalizedFormat;

    switch (format) {
      case 'md':
      case 'markdown':
        content = exportToMarkdown(tasks, { title });
        normalizedFormat = 'md';

        // If --stdout, print to console
        if (options.stdout) {
          console.log(content);
          return;
        }
        break;

      case 'docx':
        content = await exportToDocx(tasks, { title });
        normalizedFormat = 'docx';
        break;

      case 'json':
        content = exportToJson(tasks, { pretty: !options.compact });
        normalizedFormat = 'json';

        // If --stdout, print to console
        if (options.stdout) {
          console.log(content);
          return;
        }
        break;

      default:
        console.log(error(`Unbekanntes Format: ${format}`));
        process.exit(1);
    }

    // Save to file
    const filePath = await saveExport(content, filename, normalizedFormat);
    console.log(success(`${tasks.length} Tasks exportiert nach:`));
    console.log(`  ${filePath}`);

  } catch (err) {
    console.log(error(`Export fehlgeschlagen: ${err.message}`));
    process.exit(1);
  }
}
