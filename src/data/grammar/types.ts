export type GrammarGradeCategory = 'M1' | 'M2' | 'M3' | 'ONET';

export type TeachingTopicCategory =
  | 'foundation'
  | 'tenses'
  | 'structures'
  | 'conversation'
  | 'vocabulary'
  | 'reading_writing';

export interface SignalRow {
  categoryBadge?: string;
  colorTheme?: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose';
  signal: string;
  ruleOrMeaning: string;
  example: string;
  exampleTranslation: string;
}

export interface SpotDifferenceRow {
  topic: string;
  summary: string;
  correct: string;
  wrong: string;
}

export interface ConceptSlide {
  slideTitle: string;
  keyFormula: string;
  bulletPoints: string[];
  signalTable: SignalRow[];
  spotDifferences?: SpotDifferenceRow[];
  examScanSteps?: string[];
  commonTrap: {
    trap: string;
    howToFix: string;
  };
  teacherScript: string;
}

export interface EssentialVocabItem {
  term: string;
  partOfSpeech?: string;
  meaning: string;
  usageNote?: string;
}

export interface TeachingQuestionSlide {
  id: string;
  questionNumber: number;
  sourceTag?: string; // e.g., "แบบฝึกหัดซ้อมมือ" or "ข้อสอบจริง O-NET ม.3 ปี 2568 ข้อ 26"
  passageTitle?: string;
  passageImage?: string;
  passageImageCaption?: string;
  passageContext?: string;
  passageContextTranslation?: string;
  prompt: string;
  promptTranslation: string;
  choices: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  clueText: string; // 1. จุดสังเกตคืออะไร
  howToApproach?: string[]; // 2. วิธีการมองโจทย์เป็นแบบไหน (Step-by-step)
  mustKnowRule?: string; // 3. สิ่งที่ควรรู้ในโจทย์นั้นๆ (โครงสร้าง/กฎไวยากรณ์ประจำข้อ)
  essentialVocab?: EssentialVocabItem[]; // 4. วลี หรือ คำศัพท์ที่จำเป็นในข้อนั้นๆ
  eliminatedIndices: number[];
  eliminationReason: string;
  explanation: string;
  choiceBreakdowns: [string, string, string, string];
  teacherScript: string;
}

export interface GrammarTeachingUnit {
  unitNumber: number;
  id: string;
  title: string;
  subtitle: string;
  gradeLevel?: GrammarGradeCategory;
  gradeLabel?: string;
  category?: TeachingTopicCategory;
  categoryLabel?: string;
  durationMinutes?: number;
  recommendedWorksheets?: string[];
  onetPartFocus: string;
  goldenTrick: string;
  overview: string;
  conceptSlides: ConceptSlide[];
  practiceQuestions: TeachingQuestionSlide[];
  realOnetQuestions: TeachingQuestionSlide[];
}
