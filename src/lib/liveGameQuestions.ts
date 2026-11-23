import { normalizeAnswer, parseAcceptableAnswers } from './quizUtils.ts';

type LiveQuestion = {
  public_id: string;
  qType: string;
  question_type: string;
  answer_language: string;
  prompt: string;
  word: string;
  correct_answer: string;
  correct_word_id: string;
  choices: { public_id: string; word_id: string; text: string }[];
};

export function toLiveGameQuestion(question: LiveQuestion, stageType: string) {
  return {
    id: question.public_id,
    qType: question.qType,
    question_type: question.question_type,
    answer_language: question.answer_language,
    prompt: question.prompt,
    stageType,
    serverGraded: true,
    ...(question.question_type === 'meaning_mc' ? { word: question.prompt } : {}),
    choices: question.choices.map(({ public_id, text }) => ({ word_id: public_id, text })),
  };
}

export function gradeLiveGameAnswer(question: LiveQuestion, answer: string) {
  if (!normalizeAnswer(answer)) return false;
  if (question.question_type === 'spelling') return parseAcceptableAnswers(question.correct_answer).includes(normalizeAnswer(answer));
  return question.choices.some(choice => choice.public_id === answer && choice.word_id === question.correct_word_id);
}
