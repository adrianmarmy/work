import { getTaskById, updateTask, getTasks } from '../models/database.js';
import { normalizeStatus, isValidPriority, getShortId } from '../models/task.js';
import { success, error, warning, formatStatus, formatKw, formatPriority } from '../utils/formatting.js';
import { parseKw, getCurrentYear } from '../utils/kw.js';

/**
 * Update command handler
 * @param {string} id - Task ID (or partial ID)
 * @param {Object} options - Command options
 */
export function updateCommand(id, options) {
  // Find task
  const task = getTaskById(id);

  if (!task) {
    console.log(error(`Task nicht gefunden: ${id}`));
    console.log('Tipp: Verwende "task list" um alle Tasks anzuzeigen.');
    process.exit(1);
  }

  // Build updates object
  const updates = {};
  const changes = [];

  // Update status
  if (options.status || options.color) {
    const newStatus = normalizeStatus(options.status || options.color);
    if (!newStatus) {
      console.log(error(`Ungültiger Status: ${options.status || options.color}`));
      process.exit(1);
    }
    if (newStatus !== task.status) {
      updates.status = newStatus;
      changes.push(`Status: ${formatStatus(task.status)} → ${formatStatus(newStatus)}`);
    }
  }

  // Update KW
  if (options.kw) {
    const newKw = parseKw(options.kw);
    if (newKw === null) {
      console.log(error(`Ungültige Kalenderwoche: ${options.kw}`));
      process.exit(1);
    }
    if (newKw !== task.kw) {
      updates.kw = newKw;
      changes.push(`KW: ${formatKw(task.kw, task.year)} → ${formatKw(newKw, task.year)}`);
    }
  }

  // Update year
  if (options.year) {
    const newYear = parseInt(options.year, 10);
    if (isNaN(newYear) || newYear < 2020 || newYear > 2100) {
      console.log(error(`Ungültiges Jahr: ${options.year}`));
      process.exit(1);
    }
    if (newYear !== task.year) {
      updates.year = newYear;
      changes.push(`Jahr: ${task.year} → ${newYear}`);
    }
  }

  // Update priority
  if (options.priority) {
    const newPriority = parseInt(options.priority, 10);
    if (!isValidPriority(newPriority)) {
      console.log(error(`Ungültige Priorität: ${options.priority}`));
      process.exit(1);
    }
    if (newPriority !== task.priority) {
      updates.priority = newPriority;
      changes.push(`Priorität: ${formatPriority(task.priority)} → ${formatPriority(newPriority)}`);
    }
  }

  // Update description
  if (options.description) {
    if (options.description.trim().length === 0) {
      console.log(error('Beschreibung darf nicht leer sein.'));
      process.exit(1);
    }
    if (options.description !== task.description) {
      updates.description = options.description.trim();
      changes.push(`Beschreibung: "${task.description}" → "${updates.description}"`);
    }
  }

  // Update notes
  if (options.notes !== undefined) {
    updates.notes = options.notes;
    changes.push(`Notizen aktualisiert`);
  }

  // Add tags
  if (options.addTag) {
    const newTags = Array.isArray(options.addTag) ? options.addTag : [options.addTag];
    const cleanTags = newTags.map(t => t.replace(/^#/, '').trim()).filter(Boolean);
    const existingTags = task.tags || [];
    const uniqueNewTags = cleanTags.filter(t => !existingTags.includes(t));

    if (uniqueNewTags.length > 0) {
      updates.tags = [...existingTags, ...uniqueNewTags];
      changes.push(`Tags hinzugefügt: ${uniqueNewTags.map(t => '#' + t).join(', ')}`);
    }
  }

  // Remove tags
  if (options.removeTag) {
    const tagsToRemove = Array.isArray(options.removeTag) ? options.removeTag : [options.removeTag];
    const cleanTagsToRemove = tagsToRemove.map(t => t.replace(/^#/, '').trim().toLowerCase());
    const existingTags = updates.tags || task.tags || [];
    const filteredTags = existingTags.filter(t => !cleanTagsToRemove.includes(t.toLowerCase()));

    if (filteredTags.length !== existingTags.length) {
      updates.tags = filteredTags;
      changes.push(`Tags entfernt: ${tagsToRemove.map(t => '#' + t).join(', ')}`);
    }
  }

  // Check if any changes were made
  if (changes.length === 0) {
    console.log(warning('Keine Änderungen vorgenommen.'));
    return;
  }

  // Apply updates
  const updatedTask = updateTask(task.id, updates);

  // Output success message
  console.log(success(`Task ${getShortId(task.id)} aktualisiert:`));
  changes.forEach(change => {
    console.log(`  • ${change}`);
  });
}

/**
 * Move command handler - bulk update tasks by KW
 * @param {Object} options - Command options
 */
export function moveCommand(options) {
  if (!options.kw) {
    console.log(error('KW muss angegeben werden: --kw <nummer>'));
    process.exit(1);
  }

  const kw = parseKw(options.kw);
  if (kw === null) {
    console.log(error(`Ungültige Kalenderwoche: ${options.kw}`));
    process.exit(1);
  }

  const year = options.year ? parseInt(options.year, 10) : getCurrentYear();

  // Get tasks for the specified KW
  const allTasks = getTasks();
  const kwTasks = allTasks.filter(t => t.kw === kw && t.year === year);

  if (kwTasks.length === 0) {
    console.log(warning(`Keine Tasks in ${formatKw(kw, year)} gefunden.`));
    return;
  }

  // Determine what to update
  const updates = {};
  const changeDescription = [];

  if (options.status) {
    const newStatus = normalizeStatus(options.status);
    if (!newStatus) {
      console.log(error(`Ungültiger Status: ${options.status}`));
      process.exit(1);
    }
    updates.status = newStatus;
    changeDescription.push(`Status → ${formatStatus(newStatus)}`);
  }

  if (options.toKw) {
    const newKw = parseKw(options.toKw);
    if (newKw === null) {
      console.log(error(`Ungültige Ziel-KW: ${options.toKw}`));
      process.exit(1);
    }
    updates.kw = newKw;
    changeDescription.push(`KW → ${formatKw(newKw, year)}`);
  }

  if (Object.keys(updates).length === 0) {
    console.log(error('Keine Änderung angegeben. Verwende --status oder --to-kw'));
    process.exit(1);
  }

  // Apply updates to all matching tasks
  let updatedCount = 0;
  kwTasks.forEach(task => {
    updateTask(task.id, updates);
    updatedCount++;
  });

  console.log(success(`${updatedCount} Tasks in ${formatKw(kw, year)} aktualisiert:`));
  changeDescription.forEach(change => {
    console.log(`  • ${change}`);
  });
}

