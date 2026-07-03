export type ScoringResult = {
  scoreEarned: number;
  heartsRemaining: number;
};

/**
 * Calculates score and remaining hearts for a submission.
 * 
 * Rules:
 * - Start with 3 Hearts.
 * - Incorrect: -1 Heart, 0 points.
 * - Near Miss (first time): 0 points, but no Heart lost.
 * - Near Miss (subsequent): 0 points, -1 Heart (or custom logic, assuming no penalty for multiple near misses for now).
 * - Correct attempt 1: 100 pts
 * - Correct attempt 2: 70 pts
 * - Correct attempt 3: 40 pts
 * - Correct after hint: -20 pts from base
 */
export function calculateAttemptScore(
  attemptNo: number,
  isCorrect: boolean,
  isNearMiss: boolean,
  currentHearts: number,
  hintUsed: boolean
): ScoringResult {
  if (!isCorrect) {
    if (isNearMiss) {
      // Near miss doesn't reduce heart
      return { scoreEarned: 0, heartsRemaining: currentHearts };
    }
    return { scoreEarned: 0, heartsRemaining: Math.max(0, currentHearts - 1) };
  }

  let baseScore = 0;
  if (attemptNo === 1) baseScore = 100;
  else if (attemptNo === 2) baseScore = 70;
  else baseScore = 40;

  if (hintUsed) {
    baseScore = Math.max(0, baseScore - 20);
  }

  return { scoreEarned: baseScore, heartsRemaining: currentHearts };
}

export function calculateGrade(score: number, correctCount: number, totalQuestions: number): string {
  if (totalQuestions === 0) return 'F';
  const accuracy = (correctCount / totalQuestions) * 100;
  const avgScore = score / totalQuestions;

  if (accuracy === 100 && avgScore >= 95) return 'SSS';
  if (accuracy >= 90 || avgScore >= 80) return 'S';
  if (accuracy >= 80) return 'A';
  if (accuracy >= 70) return 'B';
  if (accuracy >= 50) return 'C';
  return 'F';
}
