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

// ─── Inline IPC DB: critical + commonly queried sections ──────────────────────
// Covers sections NOT in CSV (1–121) + high-priority sections
const IPC_INLINE: Record<string, LegalKnowledge> = {
  '1': {
    title: 'IPC Section 1 — Title and Extent',
    category: 'Criminal Law / IPC General',
    summary: 'This section gives the name and territorial extent of the Indian Penal Code.',
    explanation: 'IPC Section 1 states: "This Act shall be called the Indian Penal Code, and shall extend to the whole of India." This is the foundational provision. The IPC applies uniformly to all persons within Indian territory — whether Indian citizens or foreign nationals — for all offenses committed within India.',
    punishment: 'No punishment under this section — it is a definitional provision.',
    simpleExplanation: 'Section 1 simply names the law and says it applies to all of India. Every other section of the IPC derives its authority from this founding provision.',
    keyPoints: ['IPC applies to all of India', 'Applies to Indian citizens and foreigners alike', 'Enacted in 1860, in force since 1 January 1862', 'Foundation section — not a penal provision'],
  },
  '34': {
    title: 'IPC Section 34 — Common Intention',
    category: 'Criminal Law / Joint Liability',
    summary: 'When several persons act together with a common intention, each is liable for the act as if done by each alone.',
    explanation: 'IPC Section 34 establishes joint criminal liability. It states: "When a criminal act is done by several persons in furtherance of the common intention of all, each of such persons is liable for that act in the same manner as if it were done by him alone." Key requirement: there must be a prior meeting of minds — a shared plan before the act. It is not enough to be present; active participation or shared intention must be proven.',
    punishment: 'Same punishment as the principal offender. No separate punishment under Section 34 itself — it attaches liability to the main charge.',
    simpleExplanation: 'If you and others plan a crime together and act on it, you are all equally guilty — even if only one person did the physical act. The law treats all of you as having done it.',
    keyPoints: ['Requires prior common intention — not formed at the spot', 'All accused must share the criminal purpose', 'Section 34 attaches to the main charge (e.g., murder under 302 r/w 34)', 'Distinct from Section 149 — which covers unlawful assembly without requiring common intention', 'Widely used in gang crime, robbery, and murder cases'],
  },
  '96': {
    title: 'IPC Section 96 — Right of Private Defence',
    category: 'Criminal Law / Private Defence',
    summary: 'Nothing is an offense done in the exercise of the right of private defence.',
    explanation: 'IPC Section 96 establishes the fundamental right of private defence. It provides that acts done in genuine self-defence are not criminal offenses. This right exists to protect a person when the State machinery (police) cannot provide timely protection. The right must be exercised proportionally — only as much force as is necessary to repel the threat. Sections 97 to 106 define the scope and limits of this right.',
    punishment: 'No punishment — this section provides a complete defence to criminal liability.',
    simpleExplanation: 'If you genuinely act to protect yourself or your property from an immediate threat, the law recognises your right to do so. You are not committing a crime in that situation.',
    keyPoints: ['Complete defence against criminal liability', 'Must be exercised in good faith against real threat', 'Right exists because police cannot always prevent crime in time', 'Governed by Sections 96–106 of IPC', 'Force used must be proportional to the threat'],
  },
  '97': {
    title: 'IPC Section 97 — Right to Defend Body and Property',
    category: 'Criminal Law / Private Defence',
    summary: 'Every person has the right to defend their own or another\'s body, and their own or another\'s property.',
    explanation: 'IPC Section 97 explicitly extends the right of private defence to two categories: (1) The human body — every person may defend their own body or that of any other person against any offense affecting the human body. (2) Property — every person may defend their own property (moveable or immoveable) or property of any other person, against theft, robbery, mischief, or criminal trespass.',
    punishment: 'No punishment — this is a defensive right, not an offense.',
    simpleExplanation: 'You have a legal right to defend your body from assault and your property from theft or trespass. This applies whether the property is yours or belongs to someone else.',
    keyPoints: ['Covers defence of body AND property', 'Extends to protecting other persons\' bodies and property', 'Protects against theft, robbery, mischief, criminal trespass', 'Subject to restrictions in subsequent sections (98–106)', 'No duty to retreat before exercising this right'],
  },
  '100': {
    title: 'IPC Section 100 — Right of Private Defence Extending to Causing Death',
    category: 'Criminal Law / Private Defence',
    summary: 'The right of private defence of the body extends to causing death in six specific situations of grave danger.',
    explanation: 'IPC Section 100 is the most powerful provision in private defence law. It allows a person to cause the death of the attacker if facing any of these six specific threats: (1) an assault that reasonably causes apprehension of death, (2) an assault causing apprehension of grievous hurt, (3) an assault with intent to commit rape, (4) an assault with intent to gratify unnatural lust, (5) an assault with intent to kidnap or abduct, (6) an assault with intent to wrongfully confine the person. The key is that the threat must be real, immediate, and the belief must be reasonable.',
    punishment: 'No punishment if the act is genuinely within the scope of this section. If excessive force is used beyond the necessities, it can lead to culpable homicide charges.',
    simpleExplanation: 'If someone attacks you in a way that could kill you, seriously injure you, or commit rape or kidnapping against you, the law allows you to defend yourself even if that means killing the attacker.',
    keyPoints: ['Permits causing death in 6 specific grave threats', 'Threat must be real and immediate — not imagined', 'Belief of danger must be reasonable to a prudent person', 'No duty to retreat — stand your ground law', 'Killing must occur during the continuance of the threat', 'Excessive force beyond necessity can lead to liability'],
  },
  '102': {
    title: 'IPC Section 102 — When Private Defence Right Commences and Ends',
    category: 'Criminal Law / Private Defence',
    summary: 'The right of private defence of the body commences as soon as a reasonable apprehension of danger arises and ends when that danger passes.',
    explanation: 'IPC Section 102 regulates the timing of private defence. The right commences as soon as there is a reasonable apprehension of danger to the body — it does not require the offense to have actually been committed. The right continues as long as the apprehension of danger to the body continues. Once the threat ends, the right ends. Any force used after the threat ends is illegal and will attract criminal liability.',
    punishment: 'No punishment under this section — it defines temporal scope of the right.',
    simpleExplanation: 'You can start defending yourself the moment you reasonably believe you are in danger — you need not wait for the first blow. But once the danger is over, you must stop.',
    keyPoints: ['Right starts at reasonable apprehension of danger — not after actual attack', 'Ends precisely when the threat or apprehension ends', 'Any force after threat ends is illegal retaliation (not defence)', 'The timing of force is crucial in court evaluation', 'Apprehension must be reasonable — not paranoid or imagined'],
  },
  '107': {
    title: 'IPC Section 107 — Abetment of a Thing',
    category: 'Criminal Law / Abetment',
    summary: 'A person abets an offense if they instigate, conspire, or intentionally aid another to commit it.',
    explanation: 'IPC Section 107 defines abetment in three ways: (1) Instigation — actively encouraging, provoking, or inciting a person to commit an offense. (2) Conspiracy — engaging in a conspiracy with one or more persons and an act or illegal omission takes place in pursuance of it. (3) Intentional Aid — facilitating the commission of the act through any act or illegal omission. Abetment requires active participation in the crime\'s commission — mere presence is not abetment.',
    punishment: 'The same punishment as if the abettor had committed the offense themselves (varies by the main offense abetted).',
    simpleExplanation: 'If you convince someone to commit a crime, help plan it, or assist in any way — you are equally guilty as the person who actually did it. The law treats the helper and the doer the same way.',
    keyPoints: ['Three modes: instigation, conspiracy, intentional aid', 'Abettor is equally liable as the principal offender', 'Mere presence is not abetment — active participation required', 'Even if the main offense is not completed, abetment is punishable', 'Related sections: 108, 108A, 109, 110'],
  },
  '109': {
    title: 'IPC Section 109 — Punishment of Abetment if the Act is Committed',
    category: 'Criminal Law / Abetment',
    summary: 'If an act is committed as a result of abetment, the abettor receives the same punishment as the principal offender.',
    explanation: 'IPC Section 109 provides that where an act is committed in consequence of abetment, and no express provision exists for the punishment of that abetment elsewhere, the abettor shall be punished with the punishment provided for the offense. In practice, this means the mastermind who stays in the background and directs others to commit crimes faces identical punishment as the person who physically carries out the act.',
    punishment: 'Same punishment as the offense abetted (death, life imprisonment, etc. depending on the main offense).',
    simpleExplanation: 'The organiser of a crime faces the exact same punishment as the person who commits it. Being the brains behind a crime offers no legal protection.',
    keyPoints: ['Abettor and doer face equal punishment', 'Applies when no specific abetment section covers the offense', 'Widely applied in organised crime, contract killings', 'Prosecution must prove causal link between abetment and the act', 'Knowledge of the specific crime is not always required'],
  },
  '120b': {
    title: 'IPC Section 120B — Criminal Conspiracy',
    category: 'Criminal Law / Conspiracy',
    summary: 'Punishment for being part of a criminal conspiracy to commit a serious offense.',
    explanation: 'IPC Section 120B punishes criminal conspiracy. Section 120A defines criminal conspiracy as an agreement between two or more persons to do or cause to be done an illegal act, or a legal act by illegal means. Section 120B provides the punishment: (1) If the conspiracy is to commit an offense punishable with death, life imprisonment, or imprisonment of 2 years or more — punishment equals that of the offense conspired. (2) For other conspiracies — imprisonment up to 6 months, or fine, or both. The mere agreement itself is the offense — no overt act is required.',
    punishment: 'Same as the offense conspired for serious offenses. For minor conspiracies — up to 6 months imprisonment + fine.',
    simpleExplanation: 'Simply agreeing with others to commit a serious crime is itself a crime — even if that crime never happens. The planning and agreement is enough for arrest and prosecution.',
    keyPoints: ['Mere agreement to commit crime is the offense', 'No overt act needed to trigger Section 120B', 'Widely used in terror cases, financial fraud, organised crime', 'All members of the conspiracy are equally liable', 'Must involve at least two persons — cannot conspire alone'],
  },
  '302': {
    title: 'IPC Section 302 — Murder',
    category: 'Criminal Law / Capital Offenses',
    summary: 'Punishment for the offense of murder — the intentional killing of another person.',
    explanation: 'IPC Section 302 states that whoever commits murder as defined under Section 300 shall be punished. Section 300 defines murder as culpable homicide committed with intention to cause death, intention to cause bodily injury likely to cause death, or with knowledge that the act is imminently dangerous. The law distinguishes murder (Section 302) from culpable homicide not amounting to murder (Section 304) based on intent and circumstances.',
    punishment: 'Death penalty OR Life imprisonment + Fine. The court chooses based on aggravating and mitigating factors.',
    simpleExplanation: 'Intentionally killing a person is murder — the most serious crime in the IPC. The court can impose either the death penalty or life imprisonment depending on how the crime was committed and the criminal history of the accused.',
    keyPoints: ['Most serious offense under IPC', 'Requires proof of intention (mens rea)', 'Distinguished from culpable homicide (Section 304) by degree of intent', '"Rarest of rare" doctrine guides death penalty application (Bachan Singh v. State of Punjab, 1980)', 'Non-bailable, cognizable — police can arrest without warrant', 'Trial held exclusively in Sessions Court'],
  },
  '376': {
    title: 'IPC Section 376 — Rape',
    category: 'Criminal Law / Sexual Offenses',
    summary: 'Punishment for the offense of rape — sexual intercourse without consent.',
    explanation: 'IPC Section 376 punishes rape as defined in Section 375. A man is guilty of rape if he penetrates a woman without her free consent, or with consent obtained by fear, fraud, intoxication, or impersonation. After the 2018 amendment: minimum sentence is 10 years rigorous imprisonment, extendable to life. For rape of a child under 12 years, minimum is 20 years, extendable to death. Gang rape attracts minimum 20 years to life imprisonment.',
    punishment: 'Minimum 10 years rigorous imprisonment, extendable to life + Fine. For aggravated rape (child, gang rape): minimum 20 years to death.',
    simpleExplanation: 'Sexual intercourse without a woman\'s free consent is rape under law. The attacker faces a minimum of 10 years in prison — which cannot be reduced below this threshold even by a court.',
    keyPoints: ['Minimum 10 years RI — cannot be reduced (post-2018 amendment)', 'Consent must be free, voluntary, and not obtained by fear or fraud', 'Marital rape: exception applies except for judicially separated couples', 'Gang rape (Section 376D): 20 years to life', 'Rape of child under 12 (Section 376AB): 20 years to death', 'Non-bailable, cognizable — investigated by police officer of or above Inspector rank'],
  },
  '304': {
    title: 'IPC Section 304 — Culpable Homicide Not Amounting to Murder',
    category: 'Criminal Law / Capital Offenses',
    summary: 'Punishment for culpable homicide that does not cross the threshold of murder.',
    explanation: 'IPC Section 304 covers homicide that is intentional but falls short of murder under Section 300 — typically because it occurs in a sudden fight, severe provocation, or without premeditation. Part I (with intent): imprisonment for life OR up to 10 years + fine. Part II (with knowledge but without intent): up to 10 years OR fine OR both. The critical legal determination is whether the case falls under Section 302 (murder) or Section 304 (culpable homicide) — often the central issue in Sessions Court trials.',
    punishment: 'Part I (intent): Life imprisonment OR up to 10 years + fine. Part II (knowledge only): up to 10 years imprisonment OR fine or both.',
    simpleExplanation: 'If someone is killed without full murder intent — for example in a sudden fight or under extreme provocation — it may be treated as culpable homicide rather than murder. The punishment is less severe than murder but still serious.',
    keyPoints: ['Less grave than murder — distinction lies in degree of intent', 'Part I: with intention to cause death or grievous hurt', 'Part II: with knowledge but without intention to cause death', 'Sudden fight is a key mitigating factor that reduces murder to Section 304', 'Cognizable and non-bailable', 'Sessions Court sits to try this offense'],
  },
  '354': {
    title: 'IPC Section 354 — Assault or Criminal Force to Woman',
    category: 'Criminal Law / Offenses Against Women',
    summary: 'Assault or use of criminal force against a woman with intent to outrage her modesty.',
    explanation: 'IPC Section 354 provides that whoever assaults or uses criminal force to any woman, intending to outrage or knowing it to be likely that he will thereby outrage her modesty, shall be punished. The section is widely applied in cases of groping, forcible touching, eve-teasing, and other forms of physical harassment. The intention to outrage modesty is the central element. Related provisions: Section 354A (sexual harassment), 354B (disrobing), 354C (voyeurism), 354D (stalking).',
    punishment: 'Minimum 1 year imprisonment, extendable to 5 years + Fine. Non-bailable offense.',
    simpleExplanation: 'Touching, grabbing, or physically attacking a woman in a way that violates her dignity is a criminal offense carrying a minimum 1 year jail term. The law is strict — there is no possibility of a mere fine.',
    keyPoints: ['Minimum 1 year imprisonment — no lesser sentence permitted', 'Includes groping, forcible touching, eve-teasing', 'Intent to outrage modesty is essential ingredient', 'Non-bailable — accused cannot get bail as of right', 'Related: 354A (sexual harassment), 354C (voyeurism), 354D (stalking)', 'Complaint can be filed at any police station'],
  },
  '498a': {
    title: 'IPC Section 498A — Cruelty by Husband or Relatives',
    category: 'Criminal Law / Matrimonial Offenses',
    summary: 'Punishment for husband or his relatives subjecting a married woman to cruelty.',
    explanation: 'IPC Section 498A defines cruelty as: (a) willful conduct likely to drive the woman to suicide or cause grave injury to her life, limb, or health (mental or physical); or (b) harassment to coerce her or her relatives to meet unlawful demands for property or valuable security (dowry harassment). The offense is cognizable, non-bailable, and non-compoundable (cannot be settled privately without court approval). In 2014, the Supreme Court (Arnesh Kumar v. State of Bihar) directed police not to automatically arrest without proper investigation.',
    punishment: 'Imprisonment up to 3 years + Fine. Non-bailable offense.',
    simpleExplanation: 'If a husband or his family physically or mentally abuses a wife — including demanding dowry — they can be arrested without bail. The law specifically protects married women from domestic cruelty.',
    keyPoints: ['Cognizable, non-bailable, non-compoundable offense', 'Covers physical AND mental cruelty, including dowry demands', 'Wife, her parents, or any relative can file the complaint', 'Arnesh Kumar (2014 SC) — police must follow procedure, not auto-arrest', 'Cannot be compounded (settled) without Magistrate\'s permission', 'Related: Domestic Violence Act 2005 for civil reliefs'],
  },
  '420': {
    title: 'IPC Section 420 — Cheating and Dishonest Inducement',
    category: 'Criminal Law / Property Offenses',
    summary: 'Punishment for cheating that involves delivering property or destroying a valuable security.',
    explanation: 'IPC Section 420 is a more serious form of cheating than Section 417. It applies when cheating causes the victim to (1) deliver property to any person, (2) make, alter, or destroy a valuable security, or (3) anything capable of being converted into a valuable security. Essential ingredients: (a) deception by the accused, (b) the deception caused the victim to act, (c) the victim suffered harm. Online fraud, Ponzi schemes, and investment scams are commonly charged under this section.',
    punishment: 'Imprisonment up to 7 years + Fine.',
    simpleExplanation: 'If someone tricks you into giving them money, property, or signs a document through lies and fraud — that is IPC 420. It covers everything from investment fraud to fake job offers to online scams.',
    keyPoints: ['Requires: deceit + victim acting on deceit + harm', 'Covers financial fraud, online scams, fake investment schemes', 'Higher penalty than simple cheating (Section 417)', 'Non-bailable for amounts above ₹5000 in most states', 'FIR can be filed at any police station where the transaction occurred', 'Also attracts IT Act sections for cyber fraud'],
  },
  '511': {
    title: 'IPC Section 511 — Punishment for Attempting to Commit Offenses',
    category: 'Criminal Law / Attempt',
    summary: 'General provision punishing attempts to commit offenses where the IPC prescribes no specific punishment for attempt.',
    explanation: 'IPC Section 511 is the residuary provision for attempts. It states: whoever attempts to commit an offense punishable under the IPC (or causes a person to attempt it) and in such attempt does any act towards the commission of the offense shall, where no express provision is made by the Code for the punishment of such attempt, be punished with imprisonment up to half of the longest term provided for the offense, or with fine, or with both. This is the last section of the IPC.',
    punishment: 'Up to half the maximum punishment prescribed for the full offense + Fine.',
    simpleExplanation: 'If you try to commit a crime but fail or are stopped — you are still guilty of an attempt and can be punished, though the sentence is lighter than if you had succeeded.',
    keyPoints: ['Last section of the IPC (511 total sections)', 'Residuary attempt provision — applies when no specific attempt clause exists', 'Punishment: up to half the maximum of the full offense', 'Many offenses have specific attempt provisions (e.g. Section 307 — attempt to murder)', 'Attempt requires: intention + some act towards commission', 'Mere preparation is not attempt — must cross into execution'],
  },
  '144': {
    title: 'IPC Section 188 / CrPC Section 144 — Disobedience to Order',
    category: 'Criminal Law / Public Order',
    summary: 'CrPC Section 144 bans gatherings of 4+ persons to prevent public disorder. Violation is punishable under IPC Section 188.',
    explanation: 'CrPC Section 144 empowers a District Magistrate, SDM, or Executive Magistrate to issue orders prohibiting assembly of 4 or more persons in an area when there is apprehension of public nuisance, danger to human life, or disturbing public tranquility. The order is valid for 2 months (60 days) and can extend to 6 months in special circumstances. Violation of such an order is an offense under IPC Section 188 — punishable with simple imprisonment up to 1 month or fine up to ₹200, or if the violation tends to cause danger to human life, obstruction, annoyance, or injury — up to 6 months imprisonment or fine or both.',
    punishment: 'IPC 188: Simple imprisonment up to 1 month + Fine (up to 6 months if dangerous violation).',
    simpleExplanation: 'When the government imposes Section 144, gatherings of 4 or more people are banned in that area. Breaking this order is a crime. It is commonly used during riots, protests, or communal tension.',
    keyPoints: ['Imposed by District Magistrate or SDM', 'Bans assembly of 4 or more persons', 'Valid for 60 days, extendable to 6 months', 'Violation punishable under IPC Section 188', 'Used during riots, elections, sensitive communal situations', 'Can be challenged in High Court through writ petition'],
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

// ─── IPC Section Validator (1–511 only) ──────────────────────────────────────
export function validateIPCSection(sectionStr: string): {
  valid: boolean;
  number: number | null;
  message?: string;
} {
  // Strip any trailing letter (e.g. "498A" → 498)
  const numPart = parseInt(sectionStr.replace(/[a-z]+$/i, ''), 10);

  if (isNaN(numPart)) {
    return { valid: false, number: null, message: 'Not a valid section number.' };
  }
  if (numPart < 1 || numPart > 511) {
    return {
      valid: false,
      number: numPart,
      message: `IPC Section ${numPart} does not exist. The Indian Penal Code contains sections 1 to 511 only.`,
    };
  }
  return { valid: true, number: numPart };
}

// ─── Build Invalid Section Error Report ──────────────────────────────────────
function buildInvalidIPCReport(sectionStr: string, numPart: number | null): LegalReport {
  const label = numPart !== null ? `Section ${sectionStr}` : `"${sectionStr}"`;
  return {
    caseType: 'IPC_INVALID',
    legalArea: 'Indian Penal Code 1860',
    riskLevel: 'Low',
    riskScore: 0,
    summary: `IPC ${label} does not exist in the Indian Penal Code.`,
    reasoning: [
      'The Indian Penal Code 1860 contains sections numbered 1 to 511 only.',
      numPart !== null && numPart > 511
        ? `Section ${numPart} exceeds the maximum valid section (511).`
        : `Please verify the section number and try again.`,
    ].filter(Boolean) as string[],
    riskFactors: [],
    actions: [
      'Check the section number again — IPC has sections 1 to 511.',
      'Try one of the common sections: IPC 302, IPC 420, IPC 354, or IPC 498A.',
    ],
    nextSteps: [],
    warnings: [
      'Do not rely on unverified section numbers — always confirm before legal proceedings.',
    ],
    knowledge: {
      title: `⚠️ Invalid IPC Section — ${label}`,
      category: 'Indian Penal Code 1860',
      summary: `IPC ${label} does not exist. The IPC has sections 1 to 511 only.`,
      explanation: `The Indian Penal Code 1860 (IPC) is the main criminal statute of India. It was enacted by the British and contains exactly 511 sections (with some sub-sections like 498A). Sections beyond 511 do not exist in the IPC. If you are looking for a specific offense, please check the section number carefully.`,
      punishment: 'N/A — This section does not exist.',
      simpleExplanation: `There is no IPC Section ${sectionStr}. The IPC only goes up to Section 511. Please check the number and try again.`,
      keyPoints: [
        '✅ IPC 302 — Murder (Death / Life Imprisonment)',
        '✅ IPC 420 — Cheating (Up to 7 years)',
        '✅ IPC 379 — Theft (Up to 3 years)',
        '✅ IPC 376 — Rape (Minimum 10 years)',
        '✅ IPC 498A — Cruelty to wife (Up to 3 years)',
        '✅ IPC 354 — Assault on woman (1–5 years)',
      ],
    },
  };
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
    nextSteps: [],
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
  const sectionNum = extractSectionNumber(query);

  // ── Step 1: Validate the section number ──
  if (sectionNum) {
    const validation = validateIPCSection(sectionNum);

    if (!validation.valid) {
      // Return clear error — DO NOT hallucinate section details
      return buildInvalidIPCReport(sectionNum, validation.number);
    }
  }

  // ── Step 2: Try inline DB first ──
  if (sectionNum) {
    const inline = IPC_INLINE[sectionNum.toLowerCase()];
    if (inline) return buildKnowledgeReport(inline, 'IPC Inline DB');
  }

  // ── Step 3: Try full CSV database ──
  if (sectionNum) {
    const csvMatch = lookupIPCSection(sectionNum);
    if (csvMatch) return buildKnowledgeReport(csvMatch, 'IPC CSV Engine');
  }

  // ── Step 4: Section exists in range (1–511) but not in our DB ──
  // Show honest "section exists but details unavailable" — NOT hallucinated content
  if (sectionNum) {
    const num = parseInt(sectionNum, 10);
    const rangeNote = (!isNaN(num) && num >= 1 && num <= 511)
      ? `IPC Section ${sectionNum} is a valid section (within 1–511) but our database does not have its complete details yet.`
      : null;

    if (rangeNote) {
      const honest: LegalKnowledge = {
        title: `IPC Section ${sectionNum}`,
        category: 'Criminal Law / IPC',
        summary: rangeNote,
        explanation: `IPC Section ${sectionNum} exists within the Indian Penal Code (sections 1–511). Our current database does not have the complete inline data for this specific section. For the exact legal text, please consult: (1) The official Bare Act, (2) India Code – indiacode.nic.in, or (3) A qualified criminal lawyer.`,
        punishment: 'Please refer to the official IPC text or consult a lawyer for this section.',
        simpleExplanation: `Section ${sectionNum} is part of the IPC (which has 511 sections), but we cannot show full details without risking inaccurate information. Always verify with an official or lawyer.`,
        keyPoints: [
          `Section ${sectionNum} is within the valid IPC range (1–511)`,
          'For accurate details, check indiacode.nic.in or consult a lawyer',
          'Try common sections: IPC 302, 420, 379, 354, 498A',
        ],
      };
      return buildKnowledgeReport(honest, 'IPC Validated-Honest');
    }
  }

  // ── Step 5: No section number found — general IPC query ──
  const general: LegalKnowledge = {
    title: 'Indian Penal Code 1860 — Overview',
    category: 'Criminal Law / IPC',
    summary: 'The IPC is India\'s primary criminal law containing 511 sections.',
    explanation: 'The Indian Penal Code 1860 (IPC) is the main criminal statute of India, enacted during the British period. It contains 511 sections covering offenses against the state, public order, body, property, and more. It is supported by the Code of Criminal Procedure 1973 (CrPC). The modern replacement is the Bharatiya Nyaya Sanhita (BNS) 2023.',
    punishment: 'Varies by offense. Range: fine only → death penalty.',
    simpleExplanation: 'The IPC is India\'s rulebook for crimes. It lists 511 types of crimes (like theft, murder, fraud) and what happens if you commit them.',
    keyPoints: [
      'IPC has exactly 511 sections (1 to 511)',
      'IPC 302 — Murder | IPC 420 — Cheating | IPC 379 — Theft',
      'IPC 376 — Rape | IPC 498A — Cruelty to wife',
      'CrPC 1973 governs the procedure (arrest, bail, trial)',
      'Modern replacement: Bharatiya Nyaya Sanhita (BNS) 2023',
    ],
  };
  return buildKnowledgeReport(general, 'IPC General');
}
