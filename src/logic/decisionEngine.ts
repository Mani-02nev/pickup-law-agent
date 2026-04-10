import { LegalCategory, LegalReport, UserRole, WebInsight, VideoGuide } from './types';

// ─── Role-based tone wrappers ─────────────────────────────────────────────────
function applyTone(summary: string, role: UserRole): string {
  switch (role) {
    case 'Advocate':
      return `Strategic Assessment: ${summary} Immediate interim relief should be sought before the appropriate forum.`;
    case 'Judge':
      return `[Judicial Review] Upon examination of the submitted facts — ${summary} The court would critically examine the chain of title and intent.`;
    case 'Law_Student':
      return `${summary} Think of this like the legal maxim — "Nemo dat quod non habet" (no one gives what they don't have). This applies directly here.`;
    default: // Lawyer
      return summary;
  }
}

// ─── Property Case ────────────────────────────────────────────────────────────
function resolvePropertyCase(answers: Record<string, string>, score: number, role: UserRole) {
  const reasoning: string[]   = [];
  const riskFactors: string[] = [];
  const actions: string[]     = [];
  const warnings: string[]    = [];
  let summary = '';

  // Ownership analysis
  if (answers['ownership_type'] === 'parents' && answers['parents_alive'] === 'no') {
    summary = 'Critical inheritance dispute detected. The original owner is deceased — property succession rules now apply.';
    reasoning.push('Property devolves under the Indian Succession Act 1925 or Hindu Succession Act 1956 depending on religion.');
    if (answers['has_will'] === 'no') {
      riskFactors.push('No Registered Will — intestate succession applies');
      reasoning.push('Without a Will, all legal heirs have equal claim — a court order dividing property may be needed.');
      actions.push('Apply for a Succession Certificate from the Civil Court (under Sections 372–373 of Indian Succession Act).');
    } else {
      reasoning.push('A registered Will is a strong legal document. Its execution must be challenged through the Probate Court if disputed.');
    }
  } else if (answers['ownership_type'] === 'ancestral') {
    summary = 'Ancestral / joint family property dispute. Coparcenary rights of all family members must be determined.';
    reasoning.push('Under the Hindu Succession (Amendment) Act 2005, daughters have equal coparcenary rights.');
    riskFactors.push('Multiple claimants with equal rights in ancestral property');
    actions.push('File a Partition Suit to legally divide shares among all coparceners.');
  } else if (answers['ownership_type'] === 'my_name') {
    summary = 'Property is in your name — legal standing is strong. Focus is on enforcement and documentation.';
    reasoning.push('Registered ownership is the strongest form of legal title in India.');
  }

  // Possession
  if (answers['possession'] === 'disputed') {
    riskFactors.push('Adverse Possession Risk (Section 65, Limitation Act)');
    reasoning.push('If the opposite party has been in possession for 12+ years, they may claim adverse possession.');
    actions.push('File a Civil Suit for Possession and Permanent Injunction immediately.');
    actions.push('Apply for an interim stay order to prevent further encroachment.');
    warnings.push('Do NOT delay — adverse possession rights strengthen over time.');
  }

  if (answers['possession'] === 'joint') {
    riskFactors.push('No exclusive possession — shared occupancy weakens your position');
    actions.push('Get a surveyor to demarcate the boundaries of your share.');
  }

  // Documents
  if (answers['has_documents'] === 'none') {
    riskFactors.push('No supporting documents — high litigation risk');
    actions.push('Apply for certified copies of the Sale Deed / Khata from Sub-Registrar office immediately.');
    actions.push('Obtain mutation records from the Revenue Department (Patta / Khesra).');
    warnings.push('Without documents, courts cannot grant possession orders. Prioritize document recovery first.');
  } else if (answers['has_documents'] === 'partial') {
    riskFactors.push('Incomplete documentation — moderate litigation risk');
    actions.push('File RTI application to obtain missing government-held property documents.');
  }

  if (!summary) {
    summary = 'Your property matter requires careful legal documentation and proper court proceedings.';
    reasoning.push('All property disputes in India are ultimately resolved through Civil Courts under the CPC 1908.');
    actions.push('Consult a Civil Lawyer to assess the specific merits of your case.');
    actions.push('Send a legal notice to the opposite party as the first formal step.');
  }

  return { summary: applyTone(summary, role), reasoning, riskFactors, actions, warnings };
}

// ─── Criminal Case ────────────────────────────────────────────────────────────
function resolveCriminalCase(answers: Record<string, string>, score: number, role: UserRole) {
  const reasoning: string[]   = [];
  const riskFactors: string[] = [];
  const actions: string[]     = [];
  const warnings: string[]    = [];
  let summary = '';

  if (answers['fir_status'] === 'yes') {
    summary = 'FIR has been registered. The criminal process is now formally underway.';
    reasoning.push('Section 154 CrPC mandates FIR registration for cognizable offenses. The investigation must begin within 24 hours.');
    riskFactors.push('FIR is a public record — serious implications for all named parties');
    actions.push('Obtain a certified copy of the FIR immediately from the police station.');
  } else if (answers['fir_status'] === 'refused') {
    summary = 'Police refused to file FIR — this is a legal violation and must be challenged.';
    reasoning.push('Under Section 154(3) CrPC, if police refuse an FIR, you can approach the SP or Superintendent.');
    reasoning.push('Under Section 156(3) CrPC, a Magistrate can order the police to register the FIR.');
    riskFactors.push('Police inaction — risk of evidence destruction');
    actions.push('File a written complaint with the Superintendent of Police (SP).');
    actions.push('File a Section 156(3) application before the Judicial Magistrate.');
    warnings.push('Do not rely on verbal assurances from police — only a written FIR has legal standing.');
  } else {
    summary = 'No FIR has been filed yet. You may need to initiate the complaint process.';
    actions.push('Visit the nearest police station and file a written complaint.');
  }

  if (answers['intent'] === 'victim') {
    reasoning.push('As the victim, you have the right to be informed of all investigation steps under Section 157 CrPC.');
    actions.push('Apply to the court as a complainant to participate in the proceedings.');
  } else if (answers['intent'] === 'defense') {
    reasoning.push('As the accused, you have the right to bail (for bailable offenses), legal representation, and a fair trial under Article 21.');
    riskFactors.push('FIR naming you as accused requires immediate legal representation');
    actions.push('Engage a criminal defense lawyer immediately for anticipatory bail (Section 438 CrPC) if arrest is expected.');
    warnings.push('Do not give any statement to police without your lawyer being present.');
  }

  if (answers['custody_status'] === 'custody') {
    riskFactors.push('Currently in custody — time-sensitive bail application required');
    actions.push('File a bail application under Section 437 CrPC before the Magistrate immediately.');
    warnings.push('Remand must be challenged before the Magistrate within 24 hours of arrest.');
  }

  if (!reasoning.length) {
    reasoning.push('All criminal matters in India proceed under the Code of Criminal Procedure (CrPC) 1973.');
    actions.push('Consult a criminal defense lawyer within 24 hours.');
  }

  return { summary: applyTone(summary, role), reasoning, riskFactors, actions, warnings };
}

// ─── Family Case ──────────────────────────────────────────────────────────────
function resolveFamilyCase(answers: Record<string, string>, score: number, role: UserRole) {
  const reasoning: string[]   = [];
  const riskFactors: string[] = [];
  const actions: string[]     = [];
  const warnings: string[]    = [];
  let summary = '';
  const fType = answers['family_type'];

  if (fType === 'divorce') {
    summary = 'Divorce proceedings involve multiple personal law provisions. The process typically takes 6–18 months.';
    reasoning.push('Under Section 13 of the Hindu Marriage Act 1955, divorce can be sought on grounds of cruelty, desertion, adultery, etc.');
    reasoning.push('Mutual consent divorce under Section 13B is faster — 6 months cooling-off period after first motion.');
    actions.push('File a divorce petition before the Family Court in your jurisdiction.');
    actions.push('Secure evidence of grounds for divorce (messages, documents, witnesses).');
  } else if (fType === 'domestic_violence') {
    summary = 'Domestic violence is a serious offense with both criminal and civil remedies available.';
    reasoning.push('Protection of Women from Domestic Violence Act 2005 (PWDVA) provides Protection Orders, Residence Orders, and monetary relief.');
    reasoning.push('Section 498A IPC applies for cruelty against a married woman — this is a cognizable, non-bailable offense.');
    riskFactors.push('Immediate safety concern — escalation risk is high');
    actions.push('File an application under PWDVA before the Protection Officer or Magistrate for an emergency Protection Order.');
    actions.push('File an FIR under Section 498A IPC at the nearest police station.');
    warnings.push('Your safety comes first — if in danger, contact Mahila Helpline: 181 immediately.');
  } else if (fType === 'custody') {
    summary = 'Child custody is determined by the court based on the best interest of the child.';
    reasoning.push('Under Section 26 of the Hindu Marriage Act, courts determine custody keeping the welfare of the child paramount.');
    reasoning.push('Under the Guardians and Wards Act 1890, either parent can apply for guardianship.');
    actions.push('File a custody application before the Family Court.');
    actions.push('Document your living situation, relationship with the child, and financial stability.');
  } else if (fType === 'maintenance') {
    summary = 'Maintenance/alimony can be claimed during or after marriage under multiple provisions.';
    reasoning.push('Section 125 CrPC allows maintenance claims for wife, children, and parents.');
    reasoning.push('Section 24 of the Hindu Marriage Act allows interim maintenance during court proceedings.');
    actions.push('File a maintenance application under Section 125 CrPC or Section 24 HMA immediately.');
  }

  if (answers['case_filed'] === 'no') {
    actions.push('Understand your legal options — consult a Family Court lawyer before filing.');
    warnings.push('Delay in filing may affect your legal position — especially in maintenance cases.');
  }

  if (!reasoning.length) {
    reasoning.push('Family disputes are governed by personal laws (Hindu Marriage Act, Muslim Personal Law, etc.) and the Guardians and Wards Act.');
    actions.push('Consult a family law specialist at the earliest.');
  }

  return { summary: applyTone(summary, role), reasoning, riskFactors, actions, warnings };
}

// ─── Employment Case ──────────────────────────────────────────────────────────
function resolveEmploymentCase(answers: Record<string, string>, score: number, role: UserRole) {
  const reasoning: string[]   = [];
  const riskFactors: string[] = [];
  const actions: string[]     = [];
  const warnings: string[]    = [];
  let summary = '';
  const eType = answers['employment_type'];

  if (eType === 'termination') {
    summary = 'Wrongful termination requires the employer to prove valid grounds — otherwise it is illegal.';
    reasoning.push('Under Section 25F of the Industrial Disputes Act 1947, retrenchment requires one month\'s notice or pay in lieu.');
    reasoning.push('The employer must pay retrenchment compensation @ 15 days\' wages per year of service.');
    riskFactors.push('Without written termination letter — employer is in breach of contract');
    actions.push('Send a legal notice to the employer demanding reinstatement or full dues within 30 days.');
    actions.push('File a complaint with the Labour Commissioner in your district.');
  } else if (eType === 'salary') {
    summary = 'Unpaid salaries are an enforceable legal claim. Multiple legal remedies are available.';
    reasoning.push('Payment of Wages Act 1936 requires wages to be paid within 7 days of the wage period ending.');
    reasoning.push('The Labour Court has jurisdiction to award unpaid wages plus compensation.');
    actions.push('File a complaint under Payment of Wages Act with the Payment of Wages Authority.');
    actions.push('Send a formal legal demand notice to the employer with a 15-day deadline.');
    warnings.push('Keep all salary slips, bank statements, and offer letter as evidence.');
  } else if (eType === 'harassment') {
    summary = 'Workplace harassment is illegal and the employer has a legal duty to prevent and redress it.';
    reasoning.push('Sexual Harassment of Women at Workplace Act 2013 (POSH Act) mandates an Internal Complaints Committee in every organization with 10+ employees.');
    reasoning.push('General harassment may invoke Indian Penal Code provisions (Section 509, 504, etc.).');
    riskFactors.push('No ICC complaints recorded — weakens claim');
    actions.push('File a formal written complaint with the Internal Complaints Committee (ICC) at your workplace.');
    actions.push('If no ICC exists, file with the Local Complaints Committee (District Officer).');
    warnings.push('File within 3 months of the incident — delay may bar your claim under POSH Act.');
  } else if (eType === 'contract') {
    summary = 'Contract violation entitles you to damages or specific performance under the Indian Contract Act 1872.';
    reasoning.push('Section 73 of the Indian Contract Act entitles you to compensation for any loss caused by contract breach.');
    actions.push('Send a legal notice citing the specific clauses violated in the contract.');
    actions.push('File a civil suit for damages or specific performance in the appropriate court.');
  }

  if (answers['has_contract'] === 'no') {
    riskFactors.push('No written contract — verbal agreements are hard to prove');
    warnings.push('Without a written contract, enforce through witness testimony and email/message evidence.');
  }

  if (!reasoning.length) {
    reasoning.push('Employment disputes in India are primarily governed by the Industrial Disputes Act 1947 and respective state labour laws.');
    actions.push('Consult a labour law specialist and file a complaint with the Labour Commissioner.');
  }

  return { summary: applyTone(summary, role), reasoning, riskFactors, actions, warnings };
}

// ─── Main generateDecision ────────────────────────────────────────────────────
export const generateDecision = (
  category: LegalCategory,
  answers: Record<string, string>,
  score: number,
  role: UserRole,
  insights: WebInsight[] = [],
  videos: VideoGuide[]   = []
): LegalReport => {
  const riskLevel = score < 30 ? 'Low' : score < 60 ? 'Medium' : 'High';

  let resolved: { summary: string; reasoning: string[]; riskFactors: string[]; actions: string[]; warnings: string[] };

  switch (category) {
    case 'criminal_case':
      resolved = resolveCriminalCase(answers, score, role); break;
    case 'family_case':
      resolved = resolveFamilyCase(answers, score, role); break;
    case 'employment_case':
      resolved = resolveEmploymentCase(answers, score, role); break;
    default:
      resolved = resolvePropertyCase(answers, score, role);
  }

  const legalAreaMap: Record<LegalCategory, string> = {
    property_case:   'Civil / Property Law',
    criminal_case:   'Criminal Law / CrPC',
    family_case:     'Family & Personal Law',
    employment_case: 'Labour & Employment Law',
    unknown:         'General Legal Matter',
  };

  return {
    caseType:   category.replace('_case', '').toUpperCase(),
    legalArea:  legalAreaMap[category] || 'General Legal Matter',
    riskLevel,
    riskScore:  score,
    summary:    resolved.summary,
    reasoning:  resolved.reasoning,
    riskFactors: resolved.riskFactors,
    actions:    resolved.actions.length ? resolved.actions : ['Consult a qualified lawyer within 48 hours.', 'Gather all relevant documents and evidence.'],
    nextSteps:  ['Draft and send a formal legal notice.', 'File the appropriate application/suit.', 'Keep copies of all documents.'],
    warnings:   resolved.warnings,
    insights,
    videos,
  };
};
