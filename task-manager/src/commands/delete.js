import { getTaskById, deleteTask } from '../models/database.js';
import { getShortId } from '../models/task.js';
import { success, error, warning } from '../utils/formatting.js';

/**
 * Delete command handler
 * @param {string} id - Task ID (or partial ID)
 * @param {Object} options - Command options
 */
export function deleteCommand(id, options) {
  const task = getTaskById(id);

  if (!task) {
    console.log(error(`Task nicht gefunden: ${id}`));
    console.log('Tipp: Verwende "task list" um alle Tasks anzuzeigen.');
    process.exit(1);
  }

  // Confirm deletion if not forced
  if (!options.force) {
    console.log(warning(`Task wird gelöscht: ${getShortId(task.id)} - "${task.description}"`));
    console.log('Tipp: Verwende --force um die Bestätigung zu überspringen.');
  }

  deleteTask(task.id);
  console.log(success(`Task gelöscht: ${getShortId(task.id)} - "${task.description}"`));
}
