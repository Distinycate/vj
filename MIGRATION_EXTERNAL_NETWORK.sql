-- ==============================================================================
-- Vocab Journey - External School Network (Guest)
-- Additive migration: separates external dissemination users from Ban Khok Yang
-- internal students without changing existing internal defaults.
-- ==============================================================================

-- 1. User type isolation columns on the existing custom auth table.
-- The production app stores learners in public.students, not a Prisma User table.
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'INTERNAL',
ADD COLUMN IF NOT EXISTS school_name text NOT NULL DEFAULT 'โรงเรียนบ้านโคกยาง';

ALTER TABLE public.students
DROP CONSTRAINT IF EXISTS students_user_type_check;

ALTER TABLE public.students
ADD CONSTRAINT students_user_type_check
CHECK (user_type IN ('INTERNAL', 'EXTERNAL'));

-- Existing rows are the internal Ban Khok Yang population.
UPDATE public.students
SET
  user_type = COALESCE(user_type, 'INTERNAL'),
  school_name = COALESCE(NULLIF(school_name, ''), 'โรงเรียนบ้านโคกยาง')
WHERE user_type IS NULL OR school_name IS NULL OR school_name = '';

CREATE INDEX IF NOT EXISTS students_user_type_idx
  ON public.students(user_type);

CREATE INDEX IF NOT EXISTS students_external_school_name_idx
  ON public.students(school_name)
  WHERE user_type = 'EXTERNAL';

-- 2. Defensive database-side Team Battle guards.
-- External users must never be assigned to internal teams.
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
  PERFORM pg_advisory_xact_lock(hashtextextended(p_student_id::text, 0));

  SELECT * INTO v_student
  FROM public.students
  WHERE id = p_student_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'STUDENT_NOT_FOUND'; END IF;

  IF COALESCE(v_student.user_type, 'INTERNAL') = 'EXTERNAL' THEN
    RETURN jsonb_build_object(
      'skipped', true,
      'reason', 'EXTERNAL_USER_NOT_ASSIGNED_TO_INTERNAL_TEAMS'
    );
  END IF;

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
    LEFT JOIN public.students s
      ON s.id = tm.user_id
    WHERE t.team_type = 'class'
      AND t.classroom_id = v_student.classroom_id
      AND t.is_active = true
      AND COALESCE(s.user_type, 'INTERNAL') = 'INTERNAL'
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
    LEFT JOIN public.students s
      ON s.id = tm.user_id
    WHERE t.team_type = 'school'
      AND t.is_active = true
      AND COALESCE(s.user_type, 'INTERNAL') = 'INTERNAL'
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
  v_student public.students%ROWTYPE;
  v_season_id uuid;
  v_inserted integer;
BEGIN
  IF p_points < 0 THEN RAISE EXCEPTION 'TEAM_POINTS_MUST_BE_POSITIVE'; END IF;
  IF p_event_type NOT IN (
    'stage_completed', 'boss_completed', 'accuracy_bonus', 'perfect_bonus',
    'review_completed', 'wrong_word_mastered', 'streak_bonus', 'participation_bonus'
  ) THEN RAISE EXCEPTION 'INVALID_TEAM_EVENT_TYPE'; END IF;

  SELECT * INTO v_student
  FROM public.students
  WHERE id = p_student_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'STUDENT_NOT_FOUND'; END IF;
  IF COALESCE(v_student.user_type, 'INTERNAL') = 'EXTERNAL' THEN
    RETURN 0;
  END IF;

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
  JOIN public.students s ON s.id = tm.user_id
  WHERE tm.user_id = p_student_id
    AND tm.is_active = true
    AND t.is_active = true
    AND COALESCE(s.user_type, 'INTERNAL') = 'INTERNAL';
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN RAISE EXCEPTION 'STUDENT_HAS_NO_ACTIVE_TEAM'; END IF;
  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_student_team_memberships(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_team_score_event(uuid, text, numeric, jsonb) TO anon, authenticated;
