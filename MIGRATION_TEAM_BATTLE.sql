-- Migration: Team Battle System
-- Description: Adds tables for Cross-Class Team Battle feature

-- 1. Seasons
CREATE TABLE IF NOT EXISTS public.team_battle_seasons (
  id uuid primary key default gen_random_uuid(),
  season_name text not null,
  scope text not null check (scope in ('classroom', 'grade', 'school')),
  grade_level text,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE CASCADE,
  start_at timestamptz not null default now(),
  end_at timestamptz not null default now() + interval '30 days',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 2. Teams
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid primary key default gen_random_uuid(),
  team_name text not null,
  team_icon text,
  team_color text,
  team_type text not null check (team_type in ('class', 'school')),
  grade_level text,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE CASCADE,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 3. Team Members
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  user_id uuid references public.students(id) on delete cascade not null,
  assignment_type text default 'auto',
  assigned_at timestamptz default now(),
  is_active boolean default true,
  unique(team_id, user_id)
);

-- 4. Team Score Events
CREATE TABLE IF NOT EXISTS public.team_score_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  user_id uuid references public.students(id) on delete cascade not null,
  season_id uuid references public.team_battle_seasons(id) on delete cascade,
  event_type text not null,
  points numeric default 0,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Insert Default Seed Data for School Teams
INSERT INTO public.teams (team_name, team_icon, team_color, team_type)
VALUES 
('Phoenix', '🔥', '#ef4444', 'school'),
('Ocean', '🌊', '#3b82f6', 'school'),
('Thunder', '⚡', '#eab308', 'school'),
('Forest', '🌿', '#22c55e', 'school'),
('Guardian', '🛡️', '#8b5cf6', 'school'),
('Rocket', '🚀', '#f97316', 'school')
ON CONFLICT DO NOTHING;

-- Initial Active Season for School
INSERT INTO public.team_battle_seasons (season_name, scope, is_active)
VALUES ('School Championship SS1', 'school', true)
ON CONFLICT DO NOTHING;
