// src/utils/pp5Evaluation.ts
// Standardized P.P.5 Evaluation Engine for Vocab Journey
// Evaluates 8 Desirable Characteristics and 5 Reading/Analytical Thinking Indicators

export interface EvaluatableStudent {
  id: string;
  student_id?: string;
  student_name?: string;
  classroom_id?: string;
  currentStage?: number;
  tickets?: number;
  coins?: number;
  currentCards?: number;
  reservedCards?: number;
  cardsReceived?: number;
  ticketsAwarded?: number;
  ticketsRemoved?: number;
  cardsRemoved?: number;
  coinsAwarded?: number;
  coinsRemoved?: number;
  volunteerActions?: number;
  responsibilityActions?: number;
  disciplineActions?: number;
  positiveActions?: number;
  ruleViolations?: number;
  pretestScore?: number;
  posttestScore?: number;
  accuracy?: number;
  learningGain?: number;
}

export const DESIRABLE_8_TRAITS = [
  { id: 't1', name: '1. รักชาติ ศาสน์ กษัตริย์', short: 'รักชาติฯ' },
  { id: 't2', name: '2. ซื่อสัตย์สุจริต', short: 'ซื่อสัตย์' },
  { id: 't3', name: '3. มีวินัย', short: 'มีวินัย' },
  { id: 't4', name: '4. ใฝ่เรียนรู้', short: 'ใฝ่เรียนรู้' },
  { id: 't5', name: '5. อยู่อย่างพอเพียง', short: 'พอเพียง' },
  { id: 't6', name: '6. มุ่งมั่นในการทำงาน', short: 'มุ่งมั่น' },
  { id: 't7', name: '7. รักความเป็นไทย', short: 'รักไทย' },
  { id: 't8', name: '8. มีจิตสาธารณะ', short: 'จิตสาธารณะ' },
] as const;

export const READING_5_INDICATORS = [
  { id: 'r1', name: '1. การจับใจความสำคัญ', short: 'จับใจความ' },
  { id: 'r2', name: '2. การระบุรายละเอียดสนับสนุน', short: 'รายละเอียด' },
  { id: 'r3', name: '3. การวิเคราะห์แยกแยะ/เชื่อมโยง', short: 'วิเคราะห์' },
  { id: 'r4', name: '4. การแสดงความคิดเห็นและให้เหตุผล', short: 'แสดงความเห็น' },
  { id: 'r5', name: '5. การสรุปความและเขียนถ่ายทอด', short: 'สรุปถ่ายทอด' },
] as const;

export function calculateStudentTrait(
  student: EvaluatableStudent,
  traitId: string,
  overrides?: Record<string, number>
): number {
  if (overrides && overrides[traitId] !== undefined) {
    return overrides[traitId];
  }

  const positive = (student.ticketsAwarded || 0) + (student.coinsAwarded || 0);
  const deductions = (student.ticketsRemoved || 0) + (student.cardsRemoved || 0) + (student.coinsRemoved || 0);
  const violations = student.ruleViolations || 0;
  const stage = student.currentStage || 1;
  const gain = student.learningGain || 0;
  const acc = student.accuracy || 0;

  switch (traitId) {
    case 't1': // 1. รักชาติ ศาสน์ กษัตริย์
      if (violations === 0 && deductions === 0) return 3;
      if (violations <= 1) return 2;
      return 1;

    case 't2': // 2. ซื่อสัตย์สุจริต
      if (deductions === 0 && ((student.positiveActions || 0) > 0 || positive >= 1)) return 3;
      if (deductions <= 1) return 2;
      return 1;

    case 't3': // 3. มีวินัย
      if (((student.disciplineActions || 0) > 0 || stage >= 5) && violations === 0) return 3;
      if (violations <= 1) return 2;
      return 1;

    case 't4': // 4. ใฝ่เรียนรู้
      if (gain >= 25 || stage >= 10 || acc >= 65) return 3;
      if (gain >= 10 || stage >= 3 || acc >= 35) return 2;
      return 1;

    case 't5': // 5. อยู่อย่างพอเพียง
      if ((student.coins || 0) >= 80) return 3;
      if ((student.coins || 0) >= 25) return 2;
      return 1;

    case 't6': // 6. มุ่งมั่นในการทำงาน
      if ((student.responsibilityActions || 0) > 0 || stage >= 8 || (student.posttestScore || 0) >= 50) return 3;
      if (stage >= 3 || (student.posttestScore || 0) >= 25) return 2;
      return 1;

    case 't7': // 7. รักความเป็นไทย
      if (acc >= 50 && violations === 0) return 3;
      if (acc >= 30) return 2;
      return 1;

    case 't8': // 8. มีจิตสาธารณะ
      if ((student.volunteerActions || 0) > 0 || (student.ticketsAwarded || 0) >= 2 || (student.cardsReceived || 0) >= 2) return 3;
      if (positive >= 1 || (student.cardsReceived || 0) >= 1) return 2;
      return 1;

    default:
      if (positive >= 2 || gain > 20) return 3;
      if (positive >= 1 || (student.coins || 0) > 50) return 2;
      return 1;
  }
}

export function calculateStudentReading(
  student: EvaluatableStudent,
  indicatorId: string,
  overrides?: Record<string, number>
): number {
  if (overrides && overrides[indicatorId] !== undefined) {
    return overrides[indicatorId];
  }

  const acc = student.accuracy || 0;
  const post = student.posttestScore || 0;
  const gain = student.learningGain || 0;
  const stage = student.currentStage || 1;
  const positive = (student.ticketsAwarded || 0) + (student.coinsAwarded || 0);

  switch (indicatorId) {
    case 'r1': // 1. การจับใจความสำคัญ
      if (acc >= 65 || post >= 60) return 3;
      if (acc >= 35 || post >= 30) return 2;
      return 1;

    case 'r2': // 2. การระบุรายละเอียดสนับสนุน
      if (stage >= 10 || post >= 65) return 3;
      if (stage >= 4 || post >= 35) return 2;
      return 1;

    case 'r3': // 3. การวิเคราะห์แยกแยะ/เชื่อมโยง
      if (gain >= 25) return 3;
      if (gain >= 10) return 2;
      return 1;

    case 'r4': // 4. การแสดงความคิดเห็นและให้เหตุผล
      if (positive >= 2) return 3;
      if (positive >= 1 || stage >= 3) return 2;
      return 1;

    case 'r5': // 5. การสรุปความและเขียนถ่ายทอด
      const composite = (post + acc) / 2;
      if (composite >= 55) return 3;
      if (composite >= 30) return 2;
      return 1;

    default:
      if (post >= 60 || gain >= 30 || acc >= 60) return 3;
      if (post >= 35 || gain >= 15 || acc >= 35) return 2;
      return 1;
  }
}

export function getStudentOverallTrait(student: EvaluatableStudent, overrides?: Record<string, number>): number {
  const scores = DESIRABLE_8_TRAITS.map(t => calculateStudentTrait(student, t.id, overrides));
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg >= 2.5) return 3;
  if (avg >= 1.5) return 2;
  return 1;
}

export function getStudentOverallReading(student: EvaluatableStudent, overrides?: Record<string, number>): number {
  const scores = READING_5_INDICATORS.map(r => calculateStudentReading(student, r.id, overrides));
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg >= 2.5) return 3;
  if (avg >= 1.5) return 2;
  return 1;
}

export function getStudentRationale(student: EvaluatableStudent): string {
  const positive = (student.ticketsAwarded || 0) + (student.coinsAwarded || 0);
  const deductions = (student.ticketsRemoved || 0) + (student.cardsRemoved || 0) + (student.coinsRemoved || 0);
  const gain = student.learningGain || 0;
  const acc = student.accuracy || 0;

  if (positive >= 3 && gain > 25) {
    return 'ใฝ่เรียนรู้สูง มีพัฒนาการคำศัพท์โดดเด่น และมีความรับผิดชอบสม่ำเสมอ';
  }
  if (positive >= 2) {
    return 'มีความตั้งใจเรียน มีจิตสาธารณะและปฏิบัติตามกฎกติกาห้องเรียนได้ดี';
  }
  if (deductions >= 2 && deductions > positive) {
    return 'มีความพยายามร่วมกิจกรรม แนะนำให้เสริมสร้างวินัยและการส่งงานตรงเวลา';
  }
  if (acc < 40) {
    return 'มีความตั้งใจฝึกฝน พยายามผ่านด่านได้ดีแม้มีข้อจำกัดด้านอุปกรณ์/พื้นฐานเดิม';
  }
  return 'ปฏิบัติตนตามเกณฑ์ได้ดี มีความร่วมมือและพัฒนาการทางคำศัพท์ต่อเนื่อง';
}

export function formatGradeLevelText(score: number): { label: string; color: string } {
  if (score === 3) return { label: 'ดีเยี่ยม (3)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  if (score === 2) return { label: 'ดี (2)', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
  if (score === 1) return { label: 'ผ่าน (1)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
  return { label: 'ไม่ผ่าน (0)', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
}
