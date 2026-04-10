/**
 * classifier.ts
 *
 * CASE ENGINE CLASSIFIER
 * Determines which case category fits the user's personal situation.
 * NEVER returns 'unknown' — always resolves to the most appropriate category.
 *
 * Categories:
 *   property_case   → land, home, inheritance, ownership
 *   criminal_case   → FIR, arrest, police, assault, threat
 *   family_case     → divorce, marriage, custody, maintenance
 *   employment_case → salary, job, termination, employer
 */

import { LegalCategory } from './types';

const KEYWORD_MAP: Record<Exclude<LegalCategory, 'unknown'>, string[]> = {
  property_case: [
    'property', 'land', 'house', 'plot', 'flat', 'apartment',
    'father', 'uncle', 'brother', 'relative',
    'will', 'inheritance', 'ancestral', 'ownership', 'possession',
    'tenant', 'rent', 'sale', 'deed', 'registration', 'title',
    'boundary', 'encroachment', 'trespassing', 'eviction',
  ],
  criminal_case: [
    'police', 'fir', 'arrest', 'arrested', 'criminal', 'crime',
    'theft', 'robbery', 'assault', 'attack', 'beaten', 'hurt',
    'jail', 'bail', 'court', 'threat', 'threaten', 'blackmail',
    'murder', 'rape', 'harassment', 'abuse', 'cheated', 'fraud',
    'stolen', 'accused', 'witness', 'complaint',
  ],
  family_case: [
    'divorce', 'separation', 'marriage', 'married', 'wife', 'husband',
    'children', 'child', 'custody', 'alimony', 'maintenance',
    'domestic violence', 'dowry', 'family', 'in-laws', 'parents',
    'adoption', 'guardianship', 'succession', 'deceased',
  ],
  employment_case: [
    'job', 'salary', 'wages', 'termination', 'fired', 'dismissed',
    'employer', 'employee', 'company', 'boss', 'manager',
    'contract', 'notice period', 'bonus', 'overtime', 'pf',
    'provident fund', 'gratuity', 'labour', 'work', 'office',
    'promotion', 'demotion', 'appraisal', 'increment',
  ],
};

/** Score a category against the query */
function scoreCategory(query: string, keywords: string[]): number {
  const q = query.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (q.includes(kw)) {
      // Longer keyword = stronger signal
      score += kw.split(' ').length > 1 ? 3 : 1;
    }
  }
  return score;
}

export const classifyIntent = (query: string): LegalCategory => {
  let bestCategory: Exclude<LegalCategory, 'unknown'> = 'property_case';
  let maxScore = 0;

  for (const [category, keywords] of Object.entries(KEYWORD_MAP) as [Exclude<LegalCategory, 'unknown'>, string[]][]) {
    const score = scoreCategory(query, keywords);
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }

  // Always return a valid category — default to property_case
  return bestCategory;
};
