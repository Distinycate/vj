import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkGrandmasterEligibility,
  generateFirstLetterMask,
  computeDynamicTypingTimeLimit,
  selectGrandmasterQuestionPool,
  buildGrandmasterQuestions,
  GRANDMASTER_QUESTION_COUNT,
  GRANDMASTER_REQUIRED_STARS,
} from './grandmasterBoss.ts';
import type { VocabCandidate } from '../learning/adaptiveSelector.ts';

describe('grandmasterBoss engine', () => {
  it('locks Grandmaster Boss when student has completed 100 stages with fewer than 300 stars', () => {
    const stages = Array.from({ length: 100 }, (_, i) => ({
      stageNumber: i + 1,
      bestStars: i === 99 ? 2 : 3, // 299 stars total
      completed: true,
    }));

    const result = checkGrandmasterEligibility(stages);
    assert.equal(result.unlocked, false);
    assert.equal(result.totalStars, 299);
    assert.equal(result.completedCount, 100);
    assert.deepEqual(result.missingThreeStarStages, [100]);
  });

  it('unlocks Grandmaster Boss only when all 100 stages have 3 stars (300 stars)', () => {
    const stages = Array.from({ length: 100 }, (_, i) => ({
      stageNumber: i + 1,
      bestStars: 3,
      completed: true,
    }));

    const result = checkGrandmasterEligibility(stages);
    assert.equal(result.unlocked, true);
    assert.equal(result.totalStars, GRANDMASTER_REQUIRED_STARS);
    assert.equal(result.threeStarStagesCount, 100);
    assert.equal(result.missingThreeStarStages.length, 0);
  });

  it('generates first-letter mask and accurate letter count', () => {
    const res = generateFirstLetterMask('environment');
    assert.equal(res.letterCount, 11);
    assert.equal(res.mask, 'E _ _ _ _ _ _ _ _ _ _');
  });

  it('computes dynamic typing time limits based on word length and prompt type', () => {
    assert.equal(computeDynamicTypingTimeLimit('apple', 'TYPING_MEANING'), 8);
    assert.equal(computeDynamicTypingTimeLimit('harmful', 'TYPING_MEANING'), 10);
    assert.equal(computeDynamicTypingTimeLimit('environment', 'TYPING_MEANING'), 12);
    assert.equal(computeDynamicTypingTimeLimit('environment', 'TYPING_CLOZE'), 14);
  });

  it('selects 50 words stratified across all 10 worlds (5 per world) with no duplicates', () => {
    const mockVocab: VocabCandidate[] = [];
    for (let s = 1; s <= 100; s++) {
      for (let w = 1; w <= 6; w++) {
        mockVocab.push({
          id: `w-${s}-${w}`,
          word: `word${s}_${w}`,
          meaning: `ความหมาย ${s}-${w}`,
          meaning_th: `ความหมาย ${s}-${w}`,
          stage_number: s,
          wrong_count: w === 1 ? 3 : 0,
          mastery_score: w === 1 ? 30 : 80,
        });
      }
    }

    const selected = selectGrandmasterQuestionPool(mockVocab);
    assert.equal(selected.length, GRANDMASTER_QUESTION_COUNT);

    const uniqueIds = new Set(selected.map((x) => x.id));
    assert.equal(uniqueIds.size, GRANDMASTER_QUESTION_COUNT);

    // Verify 5 words from each of the 10 worlds
    for (let world = 1; world <= 10; world++) {
      const countInWorld = selected.filter(
        (x) => Math.ceil(x.stage_number / 10) === world
      ).length;
      assert.equal(countInWorld, 5, `World ${world} should have 5 selected words`);
    }

    const built = buildGrandmasterQuestions(selected);
    assert.equal(built.length, 50);
    assert.equal(built[0].phase, 1);
    assert.equal(built[49].phase, 5);
  });
});

