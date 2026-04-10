/**
 * ipcParser.ts — v3 FINAL
 *
 * FIXES:
 *  1. Proper RFC-4180 CSV parser — handles multi-line quoted fields correctly
 *  2. Robust field extraction — description is col 0, offense col 1, punishment col 2, section col 3
 *  3. Multiple lookup aliases per section (e.g. "498a" => "498A")
 *  4. Lawyer-quality text extraction from description field
 *
 * CSV columns: Description, Offense, Punishment, Section
 * Section format in CSV: IPC_302, IPC_498A, IPC_121A, etc.
 */

import { LegalKnowledge } from './types';
import rawCsv from '../data/ipc_sections.csv?raw';

interface RawIPCRow {
  description: string;
  offense:     string;
  punishment:  string;
  section:     string; // e.g. "IPC_302"
}

// ─── RFC-4180 compliant CSV parser ───────────────────────────────────────────
// Handles: multi-line quoted fields, escaped quotes (""), \r\n and \n endings
function parseCSV(csv: string): RawIPCRow[] {
  const rows: RawIPCRow[] = [];

  // Normalise all line endings to \n
  const text = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  let pos    = 0;
  const len  = text.length;

  function parseField(): string {
    if (pos >= len) return '';
    if (text[pos] === '"') {
      // Quoted field
      pos++; // skip opening quote
      let value = '';
      while (pos < len) {
        if (text[pos] === '"') {
          if (text[pos + 1] === '"') { value += '"'; pos += 2; } // escaped quote
          else { pos++; break; }                                  // closing quote
        } else {
          value += text[pos++];
        }
      }
      return value.trim();
    } else {
      // Unquoted field — read until comma or newline
      let value = '';
      while (pos < len && text[pos] !== ',' && text[pos] !== '\n') {
        value += text[pos++];
      }
      return value.trim();
    }
  }

  function parseLine(): string[] {
    const fields: string[] = [];
    while (pos < len && text[pos] !== '\n') {
      fields.push(parseField());
      if (pos < len && text[pos] === ',') pos++; // skip comma separator
    }
    if (pos < len && text[pos] === '\n') pos++;   // skip newline
    return fields;
  }

  // Skip header row
  parseLine();

  // Parse data rows
  while (pos < len) {
    const fields = parseLine();
    if (fields.length >= 4 && fields[3].startsWith('IPC_')) {
      rows.push({
        description: fields[0],
        offense:     fields[1],
        punishment:  fields[2],
        section:     fields[3],
      });
    }
  }

  return rows;
}

// ─── Extract clean legal explanation ─────────────────────────────────────────
function extractExplanation(desc: string, offense: string): string {
  if (!desc || desc.length < 20) return offense;

  // Try to find "According to section X" sentence
  const match = desc.match(/According to section[^,\n]+,\s*([^]+?)(?:\n\n|---|\$)/i);
  if (match && match[1].trim().length > 30) return match[1].trim().replace(/\n+/g, ' ');

  // Try paragraph after "Section X of IPC"  
  const match2 = desc.match(/Section \d+[A-Z]? of the Indian Penal Code[^.]+\.\s*([^]+?)(?:\n\n|---|$)/i);
  if (match2 && match2[1].trim().length > 20) return (match2[0] + ' ' + match2[1]).trim().replace(/\n+/g, ' ');

  // Fall back to first 500 chars, cleaned
  return desc.replace(/\n+/g, ' ').replace(/---+/g, '').trim().slice(0, 500);
}

// ─── Extract "In Simple Words" section ────────────────────────────────────────
function extractSimpleWords(desc: string, offense: string): string {
  const idx = desc.toLowerCase().indexOf('in simple words');
  if (idx !== -1) {
    const after = desc.slice(idx).replace(/^in simple words[\s\n:]+/i, '').trim();
    const clean = after.replace(/\n+/g, ' ').replace(/---+/g, '').slice(0, 300);
    if (clean.length > 20) return clean;
  }
  // Fallback: rephrase offense simply
  return `Under IPC, ${offense.toLowerCase()} is a punishable offense that courts take seriously.`;
}

// ─── Build lawyer-quality key points ─────────────────────────────────────────
function buildKeyPoints(row: RawIPCRow): string[] {
  const points: string[] = [];
  const num = row.section.replace('IPC_', '');
  points.push(`Defined under IPC Section ${num}`);
  if (row.offense)     points.push(`Offense: ${row.offense}`);
  if (row.punishment)  points.push(`Penalty: ${row.punishment}`);

  // Add cognizable classification hints
  const p = row.punishment.toLowerCase();
  if (p.includes('death') || p.includes('life')) {
    points.push('Cognizable and non-bailable offense — police can arrest without warrant');
    points.push('Trial held in Sessions Court');
  } else if (p.includes('year') || p.includes('imprisonment')) {
    points.push('Cognizable offense — FIR can be filed directly');
  }
  if (p.includes('fine')) points.push('Financial penalty (fine) may also be imposed by the court');
  return points;
}

// ─── Convert row → LegalKnowledge ────────────────────────────────────────────
function rowToKnowledge(row: RawIPCRow): LegalKnowledge {
  const num    = row.section.replace('IPC_', '');
  const title  = `IPC Section ${num} — ${row.offense}`;
  const explanation   = extractExplanation(row.description, row.offense);
  const simpleWords   = extractSimpleWords(row.description, row.offense);

  return {
    title,
    category:           'Criminal Law / IPC',
    summary:            row.offense || `Offense under IPC Section ${num}`,
    explanation:        explanation || row.offense,
    punishment:         row.punishment  || 'Punishment as determined by the court',
    simpleExplanation:  simpleWords,
    keyPoints:          buildKeyPoints(row),
  };
}

// ─── Build lookup map (lazy-initialized) ─────────────────────────────────────
let _ipcMap: Map<string, LegalKnowledge> | null = null;

export function getIPCMap(): Map<string, LegalKnowledge> {
  if (_ipcMap) return _ipcMap;
  _ipcMap = new Map();

  const rows = parseCSV(rawCsv);

  for (const row of rows) {
    // Primary key: numeric part lowercase, e.g. "302", "498a", "121a"
    const rawKey = row.section.replace('IPC_', '');
    const key    = rawKey.toLowerCase();

    if (!_ipcMap.has(key)) {
      _ipcMap.set(key, rowToKnowledge(row));
    }

    // Also store WITHOUT letter suffix as alias if numeric only, e.g. "304" for "304A"
    const numOnly = rawKey.replace(/[a-z]+$/i, '').toLowerCase();
    if (numOnly !== key && !_ipcMap.has(numOnly)) {
      _ipcMap.set(numOnly, rowToKnowledge(row));
    }
  }

  return _ipcMap;
}

/** Lookup by section string like "302", "420", "498A", "498a" */
export function lookupIPCSection(sectionNum: string): LegalKnowledge | null {
  const map = getIPCMap();
  const key = sectionNum.toLowerCase().trim();
  return map.get(key) ?? null;
}
