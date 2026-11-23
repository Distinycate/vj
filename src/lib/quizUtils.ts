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

export function parseAcceptableAnswers(expectedAnswer: unknown): string[] {
  const normalized = normalizeAnswer(expectedAnswer);
  if (!normalized) return [];
  
  if (normalized.includes('/')) {
    const parts = normalized.split('/').map(p => normalizeAnswer(p)).filter(Boolean);
    return Array.from(new Set([...parts, normalized]));
  }
  return [normalized];
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
  const result: any[] = [];

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

export function buildCampaignQuestion(target: any, candidates: any[], type: QuestionType) {
  const config = QUESTION_ANSWER_CONFIG[type];
  const toThai = (word: any) => [word.meaning_th, word.meaning].find(value => /[ก-๙]/.test(String(value ?? ''))) || '';
  const vocabulary = { ...target, meaning_th: toThai(target) };
  const correct = getVocabularyField(vocabulary, config.answerField);
  if (!target.id || !(config.answerLanguage === 'en' ? /[a-z]/i : /[ก-๙]/).test(correct)) return null;
  const labels = { listening_mc: 'LISTENING_MC', word_mc: 'WORD_MC', meaning_mc: 'MEANING_MC', context_mc: 'CONTEXT_MC', spelling: 'FILL_BLANK' };
  let prompt = type === 'meaning_mc' ? target.word : vocabulary.meaning_th;
  if (type === 'listening_mc') prompt = 'ฟังเสียงแล้วเลือกคำศัพท์ที่ได้ยิน';
  if (type === 'context_mc') {
    const example = String(target.example_sentence || target.example || '').trim();
    const escaped = Array.from(correct, char => '.^$*+?()[]{}|\\'.includes(char) ? '\\' + char : char).join('');
    if (!example || !new RegExp('\\b' + escaped + '\\b', 'i').test(example)) return null;
    prompt = example.replace(new RegExp('\\b' + escaped + '\\b', 'gi'), '_____');
  }
  if (!prompt) return null;
  let choices: QuizChoice[] = [];
  if (config.choiceField) {
    const field = config.choiceField;
    const pool = candidates.map(candidate => ({ ...candidate, meaning_th: toThai(candidate) }))
      .filter(candidate => candidate.id && (config.answerLanguage === 'en' ? /[a-z]/i : /[ก-๙]/).test(getVocabularyField(candidate, field)));
    const distractors = filterDistractors({ targetWord: vocabulary, candidates: shuffleArray(pool), answerField: field });
    choices = shuffleArray(uniqueChoicesByText([{ word_id: target.id, text: correct, is_correct: true },
      ...distractors.map(candidate => ({ word_id: candidate.id, text: getVocabularyField(candidate, field), is_correct: false }))]));
    if (choices.length !== 4) return null;
  }
  return { id: target.id, word_id: target.id, correct_word_id: target.id,
    word: target.word, meaning: vocabulary.meaning_th, meaning_th: vocabulary.meaning_th,
    part_of_speech: target.part_of_speech, audio_url: target.audio_url || null,
    qType: labels[type], question_type: type, correct_answer: correct, answer_language: config.answerLanguage, prompt, choices };
}

export function isConfiguredAnswerCorrect(question: { question_type?: string; correct_answer?: string; correct_word_id?: string; choices?: QuizChoice[] }, answer: string | QuizChoice) {
  const selected = normalizeAnswer(typeof answer === 'string' ? answer : answer.text);
  if (!selected) return false;
  const isSpelling = question.question_type === 'spelling';
  if (isSpelling || !question.choices?.length) return parseAcceptableAnswers(question.correct_answer).includes(selected);
  const choice = question.choices.find(item => normalizeAnswer(item.text) === selected);
  return !!choice && choice.word_id === question.correct_word_id &&
    (typeof answer === 'string' || choice.word_id === answer.word_id);
}
