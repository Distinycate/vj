'use server';

import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { requireSession } from '@/lib/server/session';

export async function getAdminClassroomStats(studentIds: string[]) {
  const session = await requireSession();
  if (!['ADMIN', 'TEACHER'].includes(session.role)) {
    throw new Error('Forbidden');
  }

  const { data: wData } = await supabaseAdmin.from('wrong_words').select('*, vocabulary(*)').in('student_id', studentIds);
  const { data: sData } = await supabaseAdmin.from('stage_results').select('stars').in('user_id', studentIds);
  const { data: tData } = await supabaseAdmin.from('card_transactions').select('id').in('actor_user_id', studentIds).in('action_type', ['random_card_stolen', 'selected_card_stolen']);

  return {
    wrongWords: wData || [],
    totalStars: (sData || []).reduce((acc, curr) => acc + (curr.stars || 0), 0),
    totalThefts: (tData || []).length
  };
}

export async function getAdminStudentAttempts(studentId: string) {
  const session = await requireSession();
  if (!['ADMIN', 'TEACHER', 'CARD_TEACHER'].includes(session.role)) {
    throw new Error('Forbidden');
  }

  const { data: attempts } = await supabaseAdmin
    .from('attempts')
    .select('id, score, total_questions, time_spent_sec, error_count, is_passed, created_at, stages(stage_number, description)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: true });

  return attempts || [];
}

export async function getAdminClassAttempts(classStudentIds: string[]) {
  const session = await requireSession();
  if (!['ADMIN', 'TEACHER', 'CARD_TEACHER'].includes(session.role)) {
    throw new Error('Forbidden');
  }
  
  if (!classStudentIds.length) return [];

  const { data: attempts } = await supabaseAdmin
    .from('attempts')
    .select('student_id, score, total_questions')
    .in('student_id', classStudentIds);

  return attempts || [];
}

export async function getAdminStudentWrongWords(studentId: string) {
  const session = await requireSession();
  if (!['ADMIN', 'TEACHER', 'CARD_TEACHER'].includes(session.role)) {
    throw new Error('Forbidden');
  }

  const { data: wrongWords } = await supabaseAdmin
    .from('wrong_words')
    .select('id, error_count, last_attempt_at, vocabulary(word, meaning_th, part_of_speech)')
    .eq('student_id', studentId)
    .order('error_count', { ascending: false });

  return wrongWords || [];
}

export async function getAdminClassWrongWords(classStudentIds: string[]) {
  const session = await requireSession();
  if (!['ADMIN', 'TEACHER', 'CARD_TEACHER'].includes(session.role)) {
    throw new Error('Forbidden');
  }
  
  if (!classStudentIds.length) return [];

  const { data: wrongWords } = await supabaseAdmin
    .from('wrong_words')
    .select('student_id, error_count, vocabulary(part_of_speech)')
    .in('student_id', classStudentIds);

  return wrongWords || [];
}

export async function getAdminStudentTests(studentId: string) {
  const session = await requireSession();
  if (!['ADMIN', 'TEACHER', 'CARD_TEACHER'].includes(session.role)) {
    throw new Error('Forbidden');
  }

  const { data: preTests } = await supabaseAdmin.from('pre_tests').select('id').eq('student_id', studentId);
  const { data: postTests } = await supabaseAdmin.from('post_tests').select('id').eq('student_id', studentId);

  return {
    pre: preTests?.length || 0,
    post: postTests?.length || 0
  };
}

export async function getAdminInitialData(teacherId: string, role: string) {
  const session = await requireSession();
  if (!['ADMIN', 'TEACHER'].includes(session.role)) {
    throw new Error('Forbidden');
  }
  
  let classQuery = supabaseAdmin.from('classrooms').select('*');
  if (role === 'TEACHER') {
    classQuery = classQuery.eq('teacher_id', teacherId);
  }
  let { data: classData } = await classQuery;
  
  // Fallback for prototype
  if (role === 'TEACHER' && (!classData || classData.length === 0)) {
    const { data: allClassData } = await supabaseAdmin.from('classrooms').select('*');
    classData = allClassData;
  }
  
  const validClasses = (classData || []).filter(c => c.class_name.includes('ม.1') || c.class_name.includes('ม.2') || c.class_name.includes('ม.3'));
  
  return {
    validClasses,
    vocabList: [],
    itemAnalysis: []
  };
}

export async function getAdminAnalyticsDatasets() {
  const session = await requireSession();
  if (!['ADMIN', 'TEACHER', 'CARD_TEACHER', 'EXECUTIVE'].includes(session.role)) {
    throw new Error('Forbidden');
  }

  const [vocabRes, itemRes] = await Promise.all([
    supabaseAdmin.from('vocabulary').select('*'),
    supabaseAdmin.from('item_analysis').select('*')
  ]);

  if (vocabRes.error) throw vocabRes.error;
  if (itemRes.error) throw itemRes.error;

  return {
    vocabList: vocabRes.data || [],
    itemAnalysis: itemRes.data || []
  };
}
