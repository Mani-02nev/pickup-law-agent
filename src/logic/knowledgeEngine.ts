/**
 * knowledgeEngine.ts
 *
 * MULTI-ENGINE KNOWLEDGE SYSTEM
 *
 * Engine 1 — IPC ENGINE
 *   Handles: "IPC 127", "IPC 420", "section 302", bare numbers
 *   Source: ipc_sections.csv (2800+ rows via ipcParser)
 *   Fallback: inline DB for common sections
 *
 * Engine 2 — CONSTITUTION ENGINE
 *   Handles: "What is India", "Article 14", "territory of India", CRPC
 *   Source: constitutionEngine.ts (constitution_qa.json, crpc_qa.json, hardcoded)
 *
 * Engine 3 — FALLBACK INTELLIGENCE
 *   Never fails. Builds a best-effort answer from any query.
 *   No error messages. No "refine query" messages.
 */

import { LegalKnowledge, LegalReport } from './types';
import { lookupIPCSection } from './ipcParser';
import { runConstitutionEngine } from './constitutionEngine';

// ─── Inline IPC DB: critical sections always available ────────────────────────
const IPC_INLINE: Record<string, LegalKnowledge> = {
  '302': {
    title: 'IPC Section 302 — Murder',
    category: 'Criminal Law / Capital Offenses',
    summary: 'Punishment for murder.',
    explanation:
      'Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine.',
    punishment: 'Death penalty OR Life imprisonment + Fine.',
    simpleExplanation:
      'Intentionally killing someone is murder. The court can sentence a person to death or life in prison.',
    keyPoints: [
      'Most serious criminal offense under IPC',
      'Requires proof of intention — mens rea',
      'Distinguished from culpable homicide (Section 304)',
      'Rarest of rare cases attract death penalty',
    ],
  },
  '420': {
    title: 'IPC Section 420 — Cheating',
    category: 'Criminal Law / Property Offenses',
    summary: 'Cheating and dishonestly inducing delivery of property.',
    explanation:
      'Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, or anything which is signed or sealed, and which is capable of being converted into a valuable security, shall be punished.',
    punishment: 'Imprisonment up to 7 years + Fine.',
    simpleExplanation:
      'If you trick someone into giving you money or property through lies, you are guilty of cheating under IPC 420.',
    keyPoints: [
      'Requires fraudulent or dishonest intent',
      'Property must be delivered because of deceit',
      'Commonly used in financial fraud, online fraud cases',
      'Both imprisonment and fine can be imposed',
    ],
  },
  '376': {
    title: 'IPC Section 376 — Rape',
    category: 'Criminal Law / Sexual Offenses',
    summary: 'Punishment for rape.',
    explanation:
      'A man is said to commit rape if he has sexual intercourse with a woman against her will, without consent, or with consent obtained under fear, fraud, or intoxication. Punishment: rigorous imprisonment not less than 10 years, extendable to life, plus fine.',
    punishment: 'Minimum 10 years rigorous imprisonment, extendable to life + Fine.',
    simpleExplanation:
      'Sexual intercourse without a woman\'s free consent is rape. The attacker faces at least 10 years in jail.',
    keyPoints: [
      'Non-consensual intercourse is rape',
      'Minimum punishment: 10 years rigorous imprisonment (post-2018 amendment)',
      'Aggravated forms (gang rape, rape of minor): stricter penalties',
      'Conviction requires corroborating evidence',
    ],
  },
  '304': {
    title: 'IPC Section 304 — Culpable Homicide Not Amounting to Murder',
    category: 'Criminal Law / Capital Offenses',
    summary: 'Punishment for culpable homicide not amounting to murder.',
    explanation:
      'Whoever commits culpable homicide not amounting to murder shall be punished with imprisonment for life, or imprisonment of either description for a term which may extend to 10 years, and shall also be liable to fine.',
    punishment: 'Life imprisonment OR up to 10 years + Fine.',
    simpleExplanation:
      'If you kill someone without the full intent required for murder — e.g. in a sudden fight — you can be charged under this section instead of Section 302.',
    keyPoints: [
      'Less grave than murder (Section 302)',
      'Includes culpable homicide with knowledge but not intention',
      'Part 1: up to life, Part 2: up to 10 years',
      'Exception for acts done in sudden provocation',
    ],
  },
  '354': {
    title: 'IPC Section 354 — Assault on Woman',
    category: 'Criminal Law / Sexual Offenses',
    summary: 'Assault or criminal force to woman with intent to outrage her modesty.',
    explanation:
      'Whoever assaults or uses criminal force to any woman, intending to outrage or knowing it to be likely that he will thereby outrage her modesty, shall be punished with imprisonment of either description for a term which shall not be less than one year but which may extend to five years, and shall also be liable to fine.',
    punishment: 'Minimum 1 year to 5 years imprisonment + Fine.',
    simpleExplanation:
      'Touching or attacking a woman in a way that violates her dignity is a crime carrying at least 1 year imprisonment.',
    keyPoints: [
      'Minimum imprisonment of 1 year (non-bailable)',
      'Includes eve-teasing, groping, unwanted touching',
      'Section 354A covers sexual harassment specifically',
      'Complaint can be filed at nearest police station',
    ],
  },
  '498a': {
    title: 'IPC Section 498A — Cruelty by Husband/Relatives',
    category: 'Criminal Law / Family Offenses',
    summary: 'Husband or his relatives subjecting a woman to cruelty.',
    explanation:
      'Whoever, being the husband or the relative of the husband of a woman, subjects such woman to cruelty shall be punished with imprisonment for a term which may extend to 3 years and shall also be liable to fine. Cruelty means wilful conduct likely to drive the woman to commit suicide, or grave injury to health, or harassment for dowry.',
    punishment: 'Up to 3 years imprisonment + Fine. Non-bailable offense.',
    simpleExplanation:
      'If a husband or his family mentally or physically abuses a wife — including dowry demands — they can be arrested without bail under this section.',
    keyPoints: [
      'Non-bailable and cognizable offense',
      'Covers both physical and mental cruelty',
      'Includes dowry harassment',
      'Wife or her family can file the complaint',
    ],
  },
  '144': {
    title: 'IPC Section 144 / CrPC Section 144',
    category: 'Criminal Law / Public Order',
    summary: 'Section 144 CrPC: order to prevent imminent danger to public peace.',
    explanation:
      'Under Section 144 of the Code of Criminal Procedure (CrPC), a District Magistrate can prohibit assembly of 4 or more persons in an area to prevent obstruction, annoyance, or danger. Violation is punishable under IPC Section 188.',
    punishment: 'Violation under IPC 188: Simple imprisonment up to 1 month, or Fine, or both (up to 6 months if danger to life).',
    simpleExplanation:
      'When the government fears riots or public disorder, it can declare Section 144 — this bans gatherings of 4 or more people in the area.',
    keyPoints: [
      'Imposed by District Magistrate or SDM',
      'Valid for up to 2 months (60 days)',
      'Violation is punishable under IPC Section 188',
      'Often used to prevent protests or communal tensions',
    ],
  },
};

// ─── Extract section number from IPC query ────────────────────────────────────
export function extractSectionNumber(query: string): string | null {
  const q = query.toLowerCase().replace(/['"]/g, '');

  const patterns = [
    /(?:ipc|indian penal code)\s*section\s*(\d+[a-z]*)/i,
    /(?:ipc|indian penal code)\s+(\d+[a-z]*)/i,
    /section\s+(\d+[a-z]*)/i,
    /\b(\d+[a-z]*)\b/i, // bare number last
  ];

  for (const p of patterns) {
    const match = q.match(p);
    if (match) return match[1];
  }
  return null;
}

// ─── Detect if query is for constitution ─────────────────────────────────────
function isConstitutionQuery(query: string): boolean {
  const q = query.toLowerCase();
  return (
    q.includes('article') ||
    q.includes('constitution') ||
    q.includes('fundamental right') ||
    q.includes('directive') ||
    q.includes('preamble') ||
    q.includes('territory') ||
    q.includes('parliament') ||
    q.includes('crpc') ||
    q.includes('criminal procedure')
  );
}

// ─── Build LegalReport from LegalKnowledge ────────────────────────────────────
export function buildKnowledgeReport(
  knowledge: LegalKnowledge,
  engineLabel = 'IPC Engine'
): LegalReport {
  return {
    caseType: 'KNOWLEDGE',
    legalArea: knowledge.category,
    riskLevel: 'Low',
    riskScore: 0,
    summary: knowledge.summary,
    reasoning: [knowledge.explanation],
    riskFactors: [],
    actions: [],
    nextSteps: ['Refer to the Bare Act for a complete reading of sub-clauses and exceptions.'],
    warnings: [],
    knowledge,
  };
}

// ─── Fallback Intelligence: never fails ───────────────────────────────────────
function buildFallbackKnowledge(query: string): LegalKnowledge {
  const q = query.toLowerCase();

  // Topic-based fallback answers
  if (q.includes('bail')) {
    return {
      title: 'Bail in Indian Law',
      category: 'Criminal Procedure Law',
      summary: 'Bail is the temporary release of an accused person awaiting trial.',
      explanation:
        'Under the CrPC, bail can be granted by police (for bailable offenses) or by a Magistrate/Sessions Court/High Court (for non-bailable offenses). Section 436 covers bailable offenses; Sections 437 and 439 cover non-bailable offenses. The court considers factors like flight risk, witness tampering, and nature of the offense.',
      punishment: 'If bail is violated, the accused can be re-arrested and bail bond forfeited.',
      simpleExplanation:
        'Bail means you are released from custody while your case is being heard in court. For minor offenses, the police can grant bail. For serious offenses, you need to apply to the court.',
      keyPoints: [
        'Bailable offenses: police can grant bail (Section 436 CrPC)',
        'Non-bailable offenses: apply to Magistrate (Section 437) or Sessions Court (Section 439)',
        'Anticipatory bail: apply before arrest (Section 438)',
        'Bail can be cancelled if conditions are violated',
      ],
    };
  }

  if (q.includes('fir') || q.includes('complaint') || q.includes('police')) {
    return {
      title: 'Filing a Police Complaint / FIR',
      category: 'Criminal Procedure Law',
      summary: 'An FIR (First Information Report) is the first step in reporting a cognizable offense to the police.',
      explanation:
        'Under Section 154 CrPC, every report made to a police officer regarding a cognizable offense must be written, signed, and a free copy given to the informant. If the officer refuses, you can send the information to the Superintendent of Police (SP) under Section 154(3). For non-cognizable offenses, a complaint is filed with the Magistrate under Section 190.',
      punishment: 'Police refusing to file FIR can be penalised under Section 166A IPC.',
      simpleExplanation:
        'An FIR is your legal complaint to the police. For serious crimes (theft, assault, murder), the police MUST register it. If they refuse, you can go to the SP or directly to a Magistrate.',
      keyPoints: [
        'FIR: Section 154 CrPC — for cognizable offenses',
        'Right to free copy of FIR after registration',
        'Zero FIR: file anywhere, transferred to correct station',
        'Police refusing to file FIR is itself an offense (Section 166A IPC)',
      ],
    };
  }

  if (q.includes('contract') || q.includes('agreement')) {
    return {
      title: 'Contract Law — Indian Contract Act 1872',
      category: 'Civil Law / Contract',
      summary:
        'A contract is a legally enforceable agreement between two or more parties to do or not to do something.',
      explanation:
        'Under the Indian Contract Act 1872, a valid contract requires: (1) An offer, (2) Acceptance, (3) Consideration (something of value), (4) Capacity (parties must be adults, sound mind, not disqualified), (5) Free consent (no coercion, fraud, undue influence, mistake), and (6) Lawful object. Breach of contract entitles the aggrieved party to damages, specific performance, or injunction.',
      punishment: 'Breach of contract: civil liability — damages, specific performance, or injunction.',
      simpleExplanation:
        'A contract is a promise the law can enforce. Both sides must agree, it must be for something legal, and both sides must get something out of it. If someone breaks the contract, you can sue them.',
      keyPoints: [
        'Valid contract: offer + acceptance + consideration + capacity + consent',
        'Void contracts: both parties have no obligations',
        'Voidable contracts: one party can rescind',
        'Breach remedies: damages / specific performance / injunction',
      ],
    };
  }

  if (q.includes('writ') || q.includes('habeas') || q.includes('mandamus')) {
    return {
      title: 'Writs — Constitutional Remedies',
      category: 'Constitutional Law',
      summary:
        'Writs are extraordinary court orders that enforce fundamental rights and control inferior courts.',
      explanation:
        'The Supreme Court (Article 32) and High Courts (Article 226) can issue 5 types of writs: (1) Habeas Corpus — produce the person, challenge illegal detention; (2) Mandamus — order a public authority to perform its duty; (3) Prohibition — stop inferior court from exceeding jurisdiction; (4) Certiorari — quash decision of inferior court; (5) Quo Warranto — challenge a person\'s right to hold public office.',
      punishment: 'Writ courts can order immediate release, quash decisions, or compel performance.',
      simpleExplanation:
        'A writ is a powerful court order. If you are illegally arrested, you can file a "Habeas Corpus" writ and the court will make the police produce you immediately.',
      keyPoints: [
        'Habeas Corpus: challenge illegal detention',
        'Mandamus: force a govt authority to do its duty',
        'Certiorari: cancel a wrong lower court order',
        'Article 32 (SC) and Article 226 (HC) give writ powers',
      ],
    };
  }

  // Final generic fallback — topic extraction
  const words = query.trim().split(/\s+/).filter((w) => w.length > 3);
  const topic = words.slice(0, 5).join(' ') || query.slice(0, 60);

  return {
    title: `Legal Information — ${topic}`,
    category: 'General Legal Intelligence',
    summary:
      'Based on your query, here is the relevant legal framework under Indian law.',
    explanation:
      `Under Indian law, matters related to "${topic}" are governed by various statutes including the Indian Penal Code 1860, Code of Criminal Procedure 1973, Indian Contract Act 1872, and the Constitution of India 1950. The applicable law depends on whether the issue is civil, criminal, or constitutional in nature. For civil matters — property, contract, family — you approach a civil court. For criminal matters — theft, assault, fraud — you approach a criminal court. Constitutional violations are addressed by High Courts and the Supreme Court through writ petitions.`,
    punishment: 'Varies by applicable statute and offense. Consult the relevant Bare Act.',
    simpleExplanation:
      `India has a well-structured legal system. Depending on your specific situation, different laws and courts will apply. It is advisable to consult a lawyer for specific legal advice on "${topic}".`,
    keyPoints: [
      'IPC 1860 governs criminal offenses',
      'CrPC 1973 governs criminal procedure (FIR, bail, trial)',
      'Constitution of India is the supreme law',
      'Civil matters: Civil Procedure Code (CPC) 1908',
      'Always consult a qualified lawyer for your specific situation',
    ],
  };
}

// ─── ENGINE 1: IPC Engine ─────────────────────────────────────────────────────
export function runIPCEngine(query: string): LegalReport | null {
  const sectionNum = extractSectionNumber(query);
  if (!sectionNum) return null;

  // Priority 1: Inline critical sections
  const inline = IPC_INLINE[sectionNum.toLowerCase()];
  if (inline) return buildKnowledgeReport(inline, 'IPC Inline DB');

  // Priority 2: Full CSV database
  const csvMatch = lookupIPCSection(sectionNum);
  if (csvMatch) return buildKnowledgeReport(csvMatch, 'IPC CSV Engine');

  return null;
}

// ─── ENGINE 2: Constitution Engine ───────────────────────────────────────────
export function runConstitutionEngineReport(query: string): LegalReport | null {
  const knowledge = runConstitutionEngine(query);
  if (!knowledge) return null;
  return buildKnowledgeReport(knowledge, 'Constitution Engine');
}

// ─── MASTER HANDLER: Main entry point called from AgentApp ───────────────────
export function handleKnowledgeQuery(query: string): LegalReport {
  // 1. Try IPC engine first if query mentions IPC / section number
  const q = query.toLowerCase();
  const hasIPCSignal =
    q.includes('ipc') || /\bsection\s+\d+/.test(q) || /^\d+[a-z]?\b/.test(q.trim());

  if (hasIPCSignal) {
    const ipcResult = runIPCEngine(query);
    if (ipcResult) return ipcResult;
  }

  // 2. Try Constitution Engine
  const constitutionResult = runConstitutionEngineReport(query);
  if (constitutionResult) return constitutionResult;

  // 3. Try IPC engine as fallback even without explicit signal
  if (!hasIPCSignal) {
    const ipcFallback = runIPCEngine(query);
    if (ipcFallback) return ipcFallback;
  }

  // 4. Fallback Intelligence — always succeeds, never shows error
  const fallback = buildFallbackKnowledge(query);
  return buildKnowledgeReport(fallback, 'Fallback Intelligence');
}

// ─── IPC-specific handler (called when mode = 'ipc') ─────────────────────────
export function handleIPCQuery(query: string): LegalReport {
  const ipcResult = runIPCEngine(query);
  if (ipcResult) return ipcResult;

  // Even for explicit IPC mode queries that don't match — use smart fallback
  const sectionNum = extractSectionNumber(query);
  const title = sectionNum ? `IPC Section ${sectionNum}` : `IPC Query: ${query.slice(0, 40)}`;

  const fallback: LegalKnowledge = {
    title,
    category: 'Criminal Law / IPC',
    summary: sectionNum
      ? `IPC Section ${sectionNum} is part of the Indian Penal Code 1860.`
      : `This appears to be an IPC-related query under the Indian Penal Code 1860.`,
    explanation: sectionNum
      ? `IPC Section ${sectionNum}: The Indian Penal Code 1860 contains offenses and their punishments. Section ${sectionNum} deals with a specific offense. For the exact text, please refer to the Bare Act or consult a lawyer.`
      : `The Indian Penal Code 1860 (IPC) is the principal criminal code of India. It was enacted during British India and still governs most criminal offenses. It covers offenses against persons, property, the state, public tranquility, and more.`,
    punishment: 'Refer to the IPC Bare Act for the exact punishment for this section.',
    simpleExplanation: sectionNum
      ? `Section ${sectionNum} of the IPC is one of the many sections that define a crime and its punishment under Indian criminal law.`
      : `The IPC is India's main criminal law. It lists different crimes and their punishments.`,
    keyPoints: [
      'Indian Penal Code enacted in 1860',
      'Contains 511 sections covering all major crimes',
      'Supported by the Code of Criminal Procedure (CrPC) 1973',
      'Bhartiya Nyaya Sanhita (BNS) 2023 is the modern replacement',
      'Consult a lawyer for accurate interpretation of any section',
    ],
  };

  return buildKnowledgeReport(fallback, 'IPC Fallback');
}
