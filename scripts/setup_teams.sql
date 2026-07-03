-- 1. Insert default teams if they don't exist
INSERT INTO public.teams (team_name, team_icon, team_color, team_type)
VALUES 
('Phoenix', '🔥', '#ef4444', 'school'),
('Ocean', '🌊', '#3b82f6', 'school'),
('Thunder', '⚡', '#eab308', 'school'),
('Forest', '🌿', '#22c55e', 'school'),
('Guardian', '🛡️', '#8b5cf6', 'school'),
('Rocket', '🚀', '#f97316', 'school')
ON CONFLICT DO NOTHING;

-- 2. Clear old team members and assign all current students to teams randomly
DO $$
DECLARE
    student_rec RECORD;
    team_ids UUID[];
    i INT := 1;
BEGIN
    -- Delete existing team members
    DELETE FROM public.team_members;

    -- Get all school team IDs
    SELECT array_agg(id) INTO team_ids FROM public.teams WHERE team_type = 'school';

    IF array_length(team_ids, 1) > 0 THEN
        -- Loop through students in random order
        FOR student_rec IN SELECT id FROM public.students ORDER BY random() LOOP
            -- Insert into team_members
            INSERT INTO public.team_members (team_id, user_id, assignment_type, is_active)
            VALUES (team_ids[i], student_rec.id, 'auto', true)
            ON CONFLICT (team_id, user_id) DO NOTHING;
            
            -- Cycle through teams
            i := i + 1;
            IF i > array_length(team_ids, 1) THEN
                i := 1;
            END IF;
        END LOOP;
    END IF;
END $$;

-- 3. Close old seasons
UPDATE public.team_battle_seasons SET is_active = false WHERE is_active = true;

-- 4. Start new monthly activity (Ends at end of month)
-- Since the current time in the system is July 2026, we name it appropriately
INSERT INTO public.team_battle_seasons (season_name, scope, start_at, end_at, is_active)
VALUES (
  'กิจกรรมประจำเดือน กรกฎาคม 2569', 
  'school', 
  now(), 
  date_trunc('month', now()) + interval '1 month' - interval '1 second', 
  true
);
