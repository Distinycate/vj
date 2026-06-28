-- MASTER SUPABASE SCHEMA FOR VOCAB JOURNEY --
-- Redesigned for Gamification, Adaptive Learning, Learning Analytics, and Assignments

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Clean slate (Drop existing tables with cascade)
drop table if exists public.intervention_alerts cascade;
drop table if exists public.analytics_summary cascade;
drop table if exists public.assignment_progress cascade;
drop table if exists public.assignments cascade;
drop table if exists public.goals cascade;
drop table if exists public.reflections cascade;
drop table if exists public.student_weekly_missions cascade;
drop table if exists public.weekly_missions cascade;
drop table if exists public.student_daily_quests cascade;
drop table if exists public.daily_quests cascade;
drop table if exists public.student_badges cascade;
drop table if exists public.badges cascade;
drop table if exists public.student_achievements cascade;
drop table if exists public.achievements cascade;
drop table if exists public.item_usage_logs cascade;
drop table if exists public.student_inventory cascade;
drop table if exists public.items cascade;
drop table if exists public.coins_transactions cascade;
drop table if exists public.boss_stages cascade;
drop table if exists public.post_tests cascade;
drop table if exists public.pre_tests cascade;
drop table if exists public.spaced_repetition cascade;
drop table if exists public.wrong_words cascade;
drop table if exists public.attempts cascade;
drop table if exists public.stages cascade;
drop table if exists public.learning_paths cascade;
drop table if exists public.vocabulary cascade;
drop table if exists public.vocabulary_categories cascade;
drop table if exists public.students cascade;
drop table if exists public.classrooms cascade;
drop table if exists public.teachers cascade;

-- 1. Teachers Table
create table public.teachers (
    id uuid references auth.users on delete cascade primary key,
    username text unique not null,
    name text not null,
    role text default 'TEACHER' check (role in ('TEACHER', 'ADMIN', 'EXECUTIVE')),
    is_active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Classrooms Table
create table public.classrooms (
    id uuid default uuid_generate_v4() primary key,
    class_name text unique not null,
    teacher_id uuid references public.teachers(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Students Table
create table public.students (
    id uuid references auth.users on delete cascade primary key,
    student_id text unique not null,
    username text unique not null,
    student_name text not null,
    classroom_id uuid references public.classrooms(id) on delete set null,
    academic_year text not null,
    is_active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Vocabulary Categories Table
create table public.vocabulary_categories (
    id uuid default uuid_generate_v4() primary key,
    name text unique not null, -- Animals, Food, Occupation, etc.
    display_name_en text not null,
    display_name_th text not null,
    icon text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Vocabulary Table
create table public.vocabulary (
    id uuid default uuid_generate_v4() primary key,
    word_id text unique not null,
    category_id uuid references public.vocabulary_categories(id) on delete cascade,
    word text not null,
    phonetic text,
    meaning text not null,
    example text,
    thai_pronunciation text,
    part_of_speech text,
    image_url text,
    rank integer default 1 check (rank between 1 and 5),
    stage integer default 1,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Learning Paths (Overall student progression state)
create table public.learning_paths (
    student_id uuid references public.students(id) on delete cascade primary key,
    current_category_id uuid references public.vocabulary_categories(id) on delete set null,
    current_rank integer default 1,
    current_stage integer default 1,
    streak_days integer default 0,
    exp integer default 0,
    coins integer default 0,
    last_active_date timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Stages Table (Definitions of stages)
create table public.stages (
    id uuid default uuid_generate_v4() primary key,
    stage_number integer not null,
    category_id uuid references public.vocabulary_categories(id) on delete cascade,
    rank integer default 1,
    description text,
    unique(category_id, stage_number)
);

-- 8. Attempts (Records of stage gameplay results)
create table public.attempts (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    stage_id uuid references public.stages(id) on delete cascade,
    score integer not null,
    total_questions integer not null,
    time_spent_sec integer not null,
    items_used_count integer default 0,
    error_count integer default 0,
    is_passed boolean not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Wrong Words (Word difficulty statistics for Spaced Repetition)
create table public.wrong_words (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    word_id uuid references public.vocabulary(id) on delete cascade,
    error_count integer default 1,
    last_attempt_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(student_id, word_id)
);

-- 10. Spaced Repetition Schedule Table
create table public.spaced_repetition (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    word_id uuid references public.vocabulary(id) on delete cascade,
    interval_days integer default 1,
    ease_factor numeric default 2.5,
    repetitions integer default 0,
    next_review_at timestamp with time zone not null,
    last_reviewed_at timestamp with time zone default timezone('utc'::text, now()),
    unique(student_id, word_id)
);

-- 11. Pre-tests Table
create table public.pre_tests (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    score integer not null,
    total_questions integer default 25,
    time_spent_sec integer not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. Post-tests Table
create table public.post_tests (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    score integer not null,
    total_questions integer default 50,
    time_spent_sec integer not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 13. Boss Stages attempts
create table public.boss_stages (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    boss_stage_number integer not null,
    score integer not null,
    is_passed boolean not null,
    time_spent_sec integer not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 14. Coins Transaction History
create table public.coins_transactions (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    amount integer not null,
    source text not null, -- STAGE_PASS, DAILY_QUEST, SHOP_BUY, etc.
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 15. Items (Shop Items) Table
create table public.items (
    id uuid default uuid_generate_v4() primary key,
    item_code text unique not null, -- TIME_FREEZE, FIFTY_FIFTY, EXTRA_LIFE, HINT
    name text not null,
    description text,
    price integer default 25,
    effect_type text not null,
    image_url text,
    is_active boolean default true
);

-- 16. Student Inventory Table
create table public.student_inventory (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    item_id uuid references public.items(id) on delete cascade,
    quantity integer default 1,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(student_id, item_id)
);

-- 17. Item Usage Logs
create table public.item_usage_logs (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    item_id uuid references public.items(id) on delete cascade,
    stage_id uuid references public.stages(id) on delete set null,
    question_word text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 18. Achievements Table
create table public.achievements (
    id uuid default uuid_generate_v4() primary key,
    code text unique not null,
    title text not null,
    description text,
    points_reward integer default 10,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 19. Student Achievements Table (Earned achievements)
create table public.student_achievements (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    achievement_id uuid references public.achievements(id) on delete cascade,
    unlocked_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(student_id, achievement_id)
);

-- 20. Badges Table
create table public.badges (
    id uuid default uuid_generate_v4() primary key,
    code text unique not null,
    name text not null,
    description text,
    image_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 21. Student Badges Table (Earned badges)
create table public.student_badges (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    badge_id uuid references public.badges(id) on delete cascade,
    earned_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(student_id, badge_id)
);

-- 22. Daily Quests Table
create table public.daily_quests (
    id uuid default uuid_generate_v4() primary key,
    quest_title text unique not null,
    target_type text not null, -- WORDS_STUDIED, STAGES_PLAYED, COINS_SPENT
    target_value integer not null,
    reward_coins integer default 10,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 23. Student Daily Quests Progress
create table public.student_daily_quests (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    daily_quest_id uuid references public.daily_quests(id) on delete cascade,
    current_value integer default 0,
    is_completed boolean default false,
    completed_at timestamp with time zone,
    quest_date date default current_date,
    unique(student_id, daily_quest_id, quest_date)
);

-- 24. Weekly Missions Table
create table public.weekly_missions (
    id uuid default uuid_generate_v4() primary key,
    mission_title text unique not null,
    target_type text not null, -- WORDS_STUDIED, STAGES_PLAYED, COINS_SPENT
    target_value integer not null,
    reward_coins integer default 50,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 25. Student Weekly Missions Progress
create table public.student_weekly_missions (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    weekly_mission_id uuid references public.weekly_missions(id) on delete cascade,
    current_value integer default 0,
    is_completed boolean default false,
    completed_at timestamp with time zone,
    week_start date default date_trunc('week', current_date)::date,
    unique(student_id, weekly_mission_id, week_start)
);

-- 26. Reflections Table (Self reflection after stage completion)
create table public.reflections (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    stage_id uuid references public.stages(id) on delete cascade,
    words_learned text not null,
    hardest_word text,
    feeling text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(student_id, stage_id)
);

-- 27. Goals Table (Goal setting before starting a stage)
create table public.goals (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    stage_id uuid references public.stages(id) on delete cascade,
    words_target integer default 10,
    stages_target integer default 1,
    time_target_min integer default 5,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(student_id, stage_id)
);

-- 28. Assignments Table (Teacher assignments)
create table public.assignments (
    id uuid default uuid_generate_v4() primary key,
    classroom_id uuid references public.classrooms(id) on delete cascade,
    teacher_id uuid references public.teachers(id) on delete cascade,
    title text not null,
    category_id uuid references public.vocabulary_categories(id) on delete cascade,
    start_stage integer not null,
    end_stage integer not null,
    due_date timestamp with time zone not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 29. Assignment Progress Table (Student completion)
create table public.assignment_progress (
    id uuid default uuid_generate_v4() primary key,
    assignment_id uuid references public.assignments(id) on delete cascade,
    student_id uuid references public.students(id) on delete cascade,
    is_completed boolean default false,
    completed_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(assignment_id, student_id)
);

-- 30. Analytics Summary Table (Compiled student research/evaluation metrics)
create table public.analytics_summary (
    student_id uuid references public.students(id) on delete cascade primary key,
    pretest_score integer default 0,
    posttest_score integer default 0,
    learning_gain numeric(5,2) default 0.00,
    normalized_gain numeric(5,2) default 0.00,
    success_rate numeric(5,2) default 0.00,
    attempt_count integer default 0,
    total_time_on_task_sec integer default 0,
    last_updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 31. Intervention Alerts Table (Alerts for teachers)
create table public.intervention_alerts (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade,
    classroom_id uuid references public.classrooms(id) on delete cascade,
    alert_type text check (alert_type in ('STAGE_FAIL_3X', 'DEMOTION', 'HIGH_TIME', 'REPEATED_ERRORS', 'INACTIVITY', 'EXCESSIVE_ITEMS')),
    description text not null,
    is_resolved boolean default false,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable Row Level Security on all tables
alter table public.teachers enable row level security;
alter table public.classrooms enable row level security;
alter table public.students enable row level security;
alter table public.vocabulary_categories enable row level security;
alter table public.vocabulary enable row level security;
alter table public.learning_paths enable row level security;
alter table public.stages enable row level security;
alter table public.attempts enable row level security;
alter table public.wrong_words enable row level security;
alter table public.spaced_repetition enable row level security;
alter table public.pre_tests enable row level security;
alter table public.post_tests enable row level security;
alter table public.boss_stages enable row level security;
alter table public.coins_transactions enable row level security;
alter table public.items enable row level security;
alter table public.student_inventory enable row level security;
alter table public.item_usage_logs enable row level security;
alter table public.reflections enable row level security;
alter table public.goals enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_progress enable row level security;
alter table public.analytics_summary enable row level security;
alter table public.intervention_alerts enable row level security;

-- 1. Vocabulary & Categories (Publicly readable by authenticated students and teachers)
create policy "Authenticated users can read categories" on public.vocabulary_categories
    for select using (auth.role() = 'authenticated');

create policy "Authenticated users can read vocabulary" on public.vocabulary
    for select using (auth.role() = 'authenticated');

create policy "Authenticated users can read stages" on public.stages
    for select using (auth.role() = 'authenticated');

create policy "Authenticated users can read items" on public.items
    for select using (auth.role() = 'authenticated');

-- 2. Student-specific data (Students can select and write their own rows)
create policy "Students can view own profile" on public.students
    for select using (auth.uid() = id);

create policy "Students can update own profile" on public.students
    for update using (auth.uid() = id);

create policy "Students can read/write learning path" on public.learning_paths
    for all using (auth.uid() = student_id);

create policy "Students can read/write attempts" on public.attempts
    for all using (auth.uid() = student_id);

create policy "Students can read/write wrong words" on public.wrong_words
    for all using (auth.uid() = student_id);

create policy "Students can read/write spaced repetition" on public.spaced_repetition
    for all using (auth.uid() = student_id);

create policy "Students can read/write pre_tests" on public.pre_tests
    for all using (auth.uid() = student_id);

create policy "Students can read/write post_tests" on public.post_tests
    for all using (auth.uid() = student_id);

create policy "Students can read/write boss_stages" on public.boss_stages
    for all using (auth.uid() = student_id);

create policy "Students can read/write coin transactions" on public.coins_transactions
    for all using (auth.uid() = student_id);

create policy "Students can read/write inventory" on public.student_inventory
    for all using (auth.uid() = student_id);

create policy "Students can read/write item usage logs" on public.item_usage_logs
    for all using (auth.uid() = student_id);

create policy "Students can read/write reflections" on public.reflections
    for all using (auth.uid() = student_id);

create policy "Students can read/write goals" on public.goals
    for all using (auth.uid() = student_id);

create policy "Students can read assignment progress" on public.assignment_progress
    for select using (auth.uid() = student_id);

create policy "Students can write assignment progress" on public.assignment_progress
    for update using (auth.uid() = student_id);

create policy "Students can read own analytics" on public.analytics_summary
    for select using (auth.uid() = student_id);

-- 3. Teacher-specific access rules
create policy "Teachers can read/write their own profile" on public.teachers
    for all using (auth.uid() = id);

create policy "Teachers can read all students in their classrooms" on public.students
    for select using (
        exists (
            select 1 from public.classrooms c 
            where c.id = students.classroom_id and c.teacher_id = auth.uid()
        )
    );

create policy "Teachers can read/write assignments in their classrooms" on public.assignments
    for all using (
        exists (
            select 1 from public.classrooms c 
            where c.id = assignments.classroom_id and c.teacher_id = auth.uid()
        )
    );

create policy "Teachers can read attempts of students in their classrooms" on public.attempts
    for select using (
        exists (
            select 1 from public.students s
            join public.classrooms c on c.id = s.classroom_id
            where s.id = attempts.student_id and c.teacher_id = auth.uid()
        )
    );

create policy "Teachers can view alerts of students in their classrooms" on public.intervention_alerts
    for all using (
        exists (
            select 1 from public.classrooms c
            where c.id = intervention_alerts.classroom_id and c.teacher_id = auth.uid()
        )
    );

create policy "Teachers can view analytics of students in their classrooms" on public.analytics_summary
    for select using (
        exists (
            select 1 from public.students s
            join public.classrooms c on c.id = s.classroom_id
            where s.id = analytics_summary.student_id and c.teacher_id = auth.uid()
        )
    );

-- Allow admins full access
create policy "Admin role can do everything" on public.students
    for all using (
        exists (
            select 1 from public.teachers t 
            where t.id = auth.uid() and t.role = 'ADMIN'
        )
    );

-- ==========================================
-- SEED DATA
-- ==========================================

-- 1. Seed Categories
INSERT INTO public.vocabulary_categories (id, name, display_name_en, display_name_th, icon) VALUES
    ('a1111111-1111-1111-1111-111111111111', 'Animals', 'Animals', 'สัตว์โลกน่ารัก', '🌲'),
    ('b2222222-2222-2222-2222-222222222222', 'Food', 'Food & Drinks', 'อาหารและเครื่องดื่ม', '🍎'),
    ('c3333333-3333-3333-3333-333333333333', 'Occupation', 'Occupations', 'อาชีพและสถานที่ทำงาน', '💼'),
    ('d4444444-4444-4444-4444-444444444444', 'Travel', 'Travel & Places', 'การท่องเที่ยวและสถานที่', '✈️'),
    ('e5555555-5555-5555-5555-555555555555', 'Health', 'Health & Body', 'สุขภาพและร่างกาย', '🏥'),
    ('f6666666-6666-6666-6666-666666666666', 'Emotion', 'Emotions & Feelings', 'อารมณ์และความรู้สึก', '😊'),
    ('77777777-7777-7777-7777-777777777777', 'Technology', 'Technology & Science', 'เทคโนโลยีและวิทยาศาสตร์', '💻')
ON CONFLICT (name) DO NOTHING;

-- 2. Seed Stages (100 stages mapped across categories and ranks)
-- We will seed a default mapping for stages 1 to 100
DO $$
DECLARE
    cat_id uuid;
    cat_record RECORD;
    stage_num integer := 1;
    curr_rank integer := 1;
BEGIN
    FOR cat_record IN SELECT id FROM public.vocabulary_categories ORDER BY name LOOP
        cat_id := cat_record.id;
        FOR i IN 1..15 LOOP
            curr_rank := CASE 
                WHEN stage_num <= 20 THEN 1
                WHEN stage_num <= 40 THEN 2
                WHEN stage_num <= 60 THEN 3
                WHEN stage_num <= 80 THEN 4
                ELSE 5
            END;
            INSERT INTO public.stages (stage_number, category_id, rank, description)
            VALUES (stage_num, cat_id, curr_rank, 'ด่านที่ ' || stage_num || ' หมวดหมู่คำศัพท์')
            ON CONFLICT (category_id, stage_number) DO NOTHING;
            stage_num := stage_num + 1;
        END LOOP;
    END LOOP;
END $$;

-- 3. Seed Items (Shop Items)
INSERT INTO public.items (id, item_code, name, description, price, effect_type, image_url) VALUES
    (uuid_generate_v4(), 'TIME_FREEZE', 'หยุดเวลา', 'เพิ่มเวลาทำข้อสอบ 10 วินาที', 25, 'TIME_FREEZE', '❄️'),
    (uuid_generate_v4(), 'FIFTY_FIFTY', '50/50', 'ตัดตัวเลือกผิดออก 2 ข้อ', 25, 'FIFTY_FIFTY', '✂️'),
    (uuid_generate_v4(), 'EXTRA_LIFE', 'เพิ่มหัวใจ', 'เพิ่มพลังชีวิตอีก 1 หัวใจ', 25, 'EXTRA_LIFE', '❤️'),
    (uuid_generate_v4(), 'HINT', 'คำใบ้', 'แสดงคำแปลย่อหรือตัวช่วยเดาความหมาย', 25, 'HINT', '💡')
ON CONFLICT (item_code) DO NOTHING;

-- 4. Seed Achievements
INSERT INTO public.achievements (code, title, description, points_reward) VALUES
    ('ACH_FIRST_STRIKE', 'เริ่มต้นผจญภัย', 'เรียนรู้และผ่านด่านแรกสำเร็จ', 10),
    ('ACH_STREAK_3', 'ความพยายามไม่เคยทรยศใคร', 'เล่นอย่างต่อเนื่องครบ 3 วัน', 20),
    ('ACH_RANK_UP', 'เก่งขึ้นอีกขั้น', 'เลื่อนระดับ Rank ครั้งแรก', 30),
    ('ACH_SHOPPING_SPREE', 'นักช้อปมือโปร', 'ซื้อไอเทมตัวช่วยครบ 3 แบบ', 25)
ON CONFLICT (code) DO NOTHING;

-- 5. Seed Daily Quests
INSERT INTO public.daily_quests (quest_title, target_type, target_value, reward_coins) VALUES
    ('เรียนคำศัพท์ใหม่ 10 คำ', 'WORDS_STUDIED', 10, 10),
    ('ผ่านด่านท้าทาย 3 ด่าน', 'STAGES_PLAYED', 3, 15),
    ('ช้อปปิ้งไอเทม 1 ชิ้น', 'COINS_SPENT', 25, 5)
ON CONFLICT (quest_title) DO NOTHING;

-- 6. Seed Weekly Missions
INSERT INTO public.weekly_missions (mission_title, target_type, target_value, reward_coins) VALUES
    ('เรียนรู้คำศัพท์ 50 คำใน 1 สัปดาห์', 'WORDS_STUDIED', 50, 50),
    ('ผ่านด่านท้าทาย 15 ด่าน', 'STAGES_PLAYED', 15, 75)
ON CONFLICT (mission_title) DO NOTHING;

