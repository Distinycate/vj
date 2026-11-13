export type WorksheetGrade = 'M1' | 'M2' | 'M3';
export type WorksheetType = 'cloze' | 'matching' | 'choice' | 'sorting';

export interface WorksheetQuestion {
  id: string;
  prompt: string;
  answer: string;
  acceptableAnswers?: string[];
  choices?: string[]; // For multiple choice
  category?: string; // For sorting
  thaiMeaning?: string;
  explanationTh?: string;
}

export interface WorksheetUnit {
  unitId: string;
  grade: WorksheetGrade;
  unitNumber: number;
  title: string;
  subtitle?: string;
  type: WorksheetType;
  instructions: string;
  wordBank?: string[];
  questions: WorksheetQuestion[];
}

export interface WorksheetUnitAccess {
  isOpen: boolean;
  allowedClassrooms: string[]; // e.g. ['ALL'] or ['ม.1/1', 'ม.2/1', ...]
}

export interface WorksheetSettings {
  unlockedUnits: Record<string, WorksheetUnitAccess>;
}

