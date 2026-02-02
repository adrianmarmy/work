import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';
import { loadUserConfig, saveUserConfig, USER_CONFIG_FILE, getDataDir, getExportsDir } from '../config.js';
import { success, error, info, warning } from '../utils/formatting.js';

/**
 * Config command handler
 * @param {Object} options - Command options
 */
export function configCommand(options) {
  if (options.show) {
    showConfig();
  } else if (options.sync) {
    setupSync(options.sync);
  } else if (options.reset) {
    resetConfig();
  } else if (options.detect) {
    detectSyncPaths();
  } else {
    showConfig();
  }
}

/**
 * Show current configuration
 */
function showConfig() {
  const config = loadUserConfig();

  console.log(chalk.bold('\n⚙️  Task Manager Konfiguration\n'));

  console.log(chalk.bold('Sync-Einstellungen:'));
  console.log(`  Typ:           ${config.syncType || 'local'}`);
  console.log(`  Pfad:          ${config.syncPath || chalk.gray('(nicht konfiguriert - lokaler Speicher)')}`);

  if (config.obsidianVault) {
    console.log(`  Obsidian Vault: ${config.obsidianVault}`);
  }

  console.log(chalk.bold('\nAktuelle Pfade:'));
  console.log(`  Daten:         ${getDataDir()}`);
  console.log(`  Exporte:       ${getExportsDir()}`);

  console.log(chalk.bold('\nAllgemeine Einstellungen:'));
  console.log(`  Auto-Archiv:   ${config.autoArchiveWeeks} Wochen`);
  console.log(`  Standard-KW:   ${config.defaultKw}`);

  console.log(chalk.bold('\nKonfigurationsdatei:'));
  console.log(`  ${USER_CONFIG_FILE}`);

  console.log(chalk.gray('\nVerwende "task config --detect" um Sync-Ordner zu finden'));
  console.log(chalk.gray('Verwende "task config --sync <pfad>" um Sync-Pfad zu setzen\n'));
}

/**
 * Setup sync path
 */
function setupSync(syncPath) {
  // Expand ~ to home directory
  const expandedPath = syncPath.replace(/^~/, homedir());

  // Check if path exists
  if (!existsSync(expandedPath)) {
    console.log(error(`Pfad existiert nicht: ${expandedPath}`));
    console.log(info('Bitte erstelle den Ordner zuerst oder verwende einen existierenden Pfad.'));
    process.exit(1);
  }

  // Detect sync type
  let syncType = 'folder';
  let obsidianVault = null;

  // Check if it's an Obsidian vault
  if (existsSync(join(expandedPath, '.obsidian'))) {
    syncType = 'obsidian';
    obsidianVault = expandedPath;
    console.log(info('Obsidian Vault erkannt!'));
  }
  // Check if it looks like Google Drive
  else if (expandedPath.toLowerCase().includes('google') ||
           expandedPath.toLowerCase().includes('gdrive')) {
    syncType = 'gdrive';
    console.log(info('Google Drive Ordner erkannt!'));
  }

  // Load current config and update
  const config = loadUserConfig();
  config.syncPath = expandedPath;
  config.syncType = syncType;
  config.obsidianVault = obsidianVault;

  if (saveUserConfig(config)) {
    console.log(success('Sync-Pfad konfiguriert!'));
    console.log(`\n  Typ:  ${syncType}`);
    console.log(`  Pfad: ${expandedPath}`);

    // Show where data will be stored
    console.log(chalk.bold('\nDaten werden gespeichert in:'));
    console.log(`  ${join(expandedPath, 'tasks')}`);

    if (syncType === 'obsidian') {
      console.log(chalk.bold('\nObsidian-Tipp:'));
      console.log(chalk.gray('  Die Tasks werden im Ordner "tasks" in deinem Vault gespeichert.'));
      console.log(chalk.gray('  Du kannst die exportierten .md Dateien direkt in Obsidian öffnen!'));
    }

    if (syncType === 'gdrive') {
      console.log(chalk.bold('\nGoogle Drive-Tipp:'));
      console.log(chalk.gray('  Stelle sicher, dass Google Drive auf beiden Computern läuft.'));
      console.log(chalk.gray('  Die Daten werden automatisch synchronisiert!'));
    }
  } else {
    console.log(error('Konfiguration konnte nicht gespeichert werden.'));
    process.exit(1);
  }
}

/**
 * Reset configuration to defaults
 */
function resetConfig() {
  const defaultConfig = {
    syncPath: null,
    syncType: 'local',
    obsidianVault: null,
    autoArchiveWeeks: 4,
    defaultKw: 'current'
  };

  if (saveUserConfig(defaultConfig)) {
    console.log(success('Konfiguration zurückgesetzt.'));
    console.log(info('Daten werden jetzt lokal gespeichert.'));
  } else {
    console.log(error('Konfiguration konnte nicht zurückgesetzt werden.'));
  }
}

/**
 * Detect common sync paths
 */
function detectSyncPaths() {
  console.log(chalk.bold('\n🔍 Suche nach Sync-Ordnern...\n'));

  const found = [];

  // Common paths to check
  const pathsToCheck = [
    // Obsidian
    { path: join(homedir(), 'Documents', 'Obsidian'), type: 'obsidian', name: 'Obsidian (Documents)' },
    { path: join(homedir(), 'Obsidian'), type: 'obsidian', name: 'Obsidian (Home)' },

    // Google Drive - verschiedene Installationen
    { path: join(homedir(), 'Google Drive'), type: 'gdrive', name: 'Google Drive' },
    { path: join(homedir(), 'GoogleDrive'), type: 'gdrive', name: 'Google Drive' },
    { path: join(homedir(), 'My Drive'), type: 'gdrive', name: 'Google Drive (My Drive)' },

    // Dropbox
    { path: join(homedir(), 'Dropbox'), type: 'dropbox', name: 'Dropbox' },

    // OneDrive
    { path: join(homedir(), 'OneDrive'), type: 'onedrive', name: 'OneDrive' },

    // iCloud (macOS)
    { path: join(homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs'), type: 'icloud', name: 'iCloud Drive' },
  ];

  // Check macOS CloudStorage for Google Drive
  const cloudStoragePath = join(homedir(), 'Library', 'CloudStorage');
  if (existsSync(cloudStoragePath)) {
    try {
      const items = readdirSync(cloudStoragePath);
      items.forEach(item => {
        if (item.startsWith('GoogleDrive')) {
          const fullPath = join(cloudStoragePath, item);
          if (existsSync(join(fullPath, 'My Drive'))) {
            pathsToCheck.push({
              path: join(fullPath, 'My Drive'),
              type: 'gdrive',
              name: `Google Drive (${item})`
            });
          } else {
            pathsToCheck.push({
              path: fullPath,
              type: 'gdrive',
              name: `Google Drive (${item})`
            });
          }
        }
      });
    } catch (e) {
      // Ignore errors
    }
  }

  // Check each path
  for (const check of pathsToCheck) {
    if (existsSync(check.path)) {
      // For Obsidian, look for vaults
      if (check.type === 'obsidian') {
        try {
          const items = readdirSync(check.path);
          items.forEach(item => {
            const vaultPath = join(check.path, item);
            if (existsSync(join(vaultPath, '.obsidian'))) {
              found.push({
                path: vaultPath,
                type: 'obsidian',
                name: `Obsidian Vault: ${item}`
              });
            }
          });
        } catch (e) {
          // If we can't read, add the base path
          found.push(check);
        }
      } else {
        found.push(check);
      }
    }
  }

  if (found.length === 0) {
    console.log(warning('Keine Sync-Ordner gefunden.'));
    console.log(info('Du kannst manuell einen Pfad setzen mit:'));
    console.log(chalk.cyan('  task config --sync /pfad/zum/ordner'));
  } else {
    console.log(chalk.bold('Gefundene Sync-Ordner:\n'));

    found.forEach((item, index) => {
      const typeEmoji = {
        obsidian: '📓',
        gdrive: '☁️ ',
        dropbox: '📦',
        onedrive: '☁️ ',
        icloud: '☁️ '
      }[item.type] || '📁';

      console.log(`  ${chalk.bold(index + 1)}. ${typeEmoji} ${item.name}`);
      console.log(chalk.gray(`     ${item.path}`));
    });

    console.log(chalk.bold('\nVerwende:'));
    console.log(chalk.cyan(`  task config --sync "${found[0].path}"`));
    console.log(chalk.gray('\nErsetze den Pfad mit deinem bevorzugten Ordner.\n'));
  }
}

/**
 * Set auto-archive weeks
 */
export function setAutoArchiveWeeks(weeks) {
  const config = loadUserConfig();
  config.autoArchiveWeeks = parseInt(weeks, 10);
  saveUserConfig(config);
  console.log(success(`Auto-Archivierung auf ${weeks} Wochen gesetzt.`));
}
