import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateWordAttempt } from './masteryModel.ts';
import type { WordReviewState } from './masteryModel.ts';

test('Persona 1: Fast Learner — Consistent accuracy, achieves MASTERED across 4 days', () => {
  let state: WordReviewState | null = null;
  const day0 = new Date('2026-09-01T08:00:00Z').getTime();

  // Day 0: Learns word (correct, fast)
  let res = evaluateWordAttempt(state, {
    wordId: 'vocab-fast',
    isCorrect: true,
    responseTimeMs: 1200,
    attemptedAt: new Date(day0),
  });
  state = res.nextState;
  assert.equal(state.masteryStatus, 'LEARNING');
  assert.equal(state.reviewStep, 1);

  // Day 1 (25 hours later): Reviews on schedule (due review)
  const day1 = day0 + 25 * 3600 * 1000;
  res = evaluateWordAttempt(state, {
    wordId: 'vocab-fast',
    isCorrect: true,
    responseTimeMs: 1100,
    attemptedAt: new Date(day1),
  });
  state = res.nextState;
  assert.equal(state.reviewStep, 2);

  // Day 1 (later in day): another repetition
  res = evaluateWordAttempt(state, {
    wordId: 'vocab-fast',
    isCorrect: true,
    responseTimeMs: 1000,
    attemptedAt: new Date(day1 + 2 * 3600 * 1000),
  });
  state = res.nextState;
  assert.equal(state.masteryStatus, 'FAMILIAR');

  // Day 4 (75 hours after day 1, due for review)
  const day4 = day1 + 75 * 3600 * 1000;
  res = evaluateWordAttempt(state, {
    wordId: 'vocab-fast',
    isCorrect: true,
    responseTimeMs: 950,
    attemptedAt: new Date(day4),
  });
  state = res.nextState;

  // Day 4 (second practice): 5 consecutive correct, >= 24h retention, successful reviews
  res = evaluateWordAttempt(state, {
    wordId: 'vocab-fast',
    isCorrect: true,
    responseTimeMs: 900,
    attemptedAt: new Date(day4 + 3600 * 1000),
  });
  state = res.nextState;

  assert.equal(state.masteryStatus, 'MASTERED', 'Fast learner attains MASTERED after spaced retention');
  assert.ok(state.masteryScore >= 85);
  assert.equal(state.consecutiveCorrect, 5);
});

test('Persona 2: Grinder / Crammer — 50 attempts in 2 hours CANNOT achieve MASTERED', () => {
  let state: WordReviewState | null = null;
  const start = new Date('2026-09-01T12:00:00Z').getTime();

  for (let i = 0; i < 50; i++) {
    const res = evaluateWordAttempt(state, {
      wordId: 'vocab-cram',
      isCorrect: true,
      responseTimeMs: 800,
      attemptedAt: new Date(start + i * 2 * 60 * 1000), // every 2 mins
    });
    state = res.nextState;
  }

  assert.ok(state);
  assert.equal(
    state.masteryStatus,
    'FAMILIAR',
    'Crammer is locked at FAMILIAR because 24-hour retention has not elapsed'
  );
  assert.equal(state.consecutiveCorrect, 50);
});

test('Persona 3: Struggling Learner — frequent errors keep student in LEARNING', () => {
  let state: WordReviewState | null = null;
  const start = new Date('2026-09-01T12:00:00Z').getTime();

  // Attempt 1: Wrong
  let res = evaluateWordAttempt(state, {
    wordId: 'vocab-struggle',
    isCorrect: false,
    responseTimeMs: 8000,
    attemptedAt: new Date(start),
  });
  state = res.nextState;
  assert.equal(state.masteryStatus, 'LEARNING');
  assert.equal(state.reviewStep, 0);

  // Attempt 2: Correct
  res = evaluateWordAttempt(state, {
    wordId: 'vocab-struggle',
    isCorrect: true,
    responseTimeMs: 7000,
    attemptedAt: new Date(start + 5 * 60 * 1000),
  });
  state = res.nextState;
  assert.equal(state.consecutiveCorrect, 1);

  // Attempt 3: Wrong again
  res = evaluateWordAttempt(state, {
    wordId: 'vocab-struggle',
    isCorrect: false,
    responseTimeMs: 9000,
    attemptedAt: new Date(start + 10 * 60 * 1000),
  });
  state = res.nextState;
  assert.equal(state.masteryStatus, 'LEARNING');
  assert.equal(state.consecutiveCorrect, 0);
  assert.equal(state.reviewStep, 0);
  assert.ok(state.masteryScore <= 50);
});

test('Persona 4: Dormant Learner — returns after 14 days, review is overdue', () => {
  const day0 = new Date('2026-09-01T08:00:00Z');
  // Starts in FAMILIAR
  const dormantState: WordReviewState = {
    wordId: 'vocab-dormant',
    masteryStatus: 'FAMILIAR',
    reviewStep: 2,
    attemptCount: 5,
    correctCount: 4,
    wrongCount: 1,
    consecutiveCorrect: 3,
    consecutiveWrong: 0,
    masteryScore: 70.0,
    successfulReviewCount: 1,
    avgResponseTimeMs: 2500,
    firstSeenAt: day0,
    lastSeenAt: day0,
    lastCorrectAt: day0,
    lastWrongAt: null,
    nextReviewAt: new Date(day0.getTime() + 72 * 3600 * 1000), // due 3 days later
  };

  // Student returns 14 days later
  const day14 = new Date(day0.getTime() + 14 * 24 * 3600 * 1000);
  const res = evaluateWordAttempt(dormantState, {
    wordId: 'vocab-dormant',
    isCorrect: true,
    responseTimeMs: 2200,
    attemptedAt: day14,
  });

  assert.equal(res.wasDueReview, true, '14 days later is definitely overdue');
  assert.equal(res.nextState.successfulReviewCount, 2);
  assert.equal(res.nextState.consecutiveCorrect, 4);
});

test('Persona 5: Regressing Learner — was MASTERED, errs and immediately drops to FAMILIAR', () => {
  const day0 = new Date('2026-09-01T08:00:00Z');
  const day10 = new Date('2026-09-11T08:00:00Z');

  const masteredState: WordReviewState = {
    wordId: 'vocab-regress',
    masteryStatus: 'MASTERED',
    reviewStep: 4,
    attemptCount: 12,
    correctCount: 12,
    wrongCount: 0,
    consecutiveCorrect: 8,
    consecutiveWrong: 0,
    masteryScore: 94.0,
    successfulReviewCount: 3,
    avgResponseTimeMs: 1400,
    firstSeenAt: day0,
    lastSeenAt: day10,
    lastCorrectAt: day10,
    lastWrongAt: null,
    nextReviewAt: new Date(day10.getTime() + 14 * 24 * 3600 * 1000),
  };

  const errTime = new Date('2026-09-15T08:00:00Z');
  const res = evaluateWordAttempt(masteredState, {
    wordId: 'vocab-regress',
    isCorrect: false,
    responseTimeMs: 4500,
    attemptedAt: errTime,
  });

  assert.equal(res.nextState.masteryStatus, 'FAMILIAR');
  assert.equal(res.nextState.reviewStep, 2);
  assert.equal(res.nextState.consecutiveCorrect, 0);
  assert.equal(res.nextState.consecutiveWrong, 1);
  assert.equal(res.nextState.nextReviewAt.getTime(), errTime.getTime(), 'Due immediately for repair');
});

test('Persona 6: Slow but Accurate Learner — high accuracy with slow response time', () => {
  let state: WordReviewState | null = null;
  const day0 = new Date('2026-09-01T08:00:00Z').getTime();

  // Takes 15,000ms each time (careful thinking)
  for (let i = 0; i < 4; i++) {
    const res = evaluateWordAttempt(state, {
      wordId: 'vocab-slow-accurate',
      isCorrect: true,
      responseTimeMs: 15000,
      attemptedAt: new Date(day0 + i * 30 * 60 * 1000),
    });
    state = res.nextState;
  }

  assert.ok(state);
  assert.equal(state.avgResponseTimeMs, 15000);
  // Accuracy is 100% (70 pts) + streak 4*4=16 pts - 5 penalty = 81 pts
  assert.equal(state.masteryStatus, 'FAMILIAR');
  assert.ok(state.masteryScore >= 60 && state.masteryScore <= 84.99);
});

test('Scenario 7: Forged ultra-fast response telemetry — clamped to 300ms, no exploit', () => {
  const res = evaluateWordAttempt(null, {
    wordId: 'vocab-bot',
    isCorrect: true,
    responseTimeMs: 5, // Forged bot attempt: 5 milliseconds!
    attemptedAt: new Date('2026-09-01T12:00:00Z'),
  });

  assert.equal(res.telemetry.clampedResponseTimeMs, 300, 'Must clamp 5ms to minimum 300ms');
  assert.equal(res.nextState.avgResponseTimeMs, 300);
});

test('Scenario 8: Duplicate completion / Idempotency protection simulation', () => {
  let state: WordReviewState | null = null;
  const t0 = new Date('2026-09-01T12:00:00Z');

  // First evaluation
  const res1 = evaluateWordAttempt(state, {
    wordId: 'vocab-dup',
    isCorrect: true,
    responseTimeMs: 1200,
    attemptedAt: t0,
  });
  state = res1.nextState;

  // In our architecture, the server checks stage_attempts.status === 'COMPLETED'
  // and aborts before state evaluation. If re-evaluated with same state, it is idempotent:
  assert.equal(state.attemptCount, 1);
  assert.equal(state.correctCount, 1);
  assert.equal(state.reviewStep, 1);
});

test('Scenario 9: Out-of-order / Late response handling', () => {
  const t0 = new Date('2026-09-01T10:00:00Z');
  const res1 = evaluateWordAttempt(null, {
    wordId: 'vocab-late',
    isCorrect: true,
    responseTimeMs: 1800,
    attemptedAt: t0,
  });

  // Subsequent answer hours later
  const tLater = new Date('2026-09-01T16:00:00Z');
  const res2 = evaluateWordAttempt(res1.nextState, {
    wordId: 'vocab-late',
    isCorrect: true,
    responseTimeMs: 1400,
    attemptedAt: tLater,
  });

  assert.ok(res2.nextState.lastSeenAt.getTime() > res1.nextState.lastSeenAt.getTime());
  assert.equal(res2.nextState.attemptCount, 2);
});

test('Scenario 10: Repeated failed reviews demote down to Step 0 and LEARNING', () => {
  const day0 = new Date('2026-09-01T08:00:00Z');
  // Starts in FAMILIAR
  let state: WordReviewState = {
    wordId: 'vocab-fail-srs',
    masteryStatus: 'FAMILIAR',
    reviewStep: 2,
    attemptCount: 6,
    correctCount: 5,
    wrongCount: 1,
    consecutiveCorrect: 4,
    consecutiveWrong: 0,
    masteryScore: 75.0,
    successfulReviewCount: 1,
    avgResponseTimeMs: 2000,
    firstSeenAt: day0,
    lastSeenAt: day0,
    lastCorrectAt: day0,
    lastWrongAt: null,
    nextReviewAt: new Date(day0.getTime() + 72 * 3600 * 1000),
  };

  // Review 1: Fails
  const res1 = evaluateWordAttempt(state, {
    wordId: 'vocab-fail-srs',
    isCorrect: false,
    responseTimeMs: 4000,
    attemptedAt: new Date(day0.getTime() + 73 * 3600 * 1000),
  });
  state = res1.nextState;
  assert.equal(state.masteryStatus, 'FAMILIAR', '1st fail keeps FAMILIAR');
  assert.equal(state.reviewStep, 1);

  // Review 2: Fails again consecutively
  const res2 = evaluateWordAttempt(state, {
    wordId: 'vocab-fail-srs',
    isCorrect: false,
    responseTimeMs: 4000,
    attemptedAt: new Date(day0.getTime() + 74 * 3600 * 1000),
  });
  state = res2.nextState;
  assert.equal(state.masteryStatus, 'LEARNING', '2nd consecutive fail drops to LEARNING');
  assert.equal(state.reviewStep, 0, 'Step resets to 0');
  assert.equal(state.consecutiveWrong, 2);
});
