/**
 * constitutionEngine.ts
 *
 * CONSTITUTION ENGINE
 * Handles queries about Article X, constitutional provisions, fundamental
 * rights, CRPC, India territory, preamble, Parliament, etc.
 *
 * Sources:
 *  - constitution_qa.json   (1200+ Q&A pairs)
 *  - crpc_qa.json           (300+ Q&A pairs)
 *  - Inline hardcoded knowledge for top articles
 */

import { LegalKnowledge } from './types';

// JSON datasets
import constitutionData from '../data/constitution_qa.json';
import crpcData from '../data/crpc_qa.json';

interface QAPair {
  question: string;
  answer: string;
}

// ─── Hardcoded top constitutional articles ────────────────────────────────────
const ARTICLE_DB: Record<string, LegalKnowledge> = {
  '1': {
    title: 'Article 1 — Name and Territory of India',
    category: 'Constitutional Law',
    summary: 'India, that is Bharat, shall be a Union of States.',
    explanation:
      'Article 1 establishes India as a Union of States. The territory of India comprises the territories of the States, Union territories specified in the First Schedule, and any other territories that may be acquired.',
    punishment: 'Not applicable — declaratory provision.',
    simpleExplanation:
      'India is made up of states and union territories. The Constitution calls it a "Union of States", not a federation, to emphasise that states cannot secede.',
    keyPoints: [
      'India is a Union of States, not a federation',
      'Territory includes States, Union Territories, and acquired territories',
      'Parliament can admit new States or alter boundaries by law',
    ],
  },
  '13': {
    title: 'Article 13 — Laws inconsistent with Fundamental Rights',
    category: 'Constitutional Law',
    summary: 'Laws that violate Fundamental Rights are void to the extent of inconsistency.',
    explanation:
      'Article 13 declares that all pre-constitutional laws inconsistent with Part III (Fundamental Rights) are void. The State cannot make any law that abridges Fundamental Rights.',
    punishment: 'Such a law is void and unenforceable.',
    simpleExplanation:
      'Any law made by Parliament or State that violates your Fundamental Rights is illegal and cannot be enforced.',
    keyPoints: [
      'Pre-constitution laws inconsistent with FRs are void',
      'Future laws abridging FRs are also void',
      '"Law" includes ordinances, orders, bye-laws, notifications',
    ],
  },
  '14': {
    title: 'Article 14 — Equality Before Law',
    category: 'Constitutional Law',
    summary: 'The State shall not deny equality before law or equal protection of law.',
    explanation:
      'The State shall not deny to any person equality before the law or the equal protection of the laws within the territory of India. It incorporates two concepts: Rule of Law (equality before law) and Equal Protection (equals must be treated equally).',
    punishment: 'Violation is challenged via Writ Petition under Article 32 (SC) or Article 226 (HC).',
    simpleExplanation:
      'The government must treat all people equally. No one is above the law, and the law must treat similar situations similarly.',
    keyPoints: [
      'Fundamental Right — available to citizens and non-citizens',
      'Covers all persons, including companies and corporations',
      'Allows "reasonable classification" — similar people treated similarly',
      'Basis of the Doctrine of Arbitrariness',
    ],
  },
  '19': {
    title: 'Article 19 — Six Fundamental Freedoms',
    category: 'Constitutional Law',
    summary:
      'Guarantees six fundamental freedoms to Indian citizens including speech, assembly, movement, and profession.',
    explanation:
      'Article 19 guarantees six fundamental freedoms: (a) Freedom of speech and expression; (b) Peaceful assembly without arms; (c) Form associations; (d) Move freely throughout India; (e) Reside in any part of India; (g) Practice any profession or business. These rights are subject to reasonable restrictions.',
    punishment: 'Violation attracts Writ remedies under Article 32 / 226.',
    simpleExplanation:
      'Indian citizens have 6 key freedoms — to speak, assemble, move, reside, and work freely — but these can be reasonably restricted by law.',
    keyPoints: [
      'Only available to Indian citizens (not foreigners)',
      'Subject to reasonable restrictions by Parliament / State',
      'Freedom of Press is implicit in 19(1)(a)',
      'Right to strike is NOT a fundamental right',
    ],
  },
  '21': {
    title: 'Article 21 — Protection of Life and Personal Liberty',
    category: 'Constitutional Law',
    summary:
      'No person shall be deprived of their life or personal liberty except according to procedure established by law.',
    explanation:
      'Article 21 is the broadest Fundamental Right. After Maneka Gandhi v. Union of India (1978), it requires that the procedure must also be fair, just, and reasonable. It now includes rights to dignity, livelihood, health, privacy, education, a speedy trial, and a clean environment.',
    punishment:
      'Any violation can be challenged via Writ Petition under Article 32 (SC) or Article 226 (HC).',
    simpleExplanation:
      'The government cannot take away your life or freedom without following a fair legal process. This is the most important right — courts have expanded it to cover dozens of sub-rights.',
    keyPoints: [
      'Available to all persons — citizens and non-citizens',
      'Cannot be suspended even during National Emergency',
      'Includes right to privacy (K.S. Puttaswamy v. UoI, 2017)',
      'Includes right to free legal aid, speedy trial, dignity',
    ],
  },
  '21a': {
    title: 'Article 21A — Right to Education',
    category: 'Constitutional Law',
    summary:
      'The State shall provide free and compulsory education to all children between 6–14 years of age.',
    explanation:
      'Inserted by 86th Amendment (2002), Article 21A makes education a Fundamental Right. The Right to Education Act 2009 operationalises this provision.',
    punishment: 'State failure can be challenged in High Courts / Supreme Court.',
    simpleExplanation:
      'Every child in India between 6 and 14 years has a legal right to free schooling. The government must provide it.',
    keyPoints: [
      'Added by 86th Constitutional Amendment, 2002',
      'Applies to children aged 6–14 years',
      'Right to Education (RTE) Act 2009 gives effect to this right',
      'Covers both government and private schools',
    ],
  },
  '32': {
    title: 'Article 32 — Right to Constitutional Remedies',
    category: 'Constitutional Law',
    summary: 'Guarantees the right to approach the Supreme Court for enforcement of Fundamental Rights.',
    explanation:
      'Article 32 is itself a Fundamental Right and gives every citizen the right to move the Supreme Court to enforce any Fundamental Right. The Supreme Court can issue writs including Habeas Corpus, Mandamus, Prohibition, Certiorari, and Quo Warranto. Dr. Ambedkar called this the "heart and soul" of the Constitution.',
    punishment: 'Not applicable — this is the enforcement mechanism itself.',
    simpleExplanation:
      'If your Fundamental Rights are violated, you can directly go to the Supreme Court and ask it to protect your rights. This right itself cannot be taken away.',
    keyPoints: [
      '"Heart and soul of the Constitution" — Dr. Ambedkar',
      'Can be suspended only during National Emergency (Article 359)',
      '5 types of writs: Habeas Corpus, Mandamus, Prohibition, Certiorari, Quo Warranto',
      'Article 226 gives similar but wider power to High Courts',
    ],
  },
  '44': {
    title: 'Article 44 — Uniform Civil Code',
    category: 'Constitutional Law / Directive Principles',
    summary: 'The State shall endeavour to secure a Uniform Civil Code for all citizens.',
    explanation:
      'Article 44 is a Directive Principle of State Policy. It directs the State to work towards a common civil law for all citizens irrespective of religion. It covers marriage, divorce, inheritance, and adoption. It is non-justiciable but guides State policy.',
    punishment: 'Not directly enforceable (Directive Principle).',
    simpleExplanation:
      'India aims to eventually have one set of personal laws (marriage, divorce, property) for all citizens regardless of religion — but this has not been implemented yet and remains controversial.',
    keyPoints: [
      'Directive Principle — not enforceable in courts',
      'Applies to personal laws: marriage, divorce, succession',
      'Goa already follows a uniform civil code',
      'Frequent subject of debate in Indian political discourse',
    ],
  },
  '370': {
    title: 'Article 370 — Special Status of Jammu & Kashmir (Historical)',
    category: 'Constitutional Law',
    summary:
      'Article 370 granted special autonomous status to Jammu & Kashmir. It was abrogated in August 2019.',
    explanation:
      'Article 370 granted Jammu & Kashmir its own constitution, flag, and greater autonomy. Only the provisions relating to defence, foreign affairs, finance, and communications applied to J&K automatically. The President can issue orders under Article 370(1). The article was abrogated by Presidential Order in August 2019, and J&K was bifurcated into two Union Territories.',
    punishment: 'Historical — no longer operative.',
    simpleExplanation:
      'J&K used to have a special status under Article 370. In August 2019, the Central Government removed this special status, and J&K became Union Territories (J&K and Ladakh).',
    keyPoints: [
      'Abrogated via Presidential Order on 5 August 2019',
      'J&K divided into two UTs: J&K and Ladakh',
      'Supreme Court upheld abrogation in December 2023',
      'Previously gave J&K its own constitution and flag',
    ],
  },
};

// ─── Semantic search in constitution_qa.json ─────────────────────────────────
function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

function scoreMatch(queryTokens: string[], itemQuestion: string): number {
  const questionTokens = tokenize(itemQuestion);
  let score = 0;
  for (const qt of queryTokens) {
    if (qt.length < 3) continue; // skip short words
    if (questionTokens.includes(qt)) score += 2;
    else if (questionTokens.some((t) => t.includes(qt) || qt.includes(t))) score += 1;
  }
  return score;
}

function searchQAData(query: string, data: QAPair[], topN = 1): string[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const scored = data
    .map((item) => ({ answer: item.answer, score: scoreMatch(tokens, item.question) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topN).map((x) => x.answer);
}

// ─── Article number extraction ────────────────────────────────────────────────
function extractArticleNumber(query: string): string | null {
  const match = query.match(/\barticle\s+(\d+[a-z]*)/i) || query.match(/\bart\.?\s*(\d+[a-z]*)/i);
  return match ? match[1].toLowerCase() : null;
}

// ─── Build a structured LegalKnowledge from a free-text answer ───────────────
function buildFromFreeText(query: string, answer: string): LegalKnowledge {
  return {
    title: `Legal Answer — ${query.slice(0, 60)}`,
    category: query.toLowerCase().includes('crpc') ? 'Criminal Procedure Law' : 'Constitutional Law',
    summary: answer.length > 200 ? answer.slice(0, 197) + '...' : answer,
    explanation: answer,
    punishment: 'Refer to the relevant provision for enforcement mechanism.',
    simpleExplanation: answer,
    keyPoints: [
      'Sourced from Constitution of India / CrPC database',
      'For detailed sub-clauses, refer to the Bare Act',
      'Consult a qualified lawyer for case-specific advice',
    ],
  };
}

// ─── MAIN: Constitution Engine ────────────────────────────────────────────────
export function runConstitutionEngine(query: string): LegalKnowledge | null {
  const q = query.toLowerCase();

  // 1. Specific Article lookup
  const articleNum = extractArticleNumber(query);
  if (articleNum && ARTICLE_DB[articleNum]) {
    return ARTICLE_DB[articleNum];
  }

  // 2. CRPC query → search crpc_qa.json
  if (q.includes('crpc') || q.includes('criminal procedure') || q.includes('code of criminal procedure')) {
    const crpcResults = searchQAData(query, crpcData as QAPair[], 1);
    if (crpcResults.length > 0 && crpcResults[0].length > 10) {
      return buildFromFreeText(query, crpcResults[0]);
    }
  }

  // 3. Semantic search in constitution_qa.json
  const constitutionResults = searchQAData(query, constitutionData as QAPair[], 1);
  if (constitutionResults.length > 0 && constitutionResults[0].length > 10) {
    return buildFromFreeText(query, constitutionResults[0]);
  }

  // 4. Fallback: try CRPC as well
  const crpcResults = searchQAData(query, crpcData as QAPair[], 1);
  if (crpcResults.length > 0 && crpcResults[0].length > 10) {
    return buildFromFreeText(query, crpcResults[0]);
  }

  return null;
}
