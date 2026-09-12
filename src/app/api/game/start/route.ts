import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/server/session';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { assertSameOrigin } from '@/lib/server/security';

const startGameSchema = z.object({
  stageNumber: z.number().int().min(1).max(100),
  missionLevel: z.number().int().min(1).max(3).optional().default(1),
  isBossMode: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireRole(['STUDENT']);

    const body = await request.json().catch(() => null);
    const parsed = startGameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid start game payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { stageNumber, missionLevel, isBossMode } = parsed.data;

    // Check student progress eligibility
    const { data: path } = await supabaseAdmin
      .from('learning_paths')
      .select('current_stage, current_rank')
      .eq('student_id', session.subjectId)
      .maybeSingle();

    const maxAllowedStage = path?.current_stage || 1;
    if (stageNumber > maxAllowedStage) {
      return NextResponse.json(
        { error: 'Stage locked. You must complete previous stages first.' },
        { status: 403 }
      );
    }

    // Fetch active vocabulary for this stage (or fallback to pool)
    let { data: stageWords } = await supabaseAdmin
      .from('vocabulary')
      .select('*')
      .eq('stage_number', stageNumber)
      .eq('is_active', true);

    if (!stageWords || stageWords.length < 4) {
      const { data: fallbackWords } = await supabaseAdmin
        .from('vocabulary')
        .select('*')
        .eq('is_active', true)
        .limit(30);
      stageWords = fallbackWords || [];
    }

    if (!stageWords || stageWords.length === 0) {
      return NextResponse.json(
        { error: 'No vocabulary available for this stage' },
        { status: 404 }
      );
    }

    // Distractor pool
    const { data: allVocab } = await supabaseAdmin
      .from('vocabulary')
      .select('id, word, meaning, meaning_th')
      .eq('is_active', true)
      .limit(100);

    const distractorPool = allVocab || stageWords;

    // Select 5-10 target words
    const targetCount = isBossMode ? 10 : Math.min(stageWords.length, 6);
    const shuffledTargets = [...stageWords].sort(() => Math.random() - 0.5).slice(0, targetCount);

    const authoritativeQuestions: any[] = [];
    const clientQuestions: any[] = [];

    for (const target of shuffledTargets) {
      const meaningText = target.meaning_th || target.meaning || '';
      const distractors = distractorPool
        .filter((d) => d.id !== target.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((d) => ({
          word_id: d.id,
          text: d.meaning_th || d.meaning || '',
        }));

      const allChoices = [
        { word_id: target.id, text: meaningText },
        ...distractors,
      ].sort(() => Math.random() - 0.5);

      // Server stores authoritative answer key
      authoritativeQuestions.push({
        id: target.id,
        word: target.word,
        correct_answer: meaningText,
        correct_word_id: target.id,
        choices: allChoices,
      });

      // Client receives choices WITHOUT is_correct flag
      clientQuestions.push({
        id: target.id,
        word_id: target.id,
        word: target.word,
        part_of_speech: target.part_of_speech,
        correct_answer: meaningText, // Kept for client animations if needed, but not trusted on submit
        qType: 'MEANING_MC',
        choices: allChoices.map((c) => ({
          word_id: c.word_id,
          text: c.text,
        })),
      });
    }

    // Create stage_attempt in database
    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from('stage_attempts')
      .insert({
        student_id: session.subjectId,
        stage_number: stageNumber,
        mission_level: missionLevel,
        status: 'ACTIVE',
        question_ids: authoritativeQuestions,
      })
      .select('id')
      .single();

    if (attemptErr || !attempt) {
      console.error('Failed to create stage attempt:', attemptErr);
      return NextResponse.json({ error: 'Failed to start stage attempt' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      stageNumber,
      missionLevel,
      questions: clientQuestions,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Start game error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
