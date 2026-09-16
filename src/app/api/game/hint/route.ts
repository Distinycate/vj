import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';

/**
 * POST /api/game/hint
 * Phase 3.2F — Atomic Hint Registration
 *
 * Security boundary:
 *   Browser → Next.js API route (session-validated) → supabaseAdmin (service_role) → record_attempt_hint_v3
 *   Browser never calls the DB function directly.
 *   The DB function is the sole persistence authority for hint state.
 *
 * The route validates:
 *   - Same-origin request
 *   - Authenticated STUDENT session
 *   - Valid UUID format for attemptId and questionId
 *
 * The DB function validates:
 *   - Attempt ownership (student_id matches)
 *   - Attempt is ACTIVE (not COMPLETED or EXPIRED)
 *   - questionId is a vocabulary UUID present in the attempt's question_ids
 *   - Idempotency via ON CONFLICT DO NOTHING on (stage_attempt_id, question_id)
 */

const hintSchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT']);

    const body = await request.json().catch(() => null);
    const parsed = hintSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid hint request payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { attemptId, questionId } = parsed.data;

    // Delegate entirely to the atomic DB function (service_role only).
    // The RPC handles: ownership check, ACTIVE state check, question membership,
    // idempotency (ON CONFLICT DO NOTHING), hint count update — all in one transaction.
    const { data, error } = await supabaseAdmin.rpc('record_attempt_hint_v3', {
      p_student_id: session.subjectId,
      p_stage_attempt_id: attemptId,
      p_question_vocabulary_id: questionId,
    });

    if (error) {
      // Map DB exception codes to HTTP responses
      const msg: string = error.message ?? '';

      if (msg.includes('HINT_ATTEMPT_NOT_FOUND')) {
        return NextResponse.json({ error: 'Stage attempt not found' }, { status: 404 });
      }

      if (msg.includes('HINT_ATTEMPT_NOT_ACTIVE')) {
        return NextResponse.json(
          { error: 'Cannot request hint on a completed or expired attempt' },
          { status: 409 }
        );
      }

      if (msg.includes('HINT_QUESTION_NOT_IN_ATTEMPT')) {
        return NextResponse.json(
          { error: 'Question is not part of this stage attempt' },
          { status: 400 }
        );
      }

      console.error('record_attempt_hint_v3 error:', error);
      return NextResponse.json({ error: 'Failed to record hint' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      hintCount: data?.hint_count ?? 0,
      alreadyRegistered: data?.already_registered ?? false,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Hint registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
