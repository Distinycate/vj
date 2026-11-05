'use server';

import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { requireSession } from '@/lib/server/session';

export async function getAdminClassroomStats(studentIds: string[]) {
  const session = await requireSession();
  if (!['ADMIN', 'TEACHER'].includes(session.role)) {
    throw new Error('Forbidden');
  }

  if (!studentIds.length) {
    return { wrongWords: [], totalStars: 0, totalThefts: 0 };
  }

  const [
    { data: wData },
    { data: urwData },
    { data: sData },
    { data: sspData },
    { data: tData },
  ] = await Promise.all([
    supabaseAdmin.from('wrong_words').select('*, vocabulary(*)').in('student_id', studentIds),
    supabaseAdmin
      .from('user_review_words')
      .select('id, user_id, word_id, wrong_count, last_wrong_at, vocabulary(*)')
      .in('user_id', studentIds)
      .gt('wrong_count', 0),
    supabaseAdmin.from('stage_results').select('id, user_id, stage_number, stars').in('user_id', studentIds),
    supabaseAdmin.from('student_stage_progress').select('student_id, stage_number, best_stars').in('student_id', studentIds),
    supabaseAdmin
      .from('card_transactions')
      .select('id')
      .in('actor_user_id', studentIds)
      .in('action_type', ['random_card_stolen', 'selected_card_stolen']),
  ]);

  // Merge wrong_words (legacy) and user_review_words (V3) by (student_id, word_id)
  const wrongMap = new Map<string, any>();
  for (const row of wData || []) {
    const vocab = Array.isArray(row.vocabulary) ? row.vocabulary[0] : row.vocabulary;
    const key = `${row.student_id}:${row.word_id}`;
    wrongMap.set(key, {
      ...row,
      error_count: Number(row.error_count || 1),
      vocabulary: vocab
        ? {
            ...vocab,
            meaning: vocab.meaning_th || vocab.meaning || '',
            meaning_th: vocab.meaning_th || vocab.meaning || '',
          }
        : null,
    });
  }

  for (const row of urwData || []) {
    const vocab = Array.isArray(row.vocabulary) ? row.vocabulary[0] : row.vocabulary;
    const key = `${row.user_id}:${row.word_id}`;
    const existing = wrongMap.get(key);
    const count = Number(row.wrong_count || 1);
    if (existing) {
      existing.error_count = Math.max(existing.error_count, count);
    } else {
      wrongMap.set(key, {
        id: row.id,
        student_id: row.user_id,
        word_id: row.word_id,
        error_count: count,
        last_attempt_at: row.last_wrong_at,
        vocabulary: vocab
          ? {
              ...vocab,
              meaning: vocab.meaning_th || vocab.meaning || '',
              meaning_th: vocab.meaning_th || vocab.meaning || '',
            }
          : null,
      });
    }
  }

  // Merge stars by (student_id, stage_number) so V3 best_stars and legacy stage_results stars are combined accurately
  const starMap = new Map<string, number>();
  for (const row of sData || []) {
    const key = `${row.user_id}:${row.stage_number || row.id}`;
    starMap.set(key, Math.max(starMap.get(key) || 0, Number(row.stars || 0)));
  }
  for (const row of sspData || []) {
    const key = `${row.student_id}:${row.stage_number}`;
    starMap.set(key, Math.max(starMap.get(key) || 0, Number(row.best_stars || 0)));
  }
  let totalStars = 0;
  for (const stars of starMap.values()) {
    totalStars += stars;
  }

  return {
    wrongWords: Array.from(wrongMap.values()),
    totalStars,
    totalThefts: (tData || []).length,
  };
}

export async function getAdminStudentAttempts(studentId: string) {
  const session = await requireSession();
  if (!['ADMIN', 'TEACHER', 'CARD_TEACHER'].includes(session.role)) {
    throw new Error('Forbidden');
  }

  const [{ data: legacyAttempts }, { data: v3Attempts }] = await Promise.all([
    supabaseAdmin
      .from('attempts')
      .select('id, score, total_questions, time_spent_sec, error_count, is_passed, created_at, stages(stage_number, description)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('stage_attempts')
      .select('id, student_id, stage_number, score, accuracy, status, started_at, completed_at, question_ids')
      .eq('student_id', studentId)
      .eq('status', 'COMPLETED')
      .order('completed_at', { ascending: true }),
  ]);

  const mappedV3 = (v3Attempts || []).map((sa: any) => {
    const qIds = Array.isArray(sa.question_ids) ? sa.question_ids : [];
    const totalQ = qIds.length > 0 ? qIds.length : 10;
    const score = Number(sa.score || 0);
    let timeSec = totalQ * 6;
    if (sa.started_at && sa.completed_at) {
      const diff = Math.round((new Date(sa.completed_at).getTime() - new Date(sa.started_at).getTime()) / 1000);
      if (diff > 0 && diff < 3600) timeSec = diff;
    }
    return {
      id: sa.id,
      score,
      total_questions: totalQ,
      time_spent_sec: timeSec,
      error_count: Math.max(0, totalQ - score),
      is_passed: Number(sa.accuracy || 0) >= 60 && score > 0,
      created_at: sa.completed_at || sa.started_at,
      stages: {
        stage_number: sa.stage_number,
        description: `ด่านที่ ${sa.stage_number}`,
      },
    };
  });

  return [...(legacyAttempts || []), ...mappedV3].sort((a: any, b: any) =>
    String(a.created_at || '').localeCompare(String(b.created_at || ''))
  );
}

export async function getAdminClassAttempts(classStudentIds: string[]) {
  const session = await requireSession();
  if (!['ADMIN', 'TEACHER', 'CARD_TEACHER'].includes(session.role)) {
    throw new Error('Forbidden');
  }

  if (!classStudentIds.length) return [];

  const [{ data: legacyAttempts }, { data: v3Attempts }] = await Promise.all([
    supabaseAdmin
      .from('attempts')
      .select('student_id, score, total_questions')
      .in('student_id', classStudentIds),
    supabaseAdmin
      .from('stage_attempts')
      .select('student_id, score, question_ids, status')
      .in('student_id', classStudentIds)
      .eq('status', 'COMPLETED'),
  ]);

  const mappedV3 = (v3Attempts || []).map((sa: any) => {
    const qIds = Array.isArray(sa.question_ids) ? sa.question_ids : [];
    return {
      student_id: sa.student_id,
      score: Number(sa.score || 0),
      total_questions: qIds.length > 0 ? qIds.length : 10,
    };
  });

  return [...(legacyAttempts || []), ...mappedV3];
}

export async function getAdminStudentWrongWords(studentId: string) {
  const session = await requireSession();
  if (!['ADMIN', 'TEACHER', 'CARD_TEACHER'].includes(session.role)) {
    throw new Error('Forbidden');
  }

  const [{ data: wrongWords }, { data: reviewWords }] = await Promise.all([
    supabaseAdmin
      .from('wrong_words')
      .select('id, word_id, error_count, last_attempt_at, vocabulary(word, meaning, meaning_th, part_of_speech)')
      .eq('student_id', studentId)
      .order('error_count', { ascending: false }),
    supabaseAdmin
      .from('user_review_words')
      .select('id, word_id, wrong_count, last_wrong_at, vocabulary(word, meaning, meaning_th, part_of_speech)')
      .eq('user_id', studentId)
      .gt('wrong_count', 0)
      .order('wrong_count', { ascending: false }),
  ]);

  const merged = new Map<string, any>();
  for (const row of wrongWords || []) {
    const vocab = Array.isArray(row.vocabulary) ? row.vocabulary[0] : row.vocabulary;
    const key = String(row.word_id || row.id);
    merged.set(key, {
      id: row.id,
      error_count: Number(row.error_count || 1),
      last_attempt_at: row.last_attempt_at,
      vocabulary: vocab
        ? {
            ...vocab,
            meaning_th: vocab.meaning_th || vocab.meaning || '',
          }
        : null,
    });
  }

  for (const row of reviewWords || []) {
    const vocab = Array.isArray(row.vocabulary) ? row.vocabulary[0] : row.vocabulary;
    const key = String(row.word_id || row.id);
    const existing = merged.get(key);
    const count = Number(row.wrong_count || 1);
    if (existing) {
      existing.error_count = Math.max(existing.error_count, count);
      if (!existing.last_attempt_at && row.last_wrong_at) {
        existing.last_attempt_at = row.last_wrong_at;
      }
    } else {
      merged.set(key, {
        id: row.id,
        error_count: count,
        last_attempt_at: row.last_wrong_at,
        vocabulary: vocab
          ? {
              ...vocab,
              meaning_th: vocab.meaning_th || vocab.meaning || '',
            }
          : null,
      });
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.error_count - a.error_count);
}

export async function getAdminClassWrongWords(classStudentIds: string[]) {
  const session = await requireSession();
  if (!['ADMIN', 'TEACHER', 'CARD_TEACHER'].includes(session.role)) {
    throw new Error('Forbidden');
  }

  if (!classStudentIds.length) return [];

  const [{ data: wrongWords }, { data: reviewWords }] = await Promise.all([
    supabaseAdmin
      .from('wrong_words')
      .select('student_id, word_id, error_count, vocabulary(part_of_speech)')
      .in('student_id', classStudentIds),
    supabaseAdmin
      .from('user_review_words')
      .select('user_id, word_id, wrong_count, vocabulary(part_of_speech)')
      .in('user_id', classStudentIds)
      .gt('wrong_count', 0),
  ]);

  const merged = new Map<string, any>();
  for (const row of wrongWords || []) {
    const key = `${row.student_id}:${row.word_id}`;
    merged.set(key, {
      student_id: row.student_id,
      error_count: Number(row.error_count || 1),
      vocabulary: row.vocabulary,
    });
  }
  for (const row of reviewWords || []) {
    const key = `${row.user_id}:${row.word_id}`;
    const existing = merged.get(key);
    const count = Number(row.wrong_count || 1);
    if (existing) {
      existing.error_count = Math.max(existing.error_count, count);
    } else {
      merged.set(key, {
        student_id: row.user_id,
        error_count: count,
        vocabulary: row.vocabulary,
      });
    }
  }

  return Array.from(merged.values());
}

export async function getAdminStudentTests(studentId: string) {
  const session = await requireSession();
  if (!['ADMIN', 'TEACHER', 'CARD_TEACHER'].includes(session.role)) {
    throw new Error('Forbidden');
  }

  const [{ data: preTests }, { data: postTests }] = await Promise.all([
    supabaseAdmin.from('pre_tests').select('id').eq('student_id', studentId),
    supabaseAdmin.from('post_tests').select('id').eq('student_id', studentId),
  ]);

  return {
    pre: preTests?.length || 0,
    post: postTests?.length || 0,
  };
}

export async function getAdminInitialData(teacherId: string, role: string) {
  const session = await requireSession();
  if (!['ADMIN', 'TEACHER'].includes(session.role)) {
    throw new Error('Forbidden');
  }

  let classQuery = supabaseAdmin.from('classrooms').select('*').order('class_name', { ascending: true });
  if (role === 'TEACHER') {
    classQuery = classQuery.eq('teacher_id', teacherId);
  }
  let { data: classData } = await classQuery;

  // Fallback for prototype
  if (role === 'TEACHER' && (!classData || classData.length === 0)) {
    const { data: allClassData } = await supabaseAdmin
      .from('classrooms')
      .select('*')
      .order('class_name', { ascending: true });
    classData = allClassData;
  }

  const validClasses = (classData || []).filter(
    (c) =>
      (c.class_name.includes('ม.1') || c.class_name.includes('ม.2') || c.class_name.includes('ม.3')) &&
      !c.class_name.includes('ทดลอง')
  );

  return {
    validClasses,
    vocabList: [],
    itemAnalysis: [],
  };
}

export async function getAdminAnalyticsDatasets() {
  const session = await requireSession();
  if (!['ADMIN', 'TEACHER', 'CARD_TEACHER', 'EXECUTIVE'].includes(session.role)) {
    throw new Error('Forbidden');
  }

  const [vocabRes, itemRes] = await Promise.all([
    supabaseAdmin.from('vocabulary').select('*'),
    supabaseAdmin.from('item_analysis').select('*'),
  ]);

  if (vocabRes.error) throw vocabRes.error;
  if (itemRes.error) throw itemRes.error;

  return {
    vocabList: vocabRes.data || [],
    itemAnalysis: itemRes.data || [],
  };
}
