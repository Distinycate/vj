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
      const [{ data: path }, { data: pretestList, count: pretestCount }, { data: analytics }] = await Promise.all([
        supabaseAdmin
          .from('learning_paths')
          .select('*')
          .eq('student_id', session.subjectId)
          .maybeSingle(),
        supabaseAdmin
          .from('pre_tests')
          .select('created_at', { count: 'exact' })
          .eq('student_id', session.subjectId)
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('analytics_summary')
          .select('pretest_score')
          .eq('student_id', session.subjectId)
          .maybeSingle(),
      ]);

      const isExternal = session.user?.userType === 'EXTERNAL';
      const hasPretests = (pretestCount !== null && pretestCount >= 5) || (analytics?.pretest_score !== null && analytics?.pretest_score !== undefined);
      const pretestDate = isExternal || hasPretests
        ? (pretestList?.[0]?.created_at || new Date().toISOString())
        : null;

      progress = {
        ...(path || {
          current_stage: 1,
          coins: 0,
          exp: 0,
          total_exp: 0,
          current_rank: 1,
          study_streak: 0,
        }),
        pretest_date: pretestDate,
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
