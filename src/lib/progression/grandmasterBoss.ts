/**
 * grandmasterBoss.ts
 * Post-Stage 100 + 300 Stars — Grandmaster Typing Boss Engine
 *
 * Pure functions. Zero DB access.
 *
 * Rules:
 *   - Unlocks ONLY when all 100 campaign stages are completed AND total stars === 300 (3 stars on all 100 stages).
 *   - 50 questions sampled across all 10 Worlds (5 words per World, prioritizing student's weak/unmastered words).
 *   - 100% Typing-Only (no multiple choice), split into 5 Boss Phases (10 questions per phase).
 *   - Dynamic short timer per question (8–12s based on word length, +2s for cloze context) to defeat 2-device / cheat-sheet lookup.
 *   - First-letter + character-count mask provided to disambiguate synonyms fairly.
 *   - Pass threshold: >= 80% (40 / 50 correct), zero hints/powerups allowed.
 */

import type { VocabCandidate } from '../learning/adaptiveSelector.ts';
import { calculateCandidatePriorityScore } from '../learning/adaptiveSelector.ts';
import { getWorldStageRange, type WorldNumber } from './worldHierarchy.ts';

export const GRANDMASTER_TOTAL_STAGES = 100;
export const GRANDMASTER_REQUIRED_STARS = 300;
export const GRANDMASTER_QUESTION_COUNT = 50;
export const GRANDMASTER_WORDS_PER_WORLD = 5;
export const GRANDMASTER_PASS_SCORE = 40;
export const GRANDMASTER_PASS_ACCURACY = 80;

export interface StageStarRecord {
  stageNumber: number;
  bestStars: number;
  completed: boolean;
}

export interface GrandmasterEligibility {
  unlocked: boolean;
  totalStars: number;
  requiredStars: number;
  completedCount: number;
  threeStarStagesCount: number;
  missingThreeStarStages: number[];
}

export interface GrandmasterQuestionItem {
  index: number;
  phase: 1 | 2 | 3 | 4 | 5;
  worldNumber: number;
  wordId: string;
  word: string;
  meaningTh: string;
  partOfSpeech: string;
  promptType: 'TYPING_MEANING' | 'TYPING_CLOZE';
  promptText: string;
  firstLetterMask: string;
  letterCount: number;
  timeLimitSeconds: number;
}

/**
 * Evaluates whether a student has unlocked the Grandmaster Typing Boss
 * (all 100 campaign stages completed with 3 stars each = 300 stars).
 */
export function checkGrandmasterEligibility(
  stageRecords: StageStarRecord[]
): GrandmasterEligibility {
  const byStage = new Map<number, StageStarRecord>();
  for (const r of stageRecords || []) {
    if (r.stageNumber >= 1 && r.stageNumber <= GRANDMASTER_TOTAL_STAGES) {
      byStage.set(r.stageNumber, r);
    }
  }

  let totalStars = 0;
  let completedCount = 0;
  let threeStarStagesCount = 0;
  const missingThreeStarStages: number[] = [];

  for (let s = 1; s <= GRANDMASTER_TOTAL_STAGES; s++) {
    const entry = byStage.get(s);
    const isCompleted = Boolean(entry?.completed);
    const stars = isCompleted ? Math.max(0, Math.min(3, Math.trunc(entry?.bestStars ?? 0))) : 0;

    if (isCompleted) {
      completedCount++;
    }
    totalStars += stars;

    if (isCompleted && stars >= 3) {
      threeStarStagesCount++;
    } else {
      missingThreeStarStages.push(s);
    }
  }

  const unlocked =
    completedCount === GRANDMASTER_TOTAL_STAGES &&
    totalStars >= GRANDMASTER_REQUIRED_STARS &&
    missingThreeStarStages.length === 0;

  return {
    unlocked,
    totalStars,
    requiredStars: GRANDMASTER_REQUIRED_STARS,
    completedCount,
    threeStarStagesCount,
    missingThreeStarStages,
  };
}

/**
 * Generates a first-letter + length mask to prevent synonym ambiguity
 * without giving away the spelling.
 * Example: "Pollution" -> "P _ _ _ _ _ _ _ _"
 */
export function generateFirstLetterMask(word: string): { mask: string; letterCount: number } {
  const trimmed = (word || '').trim();
  if (!trimmed) return { mask: '', letterCount: 0 };

  let letterCount = 0;
  const chars = Array.from(trimmed);
  const maskedParts: string[] = [];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (/[a-zA-Z]/.test(ch)) {
      letterCount++;
      if (i === 0) {
        maskedParts.push(ch.toUpperCase());
      } else {
        maskedParts.push('_');
      }
    } else if (ch === ' ') {
      maskedParts.push('  ');
    } else {
      maskedParts.push(ch);
    }
  }

  return {
    mask: maskedParts.join(' '),
    letterCount,
  };
}

/**
 * Computes a short per-question typing time limit (8–14s) so students who know
 * the word can type it comfortably, while 2-device or notebook lookup fails.
 */
export function computeDynamicTypingTimeLimit(
  word: string,
  promptType: 'TYPING_MEANING' | 'TYPING_CLOZE' = 'TYPING_MEANING'
): number {
  const lettersOnly = (word || '').replace(/[^a-zA-Z]/g, '');
  const len = lettersOnly.length;

  let baseSeconds = 10;
  if (len <= 5) {
    baseSeconds = 8;
  } else if (len <= 8) {
    baseSeconds = 10;
  } else {
    baseSeconds = 12;
  }

  if (promptType === 'TYPING_CLOZE') {
    return Math.min(14, baseSeconds + 2);
  }
  return baseSeconds;
}

/**
 * Masks the target word inside an example sentence if present.
 */
export function maskWordInSentence(sentence: string | null | undefined, word: string): string | null {
  if (!sentence || !word) return null;
  const cleanWord = word.trim();
  if (!cleanWord) return null;

  const escaped = cleanWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}(?:s|es|ed|ing)?\\b`, 'gi');
  if (!regex.test(sentence)) return null;

  return sentence.replace(regex, '________');
}

/**
 * Selects 50 vocabulary words stratified across Worlds 1–10 (5 words per world),
 * prioritizing the student's weakest / least-mastered words in each world.
 */
export function selectGrandmasterQuestionPool(
  allCandidates: VocabCandidate[],
  now: Date = new Date()
): VocabCandidate[] {
  const campaignCandidates = (allCandidates || []).filter(
    (c) => c && c.stage_number >= 1 && c.stage_number <= GRANDMASTER_TOTAL_STAGES && Boolean(c.word)
  );

  const selectedIds = new Set<string>();
  const selectedWords: VocabCandidate[] = [];

  for (let w = 1; w <= 10; w++) {
    const worldNum = w as WorldNumber;
    const { first, last } = getWorldStageRange(worldNum);
    const worldPool = campaignCandidates.filter(
      (c) => c.stage_number >= first && c.stage_number <= last && !selectedIds.has(c.id)
    );

    // Sort by adaptive priority (overdue + weakness + unmastered) with slight tie-breaker shuffle
    const scored = worldPool
      .map((item) => ({
        item,
        score: calculateCandidatePriorityScore(item, first, now),
        jitter: Math.random() * 0.5,
      }))
      .sort((a, b) => b.score + b.jitter - (a.score + a.jitter));

    let pickedForWorld = 0;
    for (const entry of scored) {
      if (pickedForWorld >= GRANDMASTER_WORDS_PER_WORLD) break;
      if (!selectedIds.has(entry.item.id)) {
        selectedIds.add(entry.item.id);
        selectedWords.push(entry.item);
        pickedForWorld++;
      }
    }
  }

  // Fallback if any world had fewer than 5 words in DB
  if (selectedWords.length < GRANDMASTER_QUESTION_COUNT) {
    const remaining = campaignCandidates
      .filter((c) => !selectedIds.has(c.id))
      .sort(
        (a, b) =>
          calculateCandidatePriorityScore(b, b.stage_number, now) -
          calculateCandidatePriorityScore(a, a.stage_number, now)
      );

    for (const c of remaining) {
      if (selectedWords.length >= GRANDMASTER_QUESTION_COUNT) break;
      selectedIds.add(c.id);
      selectedWords.push(c);
    }
  }

  return selectedWords.slice(0, GRANDMASTER_QUESTION_COUNT);
}

/**
 * Builds the 50 typing-only question items across 5 phases (10 questions per phase).
 */
export function buildGrandmasterQuestions(
  selectedWords: Array<VocabCandidate & { example_sentence?: string | null }>
): GrandmasterQuestionItem[] {
  return selectedWords.slice(0, GRANDMASTER_QUESTION_COUNT).map((w, idx) => {
    const phase = (Math.min(5, Math.floor(idx / 10) + 1)) as 1 | 2 | 3 | 4 | 5;
    const worldNumber = Math.max(1, Math.min(10, Math.ceil((w.stage_number || 1) / 10)));
    const meaningTh =
      (w.meaning_th && /[ก-๙]/.test(w.meaning_th) ? w.meaning_th : w.meaning) ||
      w.meaning_th ||
      w.meaning ||
      '';
    const maskedSentence = maskWordInSentence(w.example_sentence, w.word);
    const useCloze = idx % 2 === 1 && Boolean(maskedSentence);
    const promptType: 'TYPING_MEANING' | 'TYPING_CLOZE' = useCloze
      ? 'TYPING_CLOZE'
      : 'TYPING_MEANING';

    const { mask, letterCount } = generateFirstLetterMask(w.word);
    const timeLimitSeconds = computeDynamicTypingTimeLimit(w.word, promptType);

    const promptText = useCloze
      ? `${maskedSentence} (${meaningTh})`
      : meaningTh;

    return {
      index: idx + 1,
      phase,
      worldNumber,
      wordId: w.id,
      word: w.word.trim(),
      meaningTh,
      partOfSpeech: w.part_of_speech || 'vocab',
      promptType,
      promptText,
      firstLetterMask: mask,
      letterCount,
      timeLimitSeconds,
    };
  });
}

