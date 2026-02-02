import { readFileSync, writeFileSync, existsSync } from 'fs';
import { DB_FILE, DEFAULT_CONFIG } from '../config.js';

// Initial database structure
const INITIAL_DB = {
  tasks: [],
  archived: [],
  config: DEFAULT_CONFIG
};

/**
 * Load database from JSON file
 * @returns {Object} Database object
 */
export function loadDatabase() {
  if (!existsSync(DB_FILE)) {
    saveDatabase(INITIAL_DB);
    return INITIAL_DB;
  }

  try {
    const data = readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Fehler beim Laden der Datenbank:', error.message);
    return INITIAL_DB;
  }
}

/**
 * Save database to JSON file
 * @param {Object} db - Database object to save
 */
export function saveDatabase(db) {
  try {
    writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error('Fehler beim Speichern der Datenbank:', error.message);
    throw error;
  }
}

/**
 * Get all tasks (non-archived)
 * @returns {Array} Array of tasks
 */
export function getTasks() {
  const db = loadDatabase();
  return db.tasks || [];
}

/**
 * Get archived tasks
 * @returns {Array} Array of archived tasks
 */
export function getArchivedTasks() {
  const db = loadDatabase();
  return db.archived || [];
}

/**
 * Add a new task
 * @param {Object} task - Task object to add
 * @returns {Object} Added task
 */
export function addTask(task) {
  const db = loadDatabase();
  db.tasks.push(task);
  saveDatabase(db);
  return task;
}

/**
 * Update an existing task
 * @param {string} id - Task ID
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated task or null if not found
 */
export function updateTask(id, updates) {
  const db = loadDatabase();
  const index = db.tasks.findIndex(t => t.id === id || t.id.startsWith(id));

  if (index === -1) {
    return null;
  }

  db.tasks[index] = {
    ...db.tasks[index],
    ...updates,
    updated: new Date().toISOString()
  };

  saveDatabase(db);
  return db.tasks[index];
}

/**
 * Delete a task
 * @param {string} id - Task ID
 * @returns {boolean} True if deleted, false if not found
 */
export function deleteTask(id) {
  const db = loadDatabase();
  const index = db.tasks.findIndex(t => t.id === id || t.id.startsWith(id));

  if (index === -1) {
    return false;
  }

  db.tasks.splice(index, 1);
  saveDatabase(db);
  return true;
}

/**
 * Get a single task by ID
 * @param {string} id - Task ID (or partial ID)
 * @returns {Object|null} Task or null if not found
 */
export function getTaskById(id) {
  const db = loadDatabase();
  return db.tasks.find(t => t.id === id || t.id.startsWith(id)) || null;
}

/**
 * Archive tasks by KW
 * @param {number} kw - Calendar week
 * @param {number} year - Year
 * @returns {number} Number of archived tasks
 */
export function archiveTasksByKw(kw, year) {
  const db = loadDatabase();
  const toArchive = db.tasks.filter(t => t.kw === kw && t.year === year);

  if (toArchive.length === 0) {
    return 0;
  }

  // Mark as archived and move
  toArchive.forEach(task => {
    task.archivedAt = new Date().toISOString();
    db.archived.push(task);
  });

  // Remove from active tasks
  db.tasks = db.tasks.filter(t => !(t.kw === kw && t.year === year));

  saveDatabase(db);
  return toArchive.length;
}

/**
 * Get configuration
 * @returns {Object} Config object
 */
export function getConfig() {
  const db = loadDatabase();
  return db.config || DEFAULT_CONFIG;
}

/**
 * Update configuration
 * @param {Object} updates - Config fields to update
 * @returns {Object} Updated config
 */
export function updateConfig(updates) {
  const db = loadDatabase();
  db.config = { ...db.config, ...updates };
  saveDatabase(db);
  return db.config;
}
