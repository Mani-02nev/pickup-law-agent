import { LegalCategory, LegalReport, UserRole, WebInsight, VideoGuide } from './types';

export const generateDecision = (
  category: LegalCategory, 
  answers: Record<string, string>, 
  score: number, 
  role: UserRole,
  insights: WebInsight[] = [],
  videos: VideoGuide[] = []
): LegalReport => {
  const riskLevel = score < 30 ? 'Low' : score < 60 ? 'Medium' : 'High';
  const reasoning: string[] = [];
  const riskFactors: string[] = [];
  const actions: string[] = [];
  const warnings: string[] = [];
  let summary = "";

  // 1. Logic Processing
  if (category === 'property_case') {
    if (answers['ownership_type'] === 'parents' && answers['parents_alive'] === 'no') {
      summary = "Critical inheritance dispute detected following the demise of the original owner.";
      reasoning.push("Property devolves under the Indian Succession Act due to intestacy or testamentary disposition.");
      if (answers['has_will'] === 'no') {
        riskFactors.push("Absence of Testamentary Will");
        reasoning.push("In the absence of a Will, legal heirs must obtain a Succession Certificate.");
      }
    }

    if (answers['possession'] === 'disputed') {
      riskFactors.push("Adverse Possession Risk");
      actions.push("File a Suit for Possession and Permanent Injunction.");
      warnings.push("Continued possession by the opposite party may lead to prescription of rights.");
    }

    if (answers['has_documents'] === 'none') {
      riskFactors.push("Documentation Gap");
      actions.push("Apply for certified copies of the Sale Deed from the Sub-Registrar office.");
    }
  }

  // 2. Role-Based Tone Adjustment
  let tonedSummary = summary;
  if (role === 'Judge') {
    tonedSummary = `[Analytical Review] Upon examination of the facts, ${summary} The court would prioritize the chain of title.`;
  } else if (role === 'Law_Student') {
    tonedSummary = `${summary} Think of this like the 'Nemo dat quod non habet' principle in property law.`;
  } else if (role === 'Advocate') {
    tonedSummary = `Strategic Assessment: ${summary} We need to move the court immediately for interim relief.`;
  }

  return {
    caseType: category.toUpperCase(),
    legalArea: category === 'property_case' ? 'Civil / Property Law' : 'General Law',
    riskLevel,
    riskScore: score,
    summary: tonedSummary,
    reasoning,
    riskFactors,
    actions: actions.length ? actions : ["Consult an expert lawyer.", "Gather all receipts."],
    nextSteps: ["Draft a legal notice.", "Schedule a physical verification.", "File a caveat in court."],
    warnings,
    insights,
    videos
  };
};
