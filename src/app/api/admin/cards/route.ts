import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';

export async function GET(request: Request) {
  try {
    await requireRole(['TEACHER', 'ADMIN', 'CARD_TEACHER', 'EXECUTIVE']);
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroomId');

    if (!classroomId) {
      return NextResponse.json({ error: 'Missing classroomId' }, { status: 400 });
    }

    const { data: rawStudents, error: studentsErr } = await supabaseAdmin
      .from('students')
      .select('id, student_id, student_name, classroom_id, learning_paths(free_pull_tickets, coins)')
      .eq('classroom_id', classroomId)
      .eq('is_active', true)
      .order('student_name');

    if (studentsErr) {
      return NextResponse.json({ error: studentsErr.message }, { status: 500 });
    }

    const studentIds = (rawStudents || []).map((s: any) => s.id);
    if (studentIds.length === 0) {
      return NextResponse.json({
        success: true,
        students: [],
        inventory: [],
        pulls: [],
        actions: [],
      });
    }

    const [invRes, pullsRes, actionsRes] = await Promise.all([
      supabaseAdmin
        .from('card_inventory')
        .select('id, student_id, card_id, quantity, reserved_quantity, cards(*)')
        .in('student_id', studentIds)
        .gt('quantity', 0),
      supabaseAdmin
        .from('gacha_pulls')
        .select('id, student_id')
        .in('student_id', studentIds),
      supabaseAdmin
        .from('card_admin_actions')
        .select('*, cards(name, image_url, rarity), teachers(name), students(student_name)')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

    return NextResponse.json({
      success: true,
      students: rawStudents || [],
      inventory: invRes.data || [],
      pulls: pullsRes.data || [],
      actions: actionsRes.data || [],
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Admin cards API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
