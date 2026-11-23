-- Read-only. Every row must be true before deploying.
WITH expected(signature) AS (VALUES
  ('public.complete_stage_with_progression_v3(uuid,uuid,jsonb,timestamptz)'),
  ('public.record_attempt_hint_v3(uuid,uuid,uuid)'),
  ('public.submit_private_game_answer(uuid,uuid,uuid,text,boolean,integer)'),
  ('public.use_private_game_powerup(uuid,uuid,uuid,text)'),
  ('public.complete_private_game_stage(uuid,uuid)'),
  ('public.submit_assessment_v2(uuid,uuid,uuid,text,integer,integer,integer)'),
  ('public.submit_checkpoint_posttest(uuid,uuid,uuid,integer,integer,integer,integer)'),
  ('public.open_school_team_season_v2(text)'),
  ('public.close_team_season_v2(uuid,uuid)'),
  ('public.submit_remedial_stage_v1(uuid,uuid,text,integer,integer,uuid)'),
  ('public.import_new_season_students(jsonb)')
), resolved AS (SELECT signature, to_regprocedure(signature) AS rpc FROM expected)
SELECT signature AS check_name, CASE WHEN rpc IS NULL THEN false ELSE
  has_function_privilege('service_role',rpc::oid,'EXECUTE')
  AND NOT has_function_privilege('anon',rpc::oid,'EXECUTE')
  AND NOT has_function_privilege('authenticated',rpc::oid,'EXECUTE') END AS ready
FROM resolved
UNION ALL
SELECT 'stage_attempts.question_ids is private', CASE
  WHEN to_regclass('public.stage_attempts') IS NULL THEN false
  ELSE NOT has_column_privilege('anon','public.stage_attempts','question_ids','SELECT')
    AND NOT has_column_privilege('authenticated','public.stage_attempts','question_ids','SELECT') END
UNION ALL
SELECT 'assessment epoch and checkpoint columns installed', count(*) = 2
FROM information_schema.columns WHERE table_schema='public' AND
  ((table_name='learning_paths' AND column_name='assessment_epoch') OR (table_name='post_tests' AND column_name='stage_checkpoint'))
UNION ALL
SELECT 'campaign completion uses rank thresholds and excludes guest rewards',
  coalesce(position('vj_campaign_guest_reward_guard' in pg_get_functiondef(to_regprocedure(
    'public.complete_stage_with_progression_v3(uuid,uuid,jsonb,timestamptz)'))) > 0
    AND position('v_passed := (v_accuracy >= v_pass_threshold)' in pg_get_functiondef(to_regprocedure(
    'public.complete_stage_with_progression_v3(uuid,uuid,jsonb,timestamptz)'))) > 0, false)
UNION ALL
SELECT name || ' is private', CASE WHEN to_regclass('public.' || name) IS NULL THEN false ELSE
  NOT has_table_privilege('anon', 'public.' || name, 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.' || name, 'SELECT') END
FROM (VALUES ('event_participants'), ('event_progress'), ('remedial_stage_submissions')) AS private_tables(name);
