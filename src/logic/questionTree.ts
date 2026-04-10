import { LegalCategory, QuestionNode } from './types';

export const QUESTION_TREES: Record<LegalCategory, QuestionNode[]> = {
  // ─── PROPERTY CASE ─────────────────────────────────────────────────────────
  property_case: [
    {
      id: 'p1',
      text: 'Is the property legally registered in your name or a family member\'s name?',
      field: 'ownership_type',
      options: [
        { label: '✅ My Name', value: 'my_name', nextStep: 'p4' },
        { label: '👪 Father / Mother', value: 'parents', nextStep: 'p2' },
        { label: '🏛️ Ancestral / Joint Family', value: 'ancestral', score: 10, nextStep: 'p2' },
      ],
    },
    {
      id: 'p2',
      text: 'Is the original owner currently alive?',
      field: 'parents_alive',
      options: [
        { label: '✅ Yes, alive', value: 'yes', nextStep: 'p4' },
        { label: '❌ No, deceased', value: 'no', score: 10, nextStep: 'p3' },
      ],
    },
    {
      id: 'p3',
      text: 'Did the deceased owner leave a valid, registered Will?',
      field: 'has_will',
      options: [
        { label: '✅ Yes, registered Will exists', value: 'yes', nextStep: 'p4' },
        { label: '❌ No Will or unregistered', value: 'no', score: 20, nextStep: 'p4' },
      ],
    },
    {
      id: 'p4',
      text: 'Who is currently in physical possession of the property?',
      field: 'possession',
      options: [
        { label: '🏠 I am in possession', value: 'me', nextStep: 'p5' },
        { label: '⚠️ Opposite party / Relative', value: 'disputed', score: 30, nextStep: 'p5' },
        { label: '🤝 Joint / Shared possession', value: 'joint', score: 15, nextStep: 'p5' },
      ],
    },
    {
      id: 'p5',
      text: 'Do you have certified copies of the Title Deed, Tax Receipts, or Khata?',
      field: 'has_documents',
      options: [
        { label: '📁 Full document set available', value: 'yes', nextStep: 'END' },
        { label: '📄 Partial / some documents missing', value: 'partial', score: 20, nextStep: 'END' },
        { label: '❌ No documents at all', value: 'none', score: 40, nextStep: 'END' },
      ],
    },
  ],

  // ─── CRIMINAL CASE ──────────────────────────────────────────────────────────
  criminal_case: [
    {
      id: 'c1',
      text: 'Has an FIR (First Information Report) been filed regarding this matter?',
      field: 'fir_status',
      options: [
        { label: '✅ Yes, FIR is registered', value: 'yes', score: 30, nextStep: 'c2' },
        { label: '❌ No FIR yet', value: 'no', nextStep: 'c2' },
        { label: '⚠️ Police refused to file FIR', value: 'refused', score: 20, nextStep: 'c2' },
      ],
    },
    {
      id: 'c2',
      text: 'What best describes your situation in this matter?',
      field: 'intent',
      options: [
        { label: '🛡️ I was the victim / seeking justice', value: 'victim', nextStep: 'c3' },
        { label: '⚖️ I am the accused / seeking defense', value: 'defense', score: 20, nextStep: 'c3' },
        { label: '👁️ I am a witness', value: 'witness', nextStep: 'c3' },
      ],
    },
    {
      id: 'c3',
      text: 'Is the accused currently in custody or out on bail?',
      field: 'custody_status',
      options: [
        { label: '🔒 In custody / arrested', value: 'custody', score: 10, nextStep: 'END' },
        { label: '🔓 Out on bail', value: 'bail', nextStep: 'END' },
        { label: '🔍 Not yet arrested', value: 'not_arrested', nextStep: 'END' },
      ],
    },
  ],

  // ─── FAMILY CASE ────────────────────────────────────────────────────────────
  family_case: [
    {
      id: 'f1',
      text: 'What is the nature of your family legal matter?',
      field: 'family_type',
      options: [
        { label: '💔 Divorce / Separation', value: 'divorce', score: 10, nextStep: 'f2' },
        { label: '👶 Child Custody', value: 'custody', score: 10, nextStep: 'f2' },
        { label: '💀 Domestic Violence', value: 'domestic_violence', score: 30, nextStep: 'f2' },
        { label: '💰 Maintenance / Alimony', value: 'maintenance', nextStep: 'f2' },
      ],
    },
    {
      id: 'f2',
      text: 'Is there a court case already filed for this matter?',
      field: 'case_filed',
      options: [
        { label: '✅ Yes, case is already in court', value: 'yes', nextStep: 'END' },
        { label: '❌ No, not yet filed', value: 'no', nextStep: 'END' },
        { label: '⚠️ Police complaint filed (no court yet)', value: 'complaint', score: 10, nextStep: 'END' },
      ],
    },
  ],

  // ─── EMPLOYMENT CASE ────────────────────────────────────────────────────────
  employment_case: [
    {
      id: 'e1',
      text: 'What is the nature of your employment dispute?',
      field: 'employment_type',
      options: [
        { label: '🚫 Wrongful Termination', value: 'termination', score: 20, nextStep: 'e2' },
        { label: '💸 Unpaid Salary / Dues', value: 'salary', score: 15, nextStep: 'e2' },
        { label: '😤 Workplace Harassment', value: 'harassment', score: 25, nextStep: 'e2' },
        { label: '📝 Contract Violation', value: 'contract', score: 10, nextStep: 'e2' },
      ],
    },
    {
      id: 'e2',
      text: 'Do you have a signed employment contract or appointment letter?',
      field: 'has_contract',
      options: [
        { label: '✅ Yes, I have documents', value: 'yes', nextStep: 'END' },
        { label: '❌ No written contract', value: 'no', score: 20, nextStep: 'END' },
        { label: '📄 Partial / informal agreement', value: 'partial', score: 10, nextStep: 'END' },
      ],
    },
  ],

  // ─── UNKNOWN (safe fallback) ─────────────────────────────────────────────────
  unknown: [
    {
      id: 'u1',
      text: 'To help you better, is your situation primarily a financial or personal dispute?',
      field: 'dispute_type',
      options: [
        { label: '💰 Financial / Property', value: 'financial', nextStep: 'END' },
        { label: '👤 Personal / Family', value: 'personal', nextStep: 'END' },
        { label: '🏢 Work / Employment', value: 'employment', nextStep: 'END' },
        { label: '🚓 Criminal / Police Matter', value: 'criminal', nextStep: 'END' },
      ],
    },
  ],
};
