import test from 'node:test';
import assert from 'node:assert/strict';
import { getRequiredPrerequisites, isStageUnlocked, getMaxUnlockedStage } from './unlockRules.ts';

// ─── getRequiredPrerequisites ─────────────────────────────────────────────────

test('1. Stage 1 has no prerequisites (always unlocked)', () => {
  assert.deepEqual([...getRequiredPrerequisites(1)], []);
});

test('2. STANDARD stage N requires N-1', () => {
  const prereqs = getRequiredPrerequisites(2);
  assert.equal(prereqs.has(1), true);
  assert.equal(prereqs.size, 1);

  const prereqs3 = getRequiredPrerequisites(3);
  assert.equal(prereqs3.has(2), true);
});

test('3. REVIEW_CHECKPOINT stage requires N-1 (standard rule)', () => {
  // Stage 4 (REVIEW_CHECKPOINT) requires stage 3
  const prereqs4 = getRequiredPrerequisites(4);
  assert.equal(prereqs4.has(3), true);
  assert.equal(prereqs4.size, 1);

  // Stage 9 (REVIEW_CHECKPOINT) requires stage 8
  const prereqs9 = getRequiredPrerequisites(9);
  assert.equal(prereqs9.has(8), true);
  assert.equal(prereqs9.size, 1);
});

test('4. MINI_BOSS (stage 5) requires all preceding chapter stages (1–4)', () => {
  const prereqs = getRequiredPrerequisites(5);
  assert.equal(prereqs.has(1), true);
  assert.equal(prereqs.has(2), true);
  assert.equal(prereqs.has(3), true);
  assert.equal(prereqs.has(4), true);
  assert.equal(prereqs.size, 4);
});

test('5. MINI_BOSS (stage 15) requires stages 11–14', () => {
  const prereqs = getRequiredPrerequisites(15);
  assert.equal(prereqs.has(11), true);
  assert.equal(prereqs.has(14), true);
  assert.equal(prereqs.has(10), false, 'Stage 10 is previous world boss — not required for this mini boss');
  assert.equal(prereqs.size, 4);
});

test('6. WORLD_BOSS (stage 10) requires stages 1–9', () => {
  const prereqs = getRequiredPrerequisites(10);
  for (let s = 1; s <= 9; s++) {
    assert.equal(prereqs.has(s), true, `stage ${s} must be in prerequisites`);
  }
  assert.equal(prereqs.size, 9);
});

test('7. WORLD_BOSS (stage 20) requires stages 11–19', () => {
  const prereqs = getRequiredPrerequisites(20);
  for (let s = 11; s <= 19; s++) {
    assert.equal(prereqs.has(s), true);
  }
  assert.equal(prereqs.has(10), false, 'Previous world boss not required');
  assert.equal(prereqs.size, 9);
});

test('8. First stage of new world (e.g. stage 11) requires previous world boss (stage 10)', () => {
  const prereqs = getRequiredPrerequisites(11);
  assert.equal(prereqs.has(10), true);
  assert.equal(prereqs.size, 1);
});

test('9. First stage of new world (e.g. stage 21) requires world boss (stage 20)', () => {
  const prereqs = getRequiredPrerequisites(21);
  assert.equal(prereqs.has(20), true);
  assert.equal(prereqs.size, 1);
});

test('10. FINAL_BOSS (stage 100) requires ALL of stages 91–99', () => {
  const prereqs = getRequiredPrerequisites(100);
  for (let s = 91; s <= 99; s++) {
    assert.equal(prereqs.has(s), true, `stage ${s} must be prerequisite for final boss`);
  }
  assert.equal(prereqs.size, 9);
  assert.equal(prereqs.has(90), false, 'Stage 90 (World 9 boss) is not required');
});

test('11. LEGACY_OVERFLOW stages return empty prerequisites', () => {
  assert.equal(getRequiredPrerequisites(101).size, 0);
  assert.equal(getRequiredPrerequisites(105).size, 0);
});

// ─── isStageUnlocked — V3 Authoritative Mode ─────────────────────────────────

test('12. Stage 1 is always unlocked with or without progression data', () => {
  assert.equal(isStageUnlocked({ targetStageNumber: 1, completedStages: new Set() }), true);
  assert.equal(isStageUnlocked({ targetStageNumber: 1, completedStages: null }), true);
});

test('13. Completed stage is always replayable', () => {
  const completed = new Set([1, 2, 3]);
  assert.equal(isStageUnlocked({ targetStageNumber: 3, completedStages: completed }), true);
});

test('14. Stage unlocked when all prerequisites completed', () => {
  // Stage 2 requires stage 1
  assert.equal(isStageUnlocked({ targetStageNumber: 2, completedStages: new Set([1]) }), true);
  // Stage 11 requires stage 10
  assert.equal(isStageUnlocked({ targetStageNumber: 11, completedStages: new Set([1,2,3,4,5,6,7,8,9,10]) }), true);
});

test('15. CRITICAL: max-completed shortcut must NOT work — gaps in progression block unlock', () => {
  // pathological state: {1,2,3,10} — maxCompleted=10 but 4–9 missing
  const gapSet = new Set([1, 2, 3, 10]);
  // Stage 11 requires stage 10, but stage 10 is a World Boss requiring 1-9 first.
  // However unlockRules checks stage 11's prerequisite (stage 10) only.
  // The key test: stage 11 with {1,2,3,10} — stage 10 IS in the set, so 11 is unlocked.
  // But stage 4 is NOT in the set, so stage 5 (mini boss) is blocked.
  assert.equal(isStageUnlocked({ targetStageNumber: 5, completedStages: gapSet }), false,
    'Mini boss requires all of 1-4; missing 4 blocks it');
});

test('16. CRITICAL: Stage 100 locked if any of 91–99 are missing', () => {
  // completedStages with stages 91 and 99 but not 92–98
  const partial = new Set([...Array.from({length: 90}, (_, i) => i + 1), 91, 99]);
  assert.equal(isStageUnlocked({ targetStageNumber: 100, completedStages: partial }), false,
    'Final Boss requires ALL of 91–99');
});

test('17. Stage 100 unlocked when all of 91–99 are completed', () => {
  const allPrereqs = new Set<number>();
  for (let s = 1; s <= 99; s++) allPrereqs.add(s);
  assert.equal(isStageUnlocked({ targetStageNumber: 100, completedStages: allPrereqs }), true);
});

test('18. LEGACY_OVERFLOW stages 101–105 are always locked', () => {
  const allCompleted = new Set<number>();
  for (let s = 1; s <= 100; s++) allCompleted.add(s);
  assert.equal(isStageUnlocked({ targetStageNumber: 101, completedStages: allCompleted }), false);
  assert.equal(isStageUnlocked({ targetStageNumber: 105, completedStages: allCompleted }), false);
});

// ─── Legacy Fallback Mode (V3 migration absent) ───────────────────────────────

test('19. Legacy fallback: unlocks stages up to legacyCurrentStage when completedStages is null', () => {
  // V3 migration absent (completedStages = null) → use legacy pointer
  assert.equal(isStageUnlocked({ targetStageNumber: 5, completedStages: null, legacyCurrentStage: 5 }), true);
  assert.equal(isStageUnlocked({ targetStageNumber: 6, completedStages: null, legacyCurrentStage: 5 }), false);
});

test('20. Legacy fallback: stage 1 still always unlocked', () => {
  assert.equal(isStageUnlocked({ targetStageNumber: 1, completedStages: null, legacyCurrentStage: 0 }), true);
});

test('21. V3 data takes priority over legacy pointer — no union', () => {
  // Student has V3 data (completedStages = {1}) but legacyCurrentStage = 50
  // Stage 11 requires stage 10 completed. 10 is NOT in completedStages.
  // V3 authority should say NO, regardless of legacyCurrentStage = 50.
  const result = isStageUnlocked({
    targetStageNumber: 11,
    completedStages: new Set([1]),
    legacyCurrentStage: 50,
  });
  assert.equal(result, false,
    'V3 progression data must take priority; legacyCurrentStage=50 must not bypass prerequisites');
});

// ─── getMaxUnlockedStage ──────────────────────────────────────────────────────

test('22. getMaxUnlockedStage: stage 1 with empty completedStages', () => {
  assert.equal(getMaxUnlockedStage(new Set(), 1), 1);
});

test('23. getMaxUnlockedStage: increments correctly with sequential completion', () => {
  const completed = new Set([1, 2, 3]);
  // Stage 4 is next, 5 (mini boss) requires 1-4, so max should be 4
  assert.equal(getMaxUnlockedStage(completed, 4), 4);
});
