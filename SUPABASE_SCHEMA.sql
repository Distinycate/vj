-- SUPABASE SCHEMA FOR VOCAB JOURNEY V5 (FULL MIGRATION) --

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Clean slate (Drop existing tables)
drop table if exists public.bug_reports cascade;
drop table if exists public.student_inventory cascade;
drop table if exists public.shop_items cascade;
drop table if exists public.daily_quests cascade;
drop table if exists public.onet_blueprint cascade;
drop table if exists public.badges cascade;
drop table if exists public.word_mastery cascade;
drop table if exists public.assessment_responses cascade;
drop table if exists public.assessment_results cascade;
drop table if exists public.assessment_items cascade;
drop table if exists public.study_logs cascade;
drop table if exists public.learning_logs cascade;
drop table if exists public.stage_progress cascade;
drop table if exists public.progress_summary cascade;
drop table if exists public.vocabulary cascade;
drop table if exists public.teachers cascade;
drop table if exists public.students cascade;

-- 1. Student_Profiles Table
create table public.students (
    id uuid default uuid_generate_v4() primary key,
    student_id text unique not null,
    username text unique not null,
    password_hash text not null,
    student_name text not null,
    grade text,
    room text,
    academic_year text,
    is_active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Teachers Table
create table public.teachers (
    id uuid default uuid_generate_v4() primary key,
    username text unique not null,
    password_hash text not null,
    name text not null,
    is_active boolean default true,
    last_login timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Vocabulary Table
create table public.vocabulary (
    id uuid default uuid_generate_v4() primary key,
    word_id text unique not null,
    grade_level text,
    stage integer,
    rank integer default 1,
    word text not null,
    phonetic text,
    meaning text,
    example text,
    category text,
    thai_pronunciation text,
    part_of_speech text,
    image_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Progress_Summary Table
create table public.progress_summary (
    student_id uuid references public.students(id) on delete cascade primary key,
    pretest_score integer default 0,
    posttest_score integer default 0,
    current_rank integer default 1,
    current_stage integer default 1,
    total_words_mastered integer default 0,
    streak_days integer default 0,
    high_score_streak integer default 0,
    coins integer default 0,
    last_active_date timestamp with time zone,
    pretest_date timestamp with time zone,
    posttest_date timestamp with time zone
);

-- 5. Stage_Progress Table
create table public.stage_progress (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    grade_level text,
    stage integer,
    attempts integer default 0,
    best_score integer default 0,
    consecutive_passes integer default 0,
    is_unlocked boolean default false,
    is_passed boolean default false,
    is_boss boolean default false,
    last_played timestamp with time zone
);

-- 6. Learning_Logs Table
create table public.learning_logs (
    id uuid default uuid_generate_v4() primary key,
    session_id text,
    student_id uuid references public.students(id) on delete cascade,
    word_id text,
    timestamp timestamp with time zone default timezone('utc'::text, now()),
    attempt_number integer,
    is_correct boolean,
    is_final boolean,
    current_rank integer,
    question_type text,
    student_answer text,
    correct_answer text,
    time_spent_sec integer
);

-- 7. Study_Logs Table
create table public.study_logs (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    grade_level text,
    stage integer,
    word_ids text[],
    timestamp timestamp with time zone default timezone('utc'::text, now()),
    duration_sec integer
);

-- 8. Assessment_Items Table
create table public.assessment_items (
    id uuid default uuid_generate_v4() primary key,
    question_id text unique not null,
    test_type text, -- PRE_TEST, POST_TEST, BOSS
    grade_level text,
    stage integer,
    word_id text,
    question_type text,
    prompt text,
    choice_a text,
    choice_b text,
    choice_c text,
    choice_d text,
    correct_choice text,
    correct_answer text,
    indicator text,
    indicator_code text,
    onet_skill text,
    difficulty integer,
    points integer default 1,
    is_active boolean default true
);

-- 9. Assessment_Results Table
create table public.assessment_results (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    test_type text,
    timestamp timestamp with time zone default timezone('utc'::text, now()),
    score integer,
    total_items integer,
    percentage numeric,
    rank_after integer,
    time_spent_sec integer
);

-- 10. Assessment_Responses Table
create table public.assessment_responses (
    id uuid default uuid_generate_v4() primary key,
    result_id uuid references public.assessment_results(id) on delete cascade,
    student_id uuid references public.students(id) on delete cascade,
    question_id text,
    word_id text,
    question_type text,
    student_answer text,
    correct_answer text,
    is_correct boolean,
    time_spent_sec integer,
    timestamp timestamp with time zone default timezone('utc'::text, now())
);

-- 11. Word_Mastery Table
create table public.word_mastery (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    word_id text,
    grade_level text,
    stage integer,
    correct_count integer default 0,
    wrong_count integer default 0,
    first_try_correct_count integer default 0,
    last_attempt_date timestamp with time zone,
    next_review_date timestamp with time zone,
    mastery_status text
);

-- 12. Badges Table
create table public.badges (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    badge_name text,
    badge_type text,
    description text,
    earned_at timestamp with time zone default timezone('utc'::text, now())
);

-- 13. ONet_Blueprint Table
create table public.onet_blueprint (
    indicator_code text primary key,
    indicator_name text,
    onet_skill text,
    question_type text,
    weight_note text,
    source text
);

-- 14. Daily_Quests Table
create table public.daily_quests (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    quest_type text,
    target_value integer,
    current_value integer default 0,
    reward_coins integer,
    is_completed boolean default false,
    date date default CURRENT_DATE
);

-- 15. Shop_Items Table
create table public.shop_items (
    item_id text primary key,
    item_name text not null,
    item_type text,
    price integer default 0,
    image_url text,
    is_active boolean default true
);

-- 16. Student_Inventory Table
create table public.student_inventory (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    item_id text references public.shop_items(item_id) on delete cascade,
    acquired_at timestamp with time zone default timezone('utc'::text, now()),
    is_equipped boolean default false
);

-- 17. Bug_Reports Table
create table public.bug_reports (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    report_type text,
    description text,
    word_id text,
    status text default 'PENDING',
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Disable RLS for prototypes (or add policies if needed)
-- We disable RLS here so the Next.js app can function without Auth tokens for now.
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_summary DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_mastery DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.onet_blueprint DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_quests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_reports DISABLE ROW LEVEL SECURITY;
