import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    if (session.subjectType !== 'TEACHER') {
      return NextResponse.json({ error: 'Teacher authorization required' }, { status: 403 });
    }

    const { runId } = await params;

    await supabaseAdmin
      .from('event_participants')
      .update({ teacher_seen: true })
      .eq('event_run_id', runId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('POST mark-seen error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
