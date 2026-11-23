BEGIN;

CREATE TABLE IF NOT EXISTS public.remedial_stage_submissions (
  participant_id uuid NOT NULL REFERENCES public.event_participants(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL,
  stage_number integer NOT NULL,
  score integer NOT NULL,
  result jsonb NOT NULL,
  PRIMARY KEY (participant_id, submission_id)
);

ALTER TABLE public.remedial_stage_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.remedial_stage_submissions FROM PUBLIC, anon, authenticated;
-- Both student and teacher flows use session-checked server routes.
REVOKE ALL ON public.event_participants, public.event_progress FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_participants, public.event_progress TO service_role;

CREATE OR REPLACE FUNCTION public.submit_remedial_stage_v1(
  p_run_id uuid, p_student_id uuid, p_template_id text,
  p_stage integer, p_score integer, p_submission_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_run public.event_runs%ROWTYPE;
  v_part public.event_participants%ROWTYPE;
  v_prior public.remedial_stage_submissions%ROWTYPE;
  v_count integer;
  v_finish boolean;
  v_first_finish boolean;
  v_status text;
  v_result jsonb;
BEGIN
  IF p_stage IS NULL OR p_stage NOT BETWEEN 1 AND 15
     OR p_score IS NULL OR p_score NOT BETWEEN 0 AND 10 OR p_submission_id IS NULL THEN
    RETURN jsonb_build_object('error','INVALID');
  END IF;

  -- Hold the run stable against teacher closure, then serialize one student's writes.
  SELECT * INTO v_run FROM public.event_runs WHERE id = p_run_id FOR SHARE;
  IF NOT FOUND OR v_run.template_id IS DISTINCT FROM p_template_id THEN
    RETURN jsonb_build_object('error','INACTIVE');
  END IF;

  SELECT * INTO v_part FROM public.event_participants
    WHERE event_run_id = p_run_id AND student_id = p_student_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','NOT_ASSIGNED'); END IF;

  SELECT * INTO v_prior FROM public.remedial_stage_submissions
    WHERE participant_id = v_part.id AND submission_id = p_submission_id;
  IF FOUND THEN
    IF v_prior.stage_number <> p_stage OR v_prior.score <> p_score THEN
      RETURN jsonb_build_object('error','ATTEMPT_CONFLICT');
    END IF;
    RETURN v_prior.result;
  END IF;

  IF v_run.status <> 'active' THEN RETURN jsonb_build_object('error','INACTIVE'); END IF;
  IF p_stage > v_part.target_stages THEN RETURN jsonb_build_object('error','OUT_OF_RANGE'); END IF;
  IF p_stage > 1 AND NOT EXISTS (
    SELECT 1 FROM public.event_progress WHERE event_run_id = p_run_id AND student_id = p_student_id
      AND stage_number = p_stage - 1 AND passed
  ) THEN
    RETURN jsonb_build_object('error','LOCKED');
  END IF;

  INSERT INTO public.event_progress AS progress
    (event_run_id, student_id, stage_number, best_score, attempts, passed, updated_at)
  VALUES (p_run_id, p_student_id, p_stage, p_score, 1, p_score >= 7, now())
  ON CONFLICT (event_run_id, student_id, stage_number) DO UPDATE SET
    best_score = greatest(progress.best_score, EXCLUDED.best_score),
    attempts = progress.attempts + 1,
    passed = progress.passed OR EXCLUDED.passed,
    updated_at = now();

  SELECT count(*) INTO v_count FROM public.event_progress
    WHERE event_run_id = p_run_id AND student_id = p_student_id AND passed
      AND stage_number BETWEEN 1 AND v_part.target_stages;
  v_finish := v_part.status = 'passed' OR v_count >= v_part.target_stages;
  v_first_finish := v_finish AND v_part.status <> 'passed';
  v_status := CASE WHEN v_finish THEN 'passed' ELSE 'in_progress' END;

  UPDATE public.event_participants SET
    completed_stages = greatest(completed_stages, v_count),
    total_attempts = total_attempts + 1,
    status = v_status,
    completed_at = CASE WHEN v_first_finish THEN now() ELSE completed_at END,
    teacher_seen = CASE WHEN v_first_finish THEN false ELSE teacher_seen END,
    updated_at = now()
  WHERE id = v_part.id;

  v_result := jsonb_build_object(
    'completedStages', greatest(v_part.completed_stages, v_count),
    'targetStages', v_part.target_stages,
    'isEventCompleted', v_finish, 'eventStatus', v_status
  );
  INSERT INTO public.remedial_stage_submissions(participant_id, submission_id, stage_number, score, result)
    VALUES (v_part.id, p_submission_id, p_stage, p_score, v_result);
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_remedial_stage_v1(uuid,uuid,text,integer,integer,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_remedial_stage_v1(uuid,uuid,text,integer,integer,uuid) TO service_role;
COMMIT;
