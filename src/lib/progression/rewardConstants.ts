/**
 * rewardConstants.ts
 * Phase 3.2D — Authoritative Economy Constants
 *
 * These values MIRROR the PostgreSQL V3 migration exactly.
 * They are used for:
 *   - UI prediction / display
 *   - Pure engine tests
 *   - Server-side helper logic
 *
 * ⚠️  PostgreSQL complete_stage_with_progression_v3 is the FINAL persistence authority.
 *     TypeScript constants are reference only — never used as a substitute for DB truth.
 *
 * Source: MIGRATION_GAME_PROGRESSION_V3.sql STEP 8
 */

// ─── Primary Reason Base Rewards ──────────────────────────────────────────────

/** Coins awarded for completing a stage for the first time (and passing). */
export const FIRST_CLEAR_COINS = 20;

/** EXP awarded for completing a stage for the first time (and passing). */
export const FIRST_CLEAR_EXP = 15;

/**
 * Coins awarded when economy STAR_UPGRADE triggers.
 * Condition: already completed + trustedTier === SKILLED + prev_best_stars < 2.
 * 2→3 star upgrades do NOT trigger this — they are PRACTICE_REPLAY economy.
 */
export const STAR_UPGRADE_COINS = 6;

/** EXP awarded on economy STAR_UPGRADE. */
export const STAR_UPGRADE_EXP = 4;

/** Coins awarded for replaying a stage with no star economy upgrade. */
export const PRACTICE_REPLAY_COINS = 2;

/** EXP awarded for practice replay. */
export const PRACTICE_REPLAY_EXP = 1;

// ─── Boss Bonus Flags ─────────────────────────────────────────────────────────

/**
 * Multiplier applied to base_reward_coins AND base_reward_exp
 * when BOSS_FIRST_CLEAR is active (MINI_BOSS, WORLD_BOSS, or FINAL_BOSS first clear).
 *
 * Example — FIRST_CLEAR boss:
 *   base_coins = 20 → after ×2 = 40
 *   NOT: 20 + 20×2 = 60
 */
export const BOSS_FIRST_CLEAR_MULTIPLIER = 2;

/** Flat bonus coins for clearing a World Boss for the first time. Additive, not multiplied. */
export const WORLD_CLEAR_BONUS_COINS = 50;

/** Flat bonus EXP for clearing a World Boss for the first time. */
export const WORLD_CLEAR_BONUS_EXP = 30;

/** Flat bonus coins for defeating the Final Boss (Stage 100) for the first time. */
export const FINAL_BOSS_CLEAR_BONUS_COINS = 200;

/** Flat bonus EXP for defeating the Final Boss for the first time. */
export const FINAL_BOSS_CLEAR_BONUS_EXP = 100;

// ─── Reward Classification Helpers ───────────────────────────────────────────

export type PrimaryReason = 'FIRST_CLEAR' | 'STAR_UPGRADE' | 'PRACTICE_REPLAY';

export type BonusFlag =
  | 'BOSS_FIRST_CLEAR'
  | 'WORLD_CLEAR'
  | 'FINAL_BOSS_CLEAR';

/**
 * Computes the final economy reward from classified reason + bonus flags.
 * Mirrors the exact arithmetic of MIGRATION_GAME_PROGRESSION_V3.sql STEP 8.
 *
 * Order of operations (SQL-identical):
 *   1. base = primary reason base
 *   2. if BOSS_FIRST_CLEAR: base *= 2
 *   3. if WORLD_CLEAR: bonus_coins += 50, base_exp += 30
 *   4. if FINAL_BOSS_CLEAR: bonus_coins += 200, base_exp += 100
 *   5. earned = base + bonus_coins
 */
export function computeEconomyReward(
  primaryReason: PrimaryReason,
  bonusFlags: BonusFlag[]
): { earnedCoins: number; earnedExp: number } {
  let baseCoins =
    primaryReason === 'FIRST_CLEAR'
      ? FIRST_CLEAR_COINS
      : primaryReason === 'STAR_UPGRADE'
        ? STAR_UPGRADE_COINS
        : PRACTICE_REPLAY_COINS;

  let baseExp =
    primaryReason === 'FIRST_CLEAR'
      ? FIRST_CLEAR_EXP
      : primaryReason === 'STAR_UPGRADE'
        ? STAR_UPGRADE_EXP
        : PRACTICE_REPLAY_EXP;

  // Step 2: BOSS_FIRST_CLEAR multiplies entire base
  if (bonusFlags.includes('BOSS_FIRST_CLEAR')) {
    baseCoins *= BOSS_FIRST_CLEAR_MULTIPLIER;
    baseExp *= BOSS_FIRST_CLEAR_MULTIPLIER;
  }

  // Step 3–4: flat bonuses are additive
  let bonusCoins = 0;

  if (bonusFlags.includes('WORLD_CLEAR')) {
    bonusCoins += WORLD_CLEAR_BONUS_COINS;
    baseExp += WORLD_CLEAR_BONUS_EXP;
  }

  if (bonusFlags.includes('FINAL_BOSS_CLEAR')) {
    bonusCoins += FINAL_BOSS_CLEAR_BONUS_COINS;
    baseExp += FINAL_BOSS_CLEAR_BONUS_EXP;
  }

  return {
    earnedCoins: baseCoins + bonusCoins,
    earnedExp: baseExp,
  };
}
