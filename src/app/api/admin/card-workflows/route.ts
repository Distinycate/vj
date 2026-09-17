import { NextResponse } from 'next/server';
import { requireInternalTeacherRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';

export async function GET(request: Request) {
  try {
    await requireInternalTeacherRole(['TEACHER', 'ADMIN', 'CARD_TEACHER', 'EXECUTIVE']);
    
    const { data, error } = await supabaseAdmin
      .from('card_logs')
      .select('*, attacker:attacker_id(student_name, classroom_id, classrooms(class_name)), target:target_id(student_name, classroom_id, classrooms(class_name)), played_card:played_card_id(*)')
      .or('status.eq.PENDING,and(status.eq.RESOLVED,teacher_executed.eq.false)')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, logs: data || [] });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
