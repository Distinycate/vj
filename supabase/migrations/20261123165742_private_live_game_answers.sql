-- Install before rolling out the private campaign protocol. No existing attempt is modified.
BEGIN;
DO $$ BEGIN
  IF to_regprocedure('public.complete_stage_with_progression_v3(uuid,uuid,jsonb,timestamptz)') IS NULL
    OR to_regprocedure('public.record_attempt_hint_v3(uuid,uuid,uuid)') IS NULL
  THEN RAISE EXCEPTION 'Install the V3 progression and hint RPCs before the live game protocol'; END IF;
END $$;
ALTER TABLE public.stage_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stage_attempts FROM PUBLIC, anon, authenticated;
REVOKE SELECT (question_ids) ON public.stage_attempts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.stage_attempts TO service_role;
REVOKE EXECUTE ON FUNCTION public.complete_stage_with_progression_v3(uuid,uuid,jsonb,timestamptz),
  public.record_attempt_hint_v3(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_stage_with_progression_v3(uuid,uuid,jsonb,timestamptz),
  public.record_attempt_hint_v3(uuid,uuid,uuid) TO service_role;
CREATE TABLE IF NOT EXISTS public.live_game_answers (
  attempt_id uuid NOT NULL REFERENCES public.stage_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL,
  answer text NOT NULL,
  is_correct boolean NOT NULL,
  response_time_ms integer NOT NULL,
  PRIMARY KEY (attempt_id, question_id)
);
CREATE TABLE IF NOT EXISTS public.live_game_powerups (
  attempt_id uuid NOT NULL REFERENCES public.stage_attempts(id) ON DELETE CASCADE,
  item_code text NOT NULL,
  question_id uuid NOT NULL,
  remaining integer NOT NULL,
  PRIMARY KEY (attempt_id, item_code)
);
ALTER TABLE public.live_game_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_game_powerups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.live_game_answers,public.live_game_powerups FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT ON public.live_game_answers,public.live_game_powerups TO service_role;

CREATE OR REPLACE FUNCTION public.lock_private_game_attempt(p_attempt uuid,p_student uuid)
RETURNS public.stage_attempts LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_attempt public.stage_attempts%ROWTYPE;
BEGIN
  SELECT * INTO v_attempt FROM public.stage_attempts WHERE id=p_attempt AND student_id=p_student FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'LIVE_ATTEMPT_NOT_FOUND'; END IF;
  IF NOT coalesce((v_attempt.question_ids->0) ? 'public_id',false)
    THEN RAISE EXCEPTION 'LIVE_ATTEMPT_NOT_PRIVATE'; END IF;
  RETURN v_attempt;
END $$;

CREATE OR REPLACE FUNCTION public.submit_private_game_answer(p_attempt uuid,p_student uuid,p_question uuid,
  p_answer text,p_correct boolean,p_time integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_attempt public.stage_attempts%ROWTYPE; v_prior public.live_game_answers%ROWTYPE; v_count integer;
BEGIN
  v_attempt := public.lock_private_game_attempt(p_attempt,p_student);
  IF v_attempt.status<>'ACTIVE' OR v_attempt.expires_at<=now() THEN RAISE EXCEPTION 'LIVE_ATTEMPT_CLOSED'; END IF;
  SELECT * INTO v_prior FROM public.live_game_answers WHERE attempt_id=p_attempt AND question_id=p_question;
  IF FOUND THEN
    IF v_prior.answer IS DISTINCT FROM p_answer THEN RAISE EXCEPTION 'LIVE_ANSWER_LOCKED'; END IF;
    RETURN jsonb_build_object('correct',v_prior.is_correct);
  END IF;
  SELECT count(*) INTO v_count FROM public.live_game_answers WHERE attempt_id=p_attempt;
  IF (v_attempt.question_ids->v_count->>'public_id') IS DISTINCT FROM p_question::text THEN
    RAISE EXCEPTION 'LIVE_QUESTION_OUT_OF_ORDER';
  END IF;
  INSERT INTO public.live_game_answers VALUES(p_attempt,p_question,p_answer,p_correct,greatest(300,least(60000,p_time)));
  RETURN jsonb_build_object('correct',p_correct);
END $$;

CREATE OR REPLACE FUNCTION public.use_private_game_powerup(p_attempt uuid,p_student uuid,p_question uuid,p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_attempt public.stage_attempts%ROWTYPE; v_prior public.live_game_powerups%ROWTYPE; v_count integer;
  v_question jsonb; v_item uuid; v_stage uuid; v_remaining integer;
BEGIN
  v_attempt := public.lock_private_game_attempt(p_attempt,p_student);
  IF v_attempt.status<>'ACTIVE' OR v_attempt.expires_at<=now() THEN RAISE EXCEPTION 'LIVE_ATTEMPT_CLOSED'; END IF;
  SELECT * INTO v_prior FROM public.live_game_powerups WHERE attempt_id=p_attempt AND item_code=p_code;
  IF FOUND THEN
    IF v_prior.question_id IS DISTINCT FROM p_question THEN RAISE EXCEPTION 'LIVE_POWERUP_ALREADY_USED'; END IF;
    RETURN jsonb_build_object('remaining',v_prior.remaining);
  END IF;
  SELECT count(*) INTO v_count FROM public.live_game_answers WHERE attempt_id=p_attempt;
  v_question := v_attempt.question_ids->v_count;
  IF (v_question->>'public_id') IS DISTINCT FROM p_question::text THEN RAISE EXCEPTION 'LIVE_QUESTION_OUT_OF_ORDER'; END IF;
  IF p_code NOT IN ('TIME_FREEZE','EXTRA_LIFE','FIFTY_FIFTY','HINT')
    OR (p_code='FIFTY_FIFTY' AND coalesce(jsonb_array_length(v_question->'choices'),0)<4)
    OR (p_code='HINT' AND v_question->>'question_type'<>'spelling')
  THEN RAISE EXCEPTION 'LIVE_POWERUP_NOT_APPLICABLE'; END IF;
  SELECT id INTO v_item FROM public.items WHERE item_code=p_code;
  UPDATE public.student_inventory SET quantity=quantity-1
    WHERE student_id=p_student AND item_id=v_item AND quantity>0 RETURNING quantity INTO v_remaining;
  IF NOT FOUND THEN RAISE EXCEPTION 'LIVE_POWERUP_NO_STOCK'; END IF;
  SELECT id INTO v_stage FROM public.stages WHERE stage_number=v_attempt.stage_number;
  INSERT INTO public.item_usage_logs(student_id,item_id,stage_id,question_word)
    VALUES(p_student,v_item,v_stage,v_question->>'word');
  IF p_code IN ('FIFTY_FIFTY','HINT') THEN
    PERFORM public.record_attempt_hint_v3(p_student,p_attempt,(v_question->>'id')::uuid);
  END IF;
  INSERT INTO public.live_game_powerups VALUES(p_attempt,p_code,p_question,v_remaining);
  RETURN jsonb_build_object('remaining',v_remaining);
END $$;

CREATE OR REPLACE FUNCTION public.complete_private_game_stage(p_attempt uuid,p_student uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_attempt public.stage_attempts%ROWTYPE; v_results jsonb; v_result jsonb;
BEGIN
  v_attempt := public.lock_private_game_attempt(p_attempt,p_student);
  IF v_attempt.status<>'COMPLETED' AND (v_attempt.status<>'ACTIVE' OR v_attempt.expires_at<=now())
    THEN RAISE EXCEPTION 'LIVE_ATTEMPT_CLOSED'; END IF;
  SELECT jsonb_agg(jsonb_build_object('word_id',q.value->>'id','is_correct',coalesce(a.is_correct,false),
    'response_time_ms',coalesce(a.response_time_ms,60000)) ORDER BY q.ordinality)
    INTO v_results FROM jsonb_array_elements(v_attempt.question_ids) WITH ORDINALITY AS q(value,ordinality)
    LEFT JOIN public.live_game_answers a ON a.attempt_id=p_attempt AND a.question_id=(q.value->>'public_id')::uuid;
  v_result := public.complete_stage_with_progression_v3(p_attempt,p_student,v_results,now());
  IF coalesce((v_result->>'already_completed')::boolean,false) THEN
    v_result := v_result || jsonb_build_object('score',v_attempt.score);
  END IF;
  RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.lock_private_game_attempt(uuid,uuid), public.submit_private_game_answer(uuid,uuid,uuid,text,boolean,integer),
  public.use_private_game_powerup(uuid,uuid,uuid,text), public.complete_private_game_stage(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lock_private_game_attempt(uuid,uuid), public.submit_private_game_answer(uuid,uuid,uuid,text,boolean,integer),
  public.use_private_game_powerup(uuid,uuid,uuid,text), public.complete_private_game_stage(uuid,uuid) TO service_role;
COMMIT;
