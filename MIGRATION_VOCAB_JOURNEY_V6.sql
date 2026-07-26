-- =========================================================
-- MIGRATION V6: Student Messages (Teacher's Note) & Daily Quests Fixes
-- =========================================================

-- 1. Create student_messages table
CREATE TABLE IF NOT EXISTS public.student_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL DEFAULT 'ครู',
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add RLS
ALTER TABLE public.student_messages ENABLE ROW LEVEL SECURITY;

-- Allow students to read their own messages
CREATE POLICY "Students can read their own messages" ON public.student_messages
    FOR SELECT
    USING (auth.uid() = student_id);

-- Allow students to update their own messages (to mark as read)
CREATE POLICY "Students can update their own messages" ON public.student_messages
    FOR UPDATE
    USING (auth.uid() = student_id);

-- 3. Allow teachers to insert messages
CREATE POLICY "Teachers can insert messages" ON public.student_messages
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.teachers WHERE id = auth.uid()
      )
    );

CREATE POLICY "Teachers can read all messages" ON public.student_messages
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.teachers WHERE id = auth.uid()
      )
    );


-- 4. Create Daily Quests
CREATE TABLE IF NOT EXISTS public.daily_quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_value INTEGER NOT NULL,
    reward_coins INTEGER DEFAULT 0,
    reward_tickets INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Ensure is_active exists if the table was already created in the past
ALTER TABLE public.daily_quests ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS public.student_daily_quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    quest_id UUID NOT NULL REFERENCES public.daily_quests(id) ON DELETE CASCADE,
    quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
    progress INTEGER DEFAULT 0,
    is_claimed BOOLEAN DEFAULT false,
    UNIQUE(student_id, quest_id, quest_date)
);

ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_daily_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read active daily quests" ON public.daily_quests FOR SELECT USING (is_active = true);
CREATE POLICY "Students can read own daily quests" ON public.student_daily_quests FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can update own daily quests" ON public.student_daily_quests FOR UPDATE USING (auth.uid() = student_id);
CREATE POLICY "Students can insert own daily quests" ON public.student_daily_quests FOR INSERT WITH CHECK (auth.uid() = student_id);

