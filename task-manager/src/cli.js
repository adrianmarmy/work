#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { addCommand } from './commands/add.js';
import { listCommand } from './commands/list.js';
import { updateCommand, moveCommand } from './commands/update.js';
import { deleteCommand } from './commands/delete.js';
import { archiveCommand } from './commands/archive.js';
import { exportCommand } from './commands/export.js';
import { statsCommand } from './commands/stats.js';
import { configCommand } from './commands/config.js';
import { syncCommand } from './commands/sync.js';
import { getCurrentKw, getCurrentYear, formatKwString } from './utils/kw.js';

const program = new Command();

program
  .name('task')
  .description('CLI-basierter Task-Manager mit KW-Archivierung und Statusfarben')
  .version('1.0.0');

// Add command
program
  .command('add <description>')
  .description('Neuen Task erstellen')
  .option('-k, --kw <nummer>', 'Kalenderwoche (Standard: aktuelle KW)')
  .option('-y, --year <jahr>', 'Jahr (Standard: aktuelles Jahr)')
  .option('-c, --color <farbe>', 'Statusfarbe: green, yellow, red, white')
  .option('-s, --status <status>', 'Status (Alias für --color)')
  .option('-p, --priority <1-4>', 'Priorität: 1=niedrig, 2=normal, 3=hoch, 4=kritisch', '2')
  .option('-t, --tag <tag>', 'Tag hinzufügen (mehrfach verwendbar)', (val, acc) => {
    acc = acc || [];
    acc.push(val);
    return acc;
  })
  .option('-n, --notes <text>', 'Notizen zum Task')
  .action(addCommand);

// List command
program
  .command('list')
  .alias('ls')
  .description('Tasks anzeigen')
  .option('-k, --kw <nummer>', 'Nach Kalenderwoche filtern')
  .option('-y, --year <jahr>', 'Nach Jahr filtern')
  .option('-s, --status <status>', 'Nach Status filtern: green, yellow, red, white')
  .option('-p, --priority <1-4>', 'Nach Priorität filtern')
  .option('-t, --tag <tag>', 'Nach Tag filtern')
  .option('-q, --search <query>', 'Volltextsuche')
  .option('--today', 'Nur Tasks der aktuellen KW anzeigen')
  .option('--archived', 'Archivierte Tasks anzeigen')
  .option('--notes', 'Notizen anzeigen')
  .option('--compact', 'Kompakte Ansicht (ohne Tags)')
  .action(listCommand);

// Update command
program
  .command('update <id>')
  .alias('edit')
  .description('Task aktualisieren')
  .option('-s, --status <status>', 'Neuer Status')
  .option('-c, --color <farbe>', 'Neue Statusfarbe (Alias für --status)')
  .option('-k, --kw <nummer>', 'Neue Kalenderwoche')
  .option('-y, --year <jahr>', 'Neues Jahr')
  .option('-p, --priority <1-4>', 'Neue Priorität')
  .option('-d, --description <text>', 'Neue Beschreibung')
  .option('-n, --notes <text>', 'Neue Notizen')
  .option('--add-tag <tag>', 'Tag hinzufügen', (val, acc) => {
    acc = acc || [];
    acc.push(val);
    return acc;
  })
  .option('--remove-tag <tag>', 'Tag entfernen', (val, acc) => {
    acc = acc || [];
    acc.push(val);
    return acc;
  })
  .action(updateCommand);

// Move command (bulk update)
program
  .command('move')
  .description('Mehrere Tasks auf einmal aktualisieren')
  .requiredOption('-k, --kw <nummer>', 'Quell-Kalenderwoche')
  .option('-y, --year <jahr>', 'Jahr')
  .option('-s, --status <status>', 'Neuer Status für alle Tasks')
  .option('--to-kw <nummer>', 'Ziel-Kalenderwoche')
  .action(moveCommand);

// Delete command
program
  .command('delete <id>')
  .alias('rm')
  .description('Task löschen')
  .option('-f, --force', 'Ohne Bestätigung löschen')
  .action(deleteCommand);

// Archive command
program
  .command('archive')
  .description('Tasks archivieren')
  .option('-k, --kw <nummer>', 'Kalenderwoche zum Archivieren')
  .option('-y, --year <jahr>', 'Jahr')
  .option('--auto', 'Alte KWs automatisch archivieren')
  .option('-w, --weeks <anzahl>', 'Anzahl Wochen für Auto-Archivierung')
  .option('-f, --force', 'Auch aktuelle KW archivieren')
  .action(archiveCommand);

// Export command
program
  .command('export')
  .description('Tasks exportieren')
  .option('-f, --format <format>', 'Exportformat: md, docx, json', 'md')
  .option('-k, --kw <nummer>', 'Nur bestimmte KW exportieren')
  .option('-y, --year <jahr>', 'Jahr')
  .option('-o, --output <name>', 'Ausgabedateiname (ohne Erweiterung)')
  .option('--all', 'Inkl. archivierte Tasks')
  .option('--stdout', 'Ausgabe auf Konsole (nur md/json)')
  .option('--compact', 'Kompakte JSON-Ausgabe')
  .action(exportCommand);

// Stats command
program
  .command('stats')
  .description('Statistiken anzeigen')
  .option('-k, --kw <nummer>', 'Statistik für bestimmte KW')
  .option('-y, --year <jahr>', 'Jahr')
  .action(statsCommand);

// Config command
program
  .command('config')
  .description('Konfiguration anzeigen und ändern')
  .option('--show', 'Aktuelle Konfiguration anzeigen')
  .option('--sync <pfad>', 'Sync-Pfad setzen (Obsidian Vault oder Google Drive)')
  .option('--detect', 'Sync-Ordner automatisch erkennen')
  .option('--reset', 'Konfiguration zurücksetzen')
  .action(configCommand);

// Sync command
program
  .command('sync')
  .description('Tasks zu Obsidian/Cloud synchronisieren')
  .option('--obsidian', 'Als Obsidian-Markdown exportieren')
  .option('--all', 'Inkl. archivierte Tasks')
  .action(syncCommand);

// Show current KW info on help
program.addHelpText('after', `
${chalk.bold('Aktuelle KW:')} ${formatKwString(getCurrentKw(), getCurrentYear())}

${chalk.bold('Beispiele:')}
  $ task add "TikTok-Videos hochladen" --kw 6 --color yellow --tag social-media
  $ task list --kw 6
  $ task list --today
  $ task update abc123 --status green
  $ task move --kw 5 --status done
  $ task archive --kw 5
  $ task export --format md --kw 6
  $ task stats
  $ task config --detect
  $ task config --sync ~/Obsidian/MeinVault
  $ task sync --obsidian

${chalk.bold('Statusfarben:')}
  🟢 green  - Erledigt
  🟡 yellow - In Arbeit / Offen
  🔴 red    - Blockiert / Dringend
  ⚪ white  - Verfallen / Abgebrochen
`);

// Parse arguments
program.parse();

// If no arguments, show help
if (process.argv.length === 2) {
  program.help();
}
