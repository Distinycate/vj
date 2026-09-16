import test from 'node:test';
import assert from 'node:assert/strict';
import { computeBossBattle, isBossDefeated, selectBossQuestionPool } from './bossEngine.ts';
import type { VocabCandidate } from '../learning/adaptiveSelector.ts';
import { computeEconomyReward } from './rewardConstants.ts';

// ─── Helper: build minimal VocabCandidate ────────────────────────────────────

function makeWord(id: string, stageNumber: number, overrides: Partial<VocabCandidate> = {}): VocabCandidate {
  return {
    id,
    word: `word_${id}`,
    meaning: `meaning_${id}`,
    stage_number: stageNumber,
    ...overrides,
  };
}

// ─── computeBossBattle: HP Presentation ──────────────────────────────────────

test('1. computeBossBattle: boss defeated when accuracy >= 60', () => {
  const result = computeBossBattle({ stageType: 'WORLD_BOSS', correctCount: 6, totalQuestions: 10, accuracy: 60 });
  assert.equal(result.bossDefeated, true);
  assert.equal(result.maxHp, 100);
});

test('2. computeBossBattle: boss NOT defeated when accuracy < 60', () => {
  const result = computeBossBattle({ stageType: 'MINI_BOSS', correctCount: 5, totalQuestions: 10, accuracy: 50 });
  assert.equal(result.bossDefeated, false);
});

test('3. CRITICAL: damage formula uses integer division (Math.trunc), not rounding', () => {
  // 5 correct / 7 questions: (5 * 100) / 7 = 500 / 7 = 71.428... → trunc = 71
  // NOT: Math.round(71.428) = 71 (happens to match), but test a case where they differ
  // (3 * 100) / 7 = 42.857... → trunc = 42, round = 43
  const result = computeBossBattle({ stageType: 'MINI_BOSS', correctCount: 3, totalQuestions: 7, accuracy: 43 });
  assert.equal(result.damage, 42, 'Must use Math.trunc to match PostgreSQL integer division');
});

test('4. computeBossBattle: damage capped at 100', () => {
  const result = computeBossBattle({ stageType: 'FINAL_BOSS', correctCount: 10, totalQuestions: 10, accuracy: 100 });
  assert.equal(result.damage, 100);
  assert.equal(result.remainingHp, 0);
});

test('5. computeBossBattle: remainingHp = 100 - damage, minimum 0', () => {
  const result = computeBossBattle({ stageType: 'WORLD_BOSS', correctCount: 6, totalQuestions: 10, accuracy: 60 });
  assert.equal(result.damage, 60);
  assert.equal(result.remainingHp, 40);
});

test('6. computeBossBattle: 0 correct = 0 damage, 100 HP remaining', () => {
  const result = computeBossBattle({ stageType: 'MINI_BOSS', correctCount: 0, totalQuestions: 10, accuracy: 0 });
  assert.equal(result.damage, 0);
  assert.equal(result.remainingHp, 100);
});

test('7. isBossDefeated: accuracy >= 60 is the sole authority', () => {
  assert.equal(isBossDefeated(60), true);
  assert.equal(isBossDefeated(100), true);
  assert.equal(isBossDefeated(59.9), false);
  assert.equal(isBossDefeated(0), false);
});

// ─── Economy Formula Exact Arithmetic ────────────────────────────────────────

test('8. ECONOMY FORMULA: FIRST_CLEAR boss = base × 2 (not base + base × 2)', () => {
  // FIRST_CLEAR base = 20 coins. BOSS_FIRST_CLEAR × 2 = 40 coins.
  // Must NOT be: 20 + 20×2 = 60
  const { earnedCoins, earnedExp } = computeEconomyReward('FIRST_CLEAR', ['BOSS_FIRST_CLEAR']);
  assert.equal(earnedCoins, 40, 'BOSS_FIRST_CLEAR must multiply entire base, not add extra base');
  assert.equal(earnedExp, 30);
});

test('9. ECONOMY FORMULA: WORLD_CLEAR bonus is additive flat (not multiplied)', () => {
  // FIRST_CLEAR boss + WORLD_CLEAR:
  // base_coins = 20 × 2 = 40
  // bonus_coins = +50 (flat, not multiplied)
  // total = 90
  const { earnedCoins, earnedExp } = computeEconomyReward('FIRST_CLEAR', ['BOSS_FIRST_CLEAR', 'WORLD_CLEAR']);
  assert.equal(earnedCoins, 90);
  assert.equal(earnedExp, 60, 'EXP: 15 × 2 = 30 + 30 bonus = 60');
});

test('10. ECONOMY FORMULA: FINAL_BOSS_CLEAR is additive flat', () => {
  // FIRST_CLEAR final boss + FINAL_BOSS_CLEAR:
  // base_coins = 20 × 2 = 40 (BOSS_FIRST_CLEAR multiplied)
  // bonus_coins = +200 (flat)
  // total = 240
  const { earnedCoins, earnedExp } = computeEconomyReward('FIRST_CLEAR', ['BOSS_FIRST_CLEAR', 'FINAL_BOSS_CLEAR']);
  assert.equal(earnedCoins, 240);
  assert.equal(earnedExp, 130, 'EXP: 15 × 2 = 30 + 100 bonus = 130');
});

test('11. ECONOMY FORMULA: PRACTICE_REPLAY has no economy impact from STAR_UPGRADE', () => {
  const { earnedCoins, earnedExp } = computeEconomyReward('PRACTICE_REPLAY', []);
  assert.equal(earnedCoins, 2);
  assert.equal(earnedExp, 1);
});

test('12. ECONOMY FORMULA: STAR_UPGRADE base values', () => {
  const { earnedCoins, earnedExp } = computeEconomyReward('STAR_UPGRADE', []);
  assert.equal(earnedCoins, 6);
  assert.equal(earnedExp, 4);
});

test('13. ECONOMY FORMULA: BOSS_FIRST_CLEAR on STAR_UPGRADE (edge case)', () => {
  // Unlikely but should still multiply correctly
  const { earnedCoins, earnedExp } = computeEconomyReward('STAR_UPGRADE', ['BOSS_FIRST_CLEAR']);
  assert.equal(earnedCoins, 12);
  assert.equal(earnedExp, 8);
});

// ─── selectBossQuestionPool: MINI_BOSS ───────────────────────────────────────

test('14. selectBossQuestionPool: MINI_BOSS stage 5 returns 10 questions', () => {
  // World 1, chapter stages 1–5
  const words: VocabCandidate[] = [];
  for (let s = 1; s <= 20; s++) {
    for (let i = 0; i < 3; i++) {
      words.push(makeWord(`w${s}_${i}`, s));
    }
  }
  const plan = selectBossQuestionPool(5, words, new Date());
  assert.equal(plan.selectedWords.length, 10);
});

test('15. selectBossQuestionPool: no duplicate words in selection', () => {
  const words: VocabCandidate[] = [];
  for (let s = 1; s <= 10; s++) {
    for (let i = 0; i < 5; i++) {
      words.push(makeWord(`w${s}_${i}`, s));
    }
  }
  const plan = selectBossQuestionPool(15, words, new Date());
  const ids = plan.selectedWords.map(w => w.id);
  const uniqueIds = new Set(ids);
  assert.equal(ids.length, uniqueIds.size, 'No duplicate words in boss question pool');
});

test('16. selectBossQuestionPool: throws for non-boss stage', () => {
  assert.throws(() => selectBossQuestionPool(1, [], new Date()));
  assert.throws(() => selectBossQuestionPool(11, [], new Date()));
});

test('17. selectBossQuestionPool: FINAL_BOSS stage 100 draws from all campaign stages', () => {
  const words: VocabCandidate[] = [];
  for (let s = 1; s <= 100; s++) {
    words.push(makeWord(`w${s}`, s));
  }
  const plan = selectBossQuestionPool(100, words, new Date());
  assert.equal(plan.selectedWords.length, 10);
  // Must draw from multiple worlds
  const worldsRepresented = new Set(plan.selectedWords.map(w => Math.ceil(w.stage_number / 10)));
  assert.ok(worldsRepresented.size > 1, 'Final Boss should draw from multiple worlds');
});

test('18. FROZEN SPEC: weakness words fill the 50% bucket first', () => {
  const now = new Date();
  // 5 weak words (wrong_count > 0) in the chapter scope
  const weakWords = Array.from({ length: 5 }, (_, i) =>
    makeWord(`weak_${i}`, 1, { wrong_count: 3, mastery_score: 30 })
  );
  // Plenty of core/normal words
  const normalWords = Array.from({ length: 30 }, (_, i) =>
    makeWord(`normal_${i}`, 1)
  );
  const plan = selectBossQuestionPool(5, [...weakWords, ...normalWords], now);
  const weakIds = new Set(weakWords.map(w => w.id));
  const selectedWeak = plan.selectedWords.filter(w => weakIds.has(w.id));
  // All 5 weak words should appear (5 = 50% of 10)
  assert.equal(selectedWeak.length, 5, 'All 5 weak words should fill the 50% weakness bucket');
});

test('19. FROZEN SPEC: learning/early-familiar fills 30% bucket', () => {
  const now = new Date();
  // Only 3 weak words, but 5 learning words
  const weakWords = Array.from({ length: 3 }, (_, i) =>
    makeWord(`weak_${i}`, 1, { wrong_count: 2 })
  );
  const learningWords = Array.from({ length: 5 }, (_, i) =>
    makeWord(`learning_${i}`, 1, { mastery_status: 'LEARNING' as const, mastery_score: 10 })
  );
  const coreWords = Array.from({ length: 20 }, (_, i) =>
    makeWord(`core_${i}`, 1, { mastery_status: 'MASTERED' as const, mastery_score: 100 })
  );
  const plan = selectBossQuestionPool(5, [...weakWords, ...learningWords, ...coreWords], now);
  assert.equal(plan.selectedWords.length, 10);
  const learningIds = new Set(learningWords.map(w => w.id));
  const selectedLearning = plan.selectedWords.filter(w => learningIds.has(w.id));
  assert.ok(selectedLearning.length >= 3, 'At least 3 learning/early-familiar words should be selected (30% bucket)');
});

test('20. FINAL_BOSS: world-balancing cap — no single world exceeds 50% of 10 questions', () => {
  // Create a pool heavily skewed toward World 1 (stages 1–10)
  const words: VocabCandidate[] = [];
  // World 1: 50 words, many weak
  for (let i = 0; i < 50; i++) {
    words.push(makeWord(`w1_${i}`, 1, { wrong_count: 2, mastery_score: 20 }));
  }
  // Other worlds: just 2 words each
  for (let s = 11; s <= 100; s += 10) {
    words.push(makeWord(`other_${s}`, s));
    words.push(makeWord(`other_${s}_2`, s + 1));
  }
  const plan = selectBossQuestionPool(100, words, new Date());
  assert.equal(plan.selectedWords.length, 10);
  // Count world 1 representation
  const world1Count = plan.selectedWords.filter(w => w.stage_number <= 10).length;
  assert.ok(world1Count <= 5, `World 1 should supply at most 50% (5 questions), got ${world1Count}`);
});
