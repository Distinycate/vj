/**
 * bossEngine.ts
 * Phase 3.2E — Boss Battle Engine
 *
 * Two distinct responsibilities:
 *   A. PRESENTATION: HP/damage calculation for UI animation.
 *   B. QUESTION SELECTION: Boss pool selection strategy (50/30/20 + fallback + dedupe).
 *
 * ─── Design Invariants ────────────────────────────────────────────────────────
 *
 * Presentation functions are PURE display helpers.
 * They do NOT derive economy bonus flags (BOSS_FIRST_CLEAR, WORLD_CLEAR, FINAL_BOSS_CLEAR).
 * Those flags require historical progression state (isFirstClear, campaign_completed_at)
 * and are classified in the reward layer (rewardConstants.ts + DB RPC).
 *
 * Boss defeat authority: server accuracy >= 60% (NOT HP/damage).
 * HP/damage values are presentation-only and must not gate actual progression.
 *
 * ─── Damage Formula ──────────────────────────────────────────────────────────
 *
 * Source: MIGRATION_GAME_PROGRESSION_V3.sql STEP 14:
 *   v_damage := LEAST(100, (v_correct_count * 100) / GREATEST(v_total_questions, 1))
 *
 * SQL uses INTEGER division (PostgreSQL operator / on integers = truncating division).
 * TypeScript mirrors this with Math.trunc() to match exact DB semantics.
 *
 * Example with 7 questions, 5 correct:
 *   SQL:  (5 * 100) / 7 = 500 / 7 = 71 (integer truncation)
 *   TS:   Math.trunc((5 * 100) / 7) = Math.trunc(71.428) = 71  ✓
 *
 * ─── Boss Question Selection (50/30/20) ──────────────────────────────────────
 *
 * MINI_BOSS (stage % 10 = 5):
 *   Pool = chapter-scoped vocabulary (current world's first stage through mini boss stage)
 *   10 questions: 50% current chapter, 30% weakness, 20% review
 *
 * WORLD_BOSS (stage % 10 = 0, not stage 100):
 *   Pool = world-scoped vocabulary (all stages in the world including mini boss)
 *   10 questions: 50% world vocabulary, 30% weakness, 20% review
 *
 * FINAL_BOSS (stage 100):
 *   Pool = cross-world balanced (all campaign stages, balanced across worlds)
 *   10 questions: 50% weakest words across campaign, 30% due review, 20% random spread
 */

import type { StageType } from './worldHierarchy.ts';
import { getWorldNumber, getWorldStageRange, isBossStage } from './worldHierarchy.ts';
import type { VocabCandidate } from '../learning/adaptiveSelector.ts';
import { calculateCandidatePriorityScore } from '../learning/adaptiveSelector.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BossBattleResult {
  /** Stage type of the boss. */
  stageType: StageType;
  /**
   * Whether the boss was defeated.
   * Authority: accuracy >= 60%. HP/damage are presentation only.
   */
  bossDefeated: boolean;
  /**
   * Damage dealt as a percentage (0–100).
   * Formula: Math.min(100, Math.trunc((correctCount * 100) / totalQuestions))
   * Matches PostgreSQL integer division in V3 RPC.
   */
  damage: number;
  /** Remaining boss HP (0–100). */
  remainingHp: number;
  /** Always 100 — boss max HP is fixed. */
  maxHp: 100;
}

export interface BossQuestionPlan {
  selectedWords: VocabCandidate[];
  breakdown: {
    primaryPoolCount: number;
    weaknessCount: number;
    reviewCount: number;
    total: number;
  };
}

// ─── A. PRESENTATION: Boss HP Computation ────────────────────────────────────

/**
 * Returns the presentation battle result for a boss stage attempt.
 *
 * Only call for MINI_BOSS, WORLD_BOSS, or FINAL_BOSS.
 * For non-boss stages, returns a neutral zero-damage result.
 *
 * Damage formula mirrors MIGRATION_GAME_PROGRESSION_V3.sql STEP 14:
 *   damage = LEAST(100, (correctCount * 100) / GREATEST(totalQuestions, 1))
 * where / is INTEGER division (truncating), not rounding.
 */
export function computeBossBattle(params: {
  stageType: StageType;
  correctCount: number;
  totalQuestions: number;
  accuracy: number;
}): BossBattleResult {
  const { stageType, correctCount, totalQuestions, accuracy } = params;

  const safeTotalQuestions = Math.max(totalQuestions, 1);

  // Mirror SQL: integer division (truncate) to match PostgreSQL behavior exactly
  const damage = Math.min(100, Math.trunc((correctCount * 100) / safeTotalQuestions));
  const remainingHp = Math.max(0, 100 - damage);

  // Defeat authority: accuracy >= 60 (matches v_passed in SQL)
  const bossDefeated = accuracy >= 60;

  return {
    stageType,
    bossDefeated,
    damage,
    remainingHp,
    maxHp: 100,
  };
}

/**
 * Returns true if the boss is defeated.
 * Authority: server accuracy >= 60%.
 * Must not depend on HP or damage values.
 */
export function isBossDefeated(accuracy: number): boolean {
  return accuracy >= 60;
}

// ─── B. QUESTION SELECTION: Boss Pool Strategy ────────────────────────────────

/**
 * Boss question count is fixed at 10.
 * Slot distribution (Frozen Spec v1.2):
 *
 *   MINI_BOSS / WORLD_BOSS:
 *     50% Weakness   — words with wrong_count > 0 OR mastery_score < 60
 *     30% Learning / Early Familiar — mastery_status LEARNING, or FAMILIAR with review_step <= 2
 *     20% Chapter / World Core — scoped in-progress words (not yet weak or low mastery)
 *
 *   Fallback cascade when buckets under-fill:
 *     Attempt 50/30/20 → if short, shift to 40/40/20 → then 30/50/20 → fill from any eligible
 *
 *   FINAL_BOSS:
 *     Same semantic buckets applied cross-world, plus world-balancing cap:
 *       ≤ 30% from any single world (3 questions max from 10)
 *       Relax cap to ≤ 50% when the scoped pool is too thin to fill otherwise
 *
 * Deduplication: Each word appears at most once per boss attempt.
 */
const BOSS_QUESTION_COUNT = 10;

/** Mastery states considered "Learning or Early Familiar" for the 30% bucket. */
function isLearningOrEarlyFamiliar(c: VocabCandidate): boolean {
  const status = c.mastery_status;
  if (status === 'LEARNING') return true;
  if (status === 'FAMILIAR' && (c.review_step ?? 0) <= 2) return true;
  return false;
}

/** True if word is weak: wrong_count > 0 or mastery_score < 60. */
function isWeak(c: VocabCandidate): boolean {
  return (c.wrong_count ?? 0) > 0 || (c.mastery_score !== undefined && c.mastery_score < 60);
}

/** Picks up to `count` items from `pool` not already in `selected`. Returns picked count. */
function pickFrom(
  pool: VocabCandidate[],
  count: number,
  selected: Set<string>,
  output: VocabCandidate[]
): number {
  let picked = 0;
  for (const c of pool) {
    if (picked >= count) break;
    if (!selected.has(c.id)) {
      selected.add(c.id);
      output.push(c);
      picked++;
    }
  }
  return picked;
}

/**
 * Selects the question pool for a boss stage.
 *
 * @param stageNumber    Boss stage number (must be a boss stage).
 * @param allCandidates  All vocabulary candidates with user review metrics.
 * @param now            Reference time for SRS due-review classification.
 */
export function selectBossQuestionPool(
  stageNumber: number,
  allCandidates: VocabCandidate[],
  now: Date = new Date()
): BossQuestionPlan {
  if (!isBossStage(stageNumber)) {
    throw new Error(`selectBossQuestionPool called on non-boss stage ${stageNumber}`);
  }

  const world = getWorldNumber(stageNumber);
  const isFinalBoss = stageNumber === 100;

  // ── Determine scope: stage numbers eligible for this boss ──────────────────
  let scopeStageNumbers: Set<number>;

  if (isFinalBoss) {
    // Cross-world: all campaign stages
    scopeStageNumbers = new Set<number>();
    for (let s = 1; s <= 100; s++) scopeStageNumbers.add(s);
  } else if (stageNumber % 10 === 0 && world !== null) {
    // WORLD_BOSS: entire world
    const { first, last } = getWorldStageRange(world);
    scopeStageNumbers = new Set<number>();
    for (let s = first; s <= last; s++) scopeStageNumbers.add(s);
  } else {
    // MINI_BOSS: chapter (world's first stage through mini boss stage)
    if (world === null) throw new Error(`Mini boss stage ${stageNumber} has no world`);
    const { first } = getWorldStageRange(world);
    scopeStageNumbers = new Set<number>();
    for (let s = first; s <= stageNumber; s++) scopeStageNumbers.add(s);
  }

  // ── Sort helper (priority: overdue × weakness × unmastered) ───────────────
  const sortByPriority = (list: VocabCandidate[]) =>
    [...list].sort(
      (a, b) =>
        calculateCandidatePriorityScore(b, stageNumber, now) -
        calculateCandidatePriorityScore(a, stageNumber, now)
    );

  // ── Partition scoped candidates into semantic buckets ─────────────────────
  // Bucket 1 (50%): Weakness — wrong_count > 0 or mastery_score < 60
  // Bucket 2 (30%): Learning / Early Familiar — LEARNING or FAMILIAR with review_step <= 2
  // Bucket 3 (20%): Core — in-scope, not weak, not low-mastery
  //
  // Note: a word can qualify for multiple buckets; we assign to the highest-priority one.
  const weaknessBucket: VocabCandidate[] = [];
  const learningFamiliarBucket: VocabCandidate[] = [];
  const coreBucket: VocabCandidate[] = [];

  for (const c of allCandidates) {
    if (!scopeStageNumbers.has(c.stage_number)) continue;

    if (isWeak(c)) {
      weaknessBucket.push(c);
    } else if (isLearningOrEarlyFamiliar(c)) {
      learningFamiliarBucket.push(c);
    } else {
      coreBucket.push(c);
    }
  }

  // Also include scoped due-SRS words in weakness (overdue = high-priority weakness signal)
  // They are already captured via mastery_score / wrong_count if user has attempts.
  // For completeness, any scoped due-SRS word not yet in weakness gets added there.
  for (const c of allCandidates) {
    if (!scopeStageNumbers.has(c.stage_number)) continue;
    const isDue = c.next_review_at != null && new Date(c.next_review_at).getTime() <= now.getTime();
    if (isDue && !isWeak(c) && !weaknessBucket.includes(c)) {
      weaknessBucket.push(c);
    }
  }

  const sortedWeak = sortByPriority(weaknessBucket);
  const sortedLF = sortByPriority(learningFamiliarBucket);
  const sortedCore = sortByPriority(coreBucket);

  // ── Fill with cascade fallback ─────────────────────────────────────────────
  // Attempt distribution plans in order until 10 slots filled:
  //   Plan A: 5 weak / 3 learningFamiliar / 2 core
  //   Plan B: 4 weak / 4 learningFamiliar / 2 core   (40/40/20)
  //   Plan C: 3 weak / 5 learningFamiliar / 2 core   (30/50/20)
  //   Plan D: fill from any scoped eligible

  const selected = new Set<string>();
  const finalWords: VocabCandidate[] = [];

  let weakPicked = 0;
  let lfPicked = 0;
  let corePicked = 0;

  // Plan A
  weakPicked = pickFrom(sortedWeak, 5, selected, finalWords);
  lfPicked = pickFrom(sortedLF, 3, selected, finalWords);
  corePicked = pickFrom(sortedCore, 2, selected, finalWords);

  // Plan B: shift if weak under-filled (try to reach 4 each of weak+LF)
  if (finalWords.length < BOSS_QUESTION_COUNT) {
    const extraWeak = pickFrom(sortedWeak, 4 - weakPicked, selected, finalWords);
    weakPicked += extraWeak;
    const extraLF = pickFrom(sortedLF, 4 - lfPicked, selected, finalWords);
    lfPicked += extraLF;
  }

  // Plan C: keep pulling from LF
  if (finalWords.length < BOSS_QUESTION_COUNT) {
    const extraLF = pickFrom(sortedLF, BOSS_QUESTION_COUNT - finalWords.length, selected, finalWords);
    lfPicked += extraLF;
  }

  // Plan D: any remaining scoped candidates
  if (finalWords.length < BOSS_QUESTION_COUNT) {
    const allScoped = sortByPriority(
      allCandidates.filter(c => scopeStageNumbers.has(c.stage_number))
    );
    pickFrom(allScoped, BOSS_QUESTION_COUNT - finalWords.length, selected, finalWords);
  }

  // Final safety: any candidate regardless of scope
  if (finalWords.length < BOSS_QUESTION_COUNT) {
    const allSorted = sortByPriority(allCandidates);
    pickFrom(allSorted, BOSS_QUESTION_COUNT - finalWords.length, selected, finalWords);
  }

  // ── FINAL_BOSS: apply world-balancing cap ──────────────────────────────────
  // Cap: no single world may supply > 30% (3 questions) of the 10-question pool.
  // If pool is thin and a world exceeds 30%, relax cap to 50% (5 questions).
  if (isFinalBoss && finalWords.length > 0) {
    const HARD_CAP = 3;   // 30% of 10
    const SOFT_CAP = 5;   // 50% of 10 (relaxed)

    // Count words per world
    const worldCounts = new Map<number, number>();
    for (const w of finalWords) {
      const wn = Math.ceil(w.stage_number / 10);
      worldCounts.set(wn, (worldCounts.get(wn) ?? 0) + 1);
    }

    // Determine if any world exceeds hard cap
    const needsRebalance = [...worldCounts.values()].some(c => c > HARD_CAP);

    if (needsRebalance) {
      const cap = SOFT_CAP; // attempt soft cap first; accept hard cap if still over

      // Rebuild selection respecting per-world cap
      const worldBudget = new Map<number, number>();
      const rebalanced: VocabCandidate[] = [];
      const reselected = new Set<string>();

      // Sort all scoped candidates by priority and pick with per-world cap
      const scopedSorted = sortByPriority(
        allCandidates.filter(c => scopeStageNumbers.has(c.stage_number))
      );

      for (const c of scopedSorted) {
        if (rebalanced.length >= BOSS_QUESTION_COUNT) break;
        const wn = Math.ceil(c.stage_number / 10);
        const used = worldBudget.get(wn) ?? 0;
        if (used >= cap) continue;
        worldBudget.set(wn, used + 1);
        reselected.add(c.id);
        rebalanced.push(c);
      }

      // If rebalanced still < 10, fill from any remaining
      if (rebalanced.length < BOSS_QUESTION_COUNT) {
        for (const c of scopedSorted) {
          if (rebalanced.length >= BOSS_QUESTION_COUNT) break;
          if (!reselected.has(c.id)) {
            reselected.add(c.id);
            rebalanced.push(c);
          }
        }
      }

      if (rebalanced.length >= finalWords.length) {
        // Replace with rebalanced selection
        finalWords.length = 0;
        finalWords.push(...rebalanced);
      }
      // If rebalanced is worse (fewer words), keep original
    }
  }

  return {
    selectedWords: finalWords,
    breakdown: {
      primaryPoolCount: weakPicked,
      weaknessCount: weakPicked,
      reviewCount: lfPicked,
      total: finalWords.length,
    },
  };
}

