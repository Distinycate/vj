import assert from "node:assert/strict";
import test from "node:test";
import {
  filterDistractors,
  getVocabularyField,
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
