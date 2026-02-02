import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Base paths
export const PROJECT_ROOT = join(__dirname, '..');
export const DATA_DIR = join(PROJECT_ROOT, 'data');
export const EXPORTS_DIR = join(PROJECT_ROOT, 'exports');
export const DB_FILE = join(DATA_DIR, 'tasks.json');

// Ensure directories exist
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}
if (!existsSync(EXPORTS_DIR)) {
  mkdirSync(EXPORTS_DIR, { recursive: true });
}

// Default configuration
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
