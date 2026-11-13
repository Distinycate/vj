/**
 * puzzleEngine.ts
 * Core logic and rules for 100-Stage Crossword & Letter Wheel Puzzle Mode
 */

export const PUZZLE_MISSION_LEVEL = 50;
export const PUZZLE_TOTAL_STAGES = 100;
export const PUZZLE_REWARD_COINS = 25;
export const PUZZLE_REWARD_EXP = 40;
export const PUZZLE_HINT_COIN_COST = 20;

/**
 * Calculates 1–3 stars based on hints used:
 * - 0 hints: 3 stars (Perfect)
 * - 1–2 hints: 2 stars
 * - 3+ hints: 1 star
 */
export function calculatePuzzleStars(hintsUsed: number): number {
  if (hintsUsed <= 0) return 3;
  if (hintsUsed <= 2) return 2;
  return 1;
}

/**
 * Scrambles the uppercase letters of a word so students can swipe/connect them.
 * Guarantees that the output is not identical to the original word when length > 3.
 */
export function scrambleWordLetters(word: string): string[] {
  const chars = word.trim().toUpperCase().replace(/[^A-Z]/g, '').split('');
  if (chars.length <= 1) return chars;

  const shuffled = [...chars];
  // Seeded/deterministic swap with multiple rounds
  for (let round = 0; round < 3; round++) {
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = (i * 7 + round * 3 + 1) % (i + 1);
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }
  }

  // If accidentally identical to original word, swap first two
  if (shuffled.join('') === chars.join('') && shuffled.length >= 2) {
    const temp = shuffled[0];
    shuffled[0] = shuffled[1];
    shuffled[1] = temp;
  }

  return shuffled;
}

