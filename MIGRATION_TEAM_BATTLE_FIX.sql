-- Vocab Journey: repair and harden Team Battle.
-- Additive and safe to rerun. Run after MIGRATION_TEAM_BATTLE.sql.

DO $$
DECLARE
  v_dup RECORD;
  v_keep_id uuid;
BEGIN
  -- Deduplicate school teams
  FOR v_dup IN (
    SELECT team_name, count(*) 
    FROM public.teams 
    WHERE team_type = 'school' 
    GROUP BY team_name 
    HAVING count(*) > 1
  ) LOOP
    SELECT id INTO v_keep_id 
    FROM public.teams 
    WHERE team_name = v_dup.team_name AND team_type = 'school' 
    ORDER BY created_at ASC 
    LIMIT 1;

    UPDATE public.team_members tm
    SET team_id = v_keep_id
    FROM public.teams t
    WHERE tm.team_id = t.id AND t.team_name = v_dup.team_name AND t.team_type = 'school' AND t.id <> v_keep_id;

    DELETE FROM public.teams 
    WHERE team_name = v_dup.team_name AND team_type = 'school' AND id <> v_keep_id;
  END LOOP;
  
  -- Deduplicate class teams
  FOR v_dup IN (
    SELECT classroom_id, team_name, count(*) 
    FROM public.teams 
    WHERE team_type = 'class' 
    GROUP BY classroom_id, team_name 
    HAVING count(*) > 1
  ) LOOP
    SELECT id INTO v_keep_id 
    FROM public.teams 
    WHERE team_name = v_dup.team_name AND classroom_id = v_dup.classroom_id AND team_type = 'class' 
    ORDER BY created_at ASC 
    LIMIT 1;

    UPDATE public.team_members tm
    SET team_id = v_keep_id
    FROM public.teams t
    WHERE tm.team_id = t.id AND t.team_name = v_dup.team_name AND t.classroom_id = v_dup.classroom_id AND t.team_type = 'class' AND t.id <> v_keep_id;

    DELETE FROM public.teams 
    WHERE team_name = v_dup.team_name AND classroom_id = v_dup.classroom_id AND team_type = 'class' AND id <> v_keep_id;
  END LOOP;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS teams_school_name_unique
  ON public.teams(team_name)
  WHERE team_type = 'school';

CREATE UNIQUE INDEX IF NOT EXISTS teams_classroom_name_unique
  ON public.teams(classroom_id, team_name)
  WHERE team_type = 'class';

CREATE UNIQUE INDEX IF NOT EXISTS one_active_school_season
  ON public.team_battle_seasons(scope)
  WHERE scope = 'school' AND is_active = true;

INSERT INTO public.teams(team_name, team_icon, team_color, team_type, is_active)
VALUES
  ('Phoenix', '🔥', '#ef4444', 'school', true),
  ('Ocean', '🌊', '#3b82f6', 'school', true),
  ('Thunder', '⚡', '#eab308', 'school', true),
  ('Forest', '🌿', '#22c55e', 'school', true),
  ('Guardian', '🛡️', '#8b5cf6', 'school', true),
  ('Rocket', '🚀', '#f97316', 'school', true)
ON CONFLICT (team_name) WHERE team_type = 'school'
DO UPDATE SET
  team_icon = EXCLUDED.team_icon,
  team_color = EXCLUDED.team_color,
  is_active = true;

INSERT INTO public.team_battle_seasons(
  season_name, scope, start_at, end_at, is_active
)
SELECT
  to_char(current_date, 'FMMonth-YYYY'),
  'school',
  date_trunc('month', now()),
  date_trunc('month', now()) + interval '1 month',
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.team_battle_seasons
  WHERE scope = 'school' AND is_active = true
);

CREATE OR REPLACE FUNCTION public.ensure_student_team_memberships(
  p_student_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_class_name text;
  v_grade_level text;
  v_class_team_id uuid;
  v_school_team_id uuid;
BEGIN
  -- Prevent two dashboard tabs from assigning the same student concurrently.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_student_id::text, 0));

  SELECT * INTO v_student
  FROM public.students
  WHERE id = p_student_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'STUDENT_NOT_FOUND'; END IF;
  IF v_student.classroom_id IS NULL THEN RAISE EXCEPTION 'STUDENT_HAS_NO_CLASSROOM'; END IF;
  SELECT class_name INTO v_class_name
  FROM public.classrooms
  WHERE id = v_student.classroom_id;
  v_grade_level := coalesce(substring(v_class_name from 'ม\.[1-6]'), 'ไม่ระบุ');

  INSERT INTO public.teams(
    team_name, team_icon, team_color, team_type, classroom_id, grade_level, is_active
  )
  VALUES
    ('Lion', '🦁', '#fbbf24', 'class', v_student.classroom_id, v_grade_level, true),
    ('Eagle', '🦅', '#38bdf8', 'class', v_student.classroom_id, v_grade_level, true),
    ('Dragon', '🐉', '#ef4444', 'class', v_student.classroom_id, v_grade_level, true),
    ('Tiger', '🐯', '#f97316', 'class', v_student.classroom_id, v_grade_level, true)
  ON CONFLICT (classroom_id, team_name) WHERE team_type = 'class'
  DO UPDATE SET is_active = true;

  SELECT tm.team_id INTO v_class_team_id
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.user_id = p_student_id
    AND tm.is_active = true
    AND t.team_type = 'class'
    AND t.classroom_id = v_student.classroom_id
  ORDER BY tm.assigned_at
  LIMIT 1;

  IF v_class_team_id IS NULL THEN
    SELECT t.id INTO v_class_team_id
    FROM public.teams t
    LEFT JOIN public.team_members tm
      ON tm.team_id = t.id AND tm.is_active = true
    WHERE t.team_type = 'class'
      AND t.classroom_id = v_student.classroom_id
      AND t.is_active = true
    GROUP BY t.id
    ORDER BY count(tm.id), t.id
    LIMIT 1;

    INSERT INTO public.team_members(team_id, user_id, assignment_type, is_active)
    VALUES (v_class_team_id, p_student_id, 'auto', true)
    ON CONFLICT (team_id, user_id) DO UPDATE SET is_active = true;
  END IF;

  SELECT tm.team_id INTO v_school_team_id
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.user_id = p_student_id
    AND tm.is_active = true
    AND t.team_type = 'school'
  ORDER BY tm.assigned_at
  LIMIT 1;

  IF v_school_team_id IS NULL THEN
    SELECT t.id INTO v_school_team_id
    FROM public.teams t
    LEFT JOIN public.team_members tm
      ON tm.team_id = t.id AND tm.is_active = true
    WHERE t.team_type = 'school' AND t.is_active = true
    GROUP BY t.id
    ORDER BY count(tm.id), t.id
    LIMIT 1;

    IF v_school_team_id IS NULL THEN RAISE EXCEPTION 'NO_ACTIVE_SCHOOL_TEAM'; END IF;
    INSERT INTO public.team_members(team_id, user_id, assignment_type, is_active)
    VALUES (v_school_team_id, p_student_id, 'auto', true)
    ON CONFLICT (team_id, user_id) DO UPDATE SET is_active = true;
  END IF;

  RETURN jsonb_build_object(
    'class_team_id', v_class_team_id,
    'school_team_id', v_school_team_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_team_score_event(
  p_student_id uuid,
  p_event_type text,
  p_points numeric,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season_id uuid;
  v_inserted integer;
BEGIN
  IF p_points < 0 THEN RAISE EXCEPTION 'TEAM_POINTS_MUST_BE_POSITIVE'; END IF;
  IF p_event_type NOT IN (
    'stage_completed', 'boss_completed', 'accuracy_bonus', 'perfect_bonus',
    'review_completed', 'wrong_word_mastered', 'streak_bonus', 'participation_bonus'
  ) THEN RAISE EXCEPTION 'INVALID_TEAM_EVENT_TYPE'; END IF;

  PERFORM public.ensure_student_team_memberships(p_student_id);

  SELECT id INTO v_season_id
  FROM public.team_battle_seasons
  WHERE scope = 'school'
    AND is_active = true
    AND start_at <= now()
    AND end_at > now()
  ORDER BY start_at DESC
  LIMIT 1;
  IF v_season_id IS NULL THEN RAISE EXCEPTION 'NO_ACTIVE_TEAM_SEASON'; END IF;

  INSERT INTO public.team_score_events(
    team_id, user_id, season_id, event_type, points, metadata
  )
  SELECT tm.team_id, p_student_id, v_season_id, p_event_type, p_points, p_metadata
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.user_id = p_student_id
    AND tm.is_active = true
    AND t.is_active = true;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN RAISE EXCEPTION 'STUDENT_HAS_NO_ACTIVE_TEAM'; END IF;
  RETURN v_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_school_team_season(
  p_season_name text
) RETURNS public.team_battle_seasons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_season public.team_battle_seasons%ROWTYPE;
BEGIN
  IF nullif(trim(p_season_name), '') IS NULL THEN
    RAISE EXCEPTION 'SEASON_NAME_REQUIRED';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('school-team-season'));
  UPDATE public.team_battle_seasons
  SET is_active = false
  WHERE scope = 'school' AND is_active = true;
  INSERT INTO public.team_battle_seasons(
    season_name, scope, start_at, end_at, is_active
  )
  VALUES (
    trim(p_season_name), 'school', now(), now() + interval '30 days', true
  )
  RETURNING * INTO v_season;
  RETURN v_season;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_student_team_memberships(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_team_score_event(uuid, text, numeric, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_school_team_season(text) TO anon, authenticated;
