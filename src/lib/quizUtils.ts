export const QUESTION_ANSWER_CONFIG = {
  listening_mc: {
    answerField: "word",
    choiceField: "word",
    answerLanguage: "en",
  },
  word_mc: {
    answerField: "word",
    choiceField: "word",
    answerLanguage: "en",
  },
  meaning_mc: {
    answerField: "meaning_th",
    choiceField: "meaning_th",
    answerLanguage: "th",
  },
  context_mc: {
    answerField: "word",
    choiceField: "word",
    answerLanguage: "en",
  },
  spelling: {
    answerField: "word",
    choiceField: null,
    answerLanguage: "en",
  },
} as const;

export type QuestionType = keyof typeof QUESTION_ANSWER_CONFIG;
export type AnswerLanguage = "en" | "th";
export type VocabularyAnswerField = "word" | "meaning_th" | "meaning";

export interface QuizChoice {
  word_id: string;
  text: string;
  is_correct: boolean;
  hidden?: boolean;
}

export function getVocabularyField(
  vocabulary: Record<string, unknown> | null | undefined,
  field: VocabularyAnswerField,
): string {
  if (!vocabulary) return "";

  if (field === "meaning_th") {
    return String(vocabulary.meaning_th ?? vocabulary.meaning ?? "").trim();
  }

  return String(vocabulary[field] ?? "").trim();
}

export function normalizeAnswer(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function normalizeThai(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

export function uniqueChoicesByText<
  T extends { text?: string; word?: string; meaning_th?: string; meaning?: string }
>(choices: T[]): T[] {
  const seen = new Set<string>();

  return choices.filter((choice) => {
    // Check both meaning_th (user requested) and meaning (what's used in our DB previously)
    const displayText = choice.text ?? choice.word ?? choice.meaning_th ?? choice.meaning ?? "";
    const key = normalizeAnswer(displayText);

    if (!key) return false;
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

export function filterDistractors(params: {
  targetWord: any;
  candidates: any[];
  answerField: VocabularyAnswerField;
  limit?: number;
}) {
  const { targetWord, candidates, answerField, limit = 3 } = params;

  const targetValue = normalizeAnswer(getVocabularyField(targetWord, answerField));
  const seen = new Set<string>([targetValue]);
  const result = [];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (candidate.id === targetWord.id) continue;

    const value = normalizeAnswer(getVocabularyField(candidate, answerField));

    if (!value) continue;
    if (seen.has(value)) continue;

    seen.add(value);
    result.push(candidate);

    if (result.length >= limit) break;
  }

  return result;
}

export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
