/**
 * starRating.ts
 * Phase 3.2D — Star Rating & Economy Tier Classification
 *
 * Pure functions. Zero DB access.
 * Mirrors the EXACT star and economy logic from complete_stage_with_progression_v3.
 *
 * Invariants:
 *   - Stars 0–3 are display values.
 *   - trusted_performance_tier uses ONLY server-verifiable signals (no response time).
 *   - Economy STAR_UPGRADE = 1→2 star (PASSED→SKILLED) on completed stage only.
 *   - 2→3 star (visual) = PRACTICE_REPLAY economy, never STAR_UPGRADE.
 *   - Response time affects display stars only (3-star criterion) — not economy eligibility.
 */

import type { PrimaryReason } from './rewardConstants.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EarnedStars = 0 | 1 | 2 | 3;

/**
 * Trusted performance tier: derived from accuracy + DB-authoritative hint count ONLY.
 * Response time deliberately excluded (cannot be verified server-side in a tamper-proof way).
 */
export type TrustedPerformanceTier = 'FAILED' | 'PASSED' | 'SKILLED';

// ─── Star Computation ─────────────────────────────────────────────────────────

/**
 * Computes the display star rating for a completed attempt.
 *
 * Mirrors STEP 5 of complete_stage_with_progression_v3 (SQL):
 *   accuracy < 60                              → 0 stars
 *   accuracy >= 90 AND hints = 0 AND time < 12s → 3 stars
 *   accuracy >= 80 AND hints <= 1              → 2 stars
 *   otherwise (passed)                         → 1 star
 *
 * @param accuracy          Server-computed accuracy (0–100).
 * @param authoritativeHintCount  Hint count from DB ledger (attempt_hint_events). NOT client-supplied.
 * @param avgResponseTimeMs Average response time in ms (display criterion for 3-star only).
 */
export function computeEarnedStars(params: {
  accuracy: number;
  authoritativeHintCount: number;
  avgResponseTimeMs: number;
}): EarnedStars {
  const { accuracy, authoritativeHintCount, avgResponseTimeMs } = params;

  if (accuracy < 60) return 0;

  if (
    accuracy >= 90 &&
    authoritativeHintCount === 0 &&
    avgResponseTimeMs <= 12000
  ) {
    return 3;
  }

  if (accuracy >= 80 && authoritativeHintCount <= 1) {
    return 2;
  }

  return 1;
}

// ─── Trusted Tier ─────────────────────────────────────────────────────────────

/**
 * Computes the trusted performance tier.
 *
 * Uses ONLY server-verifiable signals (accuracy + DB hint count).
 * Response time is NOT used here — economy must not depend on values
 * that could be influenced by network conditions or client manipulation.
 *
 * Mirrors STEP 5 v_trusted_perf_tier SQL:
 *   accuracy < 60                             → FAILED
 *   accuracy >= 80 AND hints <= 1             → SKILLED
 *   otherwise                                 → PASSED
 */
export function getTrustedPerformanceTier(params: {
  accuracy: number;
  authoritativeHintCount: number;
}): TrustedPerformanceTier {
  const { accuracy, authoritativeHintCount } = params;

  if (accuracy < 60) return 'FAILED';
  if (accuracy >= 80 && authoritativeHintCount <= 1) return 'SKILLED';
  return 'PASSED';
}

// ─── Economy Classification ───────────────────────────────────────────────────

/**
 * Determines the primary economy reason for this attempt.
 *
 * Mirrors STEP 7 of complete_stage_with_progression_v3 (SQL):
 *   isFirstClear AND passed                               → FIRST_CLEAR
 *   NOT isFirstClear AND tier=SKILLED AND prevBestStars<2 → STAR_UPGRADE
 *   otherwise                                             → PRACTICE_REPLAY
 *
 * Note: isFirstClear = !alreadyCompleted (no previous completed row in student_stage_progress).
 */
export function computePrimaryReason(params: {
  isFirstClear: boolean;
  passed: boolean;
  trustedTier: TrustedPerformanceTier;
  prevBestStars: number;
}): PrimaryReason {
  const { isFirstClear, passed, trustedTier, prevBestStars } = params;

  if (isFirstClear && passed) return 'FIRST_CLEAR';

  if (!isFirstClear && trustedTier === 'SKILLED' && prevBestStars < 2) {
    return 'STAR_UPGRADE';
  }

  return 'PRACTICE_REPLAY';
}

/**
 * Returns true if this attempt qualifies for the STAR_UPGRADE economy reward.
 *
 * Exact conditions (mirrors SQL):
 *   - Stage already completed (not first clear)
 *   - trusted_performance_tier = SKILLED (accuracy >= 80, hints <= 1)
 *   - previous best_stars < 2 (1-star→2-star upgrade only)
 *
 * 2→3 star visual upgrades do NOT qualify — they use PRACTICE_REPLAY economy.
 */
export function isEconomyStarUpgradeEligible(params: {
  isFirstClear: boolean;
  trustedTier: TrustedPerformanceTier;
  prevBestStars: number;
}): boolean {
  const { isFirstClear, trustedTier, prevBestStars } = params;
  return !isFirstClear && trustedTier === 'SKILLED' && prevBestStars < 2;
}
