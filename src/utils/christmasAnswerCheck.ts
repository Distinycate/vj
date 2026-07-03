import { levenshtein } from './levenshtein';

export function normalizeChristmasAnswer(answer: string): string {
  if (!answer) return '';
  return answer
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .replace(/[.,!?]/g, ''); // Remove common punctuation
}

export function checkChristmasAnswer(studentAnswer: string, expectedAnswer: string): {
  isCorrect: boolean;
  isNearMiss: boolean;
  errorType: string | null;
  message: string;
} {
  if (!studentAnswer.trim()) {
    return { isCorrect: false, isNearMiss: false, errorType: 'blank_answer', message: 'กรุณาพิมพ์คำตอบ' };
  }

  const normalizedStudent = normalizeChristmasAnswer(studentAnswer);
  const normalizedExpected = normalizeChristmasAnswer(expectedAnswer);

  if (normalizedStudent === normalizedExpected) {
    return { isCorrect: true, isNearMiss: false, errorType: null, message: 'ถูกต้อง! 🎉' };
  }

  // Check Levenshtein distance for near miss (only for English words generally)
  const isEnglishOnly = /^[a-z\s]+$/.test(normalizedExpected);
  if (isEnglishOnly && normalizedExpected.length > 3) {
    const dist = levenshtein(normalizedStudent, normalizedExpected);
    // Allow 1 typo for words length 4-7, 2 typos for words > 7
    const threshold = normalizedExpected.length > 7 ? 2 : 1;
    if (dist <= threshold) {
      return { 
        isCorrect: false, 
        isNearMiss: true, 
        errorType: 'spelling_error', 
        message: 'เกือบถูกแล้ว! ระวังตัวสะกดนิดเดียวนะ (ไม่หักหัวใจ 💛)' 
      };
    }
  }

  return { isCorrect: false, isNearMiss: false, errorType: 'wrong_word', message: 'ยังไม่ถูกต้อง พยายามเข้านะ!' };
}
