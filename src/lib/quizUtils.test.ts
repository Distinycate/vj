import assert from "node:assert/strict";
import test from "node:test";
import {
  filterDistractors,
  getVocabularyField,
  parseAcceptableAnswers,
  QUESTION_ANSWER_CONFIG,
  uniqueChoicesByText,
} from "./quizUtils.ts";

test("question answer languages and fields follow the shared contract", () => {
  assert.deepEqual(QUESTION_ANSWER_CONFIG.listening_mc, {
    answerField: "word",
    choiceField: "word",
    answerLanguage: "en",
  });
  assert.deepEqual(QUESTION_ANSWER_CONFIG.meaning_mc, {
    answerField: "meaning_th",
    choiceField: "meaning_th",
    answerLanguage: "th",
  });

  for (const type of ["word_mc", "context_mc", "spelling"] as const) {
    assert.equal(QUESTION_ANSWER_CONFIG[type].answerField, "word");
    assert.equal(QUESTION_ANSWER_CONFIG[type].answerLanguage, "en");
  }
});

test("duplicate English words can never become distractors", () => {
  const target = { id: "ability-1", word: "ability", meaning_th: "ความสามารถ" };
  const candidates = [
    target,
    { id: "ability-2", word: " Ability ", meaning_th: "สมรรถนะ" },
    { id: "active", word: "active", meaning_th: "กระตือรือร้น" },
    { id: "afraid", word: "afraid", meaning_th: "กลัว" },
    { id: "alone", word: "alone", meaning_th: "ลำพัง" },
  ];

  const distractors = filterDistractors({
    targetWord: target,
    candidates,
    answerField: "word",
    limit: 3,
  });

  assert.deepEqual(distractors.map((word) => word.word), ["active", "afraid", "alone"]);
});

test("Thai meanings support the legacy meaning column without duplicate choices", () => {
  assert.equal(getVocabularyField({ meaning: "ความสามารถ" }, "meaning_th"), "ความสามารถ");

  const unique = uniqueChoicesByText([
    { word_id: "1", text: "ความสามารถ", is_correct: true },
    { word_id: "2", text: " ความสามารถ ", is_correct: false },
    { word_id: "3", text: "โรงเรียน", is_correct: false },
  ]);

  assert.equal(unique.length, 2);
  assert.equal(unique[0].word_id, "1");
});

test("validateQuestion blocks questions that leak answers in their prompts", async () => {
  const { validateQuestion } = await import("../utils/questionValidator.ts");

  // 1. Leaked spelling/fill-in-blank prompt (prompt is the word itself without blank)
  const leakedSpelling = {
    id: "w1",
    question_type: "spelling",
    qType: "FILL_BLANK",
    word_id: "w1",
    correct_word_id: "w1",
    correct_answer: "advocate",
    answer_language: "en",
    word: "advocate",
    prompt: "advocate", // LEAK!
    meaning: "ผู้สนับสนุน",
  };
  const spellingRes = validateQuestion(leakedSpelling);
  assert.equal(spellingRes.valid, false);
  assert.equal(spellingRes.reason, "SPELLING_PROMPT_LEAKS_WORD");

  // 2. Leaked context_mc prompt (sentence without blank containing the word)
  const leakedContext = {
    id: "w2",
    question_type: "context_mc",
    qType: "CONTEXT_MC",
    word_id: "w2",
    correct_word_id: "w2",
    correct_answer: "advocate",
    answer_language: "en",
    word: "advocate",
    prompt: "She was a passionate advocate for civil rights.", // LEAK! No blank!
    meaning: "ผู้สนับสนุน",
    choices: [
      { word_id: "w2", text: "advocate", is_correct: true },
      { word_id: "w3", text: "oppose", is_correct: false },
      { word_id: "w4", text: "reject", is_correct: false },
      { word_id: "w5", text: "ignore", is_correct: false },
    ],
  };
  const contextRes = validateQuestion(leakedContext);
  assert.equal(contextRes.valid, false);
  assert.equal(contextRes.reason, "CONTEXT_MC_PROMPT_MISSING_BLANK");

  // 3. Valid blanked context question
  const validContext = {
    id: "w2",
    question_type: "context_mc",
    qType: "CONTEXT_MC",
    word_id: "w2",
    correct_word_id: "w2",
    correct_answer: "advocate",
    answer_language: "en",
    word: "advocate",
    prompt: "She was a passionate _____ for civil rights.",
    meaning: "ผู้สนับสนุน",
    choices: [
      { word_id: "w2", text: "advocate", is_correct: true },
      { word_id: "w3", text: "oppose", is_correct: false },
      { word_id: "w4", text: "reject", is_correct: false },
      { word_id: "w5", text: "ignore", is_correct: false },
    ],
  };
  const validRes = validateQuestion(validContext);
  assert.equal(validRes.valid, true);
});

test("parseAcceptableAnswers correctly splits and normalizes slashes", () => {
  assert.deepEqual(parseAcceptableAnswers("advocate / supporter"), ["advocate", "supporter", "advocate / supporter"]);
  assert.deepEqual(parseAcceptableAnswers("is/am"), ["is", "am", "is/am"]);
  assert.deepEqual(parseAcceptableAnswers("abandon"), ["abandon"]);
  assert.deepEqual(parseAcceptableAnswers(""), []);
  assert.deepEqual(parseAcceptableAnswers(null), []);
});

