import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isCampaignStage,
  isLegacyOverflow,
  getStageType,
  getWorldNumber,
  getChapterNumber,
  getWorldStageRange,
  getChapterStageRange,
  getWorldBossStage,
  getMinieBossStage,
  isBossStage,
  isWorldBossStage,
  isFinalBossStage,
  getCampaignStageRange,
  CAMPAIGN_FIRST_STAGE,
  CAMPAIGN_LAST_STAGE,
} from './worldHierarchy.ts';

// ─── Campaign Boundary ────────────────────────────────────────────────────────

test('1. isCampaignStage: stages 1–100 are campaign stages', () => {
  assert.equal(isCampaignStage(1), true);
  assert.equal(isCampaignStage(50), true);
  assert.equal(isCampaignStage(100), true);
  assert.equal(isCampaignStage(0), false);
  assert.equal(isCampaignStage(101), false);
  assert.equal(isCampaignStage(105), false);
});

test('2. isLegacyOverflow: stages 101–105 are legacy overflow', () => {
  assert.equal(isLegacyOverflow(101), true);
  assert.equal(isLegacyOverflow(105), true);
  assert.equal(isLegacyOverflow(100), false);
  assert.equal(isLegacyOverflow(1), false);
  assert.equal(isLegacyOverflow(106), false);
});

// ─── Stage Type Classification (Mirrors V3 SQL CASE exactly) ─────────────────

test('3. getStageType: FINAL_BOSS for stage 100', () => {
  assert.equal(getStageType(100), 'FINAL_BOSS');
});

test('4. getStageType: WORLD_BOSS for multiples of 10 (not 100)', () => {
  assert.equal(getStageType(10), 'WORLD_BOSS');
  assert.equal(getStageType(20), 'WORLD_BOSS');
  assert.equal(getStageType(90), 'WORLD_BOSS');
  // Stage 100 is FINAL_BOSS, not WORLD_BOSS
  assert.notEqual(getStageType(100), 'WORLD_BOSS');
});

test('5. getStageType: MINI_BOSS for stages ending in 5', () => {
  assert.equal(getStageType(5), 'MINI_BOSS');
  assert.equal(getStageType(15), 'MINI_BOSS');
  assert.equal(getStageType(95), 'MINI_BOSS');
});

test('6. getStageType: REVIEW_CHECKPOINT for stages ending in 4 or 9', () => {
  assert.equal(getStageType(4), 'REVIEW_CHECKPOINT');
  assert.equal(getStageType(9), 'REVIEW_CHECKPOINT');
  assert.equal(getStageType(14), 'REVIEW_CHECKPOINT');
  assert.equal(getStageType(19), 'REVIEW_CHECKPOINT');
  assert.equal(getStageType(99), 'REVIEW_CHECKPOINT');
});

test('7. getStageType: STANDARD for all other campaign stages', () => {
  assert.equal(getStageType(1), 'STANDARD');
  assert.equal(getStageType(2), 'STANDARD');
  assert.equal(getStageType(3), 'STANDARD');
  assert.equal(getStageType(11), 'STANDARD');
  assert.equal(getStageType(98), 'STANDARD');
});

test('8. getStageType: LEGACY_OVERFLOW for 101–105', () => {
  assert.equal(getStageType(101), 'LEGACY_OVERFLOW');
  assert.equal(getStageType(105), 'LEGACY_OVERFLOW');
});

// ─── World Number ─────────────────────────────────────────────────────────────

test('9. getWorldNumber: Math.ceil(stageNumber / 10) for campaign stages', () => {
  assert.equal(getWorldNumber(1), 1);
  assert.equal(getWorldNumber(10), 1);
  assert.equal(getWorldNumber(11), 2);
  assert.equal(getWorldNumber(20), 2);
  assert.equal(getWorldNumber(90), 9);
  assert.equal(getWorldNumber(91), 10);
  assert.equal(getWorldNumber(100), 10);
});

test('10. getWorldNumber: returns null for LEGACY_OVERFLOW stages (NOT 11)', () => {
  // CRITICAL: Stage 101 must be null, never 11
  assert.equal(getWorldNumber(101), null, 'Stage 101 must return null, not World 11');
  assert.equal(getWorldNumber(105), null);
  assert.equal(getWorldNumber(0), null);
});

test('11. getChapterNumber: chapter position within world', () => {
  assert.equal(getChapterNumber(1), 1);   // World 1, chapter 1
  assert.equal(getChapterNumber(10), 10); // World 1, chapter 10
  assert.equal(getChapterNumber(11), 1);  // World 2, chapter 1
  assert.equal(getChapterNumber(15), 5);  // World 2, chapter 5 (MINI_BOSS)
  assert.equal(getChapterNumber(20), 10); // World 2, chapter 10 (WORLD_BOSS)
  assert.equal(getChapterNumber(101), null); // LEGACY_OVERFLOW
});

// ─── Stage Ranges ─────────────────────────────────────────────────────────────

test('12. getWorldStageRange: correct range for each world', () => {
  assert.deepEqual(getWorldStageRange(1), { first: 1, last: 10 });
  assert.deepEqual(getWorldStageRange(2), { first: 11, last: 20 });
  assert.deepEqual(getWorldStageRange(9), { first: 81, last: 90 });
  assert.deepEqual(getWorldStageRange(10), { first: 91, last: 100 });
});

test('13. getChapterStageRange: world range excluding World Boss', () => {
  assert.deepEqual(getChapterStageRange(1), { first: 1, last: 9 });
  assert.deepEqual(getChapterStageRange(10), { first: 91, last: 99 });
});

test('14. getWorldBossStage and getMinieBossStage correct values', () => {
  assert.equal(getWorldBossStage(1), 10);
  assert.equal(getWorldBossStage(10), 100);
  assert.equal(getMinieBossStage(1), 5);
  assert.equal(getMinieBossStage(2), 15);
  assert.equal(getMinieBossStage(10), 95);
});

// ─── Boss Helpers ─────────────────────────────────────────────────────────────

test('15. isBossStage: true for mini, world, final boss', () => {
  assert.equal(isBossStage(5), true);    // MINI_BOSS
  assert.equal(isBossStage(10), true);   // WORLD_BOSS
  assert.equal(isBossStage(100), true);  // FINAL_BOSS
  assert.equal(isBossStage(1), false);
  assert.equal(isBossStage(99), false);
});

test('16. isWorldBossStage: only world bosses', () => {
  assert.equal(isWorldBossStage(10), true);
  assert.equal(isWorldBossStage(90), true);
  assert.equal(isWorldBossStage(100), false); // FINAL_BOSS, not WORLD_BOSS
  assert.equal(isWorldBossStage(5), false);
});

test('17. isFinalBossStage: only stage 100', () => {
  assert.equal(isFinalBossStage(100), true);
  assert.equal(isFinalBossStage(90), false);
  assert.equal(isFinalBossStage(10), false);
});

test('18. getCampaignStageRange: campaign is 1–100', () => {
  const range = getCampaignStageRange();
  assert.equal(range.first, CAMPAIGN_FIRST_STAGE);
  assert.equal(range.last, CAMPAIGN_LAST_STAGE);
});
