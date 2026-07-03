import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { checkCompoundTypingAnswer, checkTypingAnswer, normalizeAnswer, parseAcceptableAnswers } from '../utils/answerCheck.ts';
import { calculateAttemptScore } from '../utils/eventScoring.ts';

describe('Event Utilities - Answer Check', () => {
  test('normalizeAnswer trims and lowercases', () => {
    assert.strictEqual(normalizeAnswer('  WENT  '), 'went');
    assert.strictEqual(normalizeAnswer('Has/Have'), 'has/have');
  });

  test('parseAcceptableAnswers handles slash answers', () => {
    const parsed = parseAcceptableAnswers('is/am');
    assert.ok(parsed.includes('is'));
    assert.ok(parsed.includes('am'));
    assert.ok(parsed.includes('is/am'));
  });

  test('checkTypingAnswer - exact match', () => {
    const result = checkTypingAnswer('went', 'went');
    assert.strictEqual(result.isCorrect, true);
  });

  test('checkTypingAnswer - blank answer', () => {
    const result = checkTypingAnswer('   ', 'went');
    assert.strictEqual(result.isCorrect, false);
    assert.strictEqual(result.errorType, 'blank_answer');
  });

  test('checkTypingAnswer - near miss (Levenshtein distance <= 1 for length <= 4)', () => {
    const result = checkTypingAnswer('wemt', 'went');
    assert.strictEqual(result.isCorrect, false);
    assert.strictEqual(result.isNearMiss, true);
    assert.strictEqual(result.errorType, 'spelling_error');
  });

  test('checkTypingAnswer - near miss (Levenshtein distance <= 2 for length > 4)', () => {
    const result = checkTypingAnswer('botght', 'bought'); // 2 typos
    assert.strictEqual(result.isCorrect, false);
    assert.strictEqual(result.isNearMiss, true);
  });

  test('checkTypingAnswer - completely wrong', () => {
    const result = checkTypingAnswer('goed', 'went');
    assert.strictEqual(result.isCorrect, false);
    assert.strictEqual(result.isNearMiss, false);
    assert.strictEqual(result.errorType, 'wrong_form');
  });

  test('compound answers require both verb forms in order', () => {
    assert.strictEqual(checkCompoundTypingAnswer('went, gone', ['went', 'gone']).isCorrect, true);
    assert.strictEqual(checkCompoundTypingAnswer('went', ['went', 'gone']).errorType, 'incomplete_answer');
  });
});

describe('Event Utilities - Scoring', () => {
  test('Incorrect answer (not near miss) deducts heart', () => {
    const res = calculateAttemptScore(1, false, false, 3, false);
    assert.strictEqual(res.scoreEarned, 0);
    assert.strictEqual(res.heartsRemaining, 2);
  });

  test('Near miss does not deduct heart', () => {
    const res = calculateAttemptScore(1, false, true, 3, false);
    assert.strictEqual(res.scoreEarned, 0);
    assert.strictEqual(res.heartsRemaining, 3);
  });

  test('Correct answer attempt 1 gets 100 pts', () => {
    const res = calculateAttemptScore(1, true, false, 3, false);
    assert.strictEqual(res.scoreEarned, 100);
  });
  
  test('Correct answer attempt 2 gets 70 pts', () => {
    const res = calculateAttemptScore(2, true, false, 3, false);
    assert.strictEqual(res.scoreEarned, 70);
  });

  test('Using hint deducts 20 pts', () => {
    const res = calculateAttemptScore(1, true, false, 3, true);
    assert.strictEqual(res.scoreEarned, 80);
  });
});

test('event workflow supports the internal student session and records wrong answers', () => {
  const service = readFileSync(new URL('../services/verbEventService.ts', import.meta.url), 'utf8');
  const migration = readFileSync(new URL('../../MIGRATION_EVENT_CENTER.sql', import.meta.url), 'utf8');
  assert.match(service, /\.eq\('user_id', studentId\)/);
  assert.match(service, /wrong_count/);
  assert.match(service, /total_questions/);
  assert.match(migration, /"Internal app creates attempts"/);
  assert.match(migration, /GRANT SELECT, INSERT, UPDATE ON public\.event_attempts/);
});

test('event pages no longer use fixed 83-word or zero-progress placeholders', () => {
  const landing = readFileSync(new URL('../app/events/verb-master/page.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(landing, /const totalVerbs = 83/);
  assert.doesNotMatch(landing, /practicedVerbs = 0/);
  assert.match(landing, /getStudentEventProgress/);
});
