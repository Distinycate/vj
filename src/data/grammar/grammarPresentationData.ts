import type { GrammarTeachingUnit } from './types.ts';
import { GRAMMAR_UNITS_PART_1 } from './grammarUnitsPart1.ts';
import { GRAMMAR_UNITS_PART_2A } from './grammarUnitsPart2A.ts';
import { GRAMMAR_UNITS_PART_2B } from './grammarUnitsPart2B.ts';

export type {
  SignalRow,
  ConceptSlide,
  TeachingQuestionSlide,
  GrammarTeachingUnit,
} from './types.ts';

export const GRAMMAR_TEACHING_UNITS: GrammarTeachingUnit[] = [
  ...GRAMMAR_UNITS_PART_1,
  ...GRAMMAR_UNITS_PART_2A,
  ...GRAMMAR_UNITS_PART_2B,
];

export function getGrammarUnitById(unitId: string): GrammarTeachingUnit | undefined {
  return GRAMMAR_TEACHING_UNITS.find((unit) => unit.id === unitId);
}

export function getGrammarUnitByNumber(unitNumber: number): GrammarTeachingUnit | undefined {
  return GRAMMAR_TEACHING_UNITS.find((unit) => unit.unitNumber === unitNumber);
}
