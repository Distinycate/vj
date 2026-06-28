-- SUPABASE SCHEMA FOR VOCAB JOURNEY --

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Student_Profiles Table
create table public.students (
    id uuid default uuid_generate_v4() primary key,
    student_id text unique not null,
    student_name text not null,
    grade text,
    room text,
    academic_year text,
    is_active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Vocabulary Table
create table public.vocabulary (
    id uuid default uuid_generate_v4() primary key,
    word_id text unique not null,
    grade_level text,
    stage integer,
    word text not null,
    phonetic text,
    meaning text,
    example text,
    category text,
    thai_pronunciation text,
    part_of_speech text,
    image_url text
);

-- Stage_Progress Table
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

-- Daily_Quests Table
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

-- Shop_Items Table
create table public.shop_items (
    id uuid default uuid_generate_v4() primary key,
    item_id text unique not null,
    item_name text not null,
    item_type text,
    price integer default 0,
    image_url text,
    is_active boolean default true
);

-- Student_Inventory Table
create table public.student_inventory (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    item_id text references public.shop_items(item_id) on delete cascade,
    acquired_at timestamp with time zone default timezone('utc'::text, now()),
    is_equipped boolean default false
);

-- Progress_Summary Table
create table public.progress_summary (
    student_id uuid references public.students(id) on delete cascade primary key,
    pretest_score integer default 0,
    posttest_score integer default 0,
    current_rank integer default 1,
    current_stage integer default 1,
    total_words_mastered integer default 0,
    streak_days integer default 0,
    coins integer default 0
);
