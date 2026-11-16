import type {
  GrammarTeachingUnit,
  GrammarGradeCategory,
  TeachingTopicCategory,
} from './types.ts';
import { GRAMMAR_UNITS_PART_1 } from './grammarUnitsPart1.ts';
import { GRAMMAR_UNITS_PART_2A } from './grammarUnitsPart2A.ts';
import { GRAMMAR_UNITS_PART_2B } from './grammarUnitsPart2B.ts';
import { GRAMMAR_UNITS_PART_3 } from './grammarUnitsPart3.ts';
import { GRAMMAR_UNITS_PART_4 } from './grammarUnitsPart4.ts';
import { GRAMMAR_UNITS_PART_5 } from './grammarUnitsPart5.ts';
import { ONET_WRITING_BOOSTER_UNITS } from './onetWritingBoosterUnits.ts';

export type {
  GrammarGradeCategory,
  TeachingTopicCategory,
  SignalRow,
  ConceptSlide,
  EssentialVocabItem,
  TeachingQuestionSlide,
  GrammarTeachingUnit,
} from './types.ts';

export { ONET_WRITING_BOOSTER_UNITS };

const UNIT_CURRICULUM_META: Record<
  number,
  {
    gradeLevel: GrammarGradeCategory;
    gradeLabel: string;
    category: TeachingTopicCategory;
    categoryLabel: string;
    durationMinutes: number;
    recommendedWorksheets: string[];
  }
> = {
  1: {
    gradeLevel: 'M1',
    gradeLabel: 'ม.1 (ปูพื้นฐาน A1–A2)',
    category: 'tenses',
    categoryLabel: 'Tenses & เวลา',
    durationMinutes: 40,
    recommendedWorksheets: ['M1-U1', 'M1-U2', 'M1-U9'],
  },
  2: {
    gradeLevel: 'M2',
    gradeLabel: 'ม.2 (ต่อยอดโครงสร้าง A2)',
    category: 'tenses',
    categoryLabel: 'Tenses & เวลา',
    durationMinutes: 40,
    recommendedWorksheets: ['M2-U3', 'M2-U4', 'M2-U5'],
  },
  3: {
    gradeLevel: 'M1',
    gradeLabel: 'ม.1 (ปูพื้นฐาน A1–A2)',
    category: 'foundation',
    categoryLabel: 'พื้นฐานประโยค & คำ',
    durationMinutes: 40,
    recommendedWorksheets: ['M1-U2', 'M1-U3', 'M1-U4'],
  },
  4: {
    gradeLevel: 'M2',
    gradeLabel: 'ม.2 (ต่อยอดโครงสร้าง A2)',
    category: 'structures',
    categoryLabel: 'โครงสร้างประโยค',
    durationMinutes: 40,
    recommendedWorksheets: ['M2-U10', 'M2-U11', 'M2-U19'],
  },
  5: {
    gradeLevel: 'M2',
    gradeLabel: 'ม.2 (ต่อยอดโครงสร้าง A2)',
    category: 'structures',
    categoryLabel: 'โครงสร้างประโยค',
    durationMinutes: 40,
    recommendedWorksheets: ['M2-U14', 'M2-U15', 'M3-U2'],
  },
  6: {
    gradeLevel: 'M3',
    gradeLabel: 'ม.3 (ไวยากรณ์เข้มข้น A2–B1)',
    category: 'structures',
    categoryLabel: 'โครงสร้างประโยค',
    durationMinutes: 45,
    recommendedWorksheets: ['M3-U1', 'M3-U4', 'M3-U7'],
  },
  7: {
    gradeLevel: 'M3',
    gradeLabel: 'ม.3 (ไวยากรณ์เข้มข้น A2–B1)',
    category: 'structures',
    categoryLabel: 'โครงสร้างประโยค',
    durationMinutes: 45,
    recommendedWorksheets: ['M3-U3', 'M3-U6', 'M3-U9'],
  },
  8: {
    gradeLevel: 'ONET',
    gradeLabel: 'ติวเข้มทักษะ O-NET (ม.1–ม.3)',
    category: 'conversation',
    categoryLabel: 'บทสนทนาชีวิตจริง',
    durationMinutes: 35,
    recommendedWorksheets: ['M2-U6', 'M3-U18', 'M3-U20'],
  },
  9: {
    gradeLevel: 'ONET',
    gradeLabel: 'ติวเข้มทักษะ O-NET (ม.1–ม.3)',
    category: 'reading_writing',
    categoryLabel: 'การอ่าน & การเขียน',
    durationMinutes: 40,
    recommendedWorksheets: ['M1-U10', 'M2-U9', 'M3-U8'],
  },
  10: {
    gradeLevel: 'ONET',
    gradeLabel: 'ติวเข้มทักษะ O-NET (ม.1–ม.3)',
    category: 'reading_writing',
    categoryLabel: 'การอ่าน & การเขียน',
    durationMinutes: 40,
    recommendedWorksheets: ['M3-U13', 'M3-U14', 'M3-U16'],
  },
  11: {
    gradeLevel: 'M1',
    gradeLabel: 'ม.1 (ปูพื้นฐาน A1–A2)',
    category: 'foundation',
    categoryLabel: 'พื้นฐานประโยค & คำ',
    durationMinutes: 35,
    recommendedWorksheets: ['M1-U1', 'M1-U3', 'M1-U5'],
  },
  12: {
    gradeLevel: 'M1',
    gradeLabel: 'ม.1 (ปูพื้นฐาน A1–A2)',
    category: 'foundation',
    categoryLabel: 'พื้นฐานประโยค & คำ',
    durationMinutes: 35,
    recommendedWorksheets: ['M1-U6', 'M1-U8', 'M1-U11'],
  },
  13: {
    gradeLevel: 'M1',
    gradeLabel: 'ม.1 (ปูพื้นฐาน A1–A2)',
    category: 'foundation',
    categoryLabel: 'พื้นฐานประโยค & คำ',
    durationMinutes: 35,
    recommendedWorksheets: ['M1-U12', 'M1-U14', 'M1-U17'],
  },
  14: {
    gradeLevel: 'M2',
    gradeLabel: 'ม.2 (ต่อยอดโครงสร้าง A2)',
    category: 'tenses',
    categoryLabel: 'Tenses & เวลา',
    durationMinutes: 40,
    recommendedWorksheets: ['M2-U1', 'M2-U2', 'M2-U7'],
  },
  15: {
    gradeLevel: 'M3',
    gradeLabel: 'ม.3 (ไวยากรณ์เข้มข้น A2–B1)',
    category: 'structures',
    categoryLabel: 'โครงสร้างประโยค',
    durationMinutes: 40,
    recommendedWorksheets: ['M3-U5', 'M3-U10', 'M3-U12'],
  },
  21: {
    gradeLevel: 'M1',
    gradeLabel: 'ม.1 (ปูพื้นฐาน A1–A2)',
    category: 'foundation',
    categoryLabel: 'พื้นฐานประโยค & คำ',
    durationMinutes: 40,
    recommendedWorksheets: ['M1-U2', 'M1-U3', 'M1-U11'],
  },
  22: {
    gradeLevel: 'M1',
    gradeLabel: 'ม.1 (ปูพื้นฐาน A1–A2)',
    category: 'foundation',
    categoryLabel: 'พื้นฐานประโยค & คำ',
    durationMinutes: 40,
    recommendedWorksheets: ['M1-U4', 'M1-U6', 'M1-U10'],
  },
  23: {
    gradeLevel: 'M2',
    gradeLabel: 'ม.2 (ต่อยอดโครงสร้าง A2)',
    category: 'structures',
    categoryLabel: 'โครงสร้างประโยค',
    durationMinutes: 40,
    recommendedWorksheets: ['M2-U7', 'M2-U9', 'M3-U4'],
  },
  24: {
    gradeLevel: 'M3',
    gradeLabel: 'ม.3 (ไวยากรณ์เข้มข้น & O-NET)',
    category: 'structures',
    categoryLabel: 'โครงสร้างประโยค',
    durationMinutes: 45,
    recommendedWorksheets: ['M3-U7', 'M3-U11', 'M3-U16'],
  },
  25: {
    gradeLevel: 'M3',
    gradeLabel: 'ม.3 (สาระที่ 2 & O-NET)',
    category: 'reading_writing',
    categoryLabel: 'การอ่าน & วัฒนธรรม',
    durationMinutes: 40,
    recommendedWorksheets: ['M2-U14', 'M3-U9', 'M3-U18'],
  },
};

const RAW_UNITS: GrammarTeachingUnit[] = [
  ...GRAMMAR_UNITS_PART_1,
  ...GRAMMAR_UNITS_PART_2A,
  ...GRAMMAR_UNITS_PART_2B,
  ...GRAMMAR_UNITS_PART_3,
  ...GRAMMAR_UNITS_PART_4,
  ...GRAMMAR_UNITS_PART_5,
];

export const GRAMMAR_TEACHING_UNITS: GrammarTeachingUnit[] = RAW_UNITS.map((unit) => {
  const meta = UNIT_CURRICULUM_META[unit.unitNumber];
  if (!meta) return unit;
  return {
    ...unit,
    gradeLevel: unit.gradeLevel ?? meta.gradeLevel,
    gradeLabel: unit.gradeLabel ?? meta.gradeLabel,
    category: unit.category ?? meta.category,
    categoryLabel: unit.categoryLabel ?? meta.categoryLabel,
    durationMinutes: unit.durationMinutes ?? meta.durationMinutes,
    recommendedWorksheets: unit.recommendedWorksheets ?? meta.recommendedWorksheets,
  };
});

export const GRAMMAR_GRADE_TABS: Array<{
  key: 'ALL' | GrammarGradeCategory;
  label: string;
  shortDesc: string;
}> = [
  { key: 'ALL', label: 'ทุกชั้น (25 เรื่อง)', shortDesc: 'เลือกสอนเรื่องไหนก่อนก็ได้' },
  { key: 'M1', label: 'ชั้น ม.1 (9 เรื่อง)', shortDesc: 'ปูรากฐาน A1–A2' },
  { key: 'M2', label: 'ชั้น ม.2 (7 เรื่อง)', shortDesc: 'ต่อยอดโครงสร้าง A2' },
  { key: 'M3', label: 'ชั้น ม.3 (6 เรื่อง)', shortDesc: 'ไวยากรณ์ & วัฒนธรรม A2–B1' },
  { key: 'ONET', label: 'กลยุทธ์ O-NET (3 เรื่อง)', shortDesc: 'สนทนา • การอ่าน • การเขียน' },
];

export const TEACHING_CATEGORY_TABS: Array<{
  key: 'ALL' | TeachingTopicCategory;
  label: string;
  icon: string;
}> = [
  { key: 'ALL', label: 'ทุกหมวด (25)', icon: '📚' },
  { key: 'foundation', label: 'พื้นฐานประโยค & คำ (6)', icon: '🧱' },
  { key: 'tenses', label: 'Tenses & เวลา (3)', icon: '⏱️' },
  { key: 'structures', label: 'โครงสร้างประโยค (7)', icon: '🧩' },
  { key: 'conversation', label: 'บทสนทนาชีวิตจริง (3)', icon: '💬' },
  { key: 'vocabulary', label: 'คำศัพท์ & เดาบริบท (3)', icon: '🔤' },
  { key: 'reading_writing', label: 'การอ่าน & วัฒนธรรม (3)', icon: '📖' },
];

export const ALL_TEACHING_UNITS: GrammarTeachingUnit[] = [
  ...ONET_WRITING_BOOSTER_UNITS,
  ...GRAMMAR_TEACHING_UNITS,
];

export function getGrammarUnitById(unitId: string): GrammarTeachingUnit | undefined {
  return ALL_TEACHING_UNITS.find((unit) => unit.id === unitId);
}

export function getGrammarUnitByNumber(unitNumber: number): GrammarTeachingUnit | undefined {
  return ALL_TEACHING_UNITS.find((unit) => unit.unitNumber === unitNumber);
}

export function getGrammarUnitsByGrade(
  grade: 'ALL' | GrammarGradeCategory
): GrammarTeachingUnit[] {
  if (grade === 'ALL') return GRAMMAR_TEACHING_UNITS;
  return GRAMMAR_TEACHING_UNITS.filter((unit) => unit.gradeLevel === grade);
}

export function getGrammarUnitsByCategory(
  category: 'ALL' | TeachingTopicCategory
): GrammarTeachingUnit[] {
  if (category === 'ALL') return GRAMMAR_TEACHING_UNITS;
  return GRAMMAR_TEACHING_UNITS.filter((unit) => unit.category === category);
}
