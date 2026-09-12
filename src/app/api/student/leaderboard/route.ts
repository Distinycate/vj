import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';

export async function GET() {
  try {
    const session = await requireSession();
    
    // Get student's classroom
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('id, classroom_id')
      .eq('id', session.subjectId)
      .maybeSingle();

    if (!student || !student.classroom_id) {
      return NextResponse.json({ success: true, leaderboard: [] });
    }

    const { data: classmates, error } = await supabaseAdmin
      .from('students')
      .select('id, student_name, learning_paths(coins, exp, total_exp, current_stage, avatar_seed, avatar_style)')
      .eq('classroom_id', student.classroom_id)
      .eq('is_active', true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const studentIds = (classmates || []).map((c: any) => c.id);
    const { data: cardStatusData } = await supabaseAdmin
      .from('card_inventory')
      .select('student_id, quantity, cards(rarity, effect_type)')
      .in('student_id', studentIds);

    const cardsByStudent: Record<string, any[]> = {};
    for (const row of cardStatusData || []) {
      if (!cardsByStudent[row.student_id]) cardsByStudent[row.student_id] = [];
      cardsByStudent[row.student_id].push(row);
    }

    const leaderboard = (classmates || []).map((c: any) => ({
      ...c,
      cards: cardsByStudent[c.id] || [],
    }));

    return NextResponse.json({
      success: true,
      leaderboard,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Leaderboard API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
