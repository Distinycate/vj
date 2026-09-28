import event01 from '../../data/events/event-01-verb-master-challenge.json' with { type: 'json' };
import event02 from '../../data/events/event-02-khok-nong-na-adventure.json' with { type: 'json' };
import event03 from '../../data/events/event-03-christmas-adventure.json' with { type: 'json' };

export interface RemedialQuestion {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  answer: string;
  image?: string;
}

export interface RemedialStage {
  stage: number;
  title: string;
  vocabulary?: any[];
  questions: RemedialQuestion[];
}

export interface RemedialEventTemplate {
  eventId: string;
  title: string;
  titleTh: string;
  theme: string;
  version: string;
  icon: string;
  description: string;
  rules: {
    stageCount: number;
    questionsPerStage: number;
    passScore: number;
  };
  stages: RemedialStage[];
}

const TEMPLATES_MAP: Record<string, RemedialEventTemplate> = {
  'event-01-verb-master-challenge': {
    ...(event01 as any),
    icon: '⏳',
    description: 'ท้าทายกริยา 3 ช่อง ปราสาทแห่งกาลเวลา 15 ด่าน 150 ข้อ',
  },
  'event-02-khok-nong-na-adventure': {
    ...(event02 as any),
    icon: '🌾',
    description: 'ผจญภัยโคก หนอง นา คำศัพท์เกษตรและธรรมชาติ 15 ด่าน 150 ข้อ',
  },
  'event-03-christmas-adventure': {
    ...(event03 as any),
    icon: '🎄',
    description: 'ภารกิจคริสต์มาส คำศัพท์เทศกาลและฤดูหนาว 15 ด่าน 150 ข้อ',
  },
};

export const REMEDIAL_TEMPLATES: RemedialEventTemplate[] = Object.values(TEMPLATES_MAP);

export function getRemedialTemplate(templateId: string): RemedialEventTemplate | null {
  return TEMPLATES_MAP[templateId] || null;
}

export function getRemedialStage(templateId: string, stageNumber: number): RemedialStage | null {
  const template = getRemedialTemplate(templateId);
  if (!template) return null;
  return template.stages.find(s => s.stage === stageNumber) || null;
}

/**
 * Calculate target stages to pass based on original exam/course score (< 40):
 * - 35–39 → 5 stages
 * - 30–34 → 7 stages
 * - 20–29 → 9 stages
 * - 10–19 → 12 stages
 * - 0–9   → 15 stages
 */
export function calculateTargetStages(originalScore: number | null | undefined): number {
  if (originalScore === null || originalScore === undefined || isNaN(originalScore)) {
    return 15;
  }
  const score = Math.floor(originalScore);
  if (score >= 35) return 5;
  if (score >= 30) return 7;
  if (score >= 20) return 9;
  if (score >= 10) return 12;
  return 15;
}
