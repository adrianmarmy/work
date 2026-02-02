import { execSync } from 'child_process';
import { existsSync } from 'fs';
import chalk from 'chalk';
import { getDataDir, PROJECT_ROOT } from '../config.js';
import { success, error, info, warning } from '../utils/formatting.js';
import { getTasks } from '../models/database.js';

/**
 * Push command - commit and push tasks to git
 * @param {Object} options - Command options
 */
export function pushCommand(options) {
  const dataDir = getDataDir();
  const tasksFile = `${dataDir}/tasks.json`;

  if (!existsSync(tasksFile)) {
    console.log(warning('Keine Tasks-Datei vorhanden.'));
    return;
  }

  try {
    // Check if we're in a git repo
    execSync('git rev-parse --git-dir', { cwd: PROJECT_ROOT, stdio: 'pipe' });
  } catch (err) {
    console.log(error('Kein Git-Repository gefunden.'));
    console.log(info('Initialisiere mit: git init'));
    return;
  }

  try {
    // Check for changes
    const status = execSync('git status --porcelain data/tasks.json', {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8'
    }).trim();

    if (!status && !options.force) {
      console.log(info('Keine Änderungen zum Pushen.'));
      return;
    }

    // Add tasks.json
    console.log(chalk.gray('Füge tasks.json hinzu...'));
    execSync('git add data/tasks.json', { cwd: PROJECT_ROOT, stdio: 'pipe' });

    // Commit
    const message = options.message || `Tasks aktualisiert (${new Date().toLocaleString('de-DE')})`;
    console.log(chalk.gray(`Committe: "${message}"`));

    try {
      execSync(`git commit -m "${message}"`, { cwd: PROJECT_ROOT, stdio: 'pipe' });
    } catch (commitErr) {
      // Commit might fail if nothing to commit
      if (!options.force) {
        console.log(info('Nichts zu committen.'));
        return;
      }
    }

    // Push
    console.log(chalk.gray('Pushe zu Remote...'));
    execSync('git push', { cwd: PROJECT_ROOT, stdio: 'pipe' });

    console.log(success('Tasks erfolgreich gepusht!'));

  } catch (err) {
    console.log(error(`Git-Fehler: ${err.message}`));

    if (err.message.includes('no upstream')) {
      console.log(info('Tipp: Setze einen Upstream mit: git push -u origin <branch>'));
    }
  }
}

/**
 * Pull command - pull latest tasks from git
 * @param {Object} options - Command options
 */
export function pullCommand(options) {
  try {
    // Check if we're in a git repo
    execSync('git rev-parse --git-dir', { cwd: PROJECT_ROOT, stdio: 'pipe' });
  } catch (err) {
    console.log(error('Kein Git-Repository gefunden.'));
    return;
  }

  try {
    // Check for local changes
    const status = execSync('git status --porcelain data/tasks.json', {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8'
    }).trim();

    if (status && !options.force) {
      console.log(warning('Lokale Änderungen vorhanden!'));
      console.log(info('Optionen:'));
      console.log('  1. task push          - Erst lokale Änderungen pushen');
      console.log('  2. task pull --force  - Lokale Änderungen überschreiben');
      return;
    }

    // Stash local changes if force
    if (status && options.force) {
      console.log(chalk.gray('Sichere lokale Änderungen...'));
      execSync('git stash push data/tasks.json', { cwd: PROJECT_ROOT, stdio: 'pipe' });
    }

    // Pull
    console.log(chalk.gray('Hole neueste Version...'));
    execSync('git pull', { cwd: PROJECT_ROOT, stdio: 'pipe' });

    console.log(success('Tasks erfolgreich aktualisiert!'));

    // Show current task count
    const tasks = getTasks();
    console.log(info(`${tasks.length} aktive Tasks geladen.`));

  } catch (err) {
    console.log(error(`Git-Fehler: ${err.message}`));
  }
}
