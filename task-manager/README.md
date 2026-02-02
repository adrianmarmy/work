# Task Manager CLI

CLI-basierter Task-Manager mit KW-Archivierung, Statusfarben und Export-Funktionen.

## Installation

```bash
# Im Projektverzeichnis
npm install

# Global installieren (optional)
npm link
```

## Verwendung

```bash
# Wenn global installiert:
task <befehl> [optionen]

# Ohne globale Installation:
npm start -- <befehl> [optionen]
# oder
node src/cli.js <befehl> [optionen]
```

## Befehle

### Task erstellen

```bash
task add "Beschreibung" [optionen]

Optionen:
  -k, --kw <nummer>       Kalenderwoche (Standard: aktuelle KW)
  -y, --year <jahr>       Jahr (Standard: aktuelles Jahr)
  -c, --color <farbe>     Statusfarbe: green, yellow, red, white
  -p, --priority <1-4>    Priorität: 1=niedrig, 2=normal, 3=hoch, 4=kritisch
  -t, --tag <tag>         Tag hinzufügen (mehrfach verwendbar)
  -n, --notes <text>      Notizen zum Task
```

**Beispiele:**
```bash
task add "TikTok-Videos hochladen" --kw 6 --color yellow --tag social-media
task add "Meeting vorbereiten" -p 3 -t arbeit
task add "Bug fixen" --status red --priority 4
```

### Tasks anzeigen

```bash
task list [optionen]
task ls [optionen]

Optionen:
  -k, --kw <nummer>       Nach Kalenderwoche filtern
  -s, --status <status>   Nach Status filtern
  -p, --priority <1-4>    Nach Priorität filtern
  -t, --tag <tag>         Nach Tag filtern
  -q, --search <query>    Volltextsuche
  --today                 Nur Tasks der aktuellen KW
  --archived              Archivierte Tasks anzeigen
  --notes                 Notizen anzeigen
  --compact               Kompakte Ansicht
```

**Beispiele:**
```bash
task list                    # Alle offenen Tasks
task list --kw 6             # Nur KW06
task list --status yellow    # Nur gelbe Tasks
task list --tag social-media # Nach Tag filtern
task list --today            # Aktuelle KW
task ls -q "video"           # Suche nach "video"
```

### Task aktualisieren

```bash
task update <id> [optionen]
task edit <id> [optionen]

Optionen:
  -s, --status <status>   Neuer Status
  -c, --color <farbe>     Neue Statusfarbe
  -k, --kw <nummer>       Neue Kalenderwoche
  -p, --priority <1-4>    Neue Priorität
  -d, --description       Neue Beschreibung
  -n, --notes <text>      Neue Notizen
  --add-tag <tag>         Tag hinzufügen
  --remove-tag <tag>      Tag entfernen
```

**Beispiele:**
```bash
task update abc123 --status green      # Status ändern
task update abc123 --kw 7              # KW verschieben
task update abc123 --priority 4 -c red # Prio + Status ändern
```

### Bulk-Update (Move)

```bash
task move --kw <nummer> [optionen]

Optionen:
  -k, --kw <nummer>       Quell-Kalenderwoche (erforderlich)
  -s, --status <status>   Neuer Status für alle Tasks
  --to-kw <nummer>        Ziel-Kalenderwoche
```

**Beispiele:**
```bash
task move --kw 5 --status green    # Alle KW05 Tasks → erledigt
task move --kw 5 --to-kw 6         # Alle KW05 Tasks → KW06
```

### Task löschen

```bash
task delete <id>
task rm <id>

Optionen:
  -f, --force    Ohne Bestätigung löschen
```

### Archivierung

```bash
task archive [optionen]

Optionen:
  -k, --kw <nummer>    Kalenderwoche zum Archivieren
  --auto               Alte KWs automatisch archivieren
  -w, --weeks <n>      Anzahl Wochen für Auto-Archivierung
  -f, --force          Auch aktuelle KW archivieren
```

**Beispiele:**
```bash
task archive --kw 5     # KW05 archivieren
task archive --auto     # Alte KWs automatisch archivieren
```

### Export

```bash
task export [optionen]

Optionen:
  -f, --format <format>  Exportformat: md, docx, json (Standard: md)
  -k, --kw <nummer>      Nur bestimmte KW exportieren
  -o, --output <name>    Ausgabedateiname
  --all                  Inkl. archivierte Tasks
  --stdout               Ausgabe auf Konsole (nur md/json)
```

**Beispiele:**
```bash
task export --format md --kw 6        # Markdown für KW06
task export --format docx             # DOCX Export
task export --format json --all       # Vollständiges JSON Backup
task export -f md --stdout > report.md
```

### Statistiken

```bash
task stats [optionen]

Optionen:
  -k, --kw <nummer>    Statistik für bestimmte KW
```

**Beispiele:**
```bash
task stats         # Gesamtübersicht
task stats --kw 6  # Detail-Statistik KW06
```

## Statusfarben

| Farbe   | Emoji | Bedeutung             |
|---------|-------|-----------------------|
| green   | 🟢    | Erledigt              |
| yellow  | 🟡    | In Arbeit / Offen     |
| red     | 🔴    | Blockiert / Dringend  |
| white   | ⚪    | Verfallen / Abgebrochen|

Status-Aliase:
- `green`: erledigt, done, fertig
- `yellow`: offen, open, in-arbeit, inprogress
- `red`: blockiert, blocked, dringend, urgent
- `white`: verfallen, abgebrochen, cancelled

## Prioritäten

| Level | Bedeutung |
|-------|-----------|
| 1     | Niedrig   |
| 2     | Normal    |
| 3     | Hoch      |
| 4     | Kritisch  |

## Datenstruktur

Tasks werden in `data/tasks.json` gespeichert:

```json
{
  "tasks": [
    {
      "id": "uuid",
      "description": "TikTok-Videos hochladen",
      "kw": 6,
      "year": 2026,
      "status": "yellow",
      "priority": 2,
      "tags": ["social-media", "video"],
      "notes": "Für KW06 vorbereiten",
      "created": "2026-02-01T10:00:00Z",
      "updated": "2026-02-01T14:30:00Z"
    }
  ],
  "archived": [],
  "config": {
    "autoArchiveWeeks": 4,
    "defaultKw": "current",
    "exportPath": "./exports"
  }
}
```

## Workflow-Beispiel

```bash
# Morgens: Heutige Tasks anzeigen
task list --today

# Task-Update während der Arbeit
task update abc123 --status green

# Freitags: Letzte KW archivieren
task archive --kw 5

# Wochenbericht erstellen
task export --format md --kw 6 > KW06-report.md

# Statistik überprüfen
task stats
```

## Lizenz

MIT
