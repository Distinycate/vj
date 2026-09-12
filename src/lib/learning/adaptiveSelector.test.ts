import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCandidatePriorityScore,
  selectAdaptiveQuestionPool,
} from './adaptiveSelector.ts';
import type { VocabCandidate } from './adaptiveSelector.ts';

test('1. Priority scoring awards overdue and weakness, penalizes recent exposure', () => {
  const now = new Date('2026-09-12T12:00:00Z');

  // Candidate A: Normal stage word, not seen recently
  const candA: VocabCandidate = {
    id: 'w-a',
    word: 'apple',
    meaning: 'แอปเปิ้ล',
    stage_number: 5,
    mastery_score: 50,
  };

  // Candidate B: Overdue review word (due 2 days ago)
  const candB: VocabCandidate = {
    id: 'w-b',
    word: 'banana',
    meaning: 'กล้วย',
    stage_number: 4,
    mastery_score: 40,
    wrong_count: 2,
    attempt_count: 4,
    next_review_at: new Date(now.getTime() - 48 * 3600 * 1000),
  };

  // Candidate C: Seen 5 minutes ago (recent exposure)
  const candC: VocabCandidate = {
    id: 'w-c',
    word: 'cherry',
    meaning: 'เชอร์รี่',
    stage_number: 5,
    last_seen_at: new Date(now.getTime() - 5 * 60 * 1000),
  };

  const scoreA = calculateCandidatePriorityScore(candA, 5, now);
  const scoreB = calculateCandidatePriorityScore(candB, 5, now);
  const scoreC = calculateCandidatePriorityScore(candC, 5, now);

  assert.ok(scoreB > scoreA, 'Overdue word B should have higher priority than standard word A');
  assert.ok(scoreA > scoreC, 'Recent exposure word C should be penalized heavily below A');
});

test('2. Ideal 60/20/20 distribution across 10 questions', () => {
  const now = new Date('2026-09-12T12:00:00Z');
  const pool: VocabCandidate[] = [];

  // 10 Target words (Stage 1)
  for (let i = 1; i <= 10; i++) {
    pool.push({
      id: `target-${i}`,
      word: `target_${i}`,
      meaning: `meaning_${i}`,
      stage_number: 1,
    });
  }

  // 5 Due words
  for (let i = 1; i <= 5; i++) {
    pool.push({
      id: `due-${i}`,
      word: `due_${i}`,
      meaning: `due_meaning_${i}`,
      stage_number: 2,
      next_review_at: new Date(now.getTime() - 3600 * 1000),
    });
  }

  // 5 Weakness words
  for (let i = 1; i <= 5; i++) {
    pool.push({
      id: `weak-${i}`,
      word: `weak_${i}`,
      meaning: `weak_meaning_${i}`,
      stage_number: 3,
      wrong_count: 3,
      attempt_count: 4,
      mastery_score: 25,
    });
  }

  const result = selectAdaptiveQuestionPool(pool, {
    totalQuestions: 10,
    stageNumber: 1,
    now,
  });

  assert.equal(result.selectedWords.length, 10);
  assert.equal(result.breakdown.targetStageCount, 6, '60% Target stage words (6)');
  assert.equal(result.breakdown.dueReviewCount, 2, '20% Due review words (2)');
  assert.equal(result.breakdown.weaknessCount, 2, '20% Weakness words (2)');

  // Deduplication check
  const idSet = new Set(result.selectedWords.map((w) => w.id));
  assert.equal(idSet.size, 10, 'All 10 words must be strictly unique');
});

test('3. Graceful fallback when due and weakness pools are completely empty', () => {
  const pool: VocabCandidate[] = [];

  // Only 8 target words available, no due or weakness words
  for (let i = 1; i <= 8; i++) {
    pool.push({
      id: `target-${i}`,
      word: `word_${i}`,
      meaning: `meaning_${i}`,
      stage_number: 2,
    });
  }

  const result = selectAdaptiveQuestionPool(pool, {
    totalQuestions: 6,
    stageNumber: 2,
  });

  assert.equal(result.selectedWords.length, 6);
  assert.equal(result.breakdown.dueReviewCount, 0);
  assert.equal(result.breakdown.weaknessCount, 0);
  assert.equal(result.breakdown.targetStageCount, 6);

  const idSet = new Set(result.selectedWords.map((w) => w.id));
  assert.equal(idSet.size, 6, 'All fallback selections are unique');
});
