export type UserRole = 'Advocate' | 'Lawyer' | 'Law_Student' | 'Judge';

export type LegalCategory = 'property_case' | 'criminal_case' | 'family_case' | 'employment_case' | 'unknown';

export interface QuestionOption {
  label: string;
  value: string;
  score?: number;
  nextStep?: string | 'END';
}

export interface QuestionNode {
  id: string;
  text: string;
  field: string;
  options: QuestionOption[];
}

export interface ChatState {
  step: number;
  category: LegalCategory;
  answers: Record<string, string>;
  riskScore: number;
  isComplete: boolean;
  history: string[];
  role: UserRole;
}

export interface WebInsight {
  title: string;
  snippet: string;
  link: string;
  source: string;
}

export interface VideoGuide {
  title: string;
  videoId: string;
  thumbnail: string;
}

export interface LegalKnowledge {
  title: string;
  category: string;
  summary: string;
  explanation: string;
  punishment: string;
  simpleExplanation: string;
  keyPoints: string[];
}

export interface LegalReport {
  caseType: string;
  legalArea: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  riskScore: number;
  summary: string;
  reasoning: string[];
  riskFactors: string[];
  actions: string[];
  nextSteps: string[];
  warnings: string[];
  insights?: WebInsight[];
  videos?: VideoGuide[];
  knowledge?: LegalKnowledge;
}
