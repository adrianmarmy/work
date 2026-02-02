import { writeFileSync } from 'fs';
import { join } from 'path';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { getExportsDir, STATUS, PRIORITY } from '../config.js';
import { formatKwString, getKwDateRange } from './kw.js';

/**
 * Export tasks to Markdown format
 * @param {Array} tasks - Array of tasks
 * @param {Object} options - Export options
 * @returns {string} Markdown content
 */
export function exportToMarkdown(tasks, options = {}) {
  const { title = 'Task-Liste', includeStats = true } = options;

  // Group tasks by KW
  const grouped = groupTasksByKw(tasks);

  let md = `# ${title}\n\n`;
  md += `> Exportiert am: ${new Date().toLocaleDateString('de-DE')} ${new Date().toLocaleTimeString('de-DE')}\n\n`;

  if (includeStats) {
    const stats = calculateStats(tasks);
    md += `## Übersicht\n\n`;
    md += `| Status | Anzahl |\n`;
    md += `|--------|--------|\n`;
    md += `| 🟢 Erledigt | ${stats.green} |\n`;
    md += `| 🟡 In Arbeit | ${stats.yellow} |\n`;
    md += `| 🔴 Blockiert | ${stats.red} |\n`;
    md += `| ⚪ Verfallen | ${stats.white} |\n`;
    md += `| **Gesamt** | **${stats.total}** |\n\n`;
  }

  // Output by KW
  for (const [kwKey, kwTasks] of Object.entries(grouped)) {
    const [kw, year] = kwKey.split('-').map(Number);
    const dateRange = getKwDateRange(kw, year);

    md += `## ${formatKwString(kw, year)} (${dateRange.startFormatted} - ${dateRange.endFormatted})\n\n`;

    // Sort by priority (high to low), then by status
    const sorted = sortTasks(kwTasks);

    for (const task of sorted) {
      const statusEmoji = STATUS[task.status]?.emoji || '🟡';
      const prioLabel = `P${task.priority}`;

      md += `- ${statusEmoji} **[${prioLabel}]** ${task.description}`;

      if (task.tags && task.tags.length > 0) {
        md += ` \`${task.tags.map(t => '#' + t).join(' ')}\``;
      }

      md += '\n';

      if (task.notes) {
        md += `  - _${task.notes}_\n`;
      }
    }

    md += '\n';
  }

  return md;
}

/**
 * Export tasks to DOCX format
 * @param {Array} tasks - Array of tasks
 * @param {Object} options - Export options
 * @returns {Promise<Buffer>} DOCX buffer
 */
export async function exportToDocx(tasks, options = {}) {
  const { title = 'Task-Liste' } = options;

  // Group tasks by KW
  const grouped = groupTasksByKw(tasks);

  const children = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Exportiert am: ${new Date().toLocaleDateString('de-DE')} ${new Date().toLocaleTimeString('de-DE')}`,
          italics: true,
          size: 20
        })
      ]
    }),
    new Paragraph({})
  ];

  // Add stats
  const stats = calculateStats(tasks);
  children.push(
    new Paragraph({
      text: 'Übersicht',
      heading: HeadingLevel.HEADING_1
    }),
    createStatsTable(stats)
  );

  // Add tasks by KW
  for (const [kwKey, kwTasks] of Object.entries(grouped)) {
    const [kw, year] = kwKey.split('-').map(Number);
    const dateRange = getKwDateRange(kw, year);

    children.push(
      new Paragraph({}),
      new Paragraph({
        text: `${formatKwString(kw, year)} (${dateRange.startFormatted} - ${dateRange.endFormatted})`,
        heading: HeadingLevel.HEADING_1
      })
    );

    const sorted = sortTasks(kwTasks);

    for (const task of sorted) {
      const statusEmoji = STATUS[task.status]?.emoji || '🟡';
      const statusLabel = STATUS[task.status]?.label || 'Offen';

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${statusEmoji} `,
            }),
            new TextRun({
              text: `[P${task.priority}] `,
              bold: true
            }),
            new TextRun({
              text: task.description
            }),
            ...(task.tags && task.tags.length > 0
              ? [new TextRun({
                  text: ` (${task.tags.map(t => '#' + t).join(', ')})`,
                  italics: true,
                  color: '666666'
                })]
              : []
            )
          ],
          bullet: { level: 0 }
        })
      );

      if (task.notes) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: task.notes,
                italics: true,
                color: '888888'
              })
            ],
            indent: { left: 720 }
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [{
      children
    }]
  });

  return await Packer.toBuffer(doc);
}

/**
 * Export tasks to JSON format
 * @param {Array} tasks - Array of tasks
 * @param {Object} options - Export options
 * @returns {string} JSON string
 */
export function exportToJson(tasks, options = {}) {
  const { pretty = true, includeMetadata = true } = options;

  const data = includeMetadata
    ? {
        exportedAt: new Date().toISOString(),
        count: tasks.length,
        tasks
      }
    : tasks;

  return pretty
    ? JSON.stringify(data, null, 2)
    : JSON.stringify(data);
}

/**
 * Save export to file
 * @param {string} content - Content to save
 * @param {string} filename - Filename
 * @param {string} format - Format (md, json, docx)
 * @returns {string} Full path to saved file
 */
export async function saveExport(content, filename, format) {
  const ext = format === 'docx' ? 'docx' : format === 'json' ? 'json' : 'md';
  const fullPath = join(getExportsDir(), `${filename}.${ext}`);

  if (format === 'docx') {
    writeFileSync(fullPath, content);
  } else {
    writeFileSync(fullPath, content, 'utf-8');
  }

  return fullPath;
}

// Helper functions

function groupTasksByKw(tasks) {
  const grouped = {};

  tasks.forEach(task => {
    const key = `${task.kw}-${task.year}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(task);
  });

  // Sort keys by year and KW
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const [kwA, yearA] = a.split('-').map(Number);
    const [kwB, yearB] = b.split('-').map(Number);

    if (yearA !== yearB) return yearA - yearB;
    return kwA - kwB;
  });

  const sortedGrouped = {};
  sortedKeys.forEach(key => {
    sortedGrouped[key] = grouped[key];
  });

  return sortedGrouped;
}

function sortTasks(tasks) {
  return tasks.slice().sort((a, b) => {
    // Sort by priority (high to low)
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }

    // Then by status (red first, then yellow, then green, then white)
    const statusOrder = { red: 0, yellow: 1, green: 2, white: 3 };
    return (statusOrder[a.status] || 1) - (statusOrder[b.status] || 1);
  });
}

function calculateStats(tasks) {
  const stats = { green: 0, yellow: 0, red: 0, white: 0, total: tasks.length };

  tasks.forEach(task => {
    if (stats[task.status] !== undefined) {
      stats[task.status]++;
    }
  });

  return stats;
}

function createStatsTable(stats) {
  return new Table({
    width: { size: 50, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: 'Status', bold: true })],
            shading: { fill: 'EEEEEE' }
          }),
          new TableCell({
            children: [new Paragraph({ text: 'Anzahl', bold: true })],
            shading: { fill: 'EEEEEE' }
          })
        ]
      }),
      createStatRow('🟢 Erledigt', stats.green),
      createStatRow('🟡 In Arbeit', stats.yellow),
      createStatRow('🔴 Blockiert', stats.red),
      createStatRow('⚪ Verfallen', stats.white),
      createStatRow('Gesamt', stats.total, true)
    ]
  });
}

function createStatRow(label, count, bold = false) {
  return new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: label, bold })]
        })]
      }),
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: String(count), bold })]
        })]
      })
    ]
  });
}
