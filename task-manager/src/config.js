import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// User config file location (in home directory)
export const USER_CONFIG_FILE = join(homedir(), '.taskrc.json');
export const PROJECT_ROOT = join(__dirname, '..');

// Default configuration
const DEFAULT_USER_CONFIG = {
  syncPath: null,  // null = use local, or path to Obsidian vault / Google Drive folder
  syncType: 'local',  // 'local', 'obsidian', 'gdrive'
  obsidianVault: null,
  autoArchiveWeeks: 4,
  defaultKw: 'current'
};

/**
 * Load user configuration from ~/.taskrc.json
 */
export function loadUserConfig() {
  if (!existsSync(USER_CONFIG_FILE)) {
    return { ...DEFAULT_USER_CONFIG };
  }

  try {
    const data = readFileSync(USER_CONFIG_FILE, 'utf-8');
    return { ...DEFAULT_USER_CONFIG, ...JSON.parse(data) };
  } catch (error) {
    console.error('Fehler beim Laden der Konfiguration:', error.message);
    return { ...DEFAULT_USER_CONFIG };
  }
}

/**
 * Save user configuration to ~/.taskrc.json
 */
export function saveUserConfig(config) {
  try {
    writeFileSync(USER_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Fehler beim Speichern der Konfiguration:', error.message);
    return false;
  }
}

/**
 * Get the data directory based on configuration
 */
export function getDataDir() {
  const config = loadUserConfig();

  if (config.syncPath && existsSync(config.syncPath)) {
    const taskDir = join(config.syncPath, 'tasks');
    if (!existsSync(taskDir)) {
      mkdirSync(taskDir, { recursive: true });
    }
    return taskDir;
  }

  // Fallback to local
  const localDir = join(PROJECT_ROOT, 'data');
  if (!existsSync(localDir)) {
    mkdirSync(localDir, { recursive: true });
  }
  return localDir;
}

/**
 * Get the exports directory based on configuration
 */
export function getExportsDir() {
  const config = loadUserConfig();

  if (config.syncPath && existsSync(config.syncPath)) {
    const exportsDir = join(config.syncPath, 'tasks', 'exports');
    if (!existsSync(exportsDir)) {
      mkdirSync(exportsDir, { recursive: true });
    }
    return exportsDir;
  }

  // Fallback to local
  const localDir = join(PROJECT_ROOT, 'exports');
  if (!existsSync(localDir)) {
    mkdirSync(localDir, { recursive: true });
  }
  return localDir;
}

/**
 * Get the database file path
 */
export function getDbFile() {
  return join(getDataDir(), 'tasks.json');
}

// Legacy exports for backwards compatibility
export const DATA_DIR = getDataDir();
export const EXPORTS_DIR = getExportsDir();
export const DB_FILE = getDbFile();

export const DEFAULT_CONFIG = {
  autoArchiveWeeks: 4,
  defaultKw: 'current',
  exportPath: EXPORTS_DIR
};

// Status definitions with colors and emojis
export const STATUS = {
  green: { emoji: '🟢', label: 'Erledigt', color: 'green' },
  yellow: { emoji: '🟡', label: 'In Arbeit', color: 'yellow' },
  red: { emoji: '🔴', label: 'Blockiert', color: 'red' },
  white: { emoji: '⚪', label: 'Verfallen', color: 'white' }
};

// Priority levels
export const PRIORITY = {
  1: { label: 'Niedrig', color: 'gray' },
  2: { label: 'Normal', color: 'white' },
  3: { label: 'Hoch', color: 'yellow' },
  4: { label: 'Kritisch', color: 'red' }
};

// Common sync paths to detect
export const COMMON_SYNC_PATHS = {
  // macOS
  'obsidian-mac': join(homedir(), 'Documents', 'Obsidian'),
  'gdrive-mac': join(homedir(), 'Library', 'CloudStorage', 'GoogleDrive-*'),
  'gdrive-mac-alt': join(homedir(), 'Google Drive'),

  // Linux
  'obsidian-linux': join(homedir(), 'Documents', 'Obsidian'),
  'gdrive-linux': join(homedir(), 'google-drive'),

  // Windows
  'obsidian-win': join(homedir(), 'Documents', 'Obsidian'),
  'gdrive-win': join(homedir(), 'Google Drive')
};
