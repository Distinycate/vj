import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';

export async function GET(request: Request) {
  try {
    await requireRole(['ADMIN']);
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroomId');
    const userType = searchParams.get('userType');

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

    const { data, error } = await query;
    if (error) throw error;

    // Sanitize credentials before returning
    const sanitized = (data || []).map((s: any) => {
      const { password, ...rest } = s;
      return rest;
    });

    return NextResponse.json({ success: true, students: sanitized });
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
    await requireRole(['TEACHER', 'ADMIN']);

    const body = await request.json().catch(() => null);
    if (!body || !body.studentId) {
      return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
    }

    const { studentId, ...updates } = body;
    // Disallow password updates or role escalations through this endpoint
    delete updates.password;
    delete updates.role;

    const { data, error } = await supabaseAdmin
      .from('students')
      .update(updates)
      .eq('id', studentId)
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
