// src/utils/pp5Evaluation.ts
// Standardized Authentic P.P.5 Evaluation Engine for Vocab Journey
// Grounded in authentic student gameplay, quiz accuracy, streak, and pre/post test performance.

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

/**
 * Checks whether a student has authentic assessment/gameplay records.
 * If not tested or played, returns false so we avoid generating uniform fake scores.
 */
export function isStudentTested(student: EvaluatableStudent): boolean {
  const hasPre = typeof student.pretestScore === 'number' && student.pretestScore > 0;
  const hasPost = typeof student.posttestScore === 'number' && student.posttestScore > 0;
  const hasAcc = typeof student.accuracy === 'number' && student.accuracy > 0;
  const hasStage = typeof student.currentStage === 'number' && student.currentStage > 1;
  const hasActions = (student.positiveActions || 0) + (student.ticketsAwarded || 0) + (student.coinsAwarded || 0) > 0;
  return hasPre || hasPost || hasAcc || hasStage || hasActions;
}

export function calculateStudentTrait(
  student: EvaluatableStudent,
  traitId: string,
  overrides?: Record<string, number>
): number {
  if (overrides && overrides[traitId] !== undefined) {
    return overrides[traitId];
  }

  // If student has no activity or test baseline, flag as untested (-1)
  if (!isStudentTested(student)) {
    return -1;
  }

  const positive = (student.ticketsAwarded || 0) + (student.coinsAwarded || 0);
  const deductions = (student.ticketsRemoved || 0) + (student.cardsRemoved || 0) + (student.coinsRemoved || 0);
  const violations = student.ruleViolations || 0;
  const stage = student.currentStage || 1;
  const gain = student.learningGain || 0;
  const acc = student.accuracy || 0;
  const coins = student.coins || 0;

  switch (traitId) {
    case 't1': // 1. รักชาติ ศาสน์ กษัตริย์: พฤติกรรมพื้นฐาน การเคารพกติกาห้องเรียน
      if (violations === 0 && deductions === 0) return 3;
      if (violations <= 1) return 2;
      return 1;

    case 't2': // 2. ซื่อสัตย์สุจริต: ไม่สแปม ความพยายามทำแบบทดสอบด้วยตนเอง
      if (deductions === 0 && ((student.positiveActions || 0) > 0 || positive >= 1 || acc >= 40)) return 3;
      if (deductions <= 1) return 2;
      return 1;

    case 't3': // 3. มีวินัย: ความสม่ำเสมอในการเข้าฝึกด่านและไม่ผิดระเบียบ
      if (((student.disciplineActions || 0) > 0 || stage >= 5 || acc >= 55) && violations === 0) return 3;
      if (violations <= 1 && (stage >= 2 || acc >= 30)) return 2;
      return 1;

    case 't4': // 4. ใฝ่เรียนรู้: พัฒนาการคำศัพท์ (Learning Gain), จำนวนด่านที่ผ่าน, ความแม่นยำ
      if (gain >= 20 || stage >= 6 || acc >= 60) return 3;
      if (gain >= 10 || stage >= 3 || acc >= 35) return 2;
      return 1;

    case 't5': // 5. อยู่อย่างพอเพียง: บริหารจัดการเหรียญและไอเทมในระบบอย่างคุ้มค่า
      if (coins >= 60) return 3;
      if (coins >= 20) return 2;
      return 1;

    case 't6': // 6. มุ่งมั่นในการทำงาน: ความรับผิดชอบ ความพยายามทำคะแนนหลังเรียนหรือผ่านด่านยาก
      if ((student.responsibilityActions || 0) > 0 || stage >= 6 || (student.posttestScore || 0) >= 50 || gain >= 15) return 3;
      if (stage >= 3 || (student.posttestScore || 0) >= 25) return 2;
      return 1;

    case 't7': // 7. รักความเป็นไทย: การให้เกียรติและสื่อสารร่วมมือในห้องเรียน
      if (acc >= 50 && violations === 0) return 3;
      if (acc >= 25) return 2;
      return 1;

    case 't8': // 8. มีจิตสาธารณะ: การมีส่วนร่วมสะสมคะแนนในการแข่งขันทีมและช่วยเหลือเพื่อน
      if ((student.volunteerActions || 0) > 0 || (student.ticketsAwarded || 0) >= 2 || (student.cardsReceived || 0) >= 2) return 3;
      if (positive >= 1 || (student.cardsReceived || 0) >= 1) return 2;
      return 1;

    default:
      if (positive >= 2 || gain > 20) return 3;
      if (positive >= 1 || coins > 40) return 2;
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

  // If student has no activity or test baseline, flag as untested (-1)
  if (!isStudentTested(student)) {
    return -1;
  }

  const acc = student.accuracy || 0;
  const post = student.posttestScore || 0;
  const gain = student.learningGain || 0;
  const stage = student.currentStage || 1;
  const positive = (student.ticketsAwarded || 0) + (student.coinsAwarded || 0);

  switch (indicatorId) {
    case 'r1': // 1. การจับใจความสำคัญ: วัดจากความถูกต้องของคำศัพท์และความหมาย (Accuracy)
      if (acc >= 60 || post >= 55) return 3;
      if (acc >= 35 || post >= 30) return 2;
      return 1;

    case 'r2': // 2. การระบุรายละเอียดสนับสนุน: วัดจากการผ่านด่านและทำข้อสอบปลายภาค
      if (stage >= 6 || post >= 60) return 3;
      if (stage >= 3 || post >= 30) return 2;
      return 1;

    case 'r3': // 3. การวิเคราะห์แยกแยะ/เชื่อมโยง: วัดจากพัฒนาการการเรียนรู้ (Learning Gain)
      if (gain >= 20) return 3;
      if (gain >= 10) return 2;
      return 1;

    case 'r4': // 4. การแสดงความคิดเห็นและให้เหตุผล: การมีส่วนร่วมและพฤติกรรมเชิงบวก
      if (positive >= 2 || stage >= 5) return 3;
      if (positive >= 1 || stage >= 2) return 2;
      return 1;

    case 'r5': // 5. การสรุปความและเขียนถ่ายทอด: ผลรวมความแม่นยำและคะแนนหลังเรียน
      const composite = (post + acc) / 2;
      if (composite >= 50) return 3;
      if (composite >= 25) return 2;
      return 1;

    default:
      if (post >= 55 || gain >= 20 || acc >= 55) return 3;
      if (post >= 30 || gain >= 10 || acc >= 30) return 2;
      return 1;
  }
}

export function getStudentOverallTrait(student: EvaluatableStudent, overrides?: Record<string, number>): number {
  if (!isStudentTested(student)) return -1;
  const scores = DESIRABLE_8_TRAITS.map(t => calculateStudentTrait(student, t.id, overrides)).filter(s => s >= 0);
  if (scores.length === 0) return -1;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg >= 2.5) return 3;
  if (avg >= 1.5) return 2;
  return 1;
}

export function getStudentOverallReading(student: EvaluatableStudent, overrides?: Record<string, number>): number {
  if (!isStudentTested(student)) return -1;
  const scores = READING_5_INDICATORS.map(r => calculateStudentReading(student, r.id, overrides)).filter(s => s >= 0);
  if (scores.length === 0) return -1;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg >= 2.5) return 3;
  if (avg >= 1.5) return 2;
  return 1;
}

export function getStudentRationale(student: EvaluatableStudent): string {
  if (!isStudentTested(student)) {
    return 'ยังไม่มีข้อมูลการประเมิน (รอทำแบบทดสอบหรือเริ่มเล่นในภาคเรียนนี้)';
  }

  const positive = (student.ticketsAwarded || 0) + (student.coinsAwarded || 0);
  const deductions = (student.ticketsRemoved || 0) + (student.cardsRemoved || 0) + (student.coinsRemoved || 0);
  const gain = student.learningGain || 0;
  const acc = student.accuracy || 0;
  const stage = student.currentStage || 1;
  const post = student.posttestScore || 0;

  if (gain >= 20) {
    return `พัฒนาการคำศัพท์โดดเด่นมาก (Learning Gain +${Math.round(gain)}%) มีความใฝ่รู้และมุ่งมั่น`;
  }
  if (acc >= 65) {
    return `ความแม่นยำสูง (${Math.round(acc)}%) จดจำและเข้าใจความหมายคำศัพท์ได้อย่างแม่นยำ`;
  }
  if (stage >= 6) {
    return `มีความสม่ำเสมอในการเรียนรู้ ผ่านการฝึกคำศัพท์ถึงด่าน ${stage} ปฏิบัติตามเกณฑ์ได้ดี`;
  }
  if (post >= 50) {
    return `ผลสัมฤทธิ์หลังเรียนอยู่ในเกณฑ์ดี (${Math.round(post)} คะแนน) มีทักษะการจับใจความมั่นคง`;
  }
  if (positive >= 2) {
    return 'มีความตั้งใจเรียน มีจิตสาธารณะและปฏิบัติตามกฎกติกาห้องเรียนสม่ำเสมอ';
  }
  if (deductions >= 2 && deductions > positive) {
    return 'มีความพยายามร่วมกิจกรรม แนะนำให้เสริมสร้างวินัยและการส่งงานตรงเวลา';
  }
  if (acc < 35 && isStudentTested(student)) {
    return 'มีความพยายามฝึกฝน แนะนำให้ทบทวนคำศัพท์ที่ผิดซ้ำเพื่อเพิ่มความแม่นยำ';
  }
  return 'ปฏิบัติตนตามเกณฑ์ได้ดี มีความร่วมมือและพัฒนาการทางคำศัพท์ต่อเนื่อง';
}

export function formatGradeLevelText(score: number): { label: string; color: string } {
  if (score === -1) return { label: 'รอประเมิน', color: 'text-slate-400 bg-slate-800/40 border-slate-700/50' };
  if (score === 3) return { label: 'ดีเยี่ยม (3)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  if (score === 2) return { label: 'ดี (2)', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
  if (score === 1) return { label: 'ผ่าน (1)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
  return { label: 'ไม่ผ่าน (0)', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
}
