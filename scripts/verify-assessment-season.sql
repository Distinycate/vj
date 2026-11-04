-- Read-only verification. Run AFTER installing assessment_season_atomic_reset.
-- No student names, passwords or session secrets are selected.
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'analytics_summary'
AND column_name IN ('pretest_score', 'posttest_score');

SELECT campaign_key, started_at, student_count FROM public.learning_campaign_resets;

SELECT count(*) AS archived_students,
  sum(jsonb_array_length(pre_tests)) AS archived_pretests,
  sum(jsonb_array_length(post_tests)) AS archived_posttests
FROM public.learning_campaign_archives WHERE campaign_key = '2569-T2-restart-1';

-- Immediately after reset and before students start: tests = 0, non_stage_one = 0.
-- Later, nonzero values are expected as students complete tests and stages.
SELECT count(*) AS active_internal_students,
  count(*) FILTER (WHERE lp.current_stage <> 1) AS non_stage_one,
  count(*) FILTER (WHERE lp.assessment_epoch IS NULL) AS missing_epoch
FROM public.students s JOIN public.learning_paths lp ON lp.student_id = s.id
WHERE s.user_type = 'INTERNAL' AND s.is_active = true;
SELECT count(*) AS current_pretests FROM public.pre_tests p JOIN public.students s ON s.id = p.student_id
WHERE s.user_type = 'INTERNAL' AND s.is_active = true;

SELECT has_function_privilege('anon', 'public.restart_learning_campaign_v2(uuid)', 'EXECUTE') AS anon_must_be_false,
  has_function_privilege('service_role', 'public.restart_learning_campaign_v2(uuid)', 'EXECUTE') AS server_must_be_true;
