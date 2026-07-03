-- Fix RLS policies for Team Battle tables
-- This ensures that the frontend can read the teams, team_members, and team_score_events data.

-- 1. teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.teams;
CREATE POLICY "Enable read access for all users" ON public.teams FOR SELECT USING (true);

-- 2. team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.team_members;
CREATE POLICY "Enable read access for all users" ON public.team_members FOR SELECT USING (true);

-- 3. team_battle_seasons
ALTER TABLE public.team_battle_seasons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.team_battle_seasons;
CREATE POLICY "Enable read access for all users" ON public.team_battle_seasons FOR SELECT USING (true);

-- 4. team_score_events
ALTER TABLE public.team_score_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.team_score_events;
CREATE POLICY "Enable read access for all users" ON public.team_score_events FOR SELECT USING (true);
