-- MIGRATION_VOCAB_JOURNEY_V5.sql
-- Function to randomize all teams (both School and Class scopes)
CREATE OR REPLACE FUNCTION public.randomize_all_teams()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student record;
  v_count integer := 0;
BEGIN
  -- 1. Invalidate or delete all existing active memberships
  UPDATE public.team_members
  SET is_active = false
  WHERE is_active = true;

  -- 2. Reassign all active students to teams
  FOR v_student IN (SELECT id FROM public.students WHERE is_active = true) LOOP
    PERFORM public.ensure_student_team_memberships(v_student.id);
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'reassigned_count', v_count,
    'message', 'Successfully randomized all active students into new teams.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.randomize_all_teams() TO anon, authenticated;
