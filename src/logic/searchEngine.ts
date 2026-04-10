import constitutionData from '../data/constitution_qa.json';

// Simple search for Knowledge Mode
export const searchKnowledge = (query: string): string | null => {
  const normalized = query.toLowerCase();
  
  // Find match in constitution Q&A
  const match = constitutionData.find(item => 
    normalized.includes(item.question.toLowerCase()) || 
    item.question.toLowerCase().includes(normalized)
  );

  if (match) return match.answer;

  // Fallback for general legal explanations
  if (normalized.includes('ipc')) {
    return "The Indian Penal Code (IPC) is the official criminal code of India. It is a comprehensive code intended to cover all substantive aspects of criminal law.";
  }

  return null;
};
