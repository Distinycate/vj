import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let progress: any = null;
    if (session.subjectType === 'STUDENT') {
      const { data: path } = await supabaseAdmin
        .from('learning_paths')
        .select('*')
        .eq('student_id', session.subjectId)
        .maybeSingle();

      progress = path || {
        current_stage: 1,
        coins: 0,
        exp: 0,
        total_exp: 0,
        current_rank: 1,
        study_streak: 0,
      };
    }

    const cookieStore = await cookies();
    const mustChange = cookieStore.get('vj_must_change_password')?.value === 'true';

    return NextResponse.json({
      authenticated: true,
      requires_password_change: mustChange,
      role: session.role,
      user: session.user,
      progress,
    });
  } catch (error) {
    console.error('Session rehydration error:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
