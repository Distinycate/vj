import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADAPTIVE_RANK_CONFIG,
  calculateRankFromStage,
  getPassScoreForRank,
  getPassScoreForStage,
} from '../utils/adaptiveConfig.ts';

test('1. calculateRankFromStage maps stages 1-100 into ranks 1-5 correctly', () => {
  // Rank 1: Stages 1–20
  assert.equal(calculateRankFromStage(1), 1);
  assert.equal(calculateRankFromStage(10), 1);
  assert.equal(calculateRankFromStage(20), 1);

  // Rank 2: Stages 21–40
  assert.equal(calculateRankFromStage(21), 2);
  assert.equal(calculateRankFromStage(30), 2);
  assert.equal(calculateRankFromStage(40), 2);

  // Rank 3: Stages 41–60
  assert.equal(calculateRankFromStage(41), 3);
  assert.equal(calculateRankFromStage(50), 3);
  assert.equal(calculateRankFromStage(60), 3);

  // Rank 4: Stages 61–80
  assert.equal(calculateRankFromStage(61), 4);
  assert.equal(calculateRankFromStage(70), 4);
  assert.equal(calculateRankFromStage(80), 4);

  // Rank 5: Stages 81–100
  assert.equal(calculateRankFromStage(81), 5);
  assert.equal(calculateRankFromStage(90), 5);
  assert.equal(calculateRankFromStage(100), 5);

  // Edge cases: clamp out-of-bounds
  assert.equal(calculateRankFromStage(0), 1);
  assert.equal(calculateRankFromStage(105), 5);
});

test('2. getPassScoreForRank requires 100% for Rank 5 and descends by 10%', () => {
  assert.equal(getPassScoreForRank(5), 100);
  assert.equal(getPassScoreForRank(4), 90);
  assert.equal(getPassScoreForRank(3), 80);
  assert.equal(getPassScoreForRank(2), 70);
  assert.equal(getPassScoreForRank(1), 60);
});

test('3. getPassScoreForStage resolves correct threshold per stage', () => {
  // Bronze stage 5 requires 60%
  assert.equal(getPassScoreForStage(5), 60);
  // Silver stage 25 requires 70%
  assert.equal(getPassScoreForStage(25), 70);
  // Gold stage 55 requires 80%
  assert.equal(getPassScoreForStage(55), 80);
  // Platinum stage 75 requires 90%
  assert.equal(getPassScoreForStage(75), 90);
  // Diamond stage 95 requires 100%
  assert.equal(getPassScoreForStage(95), 100);
});

test('4. ADAPTIVE_RANK_CONFIG passScores match specification', () => {
  assert.equal(ADAPTIVE_RANK_CONFIG[1].passScore, 60);
  assert.equal(ADAPTIVE_RANK_CONFIG[2].passScore, 70);
  assert.equal(ADAPTIVE_RANK_CONFIG[3].passScore, 80);
  assert.equal(ADAPTIVE_RANK_CONFIG[4].passScore, 90);
  assert.equal(ADAPTIVE_RANK_CONFIG[5].passScore, 100);
});
