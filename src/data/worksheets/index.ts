import { WORKSHEETS_M1 } from './worksheetsM1.ts';
import { WORKSHEETS_M2 } from './worksheetsM2.ts';
import { WORKSHEETS_M3 } from './worksheetsM3.ts';
import type { WorksheetGrade, WorksheetUnit } from './types.ts';

export * from './types.ts';
export { WORKSHEETS_M1 } from './worksheetsM1.ts';
export { WORKSHEETS_M2 } from './worksheetsM2.ts';
export { WORKSHEETS_M3 } from './worksheetsM3.ts';

export const ALL_WORKSHEETS: WorksheetUnit[] = [
  ...WORKSHEETS_M1,
  ...WORKSHEETS_M2,
  ...WORKSHEETS_M3,
];

export function getWorksheetsByGrade(grade: WorksheetGrade): WorksheetUnit[] {
  switch (grade) {
    case 'M1':
      return WORKSHEETS_M1;
    case 'M2':
      return WORKSHEETS_M2;
    case 'M3':
      return WORKSHEETS_M3;
    default:
      return [];
  }
}

export function getWorksheetUnit(unitId: string): WorksheetUnit | null {
  if (!unitId) return null;
  const target = unitId.trim().toLowerCase();
  const found = ALL_WORKSHEETS.find((u) => u.unitId.toLowerCase() === target);
  return found || null;
}

export function calculateWorksheetStars(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  const pct = (score / maxScore) * 100;
  if (pct >= 80) return 3;
  if (pct >= 60) return 2;
  if (pct >= 40) return 1;
  return 0;
}
