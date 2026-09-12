export interface VocabCandidate {
  id: string;
  word: string;
  meaning: string;
  meaning_th?: string;
  stage_number: number;
  part_of_speech?: string;
  // Adaptive metrics if user has seen this word
  mastery_status?: 'LEARNING' | 'FAMILIAR' | 'MASTERED';
  mastery_score?: number; // 0..100
  review_step?: number;
  wrong_count?: number;
  attempt_count?: number;
  next_review_at?: Date | string | null;
  last_seen_at?: Date | string | null;
}

export interface AdaptiveSelectorOptions {
  totalQuestions: number;
  stageNumber: number;
  targetStageRatio?: number; // default 0.60
  dueReviewRatio?: number;   // default 0.20
  weaknessRatio?: number;    // default 0.20
  now?: Date;
}

export interface SelectedQuestionPlan {
  selectedWords: VocabCandidate[];
  breakdown: {
    targetStageCount: number;
    dueReviewCount: number;
    weaknessCount: number;
    total: number;
  };
}

export function calculateCandidatePriorityScore(
  candidate: VocabCandidate,
  targetStageNumber: number,
  now: Date = new Date()
): number {
  let overdueRatio = 0;
  if (candidate.next_review_at) {
    const nextReviewTime = new Date(candidate.next_review_at).getTime();
    const diffMs = now.getTime() - nextReviewTime;
    if (diffMs > 0) {
      // Overdue: scales up to 1.0 (capped at 7 days overdue)
      overdueRatio = Math.min(1.0, diffMs / (7 * 24 * 3600 * 1000));
    }
  }

  const attempts = candidate.attempt_count || 0;
  const wrongs = candidate.wrong_count || 0;
  const weaknessRate = attempts > 0 ? wrongs / attempts : (wrongs > 0 ? 0.8 : 0);

  const masteryScore = candidate.mastery_score !== undefined ? candidate.mastery_score : 0;
  const unmasteredRatio = 1 - Math.min(100, Math.max(0, masteryScore)) / 100;

  const stageRelevance = candidate.stage_number === targetStageNumber ? 1.0 : 0.0;

  let recentExposurePenalty = 0;
  if (candidate.last_seen_at) {
    const lastSeenTime = new Date(candidate.last_seen_at).getTime();
    const elapsedMinutes = (now.getTime() - lastSeenTime) / (60 * 1000);
    if (elapsedMinutes < 15) {
      // Saw within last 15 minutes: high penalty to prevent repeating back-to-back
      recentExposurePenalty = 1.0;
    } else if (elapsedMinutes < 60) {
      recentExposurePenalty = 0.5;
    }
  }

  // Priority formula:
  // 40 * OverdueRatio + 30 * WeaknessRate + 20 * UnmasteredRatio + 10 * StageRelevance - 50 * RecentExposurePenalty
  const priority =
    40 * overdueRatio +
    30 * weaknessRate +
    20 * unmasteredRatio +
    10 * stageRelevance -
    50 * recentExposurePenalty;

  return Math.round(priority * 100) / 100;
}

/**
 * Selects an adaptive mix of vocabulary words ensuring 60/20/20 target with graceful fallback
 * and zero duplicate words in the session.
 */
export function selectAdaptiveQuestionPool(
  allAvailableWords: VocabCandidate[],
  options: AdaptiveSelectorOptions
): SelectedQuestionPlan {
  const {
    totalQuestions,
    stageNumber,
    now = new Date(),
  } = options;

  const selectedSet = new Set<string>();
  const targetStageWords: VocabCandidate[] = [];
  const dueReviewWords: VocabCandidate[] = [];
  const weaknessWords: VocabCandidate[] = [];
  const otherWords: VocabCandidate[] = [];

  for (const w of allAvailableWords) {
    const isDue = w.next_review_at && new Date(w.next_review_at).getTime() <= now.getTime();
    const isWeak = (w.wrong_count || 0) > 0 || (w.mastery_score !== undefined && w.mastery_score < 60);
    const isStageTarget = w.stage_number === stageNumber;

    if (isDue) {
      dueReviewWords.push(w);
    } else if (isWeak) {
      weaknessWords.push(w);
    } else if (isStageTarget) {
      targetStageWords.push(w);
    } else {
      otherWords.push(w);
    }
  }

  // Sort candidate buckets by priority score descending
  const sortByScore = (list: VocabCandidate[]) =>
    list.sort((a, b) => calculateCandidatePriorityScore(b, stageNumber, now) - calculateCandidatePriorityScore(a, stageNumber, now));

  sortByScore(targetStageWords);
  sortByScore(dueReviewWords);
  sortByScore(weaknessWords);
  sortByScore(otherWords);

  // Target slot distribution: 60% Target, 20% Due, 20% Weakness
  const targetNeeded = Math.round(totalQuestions * 0.6);
  const dueNeeded = Math.round(totalQuestions * 0.2);
  const weaknessNeeded = totalQuestions - targetNeeded - dueNeeded;

  const finalSelected: VocabCandidate[] = [];

  let countTarget = 0;
  let countDue = 0;
  let countWeakness = 0;

  // 1. Pick Target Stage Words
  for (const w of targetStageWords) {
    if (countTarget >= targetNeeded) break;
    if (!selectedSet.has(w.id)) {
      selectedSet.add(w.id);
      finalSelected.push(w);
      countTarget++;
    }
  }

  // 2. Pick Due Review Words
  for (const w of dueReviewWords) {
    if (countDue >= dueNeeded) break;
    if (!selectedSet.has(w.id)) {
      selectedSet.add(w.id);
      finalSelected.push(w);
      countDue++;
    }
  }

  // 3. Pick Weakness Words
  for (const w of weaknessWords) {
    if (countWeakness >= weaknessNeeded) break;
    if (!selectedSet.has(w.id)) {
      selectedSet.add(w.id);
      finalSelected.push(w);
      countWeakness++;
    }
  }

  // 4. Fallback: If any slots remaining, fill in priority order from any unselected pool
  if (finalSelected.length < totalQuestions) {
    const fallbackCandidates = [
      ...targetStageWords,
      ...dueReviewWords,
      ...weaknessWords,
      ...otherWords,
    ].filter((w) => !selectedSet.has(w.id));

    sortByScore(fallbackCandidates);

    for (const w of fallbackCandidates) {
      if (finalSelected.length >= totalQuestions) break;
      selectedSet.add(w.id);
      finalSelected.push(w);
      if (w.stage_number === stageNumber) countTarget++;
      else countWeakness++;
    }
  }

  return {
    selectedWords: finalSelected,
    breakdown: {
      targetStageCount: countTarget,
      dueReviewCount: countDue,
      weaknessCount: countWeakness,
      total: finalSelected.length,
    },
  };
}
