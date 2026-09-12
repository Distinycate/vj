export type MasteryStatus = 'LEARNING' | 'FAMILIAR' | 'MASTERED';

export interface WordReviewState {
  wordId: string;
  masteryStatus: MasteryStatus;
  reviewStep: number; // 0..5
  attemptCount: number;
  correctCount: number;
  wrongCount: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  masteryScore: number; // 0..100
  successfulReviewCount: number;
  avgResponseTimeMs: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  lastCorrectAt: Date | null;
  lastWrongAt: Date | null;
  nextReviewAt: Date;
}

export interface WordAttemptInput {
  wordId: string;
  isCorrect: boolean;
  responseTimeMs: number;
  attemptedAt?: Date;
}

export interface MasteryUpdateResult {
  previousState: WordReviewState | null;
  nextState: WordReviewState;
  wasDueReview: boolean;
  telemetry: {
    clampedResponseTimeMs: number;
    scoreDelta: number;
    statusChanged: boolean;
  };
}

// Spaced Repetition Step Intervals (in hours)
// Step 0: 4 hours (initial learning)
// Step 1: 24 hours (1 day)
// Step 2: 72 hours (3 days)
// Step 3: 168 hours (7 days)
// Step 4: 336 hours (14 days)
// Step 5: 720 hours (30 days)
export const SRS_INTERVAL_HOURS: readonly number[] = [4, 24, 72, 168, 336, 720];

// Response Time Clamping: 300ms to 60,000ms
export const MIN_RESPONSE_TIME_MS = 300;
export const MAX_RESPONSE_TIME_MS = 60000;

// Retention time constraint for MASTERED: 24 hours
export const MASTERED_MIN_RETENTION_MS = 24 * 60 * 60 * 1000;

export function clampResponseTime(ms: number): number {
  if (isNaN(ms) || ms < MIN_RESPONSE_TIME_MS) return MIN_RESPONSE_TIME_MS;
  if (ms > MAX_RESPONSE_TIME_MS) return MAX_RESPONSE_TIME_MS;
  return Math.round(ms);
}

export function calculateEWMA(currentClampedMs: number, oldEwmaMs: number): number {
  if (!oldEwmaMs || oldEwmaMs <= 0) return currentClampedMs;
  // EWMA: 0.3 * current + 0.7 * old
  return Math.round(0.3 * currentClampedMs + 0.7 * oldEwmaMs);
}

export function calculateFluencyModifier(avgResponseTimeMs: number): number {
  if (avgResponseTimeMs <= 0) return 0;
  if (avgResponseTimeMs <= 2500) return 10;
  if (avgResponseTimeMs <= 5000) return 5;
  if (avgResponseTimeMs <= 10000) return 0;
  return -5;
}

export function calculateRawScore(
  accuracyRate: number,
  consecutiveCorrect: number,
  avgResponseTimeMs: number
): number {
  const baseAccuracy = accuracyRate * 70;
  const streakBonus = Math.min(20, consecutiveCorrect * 4);
  const fluencyMod = calculateFluencyModifier(avgResponseTimeMs);
  const rawScore = baseAccuracy + streakBonus + fluencyMod;
  return Math.max(0, Math.min(100, Math.round(rawScore * 100) / 100));
}

export function formatMasteryScoreForStatus(
  rawScore: number,
  status: MasteryStatus
): number {
  let score = rawScore;
  if (status === 'MASTERED') {
    score = Math.max(85, score);
  } else if (status === 'FAMILIAR') {
    score = Math.max(50, Math.min(84.99, score));
  } else {
    score = Math.min(65, score);
  }
  return Math.round(score * 100) / 100;
}

/**
 * Pure state machine transition function for a word attempt.
 */
export function evaluateWordAttempt(
  current: WordReviewState | null,
  attempt: WordAttemptInput
): MasteryUpdateResult {
  const now = attempt.attemptedAt || new Date();
  const clampedMs = clampResponseTime(attempt.responseTimeMs);

  const isNewWord = !current;
  const wasDueReview = isNewWord
    ? true
    : now.getTime() >= current.nextReviewAt.getTime();

  const newAvgResponseTime = isNewWord
    ? clampedMs
    : calculateEWMA(clampedMs, current.avgResponseTimeMs);

  const attemptCount = (current?.attemptCount || 0) + 1;
  const correctCount = (current?.correctCount || 0) + (attempt.isCorrect ? 1 : 0);
  const wrongCount = (current?.wrongCount || 0) + (attempt.isCorrect ? 0 : 1);
  const accuracyRate = correctCount / attemptCount;

  const consecutiveCorrect = attempt.isCorrect
    ? (current?.consecutiveCorrect || 0) + 1
    : 0;
  const consecutiveWrong = attempt.isCorrect
    ? 0
    : (current?.consecutiveWrong || 0) + 1;

  let successfulReviewCount = current?.successfulReviewCount || 0;
  let reviewStep = current?.reviewStep || 0;
  let masteryStatus: MasteryStatus = current?.masteryStatus || 'LEARNING';
  const firstSeenAt = current?.firstSeenAt || now;

  if (attempt.isCorrect) {
    // Only increment successfulReviewCount and advance reviewStep if due for review
    if (wasDueReview) {
      successfulReviewCount += 1;
      reviewStep = Math.min(5, reviewStep + 1);
    }

    // Calculate raw score
    const rawScore = calculateRawScore(
      accuracyRate,
      consecutiveCorrect,
      newAvgResponseTime
    );

    // Promotion checks
    // Check MASTERED criteria:
    // 1. consecutiveCorrect >= 5
    // 2. rawScore >= 85
    // 3. successfulReviewCount >= 1
    // 4. retention time >= 24 hours
    const retentionMs = now.getTime() - firstSeenAt.getTime();
    const canBeMastered =
      consecutiveCorrect >= 5 &&
      rawScore >= 85 &&
      successfulReviewCount >= 1 &&
      retentionMs >= MASTERED_MIN_RETENTION_MS;

    if (canBeMastered) {
      masteryStatus = 'MASTERED';
    } else if (
      masteryStatus === 'LEARNING' &&
      consecutiveCorrect >= 3 &&
      rawScore >= 60
    ) {
      masteryStatus = 'FAMILIAR';
      if (reviewStep < 2) reviewStep = 2;
    }
  } else {
    // Demotion rules
    if (masteryStatus === 'MASTERED') {
      // 1 wrong answer in MASTERED -> demote to FAMILIAR
      masteryStatus = 'FAMILIAR';
      reviewStep = 2;
    } else if (masteryStatus === 'FAMILIAR') {
      if (consecutiveWrong >= 2) {
        // 2 consecutive wrongs in FAMILIAR -> demote to LEARNING
        masteryStatus = 'LEARNING';
        reviewStep = 0;
      } else {
        // 1 wrong in FAMILIAR -> keep FAMILIAR, step 1
        reviewStep = 1;
      }
    } else {
      // LEARNING wrong
      reviewStep = 0;
    }
  }

  // Calculate final mastery score based on the resolved status
  const finalRawScore = calculateRawScore(
    accuracyRate,
    consecutiveCorrect,
    newAvgResponseTime
  );
  const finalMasteryScore = formatMasteryScoreForStatus(finalRawScore, masteryStatus);

  // Determine next review schedule
  const intervalHours = SRS_INTERVAL_HOURS[reviewStep] ?? 4;
  let nextReviewAt: Date;

  if (!attempt.isCorrect) {
    // Wrong answers are due immediately for review
    nextReviewAt = new Date(now.getTime());
  } else {
    nextReviewAt = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
  }

  const nextState: WordReviewState = {
    wordId: attempt.wordId,
    masteryStatus,
    reviewStep,
    attemptCount,
    correctCount,
    wrongCount,
    consecutiveCorrect,
    consecutiveWrong,
    masteryScore: finalMasteryScore,
    successfulReviewCount,
    avgResponseTimeMs: newAvgResponseTime,
    firstSeenAt,
    lastSeenAt: now,
    lastCorrectAt: attempt.isCorrect ? now : current?.lastCorrectAt || null,
    lastWrongAt: !attempt.isCorrect ? now : current?.lastWrongAt || null,
    nextReviewAt,
  };

  return {
    previousState: current,
    nextState,
    wasDueReview,
    telemetry: {
      clampedResponseTimeMs: clampedMs,
      scoreDelta: current ? Math.round((finalMasteryScore - current.masteryScore) * 100) / 100 : finalMasteryScore,
      statusChanged: current ? current.masteryStatus !== masteryStatus : true,
    },
  };
}
