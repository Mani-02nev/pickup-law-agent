/**
 * modeDetector.ts
 *
 * MULTI-ENGINE MODE DETECTOR
 * Returns one of 3 modes:
 *   'ipc'        → IPC section queries ("IPC 127", "420", "section 302")
 *   'knowledge'  → General legal knowledge ("What is...", "Explain", constitution, CRPC)
 *   'case'       → Personal legal situations ("my land", "my brother", "I was arrested")
 */

export type AgentMode = 'ipc' | 'knowledge' | 'case';

// ─── IPC patterns ────────────────────────────────────────────────────────────
const IPC_PATTERNS = [
  /\bipc\b/i,
  /\bindian penal code\b/i,
  /\bsection\s+\d+/i,
  /\bipc[\s-]*\d+/i,
];

// ─── Knowledge starters ──────────────────────────────────────────────────────
const KNOWLEDGE_STARTERS = [
  'what', 'explain', 'define', 'describe', 'tell me', 'how does',
  'what is', 'what are', 'meaning', 'meaning of', 'difference between',
  'elaborate', 'clarify',
];

// ─── Knowledge content keywords ──────────────────────────────────────────────
const KNOWLEDGE_CONTENT_KEYWORDS = [
  'article', 'constitution', 'constitutional', 'fundamental right',
  'directive principle', 'preamble', 'crpc', 'criminal procedure',
  'bare act', 'provision', 'law', 'act', 'territory', 'india',
  'parliament', 'supreme court', 'high court', 'judiciary',
  'rights', 'citizenship', 'amendment',
];

// ─── Case signal words (personal situation) ──────────────────────────────────
const CASE_KEYWORDS = [
  'my ', 'me ', ' me', ' i ', ' i\'', 'i am', 'i was', 'i have',
  'my brother', 'my sister', 'my father', 'my mother', 'my wife', 'my husband',
  'my land', 'my property', 'my house', 'my job', 'my salary',
  'i got', 'i need', 'i want', 'help me', 'what should i',
  'someone', 'neighbour', 'dispute', 'problem', 'issue', 'fight',
  'harassment', 'cheated', 'fraud on me', 'stolen', 'beaten',
  'terminated', 'fired', 'arrested', 'bail', 'fir against',
];

export const detectMode = (query: string): AgentMode => {
  const q = query.toLowerCase().trim();

  // ── 1. IPC ENGINE: explicit IPC / section reference ──
  if (IPC_PATTERNS.some((p) => p.test(q))) return 'ipc';

  // ── 2. Bare section number (e.g. "420", "302 explain") ──
  if (/^\d+[a-z]?\s*(explain|define|meaning|what|tell)?$/i.test(q)) return 'ipc';

  // ── 3. CASE ENGINE: personal situation signals ──
  if (CASE_KEYWORDS.some((kw) => q.includes(kw))) return 'case';

  // ── 4. KNOWLEDGE ENGINE: what/explain starters ──
  if (KNOWLEDGE_STARTERS.some((kw) => q.startsWith(kw) || q.includes(kw))) return 'knowledge';

  // ── 5. Knowledge content keywords (constitution / article / crpc) ──
  if (KNOWLEDGE_CONTENT_KEYWORDS.some((kw) => q.includes(kw))) return 'knowledge';

  // ── 6. Default → knowledge (never fail, always answer) ──
  return 'knowledge';
};
