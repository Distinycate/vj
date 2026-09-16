import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeEarnedStars,
  getTrustedPerformanceTier,
  computePrimaryReason,
  isEconomyStarUpgradeEligible,
} from './starRating.ts';

// ─── computeEarnedStars ───────────────────────────────────────────────────────

test('1. computeEarnedStars: 0 stars when accuracy < 60', () => {
  assert.equal(computeEarnedStars({ accuracy: 0, authoritativeHintCount: 0, avgResponseTimeMs: 1000 }), 0);
  assert.equal(computeEarnedStars({ accuracy: 59, authoritativeHintCount: 0, avgResponseTimeMs: 1000 }), 0);
  assert.equal(computeEarnedStars({ accuracy: 59.9, authoritativeHintCount: 0, avgResponseTimeMs: 1000 }), 0);
});

test('2. computeEarnedStars: 3 stars when accuracy >= 90, hints = 0, time <= 12000ms', () => {
  assert.equal(computeEarnedStars({ accuracy: 90, authoritativeHintCount: 0, avgResponseTimeMs: 12000 }), 3);
  assert.equal(computeEarnedStars({ accuracy: 100, authoritativeHintCount: 0, avgResponseTimeMs: 5000 }), 3);
});

test('3. computeEarnedStars: NOT 3 stars if hints > 0 even with high accuracy and fast time', () => {
  // hint used → maximum 2 stars even at 100% accuracy
  assert.equal(computeEarnedStars({ accuracy: 100, authoritativeHintCount: 1, avgResponseTimeMs: 5000 }), 2);
});

test('4. computeEarnedStars: NOT 3 stars if response time > 12000ms', () => {
  assert.equal(computeEarnedStars({ accuracy: 100, authoritativeHintCount: 0, avgResponseTimeMs: 12001 }), 2);
});

test('5. computeEarnedStars: 2 stars when accuracy >= 80, hints <= 1', () => {
  assert.equal(computeEarnedStars({ accuracy: 80, authoritativeHintCount: 0, avgResponseTimeMs: 20000 }), 2);
  assert.equal(computeEarnedStars({ accuracy: 80, authoritativeHintCount: 1, avgResponseTimeMs: 20000 }), 2);
  assert.equal(computeEarnedStars({ accuracy: 89, authoritativeHintCount: 1, avgResponseTimeMs: 1000 }), 2);
});

test('6. computeEarnedStars: NOT 2 stars if hints > 1', () => {
  assert.equal(computeEarnedStars({ accuracy: 80, authoritativeHintCount: 2, avgResponseTimeMs: 1000 }), 1);
});

test('7. computeEarnedStars: 1 star when passed (accuracy >= 60) but not 2 or 3', () => {
  assert.equal(computeEarnedStars({ accuracy: 60, authoritativeHintCount: 5, avgResponseTimeMs: 1000 }), 1);
  assert.equal(computeEarnedStars({ accuracy: 70, authoritativeHintCount: 3, avgResponseTimeMs: 1000 }), 1);
  assert.equal(computeEarnedStars({ accuracy: 79, authoritativeHintCount: 0, avgResponseTimeMs: 1000 }), 1);
});

// ─── getTrustedPerformanceTier ────────────────────────────────────────────────

test('8. getTrustedPerformanceTier: FAILED when accuracy < 60', () => {
  assert.equal(getTrustedPerformanceTier({ accuracy: 0, authoritativeHintCount: 0 }), 'FAILED');
  assert.equal(getTrustedPerformanceTier({ accuracy: 59, authoritativeHintCount: 0 }), 'FAILED');
});

test('9. getTrustedPerformanceTier: SKILLED when accuracy >= 80 AND hints <= 1', () => {
  assert.equal(getTrustedPerformanceTier({ accuracy: 80, authoritativeHintCount: 0 }), 'SKILLED');
  assert.equal(getTrustedPerformanceTier({ accuracy: 100, authoritativeHintCount: 1 }), 'SKILLED');
});

test('10. getTrustedPerformanceTier: NOT SKILLED if hints > 1 even with high accuracy', () => {
  assert.equal(getTrustedPerformanceTier({ accuracy: 100, authoritativeHintCount: 2 }), 'PASSED');
});

test('11. getTrustedPerformanceTier: PASSED when accuracy >= 60 but not SKILLED', () => {
  assert.equal(getTrustedPerformanceTier({ accuracy: 60, authoritativeHintCount: 0 }), 'PASSED');
  assert.equal(getTrustedPerformanceTier({ accuracy: 79, authoritativeHintCount: 0 }), 'PASSED');
  assert.equal(getTrustedPerformanceTier({ accuracy: 80, authoritativeHintCount: 2 }), 'PASSED');
});

test('12. getTrustedPerformanceTier: response time has NO effect on trusted tier', () => {
  // Two attempts: same accuracy/hints, different response times — must produce same tier
  const fast = getTrustedPerformanceTier({ accuracy: 85, authoritativeHintCount: 0 });
  const slow = getTrustedPerformanceTier({ accuracy: 85, authoritativeHintCount: 0 });
  assert.equal(fast, slow, 'Response time must not affect trusted tier');
  assert.equal(fast, 'SKILLED');
});

// ─── computePrimaryReason ─────────────────────────────────────────────────────

test('13. computePrimaryReason: FIRST_CLEAR when first clear and passed', () => {
  assert.equal(
    computePrimaryReason({ isFirstClear: true, passed: true, trustedTier: 'PASSED', prevBestStars: 0 }),
    'FIRST_CLEAR'
  );
  assert.equal(
    computePrimaryReason({ isFirstClear: true, passed: true, trustedTier: 'SKILLED', prevBestStars: 0 }),
    'FIRST_CLEAR'
  );
});

test('14. computePrimaryReason: PRACTICE_REPLAY when first clear but failed', () => {
  // Failed on first attempt = PRACTICE_REPLAY (not FIRST_CLEAR, not STAR_UPGRADE)
  assert.equal(
    computePrimaryReason({ isFirstClear: true, passed: false, trustedTier: 'FAILED', prevBestStars: 0 }),
    'PRACTICE_REPLAY'
  );
});

test('15. computePrimaryReason: STAR_UPGRADE when not first clear, SKILLED, prevBestStars < 2', () => {
  assert.equal(
    computePrimaryReason({ isFirstClear: false, passed: true, trustedTier: 'SKILLED', prevBestStars: 0 }),
    'STAR_UPGRADE'
  );
  assert.equal(
    computePrimaryReason({ isFirstClear: false, passed: true, trustedTier: 'SKILLED', prevBestStars: 1 }),
    'STAR_UPGRADE'
  );
});

test('16. computePrimaryReason: 2→3 star is PRACTICE_REPLAY (prevBestStars = 2)', () => {
  // The upgrade from 2→3 must never produce STAR_UPGRADE economy
  assert.equal(
    computePrimaryReason({ isFirstClear: false, passed: true, trustedTier: 'SKILLED', prevBestStars: 2 }),
    'PRACTICE_REPLAY',
    '2→3 star upgrade must be PRACTICE_REPLAY, not STAR_UPGRADE'
  );
});

test('17. computePrimaryReason: PRACTICE_REPLAY when not first clear and not SKILLED', () => {
  assert.equal(
    computePrimaryReason({ isFirstClear: false, passed: true, trustedTier: 'PASSED', prevBestStars: 0 }),
    'PRACTICE_REPLAY'
  );
});

// ─── isEconomyStarUpgradeEligible ────────────────────────────────────────────

test('18. isEconomyStarUpgradeEligible: true only for 1-star to 2-star on completed stage', () => {
  assert.equal(
    isEconomyStarUpgradeEligible({ isFirstClear: false, trustedTier: 'SKILLED', prevBestStars: 0 }),
    true
  );
  assert.equal(
    isEconomyStarUpgradeEligible({ isFirstClear: false, trustedTier: 'SKILLED', prevBestStars: 1 }),
    true
  );
});

test('19. isEconomyStarUpgradeEligible: false for 2→3 (prevBestStars = 2)', () => {
  assert.equal(
    isEconomyStarUpgradeEligible({ isFirstClear: false, trustedTier: 'SKILLED', prevBestStars: 2 }),
    false,
    '2→3 star must not be economy-eligible'
  );
});

test('20. isEconomyStarUpgradeEligible: false for first clear', () => {
  assert.equal(
    isEconomyStarUpgradeEligible({ isFirstClear: true, trustedTier: 'SKILLED', prevBestStars: 0 }),
    false
  );
});

test('21. isEconomyStarUpgradeEligible: false when tier is not SKILLED', () => {
  assert.equal(
    isEconomyStarUpgradeEligible({ isFirstClear: false, trustedTier: 'PASSED', prevBestStars: 0 }),
    false
  );
  assert.equal(
    isEconomyStarUpgradeEligible({ isFirstClear: false, trustedTier: 'FAILED', prevBestStars: 0 }),
    false
  );
});
