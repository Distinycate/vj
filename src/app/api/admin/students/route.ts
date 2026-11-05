import { NextResponse } from 'next/server';
import { requireInternalTeacherRole, requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';
import { enrichStudentsWithLiveMetrics } from '@/lib/server/adminAnalyticsEnricher';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    await requireInternalTeacherRole(['ADMIN', 'TEACHER', 'CARD_TEACHER', 'EXECUTIVE']);
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroomId');
    const userType = searchParams.get('userType');
    const academicYear = searchParams.get('academicYear');
    const isActiveParam = searchParams.get('isActive');
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const fields = searchParams.get('fields');
    const countOnly = searchParams.get('countOnly') === 'true' || fields === 'roster_count' || fields === 'count';
    const rankOnly = fields === 'rank';

    if (countOnly) {
      let countQuery = supabaseAdmin
        .from('students')
        .select('id, classroom_id');

      if (classroomId) {
        countQuery = countQuery.eq('classroom_id', classroomId);
      }
      if (userType) {
        countQuery = countQuery.eq('user_type', userType);
      } else {
        countQuery = countQuery.eq('user_type', 'INTERNAL');
      }
      if (academicYear && academicYear !== 'all') {
        countQuery = countQuery.eq('academic_year', academicYear);
      }
      if (isActiveParam !== null) {
        countQuery = countQuery.eq('is_active', isActiveParam === 'true');
      } else if (!includeInactive && !academicYear) {
        countQuery = countQuery.eq('is_active', true);
      }

      const { data: countData, error: countError } = await countQuery;
      if (countError) throw countError;

      return NextResponse.json({ success: true, students: countData || [] });
    }

    if (rankOnly) {
      let rankQuery = supabaseAdmin
        .from('students')
        .select('id, student_name, classrooms(class_name), learning_paths(current_rank)')
        .order('student_name', { ascending: true });

      if (classroomId) {
        rankQuery = rankQuery.eq('classroom_id', classroomId);
      }
      if (userType) {
        rankQuery = rankQuery.eq('user_type', userType);
      }
      if (academicYear && academicYear !== 'all') {
        rankQuery = rankQuery.eq('academic_year', academicYear);
      }
      if (isActiveParam !== null) {
        rankQuery = rankQuery.eq('is_active', isActiveParam === 'true');
      } else if (!includeInactive && !academicYear) {
        rankQuery = rankQuery.eq('is_active', true);
      }

      const { data: rankData, error: rankError } = await rankQuery;
      if (rankError) throw rankError;

      return NextResponse.json({ success: true, students: rankData || [] });
    }

    let query = supabaseAdmin
      .from('students')
      .select('*, classrooms(class_name), learning_paths(*), analytics_summary(*)')
      .order('student_name', { ascending: true });

    if (classroomId) {
      query = query.eq('classroom_id', classroomId);
    }
    if (userType) {
      query = query.eq('user_type', userType);
    }
    if (academicYear && academicYear !== 'all') {
      query = query.eq('academic_year', academicYear);
    }
    if (isActiveParam !== null) {
      query = query.eq('is_active', isActiveParam === 'true');
    } else if (!includeInactive && !academicYear) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Sanitize credentials before returning
    const sanitized = (data || []).map((s: any) => {
      const { password, ...rest } = s;
      return rest;
    });

    const enriched = await enrichStudentsWithLiveMetrics(sanitized);

    return NextResponse.json(
      { success: true, students: enriched },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Admin students GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    await requireInternalTeacherRole(['TEACHER', 'ADMIN']);

    const body = await request.json().catch(() => null);
    if (!body || !body.studentId) {
      return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
    }

    const updateFields = body.updates && typeof body.updates === 'object' ? { ...body.updates } : { ...body };
    delete updateFields.studentId;
    delete updateFields.password;
    delete updateFields.role;

    const { data, error } = await supabaseAdmin
      .from('students')
      .update(updateFields)
      .eq('id', body.studentId)
      .select('*')
      .single();

    if (error) throw error;

    const { password, ...sanitized } = data;
    return NextResponse.json({ success: true, student: sanitized });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Admin students PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    await requireRole(['ADMIN']);

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    if (!studentId) {
      return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('students')
      .delete()
      .eq('id', studentId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Admin students DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
