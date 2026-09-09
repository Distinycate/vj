-- Fix Missing RLS (Row Level Security) on newer tables
-- This resolves the "Table publicly accessible (rls_disabled_in_public)" warning.

ALTER TABLE public.stage_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_review_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_validation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_weekly_missions ENABLE ROW LEVEL SECURITY;

-- Provide basic policies to allow authenticated and anon users to read/write these tables
-- Since this system uses custom auth without Supabase auth.uid(), we provide open policies
-- or you can adjust these to be more restrictive if needed.

DROP POLICY IF EXISTS "Allow public access for stage_results" ON public.stage_results;
CREATE POLICY "Allow public access for stage_results" ON public.stage_results FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access for rank_history" ON public.rank_history;
CREATE POLICY "Allow public access for rank_history" ON public.rank_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access for user_review_words" ON public.user_review_words;
CREATE POLICY "Allow public access for user_review_words" ON public.user_review_words FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access for question_validation_logs" ON public.question_validation_logs;
CREATE POLICY "Allow public access for question_validation_logs" ON public.question_validation_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access for achievements" ON public.achievements;
CREATE POLICY "Allow public access for achievements" ON public.achievements FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access for student_achievements" ON public.student_achievements;
CREATE POLICY "Allow public access for student_achievements" ON public.student_achievements FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access for badges" ON public.badges;
CREATE POLICY "Allow public access for badges" ON public.badges FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access for student_badges" ON public.student_badges;
CREATE POLICY "Allow public access for student_badges" ON public.student_badges FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access for daily_quests" ON public.daily_quests;
CREATE POLICY "Allow public access for daily_quests" ON public.daily_quests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access for student_daily_quests" ON public.student_daily_quests;
CREATE POLICY "Allow public access for student_daily_quests" ON public.student_daily_quests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access for weekly_missions" ON public.weekly_missions;
CREATE POLICY "Allow public access for weekly_missions" ON public.weekly_missions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access for student_weekly_missions" ON public.student_weekly_missions;
CREATE POLICY "Allow public access for student_weekly_missions" ON public.student_weekly_missions FOR ALL USING (true) WITH CHECK (true);
