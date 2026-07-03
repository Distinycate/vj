import { levenshtein } from './levenshtein.ts';

export function normalizeAnswer(answer: string | null | undefined): string {
  if (!answer) return '';
  return answer
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/['’]/g, "'");
}

export function parseAcceptableAnswers(expectedAnswer: string): string[] {
  const normalized = normalizeAnswer(expectedAnswer);
  if (!normalized) return [];
  
  if (normalized.includes('/')) {
    const parts = normalized.split('/').map(p => p.trim());
    return [...parts, normalized]; // accepts 'is', 'am', or 'is/am'
  }
  return [normalized];
}

export type CheckTypingResult = {
  isCorrect: boolean;
  isNearMiss: boolean;
  errorType: string | null;
  message: string;
};

export function checkTypingAnswer(studentAnswer: string | null | undefined, expectedAnswer: string): CheckTypingResult {
  const normStudent = normalizeAnswer(studentAnswer);
  const acceptableList = parseAcceptableAnswers(expectedAnswer);

  if (!normStudent) {
    return {
      isCorrect: false,
      isNearMiss: false,
      errorType: 'blank_answer',
      message: 'กรุณาพิมพ์คำตอบก่อนส่ง',
    };
  }

  // Exact Match
  if (acceptableList.includes(normStudent)) {
    return {
      isCorrect: true,
      isNearMiss: false,
      errorType: null,
      message: 'ถูกต้อง! เก่งมาก',
    };
  }

  // Near Miss check
  let isNearMiss = false;
  for (const acceptable of acceptableList) {
    const dist = levenshtein(normStudent, acceptable);
    const length = acceptable.length;
    if ((length <= 4 && dist <= 1) || (length > 4 && dist <= 2)) {
      isNearMiss = true;
      break;
    }
  }

  if (isNearMiss) {
    return {
      isCorrect: false,
      isNearMiss: true,
      errorType: 'spelling_error',
      message: 'สะกดใกล้เคียงแล้ว ลองตรวจตัวอักษรอีกครั้ง',
    };
  }

  return {
    isCorrect: false,
    isNearMiss: false,
    errorType: 'wrong_form', // General wrong, could be wrong V2/V3 based on context
    message: 'ยังไม่ถูก ลองนึกถึงกริยา 3 ช่องของคำนี้อีกครั้ง',
  };
}

export function checkCompoundTypingAnswer(
  studentAnswer: string | null | undefined,
  expectedAnswers: string[],
): CheckTypingResult {
  const parts = normalizeAnswer(studentAnswer).split(/[,\n|]+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length !== expectedAnswers.length) {
    return {
      isCorrect: false,
      isNearMiss: false,
      errorType: parts.length === 0 ? 'blank_answer' : 'incomplete_answer',
      message: `กรุณาตอบให้ครบ ${expectedAnswers.length} ช่อง โดยคั่นด้วยเครื่องหมายจุลภาค`,
    };
  }

  const results = expectedAnswers.map((expected, index) => checkTypingAnswer(parts[index], expected));
  if (results.every((result) => result.isCorrect)) {
    return { isCorrect: true, isNearMiss: false, errorType: null, message: 'ถูกต้อง! เก่งมาก' };
  }
  if (results.every((result) => result.isCorrect || result.isNearMiss)) {
    return { isCorrect: false, isNearMiss: true, errorType: 'spelling_error', message: 'เกือบถูกแล้ว ลองตรวจการสะกดอีกครั้ง' };
  }
  return { isCorrect: false, isNearMiss: false, errorType: 'wrong_form', message: 'ยังไม่ถูก ลองตรวจรูปกริยาทั้งสองคำอีกครั้ง' };
}
