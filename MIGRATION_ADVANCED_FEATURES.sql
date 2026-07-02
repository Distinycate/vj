-- 1. Add Contextual Puzzles support to vocabulary
ALTER TABLE public.vocabulary 
ADD COLUMN IF NOT EXISTS context_sentence TEXT,
ADD COLUMN IF NOT EXISTS blank_answer TEXT;

-- Example seed for context_sentence (Only if you want to test, otherwise leave empty)
-- UPDATE public.vocabulary SET context_sentence = 'The huge ___ stomped through the jungle.', blank_answer = 'elephant' WHERE word = 'elephant';

-- 2. Create student_buffs table for the Lore Book feature
CREATE TABLE IF NOT EXISTS public.student_buffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    buff_type VARCHAR(50) NOT NULL, -- e.g. 'PASSIVE_EXP_BOOST'
    multiplier NUMERIC DEFAULT 1.05, -- e.g. 1.05 for 5% boost
    duration_hours INTEGER DEFAULT 24,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and add policies for student_buffs
ALTER TABLE public.student_buffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read to student_buffs" ON public.student_buffs;
CREATE POLICY "Allow public read to student_buffs" 
    ON public.student_buffs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to student_buffs" ON public.student_buffs;
CREATE POLICY "Allow public insert to student_buffs" 
    ON public.student_buffs FOR INSERT WITH CHECK (true);
