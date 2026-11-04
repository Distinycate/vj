-- INSTALL ONLY: does not start a season. Deploy matching code, then use the ADMIN reset button.
BEGIN;
ALTER TABLE public.analytics_summary ALTER COLUMN pretest_score TYPE numeric USING pretest_score::numeric;
ALTER TABLE public.analytics_summary ALTER COLUMN posttest_score TYPE numeric USING posttest_score::numeric;
ALTER TABLE public.learning_paths ADD COLUMN IF NOT EXISTS assessment_epoch uuid NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS pre_tests_student_created_idx ON public.pre_tests (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS post_tests_student_created_idx ON public.post_tests (student_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.learning_campaign_resets (
  campaign_key text PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  started_by uuid NOT NULL,
  student_count integer NOT NULL
);
CREATE TABLE IF NOT EXISTS public.learning_campaign_archives (
  campaign_key text NOT NULL REFERENCES public.learning_campaign_resets(campaign_key),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  captured_at timestamptz NOT NULL DEFAULT now(),
  learning_path jsonb NOT NULL,
  stage_progress jsonb NOT NULL,
  pre_tests jsonb NOT NULL,
  post_tests jsonb NOT NULL,
  analytics jsonb,
  PRIMARY KEY (campaign_key, student_id)
);
ALTER TABLE public.learning_campaign_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_campaign_archives ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.learning_campaign_resets, public.learning_campaign_archives FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.learning_campaign_resets, public.learning_campaign_archives TO service_role;

-- Repair summaries from real saved tests, without changing ranks, stages or cumulative time.
INSERT INTO public.analytics_summary (student_id, pretest_score, last_updated_at)
SELECT student_id, round(avg(score::numeric / total_questions * 25), 4), now()
FROM (
  SELECT p.*, row_number() OVER (PARTITION BY p.student_id ORDER BY p.created_at DESC, p.id) AS rn
  FROM public.pre_tests p JOIN public.students s ON s.id = p.student_id
  WHERE s.user_type = 'INTERNAL' AND s.is_active = true
    AND p.total_questions > 0 AND p.score BETWEEN 0 AND p.total_questions
) tests WHERE rn <= 5 GROUP BY student_id HAVING count(*) = 5
ON CONFLICT (student_id) DO UPDATE SET pretest_score = EXCLUDED.pretest_score, last_updated_at = EXCLUDED.last_updated_at;

CREATE OR REPLACE FUNCTION public.submit_assessment_v2(
  p_student_id uuid, p_epoch uuid, p_submission_id uuid, p_type text,
  p_score integer, p_total integer, p_duration integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_path public.learning_paths%ROWTYPE;
  v_existing record;
  v_required integer;
  v_count integer;
  v_inserted boolean := false;
  v_pre numeric;
  v_post numeric;
  v_gain numeric;
  v_normalized numeric;
BEGIN
  IF p_submission_id IS NULL OR p_epoch IS NULL OR p_type IS NULL OR p_type NOT IN ('PRE_TEST','POST_TEST')
    OR p_total IS NULL OR p_total <= 0 OR p_score IS NULL OR p_score < 0 OR p_score > p_total
    OR p_duration IS NULL OR p_duration < 0 THEN RAISE EXCEPTION 'INVALID_ASSESSMENT'; END IF;
  SELECT CASE WHEN user_type = 'EXTERNAL' THEN 1 ELSE 5 END INTO v_required
    FROM public.students WHERE id = p_student_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'STUDENT_NOT_ACTIVE'; END IF;
  SELECT * INTO v_path FROM public.learning_paths WHERE student_id = p_student_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'LEARNING_PATH_MISSING'; END IF;
  IF v_path.assessment_epoch <> p_epoch THEN RAISE EXCEPTION 'ASSESSMENT_SEASON_CHANGED'; END IF;

  -- The same UUID may be retried after a lost HTTP response, but not with altered data.
  SELECT student_id, score, total_questions, time_spent_sec, 'PRE_TEST' AS test_type INTO v_existing
  FROM public.pre_tests WHERE id = p_submission_id
  UNION ALL SELECT student_id, score, total_questions, time_spent_sec, 'POST_TEST'
  FROM public.post_tests WHERE id = p_submission_id;
  IF FOUND THEN
    IF v_existing.student_id <> p_student_id OR v_existing.score <> p_score
      OR v_existing.total_questions <> p_total OR v_existing.time_spent_sec <> p_duration
      OR v_existing.test_type <> p_type THEN RAISE EXCEPTION 'ASSESSMENT_ID_CONFLICT'; END IF;
  ELSE
    IF p_type = 'PRE_TEST' THEN
      SELECT count(*) INTO v_count FROM public.pre_tests WHERE student_id = p_student_id;
      IF v_count >= v_required THEN RAISE EXCEPTION 'ASSESSMENT_ALREADY_COMPLETE'; END IF;
      INSERT INTO public.pre_tests (id, student_id, score, total_questions, time_spent_sec)
      VALUES (p_submission_id, p_student_id, p_score, p_total, p_duration);
    ELSE
      SELECT count(*) INTO v_count FROM public.pre_tests WHERE student_id = p_student_id;
      IF v_required = 5 AND v_count < 5 THEN RAISE EXCEPTION 'PRETEST_REQUIRED'; END IF;
      INSERT INTO public.post_tests (id, student_id, score, total_questions, time_spent_sec)
      VALUES (p_submission_id, p_student_id, p_score, p_total, p_duration);
    END IF;
    v_inserted := true;
  END IF;

  SELECT count(*) INTO v_count FROM public.pre_tests WHERE student_id = p_student_id;
  SELECT round(avg(score::numeric / NULLIF(total_questions, 0) * 25), 4) INTO v_pre
  FROM (SELECT score, total_questions FROM public.pre_tests WHERE student_id = p_student_id
    ORDER BY created_at DESC, id LIMIT v_required) t;
  SELECT score::numeric / NULLIF(total_questions, 0) * 25 INTO v_post
  FROM public.post_tests WHERE student_id = p_student_id ORDER BY created_at DESC, id LIMIT 1;
  v_gain := v_post - v_pre;
  v_normalized := CASE WHEN v_pre IS NULL OR v_post IS NULL THEN NULL
    WHEN v_pre >= 25 THEN NULL ELSE round((v_post - v_pre) / (25 - v_pre) * 100, 2) END;
  INSERT INTO public.analytics_summary (student_id, pretest_score, posttest_score, learning_gain,
    normalized_gain, total_time_on_task_sec, last_updated_at)
  VALUES (p_student_id, v_pre, v_post, v_gain, v_normalized,
    CASE WHEN v_inserted THEN p_duration ELSE 0 END, now())
  ON CONFLICT (student_id) DO UPDATE SET
    pretest_score = EXCLUDED.pretest_score, posttest_score = EXCLUDED.posttest_score,
    learning_gain = EXCLUDED.learning_gain, normalized_gain = EXCLUDED.normalized_gain,
    total_time_on_task_sec = COALESCE(analytics_summary.total_time_on_task_sec, 0) + EXCLUDED.total_time_on_task_sec,
    last_updated_at = EXCLUDED.last_updated_at;
  -- Assessment never places students into a stage or rank.
  RETURN jsonb_build_object('success', true, 'count', v_count, 'completedAll', v_count >= v_required,
    'preScore', v_pre, 'postScore', v_post, 'normalizedGain', v_normalized, 'absoluteGain', v_gain,
    'newStage', v_path.current_stage, 'newRank', v_path.current_rank);
END $$;
REVOKE ALL ON FUNCTION public.submit_assessment_v2(uuid, uuid, uuid, text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_assessment_v2(uuid, uuid, uuid, text, integer, integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.restart_learning_campaign_v2(p_actor_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_key constant text := '2569-T2-restart-1';
  v_count integer;
  v_paths integer;
  v_saved integer;
BEGIN
  IF p_actor_id IS NULL THEN RAISE EXCEPTION 'ACTOR_REQUIRED'; END IF;
  IF now() < timestamptz '2026-10-31 17:00:00+00' THEN RAISE EXCEPTION 'SEMESTER_NOT_STARTED'; END IF;
  PERFORM set_config('lock_timeout', '5s', true);
  -- Serialize cutover with assessment, progression and another reset.
  LOCK TABLE public.students, public.learning_paths, public.stage_attempts,
    public.student_stage_progress, public.pre_tests, public.post_tests,
    public.analytics_summary, public.learning_campaign_resets IN SHARE ROW EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM public.learning_campaign_resets WHERE campaign_key = v_key) THEN
    RETURN jsonb_build_object('success', true, 'alreadyReset', true, 'campaignKey', v_key);
  END IF;
  SELECT count(*) INTO v_count FROM public.students WHERE user_type = 'INTERNAL' AND is_active = true;
  SELECT count(*) INTO v_paths FROM public.learning_paths lp JOIN public.students s ON s.id = lp.student_id
    WHERE s.user_type = 'INTERNAL' AND s.is_active = true;
  IF v_count = 0 OR v_count <> v_paths THEN RAISE EXCEPTION 'RESET_PREFLIGHT_FAILED: students %, paths %', v_count, v_paths; END IF;
  INSERT INTO public.learning_campaign_resets (campaign_key, started_by, student_count) VALUES (v_key, p_actor_id, v_count);
  INSERT INTO public.learning_campaign_archives (campaign_key, student_id, learning_path, stage_progress, pre_tests, post_tests, analytics)
  SELECT v_key, s.id, to_jsonb(lp),
    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM public.student_stage_progress p WHERE p.student_id = s.id), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.created_at) FROM public.pre_tests p WHERE p.student_id = s.id), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.created_at) FROM public.post_tests p WHERE p.student_id = s.id), '[]'::jsonb),
    (SELECT to_jsonb(a) FROM public.analytics_summary a WHERE a.student_id = s.id)
  FROM public.students s JOIN public.learning_paths lp ON lp.student_id = s.id
  WHERE s.user_type = 'INTERNAL' AND s.is_active = true;
  GET DIAGNOSTICS v_saved = ROW_COUNT;
  IF v_saved <> v_count THEN RAISE EXCEPTION 'INCOMPLETE_ARCHIVE'; END IF;

  -- Only rows covered by this transaction's archive can be reset.
  UPDATE public.stage_attempts SET status = 'CANCELLED'
  WHERE status = 'ACTIVE' AND student_id IN (SELECT student_id FROM public.learning_campaign_archives WHERE campaign_key = v_key);
  DELETE FROM public.student_stage_progress WHERE student_id IN (SELECT student_id FROM public.learning_campaign_archives WHERE campaign_key = v_key);
  DELETE FROM public.pre_tests WHERE student_id IN (SELECT student_id FROM public.learning_campaign_archives WHERE campaign_key = v_key);
  DELETE FROM public.post_tests WHERE student_id IN (SELECT student_id FROM public.learning_campaign_archives WHERE campaign_key = v_key);
  UPDATE public.analytics_summary SET pretest_score = NULL, posttest_score = NULL, learning_gain = NULL,
    normalized_gain = NULL, last_updated_at = now()
  WHERE student_id IN (SELECT student_id FROM public.learning_campaign_archives WHERE campaign_key = v_key);
  UPDATE public.learning_paths SET current_stage = 1, campaign_completed_at = NULL, assessment_epoch = gen_random_uuid()
  WHERE student_id IN (SELECT student_id FROM public.learning_campaign_archives WHERE campaign_key = v_key);
  RETURN jsonb_build_object('success', true, 'alreadyReset', false, 'campaignKey', v_key, 'studentCount', v_count);
END $$;
REVOKE ALL ON FUNCTION public.restart_learning_campaign_v2(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restart_learning_campaign_v2(uuid) TO service_role;

-- Close the race where a request passed the HTTP pretest check before cutover
-- but finishes generating questions and inserts its attempt after cutover.
CREATE OR REPLACE FUNCTION public.guard_campaign_attempt_pretest()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'ACTIVE' AND EXISTS (
    SELECT 1 FROM public.students WHERE id = NEW.student_id AND user_type = 'INTERNAL'
  ) THEN
    PERFORM 1 FROM public.learning_paths WHERE student_id = NEW.student_id FOR UPDATE;
    IF EXISTS (SELECT 1 FROM public.learning_campaign_archives
      WHERE campaign_key = '2569-T2-restart-1' AND student_id = NEW.student_id)
      AND (SELECT count(*) FROM public.pre_tests WHERE student_id = NEW.student_id) < 5 THEN
      RAISE EXCEPTION 'PRETEST_REQUIRED';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_campaign_attempt_pretest() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_campaign_attempt_pretest() TO service_role;
DROP TRIGGER IF EXISTS campaign_attempt_pretest_guard ON public.stage_attempts;
CREATE TRIGGER campaign_attempt_pretest_guard BEFORE INSERT ON public.stage_attempts
FOR EACH ROW EXECUTE FUNCTION public.guard_campaign_attempt_pretest();
COMMIT;
