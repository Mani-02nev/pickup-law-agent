/**
 * suggestions.ts
 *
 * Smart follow-up suggestion generator.
 * Produces contextual action chips after every agent response.
 */

import { Suggestion, LegalCategory } from './types';
import { AgentMode } from './modeDetector';

// ─── IPC Suggestions ──────────────────────────────────────────────────────────
const IPC_SUGGESTIONS: Suggestion[] = [
  { icon: '⚖️', label: 'Related IPC sections', query: 'What IPC sections are related to this?' },
  { icon: '📖', label: 'Punishment in detail',  query: 'Explain the punishment in detail' },
  { icon: '⚡', label: 'Bail provisions',        query: 'What are the bail provisions for this offense?' },
  { icon: '🏛️', label: 'Court procedure',        query: 'What is the court procedure for this case?' },
];

// ─── Knowledge Suggestions ────────────────────────────────────────────────────
const KNOWLEDGE_SUGGESTIONS: Suggestion[] = [
  { icon: '📋', label: 'Real case examples',    query: 'Give me real case examples of this law' },
  { icon: '⚖️', label: 'Related laws',           query: 'What are related laws and provisions?' },
  { icon: '📝', label: 'How to use this right',  query: 'How can I use this legal right in practice?' },
  { icon: '🏛️', label: 'Supreme Court view',     query: 'What is the Supreme Court stand on this?' },
];

// ─── Case Suggestions by Category ────────────────────────────────────────────
const CASE_SUGGESTIONS: Record<LegalCategory, Suggestion[]> = {
  property_case: [
    { icon: '📄', label: 'Required documents',    query: 'What documents are needed to win a property case?' },
    { icon: '⚖️', label: 'Property ownership laws', query: 'Explain property ownership laws in India' },
    { icon: '📬', label: 'Legal notice process',  query: 'How to send a legal notice for property dispute?' },
    { icon: '🏛️', label: 'File civil case',        query: 'How to file a property dispute case in civil court?' },
  ],
  criminal_case: [
    { icon: '📋', label: 'FIR process',           query: 'How to file an FIR in India?' },
    { icon: '🔓', label: 'Bail application',       query: 'How to apply for bail in India?' },
    { icon: '⚖️', label: 'Rights as accused',      query: 'What are my rights as an accused person?' },
    { icon: '👤', label: 'Rights as victim',        query: 'What are my rights as a crime victim?' },
  ],
  family_case: [
    { icon: '💔', label: 'Divorce procedure',      query: 'What is the divorce procedure in India?' },
    { icon: '👶', label: 'Child custody law',       query: 'How is child custody decided in India?' },
    { icon: '💰', label: 'Maintenance rights',      query: 'What are maintenance rights under Indian law?' },
    { icon: '🛡️', label: 'DV Act protection',       query: 'What protection does the Domestic Violence Act give?' },
  ],
  employment_case: [
    { icon: '📝', label: 'Labour complaint',       query: 'How to file a labour complaint in India?' },
    { icon: '💸', label: 'Salary recovery',        query: 'How to recover unpaid salary legally?' },
    { icon: '🚫', label: 'Wrongful termination',   query: 'What are my rights after wrongful termination?' },
    { icon: '🤝', label: 'Gratuity rights',         query: 'What is my entitlement to gratuity?' },
  ],
  unknown: [
    { icon: '⚖️', label: 'IPC basics',             query: 'Explain the most important IPC sections' },
    { icon: '🏛️', label: 'Constitutional rights',   query: 'What are my fundamental rights under the Constitution?' },
    { icon: '📋', label: 'Legal process overview',  query: 'Give me an overview of the Indian legal system' },
    { icon: '📬', label: 'How to find a lawyer',    query: 'How do I find and appoint a lawyer in India?' },
  ],
};

// ─── Main Generator ───────────────────────────────────────────────────────────
export function generateSuggestions(mode: AgentMode | null, category?: LegalCategory): Suggestion[] {
  if (mode === 'ipc')       return IPC_SUGGESTIONS.slice(0, 3);
  if (mode === 'knowledge') return KNOWLEDGE_SUGGESTIONS.slice(0, 3);
  if (mode === 'case' && category) return (CASE_SUGGESTIONS[category] || CASE_SUGGESTIONS.unknown).slice(0, 4);
  return KNOWLEDGE_SUGGESTIONS.slice(0, 3);
}

