import { supabase } from '@/utils/supabase/client';
import {
  normalizeAnswer,
  QUESTION_ANSWER_CONFIG,
  QuestionType,
} from '@/lib/quizUtils';

export interface QuestionValidationResult {
  valid: boolean;
  reason: string | null;
}

export function validateQuestion(question: any): QuestionValidationResult {
  if (!question) {
    return { valid: false, reason: "MISSING_QUESTION" };
  }

  if (!question.question_type) {
    return { valid: false, reason: "MISSING_QUESTION_TYPE" };
  }

  if (!question.word_id) {
    return { valid: false, reason: "MISSING_WORD_ID" };
  }

  if (!question.correct_word_id) {
    return { valid: false, reason: "MISSING_CORRECT_WORD_ID" };
  }

  if (!question.correct_answer) {
    return { valid: false, reason: "MISSING_CORRECT_ANSWER" };
  }

  const questionType = question.question_type as QuestionType;
  const answerConfig = QUESTION_ANSWER_CONFIG[questionType];

  if (!answerConfig) {
    return { valid: false, reason: "UNSUPPORTED_QUESTION_TYPE" };
  }

  if (question.answer_language !== answerConfig.answerLanguage) {
    return { valid: false, reason: "ANSWER_LANGUAGE_MISMATCH" };
  }

  if (questionType === "listening_mc") {
    if (answerConfig.answerField !== "word" || answerConfig.choiceField !== "word") {
      return { valid: false, reason: "LISTENING_CONFIG_MUST_USE_WORD" };
    }

    if (normalizeAnswer(question.correct_answer) !== normalizeAnswer(question.word)) {
      return { valid: false, reason: "LISTENING_ANSWER_MUST_BE_ENGLISH_WORD" };
    }
  }

  if (
    ["word_mc", "context_mc", "spelling"].includes(questionType) &&
    normalizeAnswer(question.correct_answer) !== normalizeAnswer(question.word)
  ) {
    return { valid: false, reason: "ENGLISH_ANSWER_MUST_MATCH_WORD" };
  }

  if (
    questionType === "meaning_mc" &&
    normalizeAnswer(question.correct_answer) !== normalizeAnswer(question.meaning)
  ) {
    return { valid: false, reason: "THAI_ANSWER_MUST_MATCH_MEANING" };
  }

  if (questionType !== "spelling") {
    if (!Array.isArray(question.choices)) {
      return { valid: false, reason: "MISSING_CHOICES" };
    }

    if (question.choices.length < 4) {
      return { valid: false, reason: "NOT_ENOUGH_CHOICES" };
    }

    const invalidChoiceShape = question.choices.some((choice: any) =>
      !choice ||
      typeof choice.word_id !== "string" ||
      typeof choice.text !== "string" ||
      typeof choice.is_correct !== "boolean"
    );
    if (invalidChoiceShape) {
      return { valid: false, reason: "INVALID_CHOICE_SHAPE" };
    }

    const normalizedTexts = question.choices.map((choice: any) =>
      normalizeAnswer(choice.text)
    );

    if (normalizedTexts.some((text: string) => !text)) {
      return { valid: false, reason: "EMPTY_CHOICE_TEXT" };
    }

    const uniqueTexts = new Set(normalizedTexts);

    if (normalizedTexts.length !== uniqueTexts.size) {
      return { valid: false, reason: "DUPLICATE_CHOICE_TEXT" };
    }

    const correctChoices = question.choices.filter(
      (choice: any) => choice.is_correct === true
    );

    if (correctChoices.length !== 1) {
      return { valid: false, reason: "INVALID_CORRECT_CHOICE_COUNT" };
    }

    const correctChoice = correctChoices[0];

    if (correctChoice.word_id !== question.correct_word_id) {
      return { valid: false, reason: "CORRECT_WORD_ID_MISMATCH" };
    }

    const duplicateCorrectWordIdAsWrong = question.choices.some(
      (choice: any) =>
        choice.word_id === question.correct_word_id &&
        choice.is_correct !== true
    );

    if (duplicateCorrectWordIdAsWrong) {
      return { valid: false, reason: "CORRECT_WORD_ID_USED_AS_DISTRACTOR" };
    }

    if (
      normalizeAnswer(correctChoice.text) !==
      normalizeAnswer(question.correct_answer)
    ) {
      return { valid: false, reason: "CORRECT_TEXT_MISMATCH" };
    }

    const duplicateCorrectTextAsWrong = question.choices.some((choice: any) => {
      return (
        normalizeAnswer(choice.text) === normalizeAnswer(question.correct_answer) &&
        choice.is_correct !== true
      );
    });

    if (duplicateCorrectTextAsWrong) {
      return {
        valid: false,
        reason: "DUPLICATE_CORRECT_TEXT_AS_DISTRACTOR"
      };
    }
  }

  return { valid: true, reason: null };
}

export function validateQuestionSet(questions: any[]) {
  const validQuestions = [];
  const rejectedQuestions = [];

  for (const question of questions) {
    const result = validateQuestion(question);

    if (result.valid) {
      validQuestions.push(question);
    } else {
      rejectedQuestions.push({
        question,
        reason: result.reason
      });
    }
  }

  return {
    validQuestions,
    rejectedQuestions,
    isValid: rejectedQuestions.length === 0
  };
}

export async function logQuestionValidationError(question: any, reason: string | null) {
  if (!reason) return;
  
  try {
    await supabase.from('question_validation_logs').insert([{
      question_id: `GEN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      word_id: question.word_id || question.id || null,
      question_type: question.question_type || 'UNKNOWN',
      error_type: reason,
      error_message: `Question rejected during generation: ${reason}`,
      raw_question_json: question
    }]);
  } catch (err) {
    console.error("Failed to log question validation error:", err);
  }
}
