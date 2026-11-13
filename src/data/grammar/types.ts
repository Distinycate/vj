export interface SignalRow {
  signal: string;
  ruleOrMeaning: string;
  example: string;
  exampleTranslation: string;
}

export interface ConceptSlide {
  slideTitle: string;
  keyFormula: string;
  bulletPoints: string[];
  signalTable: SignalRow[];
  commonTrap: {
    trap: string;
    howToFix: string;
  };
  teacherScript: string;
}

export interface TeachingQuestionSlide {
  id: string;
  questionNumber: number;
  sourceTag?: string; // e.g., "แบบฝึกหัดซ้อมมือ" or "แนวข้อสอบ O-NET ม.3 ปี 2568 (Writing)"
  prompt: string;
  promptTranslation: string;
  choices: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  clueText: string;
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
  onetPartFocus: string;
  goldenTrick: string;
  overview: string;
  conceptSlides: ConceptSlide[];
  practiceQuestions: TeachingQuestionSlide[];
  realOnetQuestions: TeachingQuestionSlide[];
}

