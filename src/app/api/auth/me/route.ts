import { loadAssessmentProgress } from '@/lib/server/assessmentProgress';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/server/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let progress: any = null;
    if (session.subjectType === 'STUDENT') {
      progress = (await loadAssessmentProgress(session.subjectId, session.user.userType === 'EXTERNAL')).progress;
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
