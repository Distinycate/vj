BEGIN;
ALTER TABLE public.post_tests ADD COLUMN IF NOT EXISTS stage_checkpoint integer
  CHECK (stage_checkpoint BETWEEN 10 AND 100 AND stage_checkpoint % 10 = 0);

CREATE OR REPLACE FUNCTION public.submit_checkpoint_posttest(
  p_student_id uuid, p_epoch uuid, p_submission_id uuid, p_score integer,
  p_total integer, p_duration integer, p_checkpoint integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_result jsonb; v_existing integer;
BEGIN
  PERFORM 1 FROM public.learning_paths WHERE student_id=p_student_id FOR UPDATE;
  IF NOT EXISTS (SELECT 1 FROM public.learning_paths WHERE student_id=p_student_id AND assessment_epoch=p_epoch) THEN
    RAISE EXCEPTION 'ASSESSMENT_SEASON_CHANGED';
  END IF;
  IF p_checkpoint IS NULL OR p_checkpoint NOT BETWEEN 10 AND 100 OR p_checkpoint % 10 <> 0
    OR NOT EXISTS (SELECT 1 FROM public.students WHERE id=p_student_id AND user_type='INTERNAL' AND is_active)
    OR NOT EXISTS (SELECT 1 FROM public.student_stage_progress
      WHERE student_id=p_student_id AND stage_number=p_checkpoint AND completed) THEN
    RAISE EXCEPTION 'ASSESSMENT_CHECKPOINT_LOCKED';
  END IF;
  SELECT stage_checkpoint INTO v_existing FROM public.post_tests WHERE id=p_submission_id AND student_id=p_student_id;
  IF FOUND AND v_existing IS DISTINCT FROM p_checkpoint THEN RAISE EXCEPTION 'ASSESSMENT_ID_CONFLICT'; END IF;
  v_result := public.submit_assessment_v2(p_student_id,p_epoch,p_submission_id,'POST_TEST',p_score,p_total,p_duration);
  UPDATE public.post_tests SET stage_checkpoint=p_checkpoint WHERE id=p_submission_id AND student_id=p_student_id;
  RETURN v_result || jsonb_build_object('stageCheckpoint',p_checkpoint);
END $$;
REVOKE ALL ON FUNCTION public.submit_checkpoint_posttest(uuid,uuid,uuid,integer,integer,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_checkpoint_posttest(uuid,uuid,uuid,integer,integer,integer,integer) TO service_role;
COMMIT;
