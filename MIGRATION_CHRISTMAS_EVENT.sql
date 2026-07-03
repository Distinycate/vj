-- MIGRATION_CHRISTMAS_EVENT.sql
-- Run this in Supabase SQL Editor to create tables and RLS for Vocabulary-based Events (like Christmas Word Hunt).

-- 1. event_vocabulary
CREATE TABLE IF NOT EXISTS public.event_vocabulary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  order_no int,
  word text NOT NULL,
  meaning_th text NOT NULL,
  pronunciation text,
  part_of_speech text,
  category text,
  difficulty_rank int DEFAULT 1,
  example_sentence text,
  example_meaning_th text,
  image_url text,
  audio_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, order_no),
  UNIQUE(event_id, word)
);

-- 2. event_vocab_attempts
CREATE TABLE IF NOT EXISTS public.event_vocab_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  total_questions int DEFAULT 0,
  correct_count int DEFAULT 0,
  wrong_count int DEFAULT 0,
  accuracy numeric DEFAULT 0,
  score int DEFAULT 0,
  coins_earned int DEFAULT 0,
  exp_earned int DEFAULT 0,
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. event_vocab_attempt_items
CREATE TABLE IF NOT EXISTS public.event_vocab_attempt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid REFERENCES public.event_vocab_attempts(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  vocabulary_id uuid REFERENCES public.event_vocabulary(id) ON DELETE CASCADE,
  question_type text NOT NULL,
  prompt text NOT NULL,
  expected_answer text NOT NULL,
  student_answer text,
  is_correct boolean DEFAULT false,
  error_type text,
  attempt_no int DEFAULT 1,
  time_spent_seconds int,
  hint_used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 4. event_vocab_mastery
CREATE TABLE IF NOT EXISTS public.event_vocab_mastery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  vocabulary_id uuid REFERENCES public.event_vocabulary(id) ON DELETE CASCADE,
  meaning_correct_count int DEFAULT 0,
  listening_correct_count int DEFAULT 0,
  spelling_correct_count int DEFAULT 0,
  context_correct_count int DEFAULT 0,
  wrong_count int DEFAULT 0,
  mastery_level int DEFAULT 0,
  last_practiced_at timestamptz,
  next_review_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id, vocabulary_id)
);

-- SECTION 3: INDEXES
CREATE INDEX IF NOT EXISTS idx_event_vocabulary_event_active ON public.event_vocabulary(event_id, is_active);
CREATE INDEX IF NOT EXISTS idx_event_vocab_attempts_user_event ON public.event_vocab_attempts(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_event_vocab_attempt_items_event_user ON public.event_vocab_attempt_items(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_event_vocab_mastery_user_event ON public.event_vocab_mastery(user_id, event_id);

-- SECTION 4: RLS AND SECURITY
ALTER TABLE public.event_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_vocab_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_vocab_attempt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_vocab_mastery ENABLE ROW LEVEL SECURITY;

-- 1. All authenticated users can read active event vocabulary
DROP POLICY IF EXISTS "Anyone can view active event vocabulary" ON public.event_vocabulary;
CREATE POLICY "Anyone can view active event vocabulary" ON public.event_vocabulary FOR SELECT USING (true);

-- 1.1 Teachers can manage event vocabulary
DROP POLICY IF EXISTS "Teachers can manage event vocabulary" ON public.event_vocabulary;
CREATE POLICY "Teachers can manage event vocabulary" ON public.event_vocabulary FOR ALL USING (
  EXISTS (SELECT 1 FROM public.teachers WHERE id = auth.uid())
);

-- 2. Students can view their own data
DROP POLICY IF EXISTS "Students view own vocab attempts" ON public.event_vocab_attempts;
CREATE POLICY "Students view own vocab attempts" ON public.event_vocab_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.students WHERE id = user_id)
);

DROP POLICY IF EXISTS "Students view own vocab attempt items" ON public.event_vocab_attempt_items;
CREATE POLICY "Students view own vocab attempt items" ON public.event_vocab_attempt_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.students WHERE id = user_id)
);

DROP POLICY IF EXISTS "Students view own vocab mastery" ON public.event_vocab_mastery;
CREATE POLICY "Students view own vocab mastery" ON public.event_vocab_mastery FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.students WHERE id = user_id)
);

-- Internal app policies
DROP POLICY IF EXISTS "Internal app creates vocab attempts" ON public.event_vocab_attempts;
CREATE POLICY "Internal app creates vocab attempts" ON public.event_vocab_attempts FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.students WHERE id = user_id)
  AND EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND status = 'active')
);

DROP POLICY IF EXISTS "Internal app updates vocab attempts" ON public.event_vocab_attempts;
CREATE POLICY "Internal app updates vocab attempts" ON public.event_vocab_attempts FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.students WHERE id = user_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.students WHERE id = user_id));

DROP POLICY IF EXISTS "Internal app writes vocab attempt items" ON public.event_vocab_attempt_items;
CREATE POLICY "Internal app writes vocab attempt items" ON public.event_vocab_attempt_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.event_vocab_attempts a
    WHERE a.id = attempt_id AND a.user_id = user_id AND a.event_id = event_id
  )
);

DROP POLICY IF EXISTS "Internal app creates vocab mastery" ON public.event_vocab_mastery;
CREATE POLICY "Internal app creates vocab mastery" ON public.event_vocab_mastery FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.students WHERE id = user_id));

DROP POLICY IF EXISTS "Internal app updates vocab mastery" ON public.event_vocab_mastery;
CREATE POLICY "Internal app updates vocab mastery" ON public.event_vocab_mastery FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.students WHERE id = user_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.students WHERE id = user_id));

GRANT SELECT, INSERT, UPDATE ON public.event_vocab_attempts TO anon, authenticated;
GRANT SELECT, INSERT ON public.event_vocab_attempt_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.event_vocab_mastery TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.event_vocabulary TO anon, authenticated;
