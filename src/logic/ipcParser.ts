/**
 * ipcParser.ts
 * Parses the bundled ipc_sections.csv and builds a fast in-memory lookup map.
 * CSV columns: Description, Offense, Punishment, Section
 */

import { LegalKnowledge } from './types';

// Vite raw import of the CSV
import rawCsv from '../data/ipc_sections.csv?raw';

interface RawIPCRow {
  description: string;
  offense: string;
  punishment: string;
  section: string; // e.g. "IPC_127"
}

// ─── Parse CSV ──────────────────────────────────────────────────────────────
function parseCSV(csv: string): RawIPCRow[] {
  const rows: RawIPCRow[] = [];
  let i = 0;
  const lines = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Skip header row
  const firstNewline = lines.indexOf('\n');
  i = firstNewline + 1;

  while (i < lines.length) {
    // Parse a complete record (may span multiple lines due to quoted fields)
    const fields: string[] = [];
    let field = '';
    let inQuotes = false;

    while (i < lines.length) {
      const ch = lines[i];

      if (inQuotes) {
        if (ch === '"') {
          if (lines[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            inQuotes = false;
            i++;
          }
        } else {
          field += ch;
          i++;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
          i++;
        } else if (ch === ',') {
          fields.push(field.trim());
          field = '';
          i++;
        } else if (ch === '\n') {
          fields.push(field.trim());
          field = '';
          i++;
          break;
        } else {
          field += ch;
          i++;
        }
      }
    }

    if (fields.length >= 4) {
      rows.push({
        description: fields[0],
        offense: fields[1],
        punishment: fields[2],
        section: fields[3],
      });
    }
  }

  return rows;
}

// ─── Extract simple words block ─────────────────────────────────────────────
function extractSimpleWords(description: string): string {
  const marker = 'in Simple Words\n';
  const idx = description.toLowerCase().indexOf('in simple words\n');
  if (idx === -1) return '';
  return description.slice(idx + marker.length).trim();
}

// ─── Extract full legal explanation ─────────────────────────────────────────
function extractExplanation(description: string): string {
  // Grab the paragraph after "According to section X of Indian penal code,"
  const match = description.match(/According to section [^\n,]+,\s*([\s\S]*?)(?:IPC \d|$)/i);
  if (match) return match[1].trim().replace(/\n+/g, ' ');
  return description.slice(0, 400).trim();
}

// ─── Build Knowledge from row ────────────────────────────────────────────────
function rowToKnowledge(row: RawIPCRow): LegalKnowledge {
  const sectionLabel = row.section.replace('IPC_', 'IPC Section ');
  const simpleWords = extractSimpleWords(row.description);
  const explanation = extractExplanation(row.description);

  return {
    title: sectionLabel,
    category: 'Criminal Law / IPC',
    summary: row.offense || 'See full description.',
    explanation: explanation || row.offense,
    punishment: row.punishment || 'Refer to Bare Act.',
    simpleExplanation: simpleWords || row.offense,
    keyPoints: [
      `Section identifier: ${row.section.replace('_', ' ')}`,
      `Offense: ${row.offense}`,
      `Penalty: ${row.punishment}`,
    ],
  };
}

// ─── Build lookup map (lazy-initialized) ────────────────────────────────────
let _ipcMap: Map<string, LegalKnowledge> | null = null;

export function getIPCMap(): Map<string, LegalKnowledge> {
  if (_ipcMap) return _ipcMap;

  _ipcMap = new Map();
  const rows = parseCSV(rawCsv);

  for (const row of rows) {
    // Section key: e.g. "127", "121A"
    const key = row.section.replace('IPC_', '').toLowerCase();
    if (!_ipcMap.has(key)) {
      _ipcMap.set(key, rowToKnowledge(row));
    }
  }

  return _ipcMap;
}

/** Lookup a section by number string like "127", "420", "121A" */
export function lookupIPCSection(sectionNum: string): LegalKnowledge | null {
  const map = getIPCMap();
  return map.get(sectionNum.toLowerCase()) ?? null;
}
