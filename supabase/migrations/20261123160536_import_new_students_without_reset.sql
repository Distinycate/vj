-- Installs an insert-only RPC. Does not import or change any student on migration.
BEGIN;
CREATE OR REPLACE FUNCTION public.import_new_season_students(p_rows jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_row record;
  v_id uuid;
  v_created integer := 0;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN RAISE EXCEPTION 'INVALID_ROSTER'; END IF;
  IF jsonb_array_length(p_rows) > 150 THEN RAISE EXCEPTION 'INVALID_ROSTER'; END IF;
  PERFORM set_config('lock_timeout', '5s', true);
  LOCK TABLE public.students IN SHARE ROW EXCLUSIVE MODE;
  FOR v_row IN SELECT * FROM jsonb_populate_recordset(NULL::public.students, p_rows) LOOP
    IF v_row.username IS NULL OR v_row.student_id IS NULL OR v_row.classroom_id IS NULL OR v_row.password IS NULL THEN
      RAISE EXCEPTION 'INVALID_ROSTER';
    END IF;
    IF EXISTS (SELECT 1 FROM public.students WHERE username = v_row.username OR student_id = v_row.student_id) THEN
      RAISE EXCEPTION 'ROSTER_CHANGED';
    END IF;
    INSERT INTO public.students (username, student_id, password, student_name, first_name, last_name,
      grade_level, room_number, classroom_id, academic_year, user_type, is_active, is_verified)
    VALUES (v_row.username, v_row.student_id, v_row.password, v_row.student_name, v_row.first_name, v_row.last_name,
      v_row.grade_level, v_row.room_number, v_row.classroom_id, '2568-T2', 'INTERNAL', true, true)
    RETURNING id INTO v_id;
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets)
    VALUES (v_id, 1, 1, 0, 0, 0, 0);
    v_created := v_created + 1;
  END LOOP;
  RETURN v_created;
END $$;
REVOKE ALL ON FUNCTION public.import_new_season_students(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_new_season_students(jsonb) TO service_role;
COMMIT;
