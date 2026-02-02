import { writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { getTasks, getArchivedTasks } from '../models/database.js';
import { loadUserConfig, getDataDir } from '../config.js';
import { STATUS, PRIORITY } from '../config.js';
import { formatKwString, getKwDateRange, getCurrentKw, getCurrentYear } from '../utils/kw.js';
import { success, error, info, warning } from '../utils/formatting.js';

/**
 * Sync command handler - syncs tasks to Obsidian-compatible Markdown files
 * @param {Object} options - Command options
 */
export function syncCommand(options) {
  const config = loadUserConfig();

  if (!config.syncPath) {
    console.log(warning('Kein Sync-Pfad konfiguriert.'));
    console.log(info('Verwende "task config --sync <pfad>" um einen Sync-Ordner zu setzen.'));
    console.log(info('Oder "task config --detect" um Ordner automatisch zu finden.'));
    return;
  }

  if (options.obsidian || config.syncType === 'obsidian') {
    syncToObsidian(options);
  } else {
    // Standard sync - just ensure the JSON is in the sync folder
    console.log(success('Daten sind bereits synchronisiert.'));
    console.log(`  Pfad: ${getDataDir()}`);
  }
}

/**
 * Sync tasks to Obsidian-compatible Markdown files
 */
function syncToObsidian(options) {
  const config = loadUserConfig();
  const tasks = getTasks();
  const archived = options.all ? getArchivedTasks() : [];

  if (tasks.length === 0 && archived.length === 0) {
    console.log(info('Keine Tasks zum Synchronisieren.'));
    return;
  }

  // Create tasks folder in sync path
  const tasksFolder = join(config.syncPath, 'tasks');
  const kwFolder = join(tasksFolder, 'kalenderwochen');

  if (!existsSync(tasksFolder)) {
    mkdirSync(tasksFolder, { recursive: true });
  }
  if (!existsSync(kwFolder)) {
    mkdirSync(kwFolder, { recursive: true });
  }

  // Group tasks by KW
  const grouped = groupTasksByKw([...tasks, ...archived]);

  // Generate Markdown files for each KW
  let fileCount = 0;
  for (const [kwKey, kwTasks] of Object.entries(grouped)) {
    const [kw, year] = kwKey.split('-').map(Number);
    const filename = `KW${String(kw).padStart(2, '0')}-${year}.md`;
    const filepath = join(kwFolder, filename);

    const content = generateObsidianMarkdown(kw, year, kwTasks);
    writeFileSync(filepath, content, 'utf-8');
    fileCount++;
  }

  // Generate index file
  const indexContent = generateIndexMarkdown(grouped);
  writeFileSync(join(tasksFolder, 'Tasks-Index.md'), indexContent, 'utf-8');

  // Generate current week overview
  const currentKw = getCurrentKw();
  const currentYear = getCurrentYear();
  const currentKey = `${currentKw}-${currentYear}`;
  const currentTasks = grouped[currentKey] || [];
  const dashboardContent = generateDashboardMarkdown(currentTasks, tasks);
  writeFileSync(join(tasksFolder, 'Dashboard.md'), dashboardContent, 'utf-8');

  console.log(success(`${fileCount} KW-Dateien nach Obsidian synchronisiert.`));
  console.log(`  Ordner: ${kwFolder}`);
  console.log(`  Index:  ${join(tasksFolder, 'Tasks-Index.md')}`);
  console.log(`  Dashboard: ${join(tasksFolder, 'Dashboard.md')}`);

  if (config.syncType === 'obsidian') {
    console.log(chalk.bold('\nObsidian-Tipp:'));
    console.log(chalk.gray('  Öffne "Dashboard.md" für eine Übersicht deiner aktuellen Tasks.'));
    console.log(chalk.gray('  Die KW-Dateien sind unter "kalenderwochen/" zu finden.'));
  }
}

/**
 * Generate Obsidian-compatible Markdown for a KW
 */
function generateObsidianMarkdown(kw, year, tasks) {
  const dateRange = getKwDateRange(kw, year);
  const isCurrent = kw === getCurrentKw() && year === getCurrentYear();

  let md = `---
tags:
  - tasks
  - kw${kw}
  - "${year}"
kw: ${kw}
year: ${year}
date_start: ${dateRange.startFormatted}
date_end: ${dateRange.endFormatted}
---

# ${formatKwString(kw, year)}${isCurrent ? ' ⭐' : ''}

> **Zeitraum:** ${dateRange.startFormatted} - ${dateRange.endFormatted}

`;

  // Stats
  const stats = calculateStats(tasks);
  const progress = tasks.length > 0 ? Math.round((stats.green / tasks.length) * 100) : 0;

  md += `## Fortschritt

\`\`\`
${createTextProgressBar(progress)} ${progress}%
\`\`\`

| Status | Anzahl |
|--------|--------|
| 🟢 Erledigt | ${stats.green} |
| 🟡 In Arbeit | ${stats.yellow} |
| 🔴 Blockiert | ${stats.red} |
| ⚪ Verfallen | ${stats.white} |
| **Gesamt** | **${tasks.length}** |

## Tasks

`;

  // Group by status
  const byStatus = {
    red: tasks.filter(t => t.status === 'red'),
    yellow: tasks.filter(t => t.status === 'yellow'),
    green: tasks.filter(t => t.status === 'green'),
    white: tasks.filter(t => t.status === 'white')
  };

  // Blockiert (red)
  if (byStatus.red.length > 0) {
    md += `### 🔴 Blockiert\n\n`;
    byStatus.red.forEach(task => {
      md += formatTaskAsCheckbox(task);
    });
    md += '\n';
  }

  // In Arbeit (yellow)
  if (byStatus.yellow.length > 0) {
    md += `### 🟡 In Arbeit\n\n`;
    byStatus.yellow.forEach(task => {
      md += formatTaskAsCheckbox(task);
    });
    md += '\n';
  }

  // Erledigt (green)
  if (byStatus.green.length > 0) {
    md += `### 🟢 Erledigt\n\n`;
    byStatus.green.forEach(task => {
      md += formatTaskAsCheckbox(task);
    });
    md += '\n';
  }

  // Verfallen (white)
  if (byStatus.white.length > 0) {
    md += `### ⚪ Verfallen/Abgebrochen\n\n`;
    byStatus.white.forEach(task => {
      md += formatTaskAsCheckbox(task);
    });
    md += '\n';
  }

  return md;
}

/**
 * Generate index Markdown
 */
function generateIndexMarkdown(grouped) {
  const currentKw = getCurrentKw();
  const currentYear = getCurrentYear();

  let md = `---
tags:
  - tasks
  - index
---

# Task-Index

> Generiert am: ${new Date().toLocaleDateString('de-DE')} ${new Date().toLocaleTimeString('de-DE')}

## Kalenderwochen

| KW | Zeitraum | Tasks | Fortschritt |
|----|----------|-------|-------------|
`;

  // Sort KWs
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const [kwA, yearA] = a.split('-').map(Number);
    const [kwB, yearB] = b.split('-').map(Number);
    if (yearB !== yearA) return yearB - yearA;
    return kwB - kwA;
  });

  for (const kwKey of sortedKeys) {
    const [kw, year] = kwKey.split('-').map(Number);
    const tasks = grouped[kwKey];
    const dateRange = getKwDateRange(kw, year);
    const stats = calculateStats(tasks);
    const progress = tasks.length > 0 ? Math.round((stats.green / tasks.length) * 100) : 0;
    const isCurrent = kw === currentKw && year === currentYear;

    md += `| [[KW${String(kw).padStart(2, '0')}-${year}\\|${formatKwString(kw, year)}]]${isCurrent ? ' ⭐' : ''} | ${dateRange.startFormatted} - ${dateRange.endFormatted} | ${tasks.length} | ${progress}% |\n`;
  }

  return md;
}

/**
 * Generate dashboard Markdown
 */
function generateDashboardMarkdown(currentTasks, allTasks) {
  const currentKw = getCurrentKw();
  const currentYear = getCurrentYear();
  const dateRange = getKwDateRange(currentKw, currentYear);

  let md = `---
tags:
  - tasks
  - dashboard
---

# 📋 Task Dashboard

> Aktualisiert: ${new Date().toLocaleDateString('de-DE')} ${new Date().toLocaleTimeString('de-DE')}

## Aktuelle Woche: ${formatKwString(currentKw, currentYear)}

**Zeitraum:** ${dateRange.startFormatted} - ${dateRange.endFormatted}

`;

  if (currentTasks.length === 0) {
    md += `> Keine Tasks für diese Woche.\n\n`;
  } else {
    const stats = calculateStats(currentTasks);
    const progress = Math.round((stats.green / currentTasks.length) * 100);

    md += `### Fortschritt

\`\`\`
${createTextProgressBar(progress)} ${progress}%
\`\`\`

🟢 ${stats.green} erledigt | 🟡 ${stats.yellow} offen | 🔴 ${stats.red} blockiert

### Offene Tasks

`;

    // Show open and blocked tasks
    const openTasks = currentTasks.filter(t => t.status === 'yellow' || t.status === 'red');
    openTasks.sort((a, b) => b.priority - a.priority);

    if (openTasks.length === 0) {
      md += `> ✅ Alle Tasks erledigt!\n\n`;
    } else {
      openTasks.forEach(task => {
        md += formatTaskAsCheckbox(task);
      });
    }
  }

  // Overall stats
  const overallStats = calculateStats(allTasks);
  const overallProgress = allTasks.length > 0 ? Math.round((overallStats.green / allTasks.length) * 100) : 0;

  md += `
## Gesamtübersicht

| Metrik | Wert |
|--------|------|
| Aktive Tasks | ${allTasks.length} |
| Erledigt | ${overallStats.green} (${overallProgress}%) |
| Offen | ${overallStats.yellow} |
| Blockiert | ${overallStats.red} |

---

*Verwende \`task sync --obsidian\` um diese Datei zu aktualisieren.*
`;

  return md;
}

/**
 * Format task as Obsidian checkbox
 */
function formatTaskAsCheckbox(task) {
  const isChecked = task.status === 'green';
  const checkbox = isChecked ? '- [x]' : '- [ ]';
  const priority = task.priority >= 3 ? ` ⚡` : '';
  const tags = task.tags && task.tags.length > 0
    ? ' ' + task.tags.map(t => `#${t}`).join(' ')
    : '';

  let line = `${checkbox} ${task.description}${priority}${tags}\n`;

  if (task.notes) {
    line += `    - 📝 ${task.notes}\n`;
  }

  return line;
}

/**
 * Create text-based progress bar
 */
function createTextProgressBar(percentage, width = 20) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Group tasks by KW
 */
function groupTasksByKw(tasks) {
  const grouped = {};
  tasks.forEach(task => {
    const key = `${task.kw}-${task.year}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(task);
  });
  return grouped;
}

/**
 * Calculate stats
 */
function calculateStats(tasks) {
  return {
    green: tasks.filter(t => t.status === 'green').length,
    yellow: tasks.filter(t => t.status === 'yellow').length,
    red: tasks.filter(t => t.status === 'red').length,
    white: tasks.filter(t => t.status === 'white').length
  };
}
