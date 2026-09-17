import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const studentId = session.subjectId;
    const { searchParams } = new URL(request.url);
    const targetStudentId = searchParams.get('targetStudentId');

    // If querying target student's cards (e.g. for Thief/Ninja steal card modal)
    if (targetStudentId) {
      const { data: targetCards, error: targetErr } = await supabaseAdmin
        .from('card_inventory')
        .select('id, quantity, reserved_quantity, cards!inner(*)')
        .eq('student_id', targetStudentId)
        .gt('quantity', 0);

      if (targetErr) {
        return NextResponse.json({ error: targetErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        cards: targetCards || [],
      });
    }

    // Default: fetch student's own card center data
    const [
      { data: inventory },
      { data: schoolmates },
      { data: logs },
      { data: learningPath },
      { data: studentData },
    ] = await Promise.all([
      supabaseAdmin
        .from('card_inventory')
        .select('id, quantity, reserved_quantity, cards(*)')
        .eq('student_id', studentId)
        .gt('quantity', 0),
      supabaseAdmin
        .from('students')
        .select('id, student_name, classroom_id, classrooms(class_name)')
        .neq('id', studentId)
        .eq('is_active', true)
        .order('student_name'),
      supabaseAdmin
        .from('card_logs')
        .select('*, attacker:attacker_id(student_name), target:target_id(student_name), played_card:played_card_id(*), counter_card:counter_card_id(*)')
        .or(`target_id.eq.${studentId},attacker_id.eq.${studentId}`)
        .order('created_at', { ascending: false })
        .limit(30),
      supabaseAdmin
        .from('learning_paths')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle(),
      supabaseAdmin
        .from('students')
        .select('id, student_name, active_defense_count, active_reflect_count')
        .eq('id', studentId)
        .maybeSingle(),
    ]);

    const incoming = (logs || []).filter(l => l.target_id === studentId);
    const outgoing = (logs || []).filter(l => l.attacker_id === studentId);

    return NextResponse.json({
      success: true,
      inventory: inventory || [],
      schoolmates: schoolmates || [],
      incoming,
      outgoing,
      logs: logs || [],
      learningPath: learningPath || null,
      activeDefenseCount: Number(studentData?.active_defense_count || 0),
      activeReflectCount: Number(studentData?.active_reflect_count || 0),
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Student cards API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
