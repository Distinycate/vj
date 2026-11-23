-- Install only. Do not recalculate historical attempts, ranks or balances.
BEGIN;
DO $patch$
DECLARE
  v_function regprocedure := to_regprocedure('public.complete_stage_with_progression_v3(uuid,uuid,jsonb,timestamptz)');
  v_definition text;
  v_anchor text := '    v_new_coins     := COALESCE(v_path.coins, 0) + v_earned_coins;';
  v_guard text := $guard$
    -- vj_campaign_guest_reward_guard
    IF EXISTS (SELECT 1 FROM public.students WHERE id = p_student_id AND user_type = 'EXTERNAL') THEN
        v_base_reward_coins := 0;
        v_base_reward_exp := 0;
        v_bonus_coins := 0;
        v_earned_coins := 0;
        v_earned_exp := 0;
    END IF;
$guard$;
BEGIN
  IF v_function IS NULL THEN RAISE EXCEPTION 'Install V3 rank-aware completion before this guard'; END IF;
  v_definition := pg_get_functiondef(v_function);
  IF position('vj_campaign_guest_reward_guard' IN v_definition) = 0 THEN
    IF position('v_passed := (v_accuracy >= v_pass_threshold)' IN v_definition) = 0
      OR (length(v_definition) - length(replace(v_definition, v_anchor, ''))) <> length(v_anchor) THEN
      RAISE EXCEPTION 'Unexpected V3 body: compare to MIGRATION_RANK_AND_PASS_SCORE_UPDATE.sql before applying';
    END IF;
    EXECUTE replace(v_definition, v_anchor, v_guard || v_anchor);
  END IF;
END;
$patch$;
REVOKE EXECUTE ON FUNCTION public.complete_stage_with_progression_v3(uuid,uuid,jsonb,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_stage_with_progression_v3(uuid,uuid,jsonb,timestamptz) TO service_role;
COMMIT;
