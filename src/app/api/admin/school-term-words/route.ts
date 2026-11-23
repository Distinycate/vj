import { NextResponse } from 'next/server';
import { requireInternalTeacherRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { reportingTerms } from '@/lib/reportingTerms';

export async function GET(request: Request) {
  try {
    await requireInternalTeacherRole(['TEACHER', 'ADMIN', 'EXECUTIVE']);
    const term = new URL(request.url).searchParams.get('term');
    if (term !== '1' && term !== '2') return NextResponse.json({ error: 'กรุณาเลือกภาคเรียน' }, { status: 400 });
    const { start, end } = reportingTerms[term];
    const counts = new Map<string, { word: string; meaning: string; count: number }>();
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabaseAdmin.from('word_attempt_history')
        .select('id, vocabulary(word, meaning_th), students!inner(user_type)')
        .eq('is_correct', false).eq('students.user_type', 'INTERNAL')
        .gte('answered_at', start).lt('answered_at', end).order('id').range(offset, offset + pageSize - 1);
      if (error) throw error;
      for (const row of data || []) {
        const vocabulary = Array.isArray(row.vocabulary) ? row.vocabulary[0] : row.vocabulary;
        const word = vocabulary?.word?.trim();
        if (!word) continue;
        const key = word.toLocaleLowerCase();
        const previous = counts.get(key);
        if (previous) previous.count += 1;
        else counts.set(key, { word, meaning: vocabulary.meaning_th || '', count: 1 });
      }
      if (!data || data.length < pageSize) break;
    }
    return NextResponse.json({ words: [...counts.values()].sort((a, b) => b.count - a.count || a.word.localeCompare(b.word)).slice(0, 10), start, end });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: error.status });
    console.error('School term words:', error);
    return NextResponse.json({ error: 'ไม่สามารถโหลดประวัติคำศัพท์ได้' }, { status: 500 });
  }
}
