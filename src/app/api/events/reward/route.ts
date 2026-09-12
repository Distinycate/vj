import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';

const eventRewardSchema = z.object({
  source: z.string().min(1).max(50),
  referenceId: z.string().min(1).max(100),
  coinsDelta: z.number().int().min(0).max(1000).default(0),
  expDelta: z.number().int().min(0).max(10000).default(0),
  ticketsDelta: z.number().int().min(0).max(10).default(0),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT']);

    const body = await request.json().catch(() => null);
    const parsed = eventRewardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid event reward payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { source, referenceId, coinsDelta, expDelta, ticketsDelta, metadata } = parsed.data;

    // Call atomic grant_student_reward RPC
    const { data, error } = await supabaseAdmin.rpc('grant_student_reward', {
      p_student_id: session.subjectId,
      p_source: source,
      p_reference_id: referenceId,
      p_coins_delta: coinsDelta,
      p_exp_delta: expDelta,
      p_tickets_delta: ticketsDelta,
      p_metadata: metadata,
    });

    if (error) {
      console.error('grant_student_reward RPC error:', error);
      return NextResponse.json({ error: 'Failed to grant reward' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      coins: data.coins,
      totalExp: data.total_exp,
      freePullTickets: data.free_pull_tickets,
      alreadyGranted: data.already_granted || false,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Event reward route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
