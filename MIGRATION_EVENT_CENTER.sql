-- MIGRATION_EVENT_CENTER.sql
-- Run this in Supabase SQL Editor to create tables and RLS for the Event Center.

-- 1. events
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  event_type text NOT NULL,
  theme text,
  banner_url text,
  icon text,
  start_at timestamptz,
  end_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'upcoming', 'ended')),
  reward_config jsonb DEFAULT '{}'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. event_verbs
CREATE TABLE IF NOT EXISTS public.event_verbs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  order_no int,
  base_form text NOT NULL,
  past_simple text NOT NULL,
  past_participle text NOT NULL,
  meaning_th text NOT NULL,
  pronunciation_base text,
  pronunciation_past text,
  pronunciation_participle text,
  difficulty_rank int DEFAULT 1,
  category text DEFAULT 'irregular_verbs',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, order_no),
  UNIQUE(event_id, base_form)
);

-- 3. event_attempts
CREATE TABLE IF NOT EXISTS public.event_attempts (
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

-- 4. event_attempt_items
CREATE TABLE IF NOT EXISTS public.event_attempt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid REFERENCES public.event_attempts(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  verb_id uuid REFERENCES public.event_verbs(id) ON DELETE CASCADE,
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

-- 5. event_verb_mastery
CREATE TABLE IF NOT EXISTS public.event_verb_mastery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  verb_id uuid REFERENCES public.event_verbs(id) ON DELETE CASCADE,
  v2_correct_count int DEFAULT 0,
  v3_correct_count int DEFAULT 0,
  sentence_correct_count int DEFAULT 0,
  wrong_count int DEFAULT 0,
  mastery_level int DEFAULT 0,
  last_practiced_at timestamptz,
  next_review_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id, verb_id)
);

-- 6. event_rewards
CREATE TABLE IF NOT EXISTS public.event_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  reward_type text NOT NULL,
  reward_name text NOT NULL,
  reward_value jsonb DEFAULT '{}'::jsonb,
  earned_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- SECTION 3: INDEXES
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_event_verbs_event_active ON public.event_verbs(event_id, is_active);
CREATE INDEX IF NOT EXISTS idx_event_attempts_user_event ON public.event_attempts(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_event_attempts_event_classroom ON public.event_attempts(event_id, classroom_id);
CREATE INDEX IF NOT EXISTS idx_event_attempt_items_event_user ON public.event_attempt_items(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_event_attempt_items_verb ON public.event_attempt_items(verb_id);
CREATE INDEX IF NOT EXISTS idx_event_verb_mastery_user_event ON public.event_verb_mastery(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_event_verb_mastery_next_review ON public.event_verb_mastery(next_review_at);
CREATE INDEX IF NOT EXISTS idx_event_rewards_user_event ON public.event_rewards(user_id, event_id);


-- SECTION 4: RLS AND SECURITY
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_verbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attempt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_verb_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rewards ENABLE ROW LEVEL SECURITY;

-- 1. All authenticated users can read active events and event_verbs
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;
CREATE POLICY "Anyone can view events" ON public.events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view active event verbs" ON public.event_verbs;
CREATE POLICY "Anyone can view active event verbs" ON public.event_verbs FOR SELECT USING (true);

-- 1.1 Teachers can manage events
DROP POLICY IF EXISTS "Teachers can manage events" ON public.events;
CREATE POLICY "Teachers can manage events" ON public.events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.teachers WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Teachers can manage event verbs" ON public.event_verbs;
CREATE POLICY "Teachers can manage event verbs" ON public.event_verbs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.teachers WHERE id = auth.uid())
);

-- 2. Students can view their own data
DROP POLICY IF EXISTS "Students view own attempts" ON public.event_attempts;
CREATE POLICY "Students view own attempts" ON public.event_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.students WHERE id = user_id)
);

DROP POLICY IF EXISTS "Students view own attempt items" ON public.event_attempt_items;
CREATE POLICY "Students view own attempt items" ON public.event_attempt_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.students WHERE id = user_id)
);

DROP POLICY IF EXISTS "Students view own mastery" ON public.event_verb_mastery;
CREATE POLICY "Students view own mastery" ON public.event_verb_mastery FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.students WHERE id = user_id)
);

DROP POLICY IF EXISTS "Students view own rewards" ON public.event_rewards;
CREATE POLICY "Students view own rewards" ON public.event_rewards FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.students WHERE id = user_id)
);

-- This internal-school app uses its own students table instead of Supabase Auth.
DROP POLICY IF EXISTS "Internal app creates attempts" ON public.event_attempts;
CREATE POLICY "Internal app creates attempts" ON public.event_attempts FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.students WHERE id = user_id)
  AND EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND status = 'active')
);

DROP POLICY IF EXISTS "Internal app updates attempts" ON public.event_attempts;
CREATE POLICY "Internal app updates attempts" ON public.event_attempts FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.students WHERE id = user_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.students WHERE id = user_id));

DROP POLICY IF EXISTS "Internal app writes attempt items" ON public.event_attempt_items;
CREATE POLICY "Internal app writes attempt items" ON public.event_attempt_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.event_attempts a
    WHERE a.id = attempt_id AND a.user_id = user_id AND a.event_id = event_id
  )
);

DROP POLICY IF EXISTS "Internal app creates mastery" ON public.event_verb_mastery;
CREATE POLICY "Internal app creates mastery" ON public.event_verb_mastery FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.students WHERE id = user_id));

DROP POLICY IF EXISTS "Internal app updates mastery" ON public.event_verb_mastery;
CREATE POLICY "Internal app updates mastery" ON public.event_verb_mastery FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.students WHERE id = user_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.students WHERE id = user_id));

DROP POLICY IF EXISTS "Internal admin manages events" ON public.events;
CREATE POLICY "Internal admin manages events" ON public.events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Internal admin manages event verbs" ON public.event_verbs;
CREATE POLICY "Internal admin manages event verbs" ON public.event_verbs FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.event_attempts TO anon, authenticated;
GRANT SELECT, INSERT ON public.event_attempt_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.event_verb_mastery TO anon, authenticated;
GRANT SELECT ON public.event_rewards TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.events TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.event_verbs TO anon, authenticated;
