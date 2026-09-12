import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateWordAttempt,
  clampResponseTime,
  calculateEWMA,
  calculateFluencyModifier,
} from './masteryModel.ts';
import type {
  WordReviewState,
  WordAttemptInput,
} from './masteryModel.ts';

test('1. Response Time Clamping and EWMA calculation', () => {
  assert.equal(clampResponseTime(100), 300, 'Clamps below 300ms to 300ms');
  assert.equal(clampResponseTime(120000), 60000, 'Clamps above 60000ms to 60000ms');
  assert.equal(clampResponseTime(2450), 2450, 'Keeps normal response time');

  // EWMA: 0.3 * current + 0.7 * old
  // 0.3 * 1000 + 0.7 * 2000 = 300 + 1400 = 1700
  assert.equal(calculateEWMA(1000, 2000), 1700);

  // Fluency modifiers
  assert.equal(calculateFluencyModifier(2000), 10, 'Fast response <= 2500ms gets +10');
  assert.equal(calculateFluencyModifier(4000), 5, 'Medium response <= 5000ms gets +5');
  assert.equal(calculateFluencyModifier(8000), 0, 'Normal response <= 10000ms gets 0');
  assert.equal(calculateFluencyModifier(15000), -5, 'Slow response > 10000ms gets -5');
});

test('2. First attempt (New word) enters LEARNING immediately', () => {
  const attemptDate = new Date('2026-09-12T10:00:00Z');
  const attempt: WordAttemptInput = {
    wordId: 'word-1',
    isCorrect: true,
    responseTimeMs: 2500,
    attemptedAt: attemptDate,
  };

  const result = evaluateWordAttempt(null, attempt);
  const state = result.nextState;

  assert.equal(state.masteryStatus, 'LEARNING');
  assert.equal(state.attemptCount, 1);
  assert.equal(state.correctCount, 1);
  assert.equal(state.wrongCount, 0);
  assert.equal(state.consecutiveCorrect, 1);
  assert.equal(state.consecutiveWrong, 0);
  assert.equal(state.reviewStep, 1);
  assert.equal(state.successfulReviewCount, 1);
  assert.equal(state.firstSeenAt.getTime(), attemptDate.getTime());
  assert.equal(state.lastSeenAt.getTime(), attemptDate.getTime());
  assert.equal(result.wasDueReview, true);
});

test('3. Promotion to FAMILIAR requires 3 consecutive correct and score >= 60', () => {
  let state: WordReviewState | null = null;
  const baseTime = new Date('2026-09-12T10:00:00Z').getTime();

  // Attempt 1 (Correct)
  let res = evaluateWordAttempt(state, {
    wordId: 'word-1',
    isCorrect: true,
    responseTimeMs: 2000,
    attemptedAt: new Date(baseTime),
  });
  state = res.nextState;
  assert.equal(state.masteryStatus, 'LEARNING');

  // Attempt 2 (Correct, within 1 hour - not due for review)
  res = evaluateWordAttempt(state, {
    wordId: 'word-1',
    isCorrect: true,
    responseTimeMs: 2000,
    attemptedAt: new Date(baseTime + 10 * 60 * 1000), // 10 mins later
  });
  state = res.nextState;
  assert.equal(state.masteryStatus, 'LEARNING');
  assert.equal(res.wasDueReview, false);
  assert.equal(state.consecutiveCorrect, 2);

  // Attempt 3 (Correct) -> 3 consecutive correct!
  res = evaluateWordAttempt(state, {
    wordId: 'word-1',
    isCorrect: true,
    responseTimeMs: 2000,
    attemptedAt: new Date(baseTime + 20 * 60 * 1000), // 20 mins later
  });
  state = res.nextState;
  assert.equal(state.masteryStatus, 'FAMILIAR', 'Promoted to FAMILIAR after 3 consecutive correct');
  assert.ok(state.masteryScore >= 60, `Score is ${state.masteryScore} >= 60`);
  assert.ok(state.reviewStep >= 2, `Review step is ${state.reviewStep} >= 2`);
});

test('4. Anti-Grinding: 5 rapid correct answers in the same hour CANNOT become MASTERED', () => {
  let state: WordReviewState | null = null;
  const startTime = new Date('2026-09-12T10:00:00Z').getTime();

  // 6 rapid correct answers within 30 minutes
  for (let i = 0; i < 6; i++) {
    const res = evaluateWordAttempt(state, {
      wordId: 'word-1',
      isCorrect: true,
      responseTimeMs: 1500,
      attemptedAt: new Date(startTime + i * 5 * 60 * 1000),
    });
    state = res.nextState;
  }

  assert.ok(state);
  assert.equal(state.consecutiveCorrect, 6);
  assert.equal(
    state.masteryStatus,
    'FAMILIAR',
    'Must NOT be MASTERED because 24h retention evidence has not elapsed'
  );
});

test('5. Promotion to MASTERED succeeds with 24h+ retention and spaced review', () => {
  let state: WordReviewState | null = null;
  const day1 = new Date('2026-09-12T10:00:00Z').getTime();

  // Day 1: 4 correct answers
  for (let i = 0; i < 4; i++) {
    const res = evaluateWordAttempt(state, {
      wordId: 'word-1',
      isCorrect: true,
      responseTimeMs: 1500,
      attemptedAt: new Date(day1 + i * 10 * 60 * 1000),
    });
    state = res.nextState;
  }
  assert.ok(state);
  assert.equal(state.masteryStatus, 'FAMILIAR');

  // Day 4 (75 hours later) - Step 2 (72h) review is due!
  const day2 = day1 + 75 * 60 * 60 * 1000;
  assert.ok(
    day2 >= state.nextReviewAt.getTime(),
    'Next review is due on day 4 (after 72h interval)'
  );

  const resDay2 = evaluateWordAttempt(state, {
    wordId: 'word-1',
    isCorrect: true,
    responseTimeMs: 1500,
    attemptedAt: new Date(day2),
  });
  state = resDay2.nextState;

  assert.equal(resDay2.wasDueReview, true);
  assert.ok(state.successfulReviewCount >= 1);
  assert.equal(state.consecutiveCorrect, 5);
  assert.equal(state.masteryStatus, 'MASTERED', 'Promoted to MASTERED with 24h+ evidence');
  assert.ok(state.masteryScore >= 85);
});

test('6. Demotion from MASTERED: Single wrong answer demotes to FAMILIAR', () => {
  // Setup a MASTERED state
  const firstSeen = new Date('2026-09-10T10:00:00Z');
  const now = new Date('2026-09-12T10:00:00Z');

  const masteredState: WordReviewState = {
    wordId: 'word-1',
    masteryStatus: 'MASTERED',
    reviewStep: 4,
    attemptCount: 10,
    correctCount: 10,
    wrongCount: 0,
    consecutiveCorrect: 6,
    consecutiveWrong: 0,
    masteryScore: 92.5,
    successfulReviewCount: 2,
    avgResponseTimeMs: 1800,
    firstSeenAt: firstSeen,
    lastSeenAt: now,
    lastCorrectAt: now,
    lastWrongAt: null,
    nextReviewAt: new Date(now.getTime() + 14 * 24 * 3600 * 1000),
  };

  // Student makes 1 mistake
  const res = evaluateWordAttempt(masteredState, {
    wordId: 'word-1',
    isCorrect: false,
    responseTimeMs: 3500,
    attemptedAt: new Date(now.getTime() + 1000),
  });

  const state = res.nextState;
  assert.equal(state.masteryStatus, 'FAMILIAR', 'Single mistake demotes MASTERED to FAMILIAR');
  assert.equal(state.consecutiveCorrect, 0);
  assert.equal(state.consecutiveWrong, 1);
  assert.equal(state.reviewStep, 2);
  assert.equal(state.nextReviewAt.getTime(), res.nextState.lastSeenAt.getTime(), 'Due immediately');
});

test('7. Demotion from FAMILIAR: 1 wrong keeps FAMILIAR, 2 consecutive wrongs demotes to LEARNING', () => {
  const now = new Date('2026-09-12T10:00:00Z');
  const familiarState: WordReviewState = {
    wordId: 'word-1',
    masteryStatus: 'FAMILIAR',
    reviewStep: 2,
    attemptCount: 5,
    correctCount: 4,
    wrongCount: 1,
    consecutiveCorrect: 3,
    consecutiveWrong: 0,
    masteryScore: 72.0,
    successfulReviewCount: 1,
    avgResponseTimeMs: 2200,
    firstSeenAt: new Date('2026-09-11T10:00:00Z'),
    lastSeenAt: now,
    lastCorrectAt: now,
    lastWrongAt: null,
    nextReviewAt: now,
  };

  // Wrong attempt 1 in FAMILIAR
  const res1 = evaluateWordAttempt(familiarState, {
    wordId: 'word-1',
    isCorrect: false,
    responseTimeMs: 4000,
    attemptedAt: new Date(now.getTime() + 1000),
  });
  assert.equal(res1.nextState.masteryStatus, 'FAMILIAR', '1 wrong in FAMILIAR stays FAMILIAR');
  assert.equal(res1.nextState.consecutiveWrong, 1);
  assert.equal(res1.nextState.reviewStep, 1);

  // Wrong attempt 2 (consecutive) in FAMILIAR
  const res2 = evaluateWordAttempt(res1.nextState, {
    wordId: 'word-1',
    isCorrect: false,
    responseTimeMs: 4000,
    attemptedAt: new Date(now.getTime() + 2000),
  });
  assert.equal(res2.nextState.masteryStatus, 'LEARNING', '2 consecutive wrongs in FAMILIAR demotes to LEARNING');
  assert.equal(res2.nextState.consecutiveWrong, 2);
  assert.equal(res2.nextState.reviewStep, 0);
});
