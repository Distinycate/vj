/**
 * worldHierarchy.ts
 * Phase 3.2D — World & Stage Classification Registry
 *
 * Pure functions. Zero DB access. Zero side effects.
 * All campaign invariants are enforced here:
 *   - Main Campaign = Stage 1–100 only
 *   - Stages 101–105 = LEGACY_OVERFLOW (never exposed as World 11)
 *   - World size = 10 stages; World 1 = stages 1–10, World 10 = stages 91–100
 *   - Stage type mirrors complete_stage_with_progression_v3 SQL CASE exactly
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type StageType =
  | 'STANDARD'
  | 'REVIEW_CHECKPOINT'
  | 'MINI_BOSS'
  | 'WORLD_BOSS'
  | 'FINAL_BOSS'
  | 'LEGACY_OVERFLOW';

/** World number within the campaign (1–10). null for non-campaign stages. */
export type WorldNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface StageRange {
  first: number;
  last: number;
}

// ─── Campaign Boundary Guards ─────────────────────────────────────────────────

/** Returns true if stageNumber is within the Main Campaign (1–100). */
export function isCampaignStage(stageNumber: number): boolean {
  return Number.isInteger(stageNumber) && stageNumber >= 1 && stageNumber <= 100;
}

/**
 * Returns true if stageNumber is in the LEGACY_OVERFLOW range (101–105).
 * These stages must never be treated as campaign progression.
 */
export function isLegacyOverflow(stageNumber: number): boolean {
  return Number.isInteger(stageNumber) && stageNumber >= 101 && stageNumber <= 105;
}

// ─── Stage Classification ─────────────────────────────────────────────────────

/**
 * Returns the stage type.
 *
 * Mirrors the EXACT SQL CASE from complete_stage_with_progression_v3:
 *   WHEN stage_number = 100          → FINAL_BOSS
 *   WHEN stage_number % 10 = 0      → WORLD_BOSS
 *   WHEN stage_number % 10 = 5      → MINI_BOSS
 *   WHEN stage_number % 10 IN (4,9) → REVIEW_CHECKPOINT
 *   WHEN stage_number > 100         → LEGACY_OVERFLOW
 *   ELSE                            → STANDARD
 *
 * Stage 100: evaluated as FINAL_BOSS first (takes precedence over WORLD_BOSS).
 */
export function getStageType(stageNumber: number): StageType {
  if (stageNumber > 100) return 'LEGACY_OVERFLOW';
  if (stageNumber === 100) return 'FINAL_BOSS';
  if (stageNumber % 10 === 0) return 'WORLD_BOSS';
  if (stageNumber % 10 === 5) return 'MINI_BOSS';
  if (stageNumber % 10 === 4 || stageNumber % 10 === 9) return 'REVIEW_CHECKPOINT';
  return 'STANDARD';
}

export function isBossStage(stageNumber: number): boolean {
  const t = getStageType(stageNumber);
  return t === 'MINI_BOSS' || t === 'WORLD_BOSS' || t === 'FINAL_BOSS';
}

export function isWorldBossStage(stageNumber: number): boolean {
  return getStageType(stageNumber) === 'WORLD_BOSS';
}

export function isFinalBossStage(stageNumber: number): boolean {
  return getStageType(stageNumber) === 'FINAL_BOSS';
}

// ─── World Hierarchy ──────────────────────────────────────────────────────────

/**
 * Returns the world number (1–10) for a campaign stage.
 * Returns null for stages outside the Main Campaign (including LEGACY_OVERFLOW 101–105).
 *
 * ⚠️  getWorldNumber(101) === null, NOT 11.
 *     Stages 101–105 are LEGACY_OVERFLOW and must not be treated as World 11.
 *
 * Math: World = Math.ceil(stageNumber / 10)
 *   Stage  1 → World 1
 *   Stage 10 → World 1
 *   Stage 11 → World 2
 *   Stage 90 → World 9
 *   Stage 91 → World 10
 *   Stage 100 → World 10
 */
export function getWorldNumber(stageNumber: number): WorldNumber | null {
  if (!isCampaignStage(stageNumber)) return null;
  return Math.ceil(stageNumber / 10) as WorldNumber;
}

/**
 * Returns the chapter number within its world (1–10).
 * chapter = ((stageNumber - 1) % 10) + 1
 * Returns null for non-campaign stages.
 *
 * Example: Stage 11 → chapter 1 of World 2
 *          Stage 15 → chapter 5 of World 2 (MINI_BOSS)
 *          Stage 20 → chapter 10 of World 2 (WORLD_BOSS)
 */
export function getChapterNumber(stageNumber: number): number | null {
  if (!isCampaignStage(stageNumber)) return null;
  return ((stageNumber - 1) % 10) + 1;
}

/**
 * Returns the inclusive stage range for a given world number.
 * World 1 → { first: 1, last: 10 }
 * World 10 → { first: 91, last: 100 }
 */
export function getWorldStageRange(world: WorldNumber): StageRange {
  const first = (world - 1) * 10 + 1;
  const last = world * 10;
  return { first, last };
}

/**
 * Returns the inclusive stage range for the chapter-level stages within a world,
 * excluding the World Boss (last stage of the world).
 * World 1 chapter pool → { first: 1, last: 9 }
 */
export function getChapterStageRange(world: WorldNumber): StageRange {
  const { first, last } = getWorldStageRange(world);
  return { first, last: last - 1 };
}

/** Returns the World Boss stage number for a given world. */
export function getWorldBossStage(world: WorldNumber): number {
  return world * 10;
}

/** Returns the Mini Boss stage number for a given world (stage % 10 === 5). */
export function getMinieBossStage(world: WorldNumber): number {
  return (world - 1) * 10 + 5;
}

// ─── Campaign Constants ───────────────────────────────────────────────────────

export function getCampaignStageRange(): StageRange {
  return { first: 1, last: 100 };
}

export const STAGES_PER_WORLD = 10;
export const TOTAL_WORLDS = 10;
export const CAMPAIGN_FIRST_STAGE = 1;
export const CAMPAIGN_LAST_STAGE = 100;
export const FINAL_BOSS_STAGE = 100;
