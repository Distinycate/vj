/**
 * unlockRules.ts
 * Phase 3.2D — Stage Unlock Authorization
 *
 * Pure functions. Zero DB access.
 * Input is the caller's responsibility to load from the database.
 *
 * ─── Unlock Model ─────────────────────────────────────────────────────────────
 *
 * Stage 1:         always unlocked.
 * Completed stage: always accessible (replay).
 * LEGACY_OVERFLOW (101–105): always locked.
 *
 * Campaign unlock rules (EXACT prerequisite membership, NOT max+1 arithmetic):
 *
 *   STANDARD / REVIEW_CHECKPOINT:
 *     → requires stage N-1 completed
 *
 *   MINI_BOSS (stage % 10 = 5):
 *     → requires all stages in the current chapter before it to be completed
 *       (i.e., stages (world-1)*10+1 through stageNumber-1)
 *
 *   WORLD_BOSS (stage % 10 = 0, not stage 100):
 *     → requires all 9 preceding stages in the world to be completed
 *       (i.e., stages (world-1)*10+1 through stageNumber-1)
 *
 *   FINAL_BOSS (stage 100):
 *     → requires all stages 91–99 completed
 *
 *   FIRST STAGE OF NEXT WORLD (stage % 10 = 1, stage > 1):
 *     → the previous world's boss must be completed
 *       (i.e., stage - 1, which is a WORLD_BOSS)
 *
 * ─── Legacy Fallback ─────────────────────────────────────────────────────────
 *
 * For the migration transition period:
 *   - Use student_stage_progress (V3 authority) when available.
 *   - Fall back to learning_paths.current_stage ONLY when V3 migration is absent
 *     (i.e., completedStages is undefined/null).
 *   - After V3 migration is confirmed deployed, legacyCurrentStage must NOT
 *     override prerequisite rules derived from student_stage_progress.
 */

import {
  isCampaignStage,
  isLegacyOverflow,
  getStageType,
  getWorldNumber,
  getWorldStageRange,
} from './worldHierarchy.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UnlockCheckInput {
  /** The stage the student is trying to access. */
  targetStageNumber: number;

  /**
   * Set of stage numbers the student has completed, from student_stage_progress.
   * If undefined or null, V3 progression data is unavailable → use legacyCurrentStage fallback.
   */
  completedStages: Set<number> | null | undefined;

  /**
   * learning_paths.current_stage — compatibility pointer.
   * Used as fallback ONLY when completedStages is unavailable (pre-migration environment).
   * After V3 migration is deployed and backfilled, this must not override prerequisite rules.
   */
  legacyCurrentStage?: number;
}

// ─── Prerequisite Resolution ──────────────────────────────────────────────────

/**
 * Returns the set of stage numbers that must all be completed
 * for the target stage to be unlocked.
 *
 * Empty set = no prerequisites (always unlocked).
 */
export function getRequiredPrerequisites(targetStageNumber: number): Set<number> {
  if (!isCampaignStage(targetStageNumber)) return new Set();

  const stageType = getStageType(targetStageNumber);

  // Stage 1: always unlocked
  if (targetStageNumber === 1) return new Set();

  // FINAL_BOSS: requires all of 91–99
  if (stageType === 'FINAL_BOSS') {
    const required = new Set<number>();
    for (let s = 91; s <= 99; s++) required.add(s);
    return required;
  }

  // WORLD_BOSS (stageNumber % 10 === 0, not stage 100):
  // Requires all preceding stages in the world
  if (stageType === 'WORLD_BOSS') {
    const world = getWorldNumber(targetStageNumber)!;
    const { first } = getWorldStageRange(world);
    const required = new Set<number>();
    for (let s = first; s < targetStageNumber; s++) required.add(s);
    return required;
  }

  // MINI_BOSS (stageNumber % 10 === 5):
  // Requires all preceding stages in the current chapter (world's first stage through miniboss-1)
  if (stageType === 'MINI_BOSS') {
    const world = getWorldNumber(targetStageNumber)!;
    const { first } = getWorldStageRange(world);
    const required = new Set<number>();
    for (let s = first; s < targetStageNumber; s++) required.add(s);
    return required;
  }

  // First stage of a new world (stage % 10 === 1, but not stage 1):
  // Requires the previous world's boss (targetStageNumber - 1)
  if (targetStageNumber % 10 === 1 && targetStageNumber > 1) {
    return new Set([targetStageNumber - 1]);
  }

  // STANDARD / REVIEW_CHECKPOINT:
  // Requires stage N-1
  return new Set([targetStageNumber - 1]);
}

// ─── Unlock Check ─────────────────────────────────────────────────────────────

/**
 * Determines whether a student is authorized to access the target stage.
 *
 * Priority:
 *   1. LEGACY_OVERFLOW → always false.
 *   2. Non-campaign → false.
 *   3. Stage 1 → always true.
 *   4. Target already completed → true (replay).
 *   5. If V3 progression data available (completedStages is a Set):
 *        Use exact prerequisite membership check.
 *   6. If V3 data unavailable (completedStages is null/undefined):
 *        Fallback: targetStageNumber <= legacyCurrentStage.
 *
 * ⚠️  The max-completed+1 shortcut is NOT used.
 *     completedStages={1,2,3,10} does NOT unlock Stage 11.
 *     Each prerequisite must be individually present in completedStages.
 */
export function isStageUnlocked(input: UnlockCheckInput): boolean {
  const { targetStageNumber, completedStages, legacyCurrentStage } = input;

  // Non-campaign and LEGACY_OVERFLOW are always locked
  if (!isCampaignStage(targetStageNumber)) return false;
  if (isLegacyOverflow(targetStageNumber)) return false;

  // Stage 1 is always unlocked
  if (targetStageNumber === 1) return true;

  // V3 authoritative path
  if (completedStages !== null && completedStages !== undefined) {
    // Already completed = always replayable
    if (completedStages.has(targetStageNumber)) return true;

    // Check exact prerequisite membership
    const prerequisites = getRequiredPrerequisites(targetStageNumber);
    for (const required of prerequisites) {
      if (!completedStages.has(required)) return false;
    }
    return true;
  }

  // Legacy fallback: only when V3 migration is absent
  if (typeof legacyCurrentStage === 'number' && legacyCurrentStage >= 1) {
    return targetStageNumber <= legacyCurrentStage;
  }

  // No progression data at all — only stage 1 is safe
  return false;
}

/**
 * Returns the highest stage number the student is authorized to access,
 * based on authoritative completedStages.
 *
 * This is used for UI rendering (greyed out stages), not for access control
 * (which uses isStageUnlocked per-stage).
 */
export function getMaxUnlockedStage(
  completedStages: Set<number>,
  legacyCurrentStage: number
): number {
  if (completedStages.size === 0) {
    // No authoritative data; use legacy pointer with a floor of 1
    return Math.max(1, legacyCurrentStage);
  }

  let maxUnlocked = 1;
  for (let s = 1; s <= 100; s++) {
    if (
      isStageUnlocked({
        targetStageNumber: s,
        completedStages,
        legacyCurrentStage,
      })
    ) {
      maxUnlocked = s;
    } else {
      break;
    }
  }

  return maxUnlocked;
}
