import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const requestedStudentId = searchParams.get('studentId');

    let targetStudentId = session.subjectId;

    // BOLA Protection: Students can ONLY query their own profile
    if (session.subjectType === 'STUDENT') {
      targetStudentId = session.subjectId;
    } else {
      // Teachers/Admins can inspect student profiles
      if (requestedStudentId) {
        targetStudentId = requestedStudentId;
      }
    }

    const [
      { data: student, error: studentErr },
      { data: learningPath },
      { data: analyticsSummary },
      { data: wrongWords },
    ] = await Promise.all([
      supabaseAdmin
        .from('students')
        .select('id, student_name, username, classroom_id, user_type, school_name, is_active, classrooms(class_name)')
        .eq('id', targetStudentId)
        .maybeSingle(),
      supabaseAdmin
        .from('learning_paths')
        .select('*')
        .eq('student_id', targetStudentId)
        .maybeSingle(),
      supabaseAdmin
        .from('analytics_summary')
        .select('*')
        .eq('student_id', targetStudentId)
        .maybeSingle(),
      supabaseAdmin
        .from('wrong_words')
        .select('*, vocabulary(*)')
        .eq('student_id', targetStudentId),
    ]);

    if (studentErr || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      student,
      learningPath: learningPath || null,
      analyticsSummary: analyticsSummary || null,
      wrongWords: wrongWords || [],
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Student profile GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    if (session.subjectType !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can update profile attributes' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const { avatarSeed, avatarStyle, currentRank, rankScore } = body || {};

    const updates: Record<string, any> = {};
    if (avatarSeed && typeof avatarSeed === 'string') updates.avatar_seed = avatarSeed.slice(0, 50);
    if (avatarStyle && typeof avatarStyle === 'string') updates.avatar_style = avatarStyle.slice(0, 50);
    if (typeof currentRank === 'number') updates.current_rank = currentRank;
    if (typeof rankScore === 'number') {
      updates.rank_score = rankScore;
      updates.rank_updated_at = new Date().toISOString();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('learning_paths')
      .update(updates)
      .eq('student_id', session.subjectId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, learningPath: data });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Student profile PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

