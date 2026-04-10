/**
 * modeDetector.ts — FINAL RELEASE
 *
 * STRICT PRIORITY ORDER:
 *   1. CASE  — personal situation signals ("my", "I was", "my brother")
 *   2. IPC   — explicit IPC/section references ("IPC 302", "section 420")
 *   3. KNOWLEDGE — everything else
 *
 * CRITICAL RULE: Case signals ALWAYS win, even if query also mentions IPC.
 * Reason: "My brother used IPC against me" is a CASE, not an IPC lookup.
 */

export type AgentMode = 'greeting' | 'casual' | 'ipc' | 'knowledge' | 'case';

// ─── CASE SIGNALS — personal situation indicators ─────────────────────────────
// These MUST win over all other patterns (highest priority)
const CASE_SIGNALS: RegExp[] = [
  // Personal pronouns + possessives
  /\bmy\b/i,
  /\bi\s+(am|was|have|had|got|want|need|did|cannot|can't|don't)\b/i,
  /\bme\b/i,
  /\bhelp me\b/i,
  /\bwhat should i\b/i,

  // Family members
  /\bmy (brother|sister|father|mother|wife|husband|son|daughter|uncle|aunt|cousin|relative|family|neighbour|neighbor|landlord|tenant)\b/i,

  // Property personal
  /\bmy (land|property|house|home|flat|plot|farm|shop|building|room)\b/i,

  // Employment personal
  /\bmy (job|salary|wages|office|employer|company|boss|manager|colleague)\b/i,

  // Legal situation personal
  /\b(arrested|detained|threatened|beaten|cheated|harassed|fired|terminated|evicted|assaulted|abused|stalked|blackmailed)\b/i,
  /\b(fir against me|case against me|notice to me|summons|complain against)\b/i,
  /\b(bail|anticipatory bail|police came|police took)\b/i,

  // Dispute signals
  /\b(dispute|fight|conflict|problem with|issue with|trouble with|neighbour took|someone took|they took|he took|she took)\b/i,
  /\b(illegally|without permission|without consent|taking my|occupying my|encroached|encroachment)\b/i,
];

// ─── IPC PATTERNS — only when NO personal signal above ───────────────────────
const IPC_PATTERNS: RegExp[] = [
  /\bipc\b/i,
  /\bindian penal code\b/i,
  /\bsection\s+\d+/i,
  /\bipc[\s-]*\d+/i,
  /^\d+[a-z]?\s*(explain|define|meaning|what|tell)?$/i,  // bare number like "420"
];

// ─── KNOWLEDGE STARTERS ───────────────────────────────────────────────────────
const KNOWLEDGE_STARTERS: string[] = [
  'what is', 'what are', 'explain ', 'define ', 'describe ', 'tell me about',
  'how does', 'meaning of', 'difference between', 'elaborate', 'clarify',
  'what do you mean', 'give me information',
];

const KNOWLEDGE_KEYWORDS: string[] = [
  'article', 'constitution', 'constitutional', 'fundamental right',
  'directive principle', 'preamble', 'crpc', 'criminal procedure code',
  'parliament', 'supreme court', 'high court', 'judiciary',
  'citizenship', 'amendment', 'bharat', 'territory of india',
  'right to', 'freedom of',
];

// ─── GREETING words ───────────────────────────────────────────────────────────────────
const GREETINGS = new Set([
  'hi', 'hello', 'hey', 'hii', 'helo', 'heyy', 'hai', 'sup', 'yo',
  'hi there', 'hello there', 'good morning', 'good evening', 'good afternoon',
  'greetings', 'howdy', 'namaste', 'vanakkam', 'salaam',
]);

// ─── CASUAL / acknowledgement words ────────────────────────────────────────────────────
const CASUALS = new Set([
  'ok', 'okay', 'k', 'ok', 'fine', 'sure', 'alright',
  'thanks', 'thank you', 'thankyou', 'ty', 'thx', 'thank u',
  'got it', 'noted', 'understood', 'yes', 'no', 'nope', 'yep', 'yeah',
  'cool', 'great', 'nice', 'good', 'perfect', 'wow', 'amazing',
  'bye', 'goodbye', 'see you', 'cya', 'later',
]);

// ─── MAIN DETECTOR ───────────────────────────────────────────────────────────────────
export const detectMode = (query: string): AgentMode => {
  const q = query.toLowerCase().trim();

  // ══════════════════════════════════════════════════
  // STEP 0a — GREETING (highest priority)
  // Short social messages must NEVER trigger legal engines
  // ══════════════════════════════════════════════════
  if (GREETINGS.has(q)) return 'greeting';

  // ══════════════════════════════════════════════════
  // STEP 0b — CASUAL / acknowledgement
  // ok / thanks / got it / bye — never legal
  // ══════════════════════════════════════════════════
  if (CASUALS.has(q)) return 'casual';

  // ══════════════════════════════════════════════════
  // STEP 1 — CASE ENGINE (personal situation signals)
  // ══════════════════════════════════════════════════
  if (CASE_SIGNALS.some(pattern => pattern.test(query))) return 'case';

  // ══════════════════════════════════════════════════
  // STEP 2 — IPC ENGINE (explicit section reference)
  // ══════════════════════════════════════════════════
  if (IPC_PATTERNS.some(pattern => pattern.test(q))) return 'ipc';

  // ══════════════════════════════════════════════════
  // STEP 3 — KNOWLEDGE ENGINE
  // ══════════════════════════════════════════════════
  if (KNOWLEDGE_STARTERS.some(kw => q.startsWith(kw) || q.includes(kw))) return 'knowledge';
  if (KNOWLEDGE_KEYWORDS.some(kw => q.includes(kw))) return 'knowledge';

  // ══════════════════════════════════════════════════
  // STEP 4 — DEFAULT: knowledge (never fail)
  // ══════════════════════════════════════════════════
  return 'knowledge';
};
