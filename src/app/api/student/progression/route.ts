import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { isStageUnlocked } from '@/lib/progression/unlockRules';
import { getStageType } from '@/lib/progression/worldHierarchy';

/**
 * GET /api/student/progression
 * Phase 3.2H — Server-Authoritative Progression State
 *
 * This endpoint is the SINGLE SOURCE OF TRUTH for:
 *   1. Which stages the student has completed (from student_stage_progress)
 *   2. How many stars each completed stage has earned (best_stars)
 *   3. Which stages are UNLOCKED (computed server-side via isStageUnlocked)
 *   4. Stage types (boss, mini_boss, etc.)
 *
 * AUTHORITY POLICY:
 *   V3 PRIMARY: If student_stage_progress table exists and is queryable:
 *     - completedStages derived exclusively from student_stage_progress rows
 *     - unlockState computed using isStageUnlocked() with exact prerequisites
 *     - learning_paths.current_stage returned for compatibility but NOT used for unlock
 *
 *   LEGACY FALLBACK: ONLY if student_stage_progress table does not exist
 *     (query returns error indicating table is missing — environment without V3 migration).
 *     In this mode, learning_paths.current_stage drives unlock state.
 *
 *   FAIL-CLOSED: If V3 table exists but query encounters 500/permission/other error:
 *     - Return 503 error. Do NOT fall back to current_stage.
 *     - Falling back on V3 errors would silently bypass V3 authority.
 *     - Client must show an error state, not a permissive unlock.
 *
 * Security: requireRole(['STUDENT']), supabaseAdmin (service_role).
 */

/** PostgreSQL error code indicating a table does not exist. */
const PG_UNDEFINED_TABLE = '42P01';

/** Returns true if the error indicates student_stage_progress table is absent. */
function isV3TableAbsent(error: any): boolean {
  const code = error?.code ?? '';
  const msg = error?.message ?? '';
  return (
    code === PG_UNDEFINED_TABLE &&
    msg.includes('student_stage_progress')
  );
}

export async function GET(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT']);

    // Load legacy learning_path (always available, needed for compatibility pointer)
    const { data: path } = await supabaseAdmin
      .from('learning_paths')
      .select('current_stage, campaign_completed_at')
      .eq('student_id', session.subjectId)
      .maybeSingle();

    const legacyCurrentStage: number = path?.current_stage ?? 1;
    const campaignCompleted: boolean = path?.campaign_completed_at != null;

    // ── Attempt V3 authority ───────────────────────────────────────────────
    const { data: progressRows, error: progressError } = await supabaseAdmin
      .from('student_stage_progress')
      .select('stage_number, best_stars, best_accuracy, completed, attempt_count, evidence_source')
      .eq('student_id', session.subjectId);

    // ── FAIL-CLOSED: V3 table exists but query errored ─────────────────────
    if (progressError && !isV3TableAbsent(progressError)) {
      // V3 table is present in this environment but encountered a runtime error
      // (permission denied, connection issue, etc.). Do NOT fall back to legacy.
      console.error('[/api/student/progression] V3 query error (fail-closed):', progressError);
      return NextResponse.json(
        { error: 'Progression data temporarily unavailable. Please try again.' },
        { status: 503 }
      );
    }

    // ── Determine authority mode ────────────────────────────────────────────
    const isV3Available = !progressError; // progressError is null → table exists and query succeeded

    if (isV3Available) {
      // V3 AUTHORITY MODE
      const completedStages = new Set<number>();
      const stageDetails: Array<{
        stageNumber: number;
        bestStars: number;
        bestAccuracy: number | null;
        completed: boolean;
        attemptCount: number;
        stageType: string;
        evidenceSource: string | null;
      }> = [];

      for (const row of progressRows || []) {
        if (row.completed) {
          completedStages.add(row.stage_number);
        }
        stageDetails.push({
          stageNumber: row.stage_number,
          bestStars: row.best_stars ?? 0,
          bestAccuracy: row.best_accuracy,
          completed: row.completed ?? false,
          attemptCount: row.attempt_count ?? 0,
          stageType: getStageType(row.stage_number),
          evidenceSource: row.evidence_source ?? null,
        });
      }

      // Compute unlock state for all 100 stages (server-side, authoritative)
      const unlockedStages: number[] = [];
      for (let s = 1; s <= 100; s++) {
        if (isStageUnlocked({
          targetStageNumber: s,
          completedStages,
          legacyCurrentStage, // passed but won't override V3 when completedStages is non-null
        })) {
          unlockedStages.push(s);
        }
      }

      // Calculate V3 global accuracy
      let totalAcc = 0;
      let accCount = 0;
      for (const row of progressRows || []) {
        if (row.best_accuracy != null) {
          totalAcc += row.best_accuracy;
          accCount++;
        }
      }
      const v3Accuracy = accCount > 0 ? Math.round(totalAcc / accCount) : null;

      return NextResponse.json({
        authority: 'V3',
        completedStages: stageDetails,
        unlockedStages,
        currentStage: legacyCurrentStage, // compatibility pointer only
        campaignCompleted,
        globalAccuracy: v3Accuracy,
      });
    }

    // ── LEGACY FALLBACK MODE (V3 table absent) ──────────────────────────────
    console.warn(
      '[/api/student/progression] student_stage_progress table not found — ' +
      'using legacy current_stage. Apply MIGRATION_GAME_PROGRESSION_V3.sql to enable V3 authority.'
    );

    // In legacy mode, we still need to provide accurate stats to the Dashboard
    // to prevent insecure client-side DB queries.
    const [{ data: stageResultRows }, { data: attemptRows }] = await Promise.all([
      supabaseAdmin
        .from('stage_results')
        .select('stage_number, accuracy, stars, passed')
        .eq('user_id', session.subjectId),
      supabaseAdmin
        .from('attempts')
        .select('score, total_questions, is_passed, stages(stage_number)')
        .eq('student_id', session.subjectId),
    ]);

    const starsByStage: Record<number, number> = {};
    const accByStage: Record<number, number> = {};
    let totalAcc = 0;
    let accCount = 0;

    for (const row of stageResultRows || []) {
      const stageNumber = Number(row.stage_number || 0);
      if (!stageNumber) continue;
      const derivedStars = Number(row.stars || 0) || (row.passed ? 1 : 0);
      starsByStage[stageNumber] = Math.max(starsByStage[stageNumber] || 0, derivedStars);
      if (row.accuracy != null) {
        accByStage[stageNumber] = Math.max(accByStage[stageNumber] || 0, row.accuracy);
        totalAcc += row.accuracy;
        accCount++;
      }
    }

    for (const row of attemptRows || []) {
      const stageRelation = Array.isArray(row.stages) ? row.stages[0] : row.stages;
      const stageNumber = Number(stageRelation?.stage_number || 0);
      const totalQuestions = Number(row.total_questions || 0);
      if (!stageNumber || totalQuestions <= 0) continue;
      
      const accuracy = (Number(row.score || 0) / totalQuestions) * 100;
      totalAcc += accuracy;
      accCount++;
      
      if (!row.is_passed) continue;
      if (starsByStage[stageNumber] === undefined) {
        const derivedStars = accuracy >= 90 ? 3 : accuracy >= 75 ? 2 : 1;
        starsByStage[stageNumber] = derivedStars;
        accByStage[stageNumber] = accuracy;
      }
    }

    const legacyUnlocked: number[] = [];
    const legacyCompleted: Array<{
      stageNumber: number;
      bestStars: number;
      bestAccuracy: number | null;
      completed: boolean;
      attemptCount: number;
      stageType: string;
      evidenceSource: string | null;
    }> = [];

    for (let s = 1; s <= 100; s++) {
      if (s <= legacyCurrentStage) {
        legacyUnlocked.push(s);
      }
      if (s < legacyCurrentStage || starsByStage[s] !== undefined) {
        legacyCompleted.push({
          stageNumber: s,
          bestStars: starsByStage[s] || 0,
          bestAccuracy: accByStage[s] ?? null,
          completed: true,
          attemptCount: 1, // mocked in legacy
          stageType: getStageType(s),
          evidenceSource: 'LEGACY_FALLBACK',
        });
      }
    }

    const averageAccuracy = accCount > 0 ? Math.round(totalAcc / accCount) : null;

    return NextResponse.json({
      authority: 'LEGACY',
      completedStages: legacyCompleted,
      unlockedStages: legacyUnlocked,
      currentStage: legacyCurrentStage,
      campaignCompleted,
      globalAccuracy: averageAccuracy,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Progression API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
