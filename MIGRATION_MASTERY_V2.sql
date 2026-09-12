-- ====================================================================
-- MIGRATION_MASTERY_V2.sql
-- Vocab Journey Phase 3.1 — Learning Engine V2 & Vocabulary Mastery System
-- Authoritative State Machine: LEARNING -> FAMILIAR -> MASTERED
-- Append-Only Academic Telemetry: word_attempt_history
--
-- ROLLBACK PROCEDURE (If ever needed to revert Phase 3.1):
-- 1. DROP TABLE IF EXISTS public.word_attempt_history CASCADE;
-- 2. DROP FUNCTION IF EXISTS public.complete_stage_with_mastery_v2 CASCADE;
-- 3. DROP FUNCTION IF EXISTS public.record_word_attempts_batch_v2 CASCADE;
-- 4. DROP FUNCTION IF EXISTS public.record_word_attempt_v2 CASCADE;
-- 4. ALTER TABLE public.user_review_words 
--    DROP COLUMN IF EXISTS mastery_status,
--    DROP COLUMN IF EXISTS review_step,
--    DROP COLUMN IF EXISTS attempt_count,
--    DROP COLUMN IF EXISTS correct_count,
--    DROP COLUMN IF EXISTS consecutive_correct,
--    DROP COLUMN IF EXISTS consecutive_wrong,
--    DROP COLUMN IF EXISTS mastery_score,
--    DROP COLUMN IF EXISTS successful_review_count,
--    DROP COLUMN IF EXISTS avg_response_time_ms,
--    DROP COLUMN IF EXISTS first_seen_at,
--    DROP COLUMN IF EXISTS last_seen_at,
--    DROP COLUMN IF EXISTS last_correct_at;
-- ====================================================================

-- 1. EXTEND user_review_words SCHEMA FOR MASTERY V2
DO $$
BEGIN
    -- mastery_status ('LEARNING', 'FAMILIAR', 'MASTERED')
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_review_words' AND column_name = 'mastery_status'
    ) THEN
        ALTER TABLE public.user_review_words 
        ADD COLUMN mastery_status text DEFAULT 'LEARNING' CHECK (mastery_status IN ('LEARNING', 'FAMILIAR', 'MASTERED'));
    END IF;

    -- review_step (0..5)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_review_words' AND column_name = 'review_step'
    ) THEN
        ALTER TABLE public.user_review_words 
        ADD COLUMN review_step integer DEFAULT 0 CHECK (review_step >= 0 AND review_step <= 5);
    END IF;

    -- attempt_count
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_review_words' AND column_name = 'attempt_count'
    ) THEN
        ALTER TABLE public.user_review_words 
        ADD COLUMN attempt_count integer DEFAULT 0;
    END IF;

    -- correct_count
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_review_words' AND column_name = 'correct_count'
    ) THEN
        ALTER TABLE public.user_review_words 
        ADD COLUMN correct_count integer DEFAULT 0;
    END IF;

    -- consecutive_correct
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_review_words' AND column_name = 'consecutive_correct'
    ) THEN
        ALTER TABLE public.user_review_words 
        ADD COLUMN consecutive_correct integer DEFAULT 0;
    END IF;

    -- consecutive_wrong
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_review_words' AND column_name = 'consecutive_wrong'
    ) THEN
        ALTER TABLE public.user_review_words 
        ADD COLUMN consecutive_wrong integer DEFAULT 0;
    END IF;

    -- mastery_score (0.00 .. 100.00)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_review_words' AND column_name = 'mastery_score'
    ) THEN
        ALTER TABLE public.user_review_words 
        ADD COLUMN mastery_score numeric(5,2) DEFAULT 0.00;
    END IF;

    -- successful_review_count
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_review_words' AND column_name = 'successful_review_count'
    ) THEN
        ALTER TABLE public.user_review_words 
        ADD COLUMN successful_review_count integer DEFAULT 0;
    END IF;

    -- avg_response_time_ms (clamped EWMA)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_review_words' AND column_name = 'avg_response_time_ms'
    ) THEN
        ALTER TABLE public.user_review_words 
        ADD COLUMN avg_response_time_ms integer DEFAULT 0;
    END IF;

    -- first_seen_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_review_words' AND column_name = 'first_seen_at'
    ) THEN
        ALTER TABLE public.user_review_words 
        ADD COLUMN first_seen_at timestamptz DEFAULT now();
    END IF;

    -- last_seen_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_review_words' AND column_name = 'last_seen_at'
    ) THEN
        ALTER TABLE public.user_review_words 
        ADD COLUMN last_seen_at timestamptz DEFAULT now();
    END IF;

    -- last_correct_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_review_words' AND column_name = 'last_correct_at'
    ) THEN
        ALTER TABLE public.user_review_words 
        ADD COLUMN last_correct_at timestamptz;
    END IF;
END $$;

-- 2. CREATE APPEND-ONLY ACADEMIC TELEMETRY TABLE (word_attempt_history)
CREATE TABLE IF NOT EXISTS public.word_attempt_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    stage_attempt_id uuid REFERENCES public.stage_attempts(id) ON DELETE SET NULL,
    word_id uuid NOT NULL REFERENCES public.vocabulary(id) ON DELETE CASCADE,
    answered_at timestamptz DEFAULT now() NOT NULL,
    is_correct boolean NOT NULL,
    response_time_ms integer NOT NULL,
    mastery_before text NOT NULL,
    mastery_after text NOT NULL,
    score_before numeric(5,2) NOT NULL,
    score_after numeric(5,2) NOT NULL,
    was_due_review boolean NOT NULL,
    review_step_before integer NOT NULL,
    review_step_after integer NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_review_words_student_due 
    ON public.user_review_words(user_id, next_review_at);

CREATE INDEX IF NOT EXISTS idx_user_review_words_status 
    ON public.user_review_words(user_id, mastery_status);

CREATE INDEX IF NOT EXISTS idx_word_attempt_history_student_time 
    ON public.word_attempt_history(student_id, answered_at DESC);

CREATE INDEX IF NOT EXISTS idx_word_attempt_history_word 
    ON public.word_attempt_history(student_id, word_id);

-- 3. ROW LEVEL SECURITY ON word_attempt_history
ALTER TABLE public.word_attempt_history ENABLE ROW LEVEL SECURITY;

-- Deny all direct client access (anon and authenticated) to prevent client-supplied student_id spoofing
REVOKE ALL ON public.word_attempt_history FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.word_attempt_history TO service_role;

-- Students read their historical telemetry exclusively through server endpoints
-- that enforce cryptographic session identity (session.subjectId)
DROP POLICY IF EXISTS "Students can view own attempt history" ON public.word_attempt_history;
CREATE POLICY "Students can view own attempt history" 
    ON public.word_attempt_history 
    FOR SELECT 
    TO authenticated 
    USING (student_id = auth.uid());

-- 4. CONSERVATIVE BACKFILL OF LEGACY user_review_words
-- Invariant: mastery_level 4 becomes FAMILIAR (never MASTERED without 24h review evidence)
UPDATE public.user_review_words
SET
    mastery_status = CASE
        WHEN COALESCE(mastery_level, 0) = 0 THEN 'LEARNING'
        ELSE 'FAMILIAR'
    END,
    review_step = CASE
        WHEN COALESCE(mastery_level, 0) = 0 THEN 0
        WHEN COALESCE(mastery_level, 0) BETWEEN 1 AND 3 THEN 2
        WHEN COALESCE(mastery_level, 0) >= 4 THEN 3
        ELSE 0
    END,
    mastery_score = CASE
        WHEN COALESCE(mastery_level, 0) = 0 THEN 30.00
        WHEN COALESCE(mastery_level, 0) BETWEEN 1 AND 3 THEN 65.00
        WHEN COALESCE(mastery_level, 0) >= 4 THEN 80.00
        ELSE 30.00
    END,
    attempt_count = GREATEST(1, COALESCE(wrong_count, 0) + CASE WHEN COALESCE(mastery_level, 0) > 0 THEN mastery_level * 2 ELSE 1 END),
    correct_count = CASE WHEN COALESCE(mastery_level, 0) > 0 THEN mastery_level * 2 ELSE 0 END,
    consecutive_correct = CASE WHEN COALESCE(mastery_level, 0) > 0 THEN 2 ELSE 0 END,
    consecutive_wrong = 0,
    first_seen_at = COALESCE(first_seen_at, last_wrong_at, now()),
    last_seen_at = COALESCE(last_seen_at, last_wrong_at, now())
WHERE mastery_score = 0.00 OR mastery_status IS NULL;

-- 5. FUNCTION: record_word_attempt_v2 (Atomic state machine & append-only history)
CREATE OR REPLACE FUNCTION public.record_word_attempt_v2(
    p_student_id uuid,
    p_stage_attempt_id uuid,
    p_word_id uuid,
    p_is_correct boolean,
    p_response_time_ms integer,
    p_now timestamptz DEFAULT now()
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_existing public.user_review_words%ROWTYPE;
    v_clamped_time integer;
    v_is_new boolean;
    v_was_due boolean;
    v_new_avg_time integer;
    v_attempt_count integer;
    v_correct_count integer;
    v_wrong_count integer;
    v_consecutive_correct integer;
    v_consecutive_wrong integer;
    v_successful_review_count integer;
    v_review_step integer;
    v_mastery_status text;
    v_first_seen_at timestamptz;
    v_accuracy_rate numeric;
    v_base_accuracy numeric;
    v_streak_bonus numeric;
    v_fluency_mod numeric;
    v_raw_score numeric;
    v_final_score numeric;
    v_retention_interval interval;
    v_next_interval_hours integer;
    v_next_review_at timestamptz;
    v_status_before text;
    v_score_before numeric(5,2);
    v_step_before integer;
BEGIN
    -- Clamp response time (300ms to 60,000ms)
    v_clamped_time := GREATEST(300, LEAST(60000, COALESCE(p_response_time_ms, 1500)));

    -- Lock and retrieve existing record
    SELECT * INTO v_existing
    FROM public.user_review_words
    WHERE user_id = p_student_id AND word_id = p_word_id
    FOR UPDATE;

    IF NOT FOUND THEN
        v_is_new := true;
        v_was_due := true;
        v_status_before := 'NEW';
        v_score_before := 0.00;
        v_step_before := 0;
        v_first_seen_at := p_now;
        v_new_avg_time := v_clamped_time;
        v_attempt_count := 1;
        v_correct_count := CASE WHEN p_is_correct THEN 1 ELSE 0 END;
        v_wrong_count := CASE WHEN p_is_correct THEN 0 ELSE 1 END;
        v_consecutive_correct := CASE WHEN p_is_correct THEN 1 ELSE 0 END;
        v_consecutive_wrong := CASE WHEN p_is_correct THEN 0 ELSE 1 END;
        v_successful_review_count := CASE WHEN p_is_correct THEN 1 ELSE 0 END;
        v_review_step := CASE WHEN p_is_correct THEN 1 ELSE 0 END;
        v_mastery_status := 'LEARNING';
    ELSE
        v_is_new := false;
        v_was_due := (v_existing.next_review_at IS NULL OR p_now >= v_existing.next_review_at);
        v_status_before := COALESCE(v_existing.mastery_status, 'LEARNING');
        v_score_before := COALESCE(v_existing.mastery_score, 0.00);
        v_step_before := COALESCE(v_existing.review_step, 0);
        v_first_seen_at := COALESCE(v_existing.first_seen_at, p_now);

        -- EWMA: 0.3 * current + 0.7 * old
        IF COALESCE(v_existing.avg_response_time_ms, 0) <= 0 THEN
            v_new_avg_time := v_clamped_time;
        ELSE
            v_new_avg_time := round(0.3 * v_clamped_time + 0.7 * v_existing.avg_response_time_ms);
        END IF;

        v_attempt_count := COALESCE(v_existing.attempt_count, 0) + 1;
        v_correct_count := COALESCE(v_existing.correct_count, 0) + (CASE WHEN p_is_correct THEN 1 ELSE 0 END);
        v_wrong_count := COALESCE(v_existing.wrong_count, 0) + (CASE WHEN p_is_correct THEN 0 ELSE 1 END);
        v_consecutive_correct := CASE WHEN p_is_correct THEN COALESCE(v_existing.consecutive_correct, 0) + 1 ELSE 0 END;
        v_consecutive_wrong := CASE WHEN p_is_correct THEN 0 ELSE COALESCE(v_existing.consecutive_wrong, 0) + 1 END;
        v_successful_review_count := COALESCE(v_existing.successful_review_count, 0);
        v_review_step := COALESCE(v_existing.review_step, 0);
        v_mastery_status := COALESCE(v_existing.mastery_status, 'LEARNING');

        IF p_is_correct THEN
            IF v_was_due THEN
                v_successful_review_count := v_successful_review_count + 1;
                v_review_step := LEAST(5, v_review_step + 1);
            END IF;
        ELSE
            -- Demotion rules
            IF v_mastery_status = 'MASTERED' THEN
                v_mastery_status := 'FAMILIAR';
                v_review_step := 2;
            ELSIF v_mastery_status = 'FAMILIAR' THEN
                IF v_consecutive_wrong >= 2 THEN
                    v_mastery_status := 'LEARNING';
                    v_review_step := 0;
                ELSE
                    v_review_step := 1;
                END IF;
            ELSE
                v_review_step := 0;
            END IF;
        END IF;
    END IF;

    -- Calculate Raw Score
    v_accuracy_rate := v_correct_count::numeric / v_attempt_count::numeric;
    v_base_accuracy := v_accuracy_rate * 70.0;
    v_streak_bonus := LEAST(20.0, v_consecutive_correct::numeric * 4.0);
    
    IF v_new_avg_time <= 2500 THEN
        v_fluency_mod := 10.0;
    ELSIF v_new_avg_time <= 5000 THEN
        v_fluency_mod := 5.0;
    ELSIF v_new_avg_time <= 10000 THEN
        v_fluency_mod := 0.0;
    ELSE
        v_fluency_mod := -5.0;
    END IF;

    v_raw_score := GREATEST(0.0, LEAST(100.0, v_base_accuracy + v_streak_bonus + v_fluency_mod));

    -- Promotion Check (only if correct)
    IF p_is_correct THEN
        v_retention_interval := p_now - v_first_seen_at;
        
        -- Criteria for MASTERED:
        -- 1. consecutive_correct >= 5
        -- 2. raw_score >= 85
        -- 3. successful_review_count >= 1
        -- 4. retention >= 24 hours
        IF v_consecutive_correct >= 5 
           AND v_raw_score >= 85.0 
           AND v_successful_review_count >= 1 
           AND v_retention_interval >= interval '24 hours' THEN
            v_mastery_status := 'MASTERED';
        ELSIF v_mastery_status = 'LEARNING' 
              AND v_consecutive_correct >= 3 
              AND v_raw_score >= 60.0 THEN
            v_mastery_status := 'FAMILIAR';
            IF v_review_step < 2 THEN
                v_review_step := 2;
            END IF;
        END IF;
    END IF;

    -- Final score bounds formatted for status
    v_final_score := v_raw_score;
    IF v_mastery_status = 'MASTERED' THEN
        v_final_score := GREATEST(85.00, v_final_score);
    ELSIF v_mastery_status = 'FAMILIAR' THEN
        v_final_score := GREATEST(50.00, LEAST(84.99, v_final_score));
    ELSE
        v_final_score := LEAST(65.00, v_final_score);
    END IF;

    -- Next review schedule (0: 4h, 1: 24h, 2: 72h, 3: 168h, 4: 336h, 5: 720h)
    v_next_interval_hours := CASE v_review_step
        WHEN 0 THEN 4
        WHEN 1 THEN 24
        WHEN 2 THEN 72
        WHEN 3 THEN 168
        WHEN 4 THEN 336
        ELSE 720
    END;

    IF NOT p_is_correct THEN
        v_next_review_at := p_now; -- immediate review due
    ELSE
        v_next_review_at := p_now + (v_next_interval_hours || ' hours')::interval;
    END IF;

    -- Upsert user_review_words
    INSERT INTO public.user_review_words (
        user_id, word_id, mastery_status, review_step,
        attempt_count, correct_count, wrong_count,
        consecutive_correct, consecutive_wrong,
        mastery_score, successful_review_count, avg_response_time_ms,
        first_seen_at, last_seen_at, last_correct_at, last_wrong_at,
        next_review_at
    ) VALUES (
        p_student_id, p_word_id, v_mastery_status, v_review_step,
        v_attempt_count, v_correct_count, v_wrong_count,
        v_consecutive_correct, v_consecutive_wrong,
        v_final_score, v_successful_review_count, v_new_avg_time,
        v_first_seen_at, p_now,
        CASE WHEN p_is_correct THEN p_now ELSE NULL END,
        CASE WHEN NOT p_is_correct THEN p_now ELSE NULL END,
        v_next_review_at
    )
    ON CONFLICT (user_id, word_id) DO UPDATE
    SET
        mastery_status = EXCLUDED.mastery_status,
        review_step = EXCLUDED.review_step,
        attempt_count = EXCLUDED.attempt_count,
        correct_count = EXCLUDED.correct_count,
        wrong_count = EXCLUDED.wrong_count,
        consecutive_correct = EXCLUDED.consecutive_correct,
        consecutive_wrong = EXCLUDED.consecutive_wrong,
        mastery_score = EXCLUDED.mastery_score,
        successful_review_count = EXCLUDED.successful_review_count,
        avg_response_time_ms = EXCLUDED.avg_response_time_ms,
        last_seen_at = EXCLUDED.last_seen_at,
        last_correct_at = COALESCE(EXCLUDED.last_correct_at, public.user_review_words.last_correct_at),
        last_wrong_at = COALESCE(EXCLUDED.last_wrong_at, public.user_review_words.last_wrong_at),
        next_review_at = EXCLUDED.next_review_at;

    -- Write Append-Only Audit History
    INSERT INTO public.word_attempt_history (
        student_id, stage_attempt_id, word_id, answered_at,
        is_correct, response_time_ms,
        mastery_before, mastery_after,
        score_before, score_after,
        was_due_review, review_step_before, review_step_after
    ) VALUES (
        p_student_id, p_stage_attempt_id, p_word_id, p_now,
        p_is_correct, v_clamped_time,
        v_status_before, v_mastery_status,
        v_score_before, v_final_score,
        v_was_due, v_step_before, v_review_step
    );

    RETURN jsonb_build_object(
        'word_id', p_word_id,
        'is_correct', p_is_correct,
        'mastery_status', v_mastery_status,
        'review_step', v_review_step,
        'mastery_score', v_final_score,
        'was_due_review', v_was_due,
        'next_review_at', v_next_review_at
    );
END;
$$;

-- 6. FUNCTION: record_word_attempts_batch_v2 (Process all stage questions in one call)
CREATE OR REPLACE FUNCTION public.record_word_attempts_batch_v2(
    p_student_id uuid,
    p_stage_attempt_id uuid,
    p_attempts jsonb,
    p_now timestamptz DEFAULT now()
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_item jsonb;
    v_result jsonb;
    v_results jsonb := '[]'::jsonb;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_attempts)
    LOOP
        v_result := public.record_word_attempt_v2(
            p_student_id,
            p_stage_attempt_id,
            (v_item->>'word_id')::uuid,
            (v_item->>'is_correct')::boolean,
            (v_item->>'response_time_ms')::integer,
            p_now
        );
        v_results := v_results || jsonb_build_array(v_result);
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'count', jsonb_array_length(v_results),
        'results', v_results
    );
END;
$$;

-- Grant execution to service_role
REVOKE ALL ON FUNCTION public.record_word_attempt_v2 FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_word_attempt_v2 TO service_role;

REVOKE ALL ON FUNCTION public.record_word_attempts_batch_v2 FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_word_attempts_batch_v2 TO service_role;

-- 7. ATOMIC UNIFIED STAGE COMPLETION & MASTERY RPC (Type A: Single Atomic Transaction)
-- Bundles stage_attempt + economy_transactions + user_review_words + word_attempt_history
-- in ONE atomic transaction with zero split-brain and full idempotency protection.
CREATE OR REPLACE FUNCTION public.complete_stage_with_mastery_v2(
    p_attempt_id uuid,
    p_student_id uuid,
    p_stage_number integer,
    p_score integer,
    p_total_questions integer,
    p_accuracy numeric,
    p_passed boolean,
    p_used_hints integer,
    p_response_time_avg numeric,
    p_mission_level integer,
    p_wrong_word_ids uuid[],
    p_correct_word_ids uuid[],
    p_word_attempts jsonb,
    p_now timestamptz DEFAULT now()
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_attempt public.stage_attempts%ROWTYPE;
    v_path public.learning_paths%ROWTYPE;
    v_is_boss boolean;
    v_earned_coins integer := 0;
    v_earned_exp integer := 0;
    v_new_coins integer;
    v_new_exp integer;
    v_new_total_exp integer;
    v_next_stage integer;
    v_star_multiplier numeric := 1.0;
    v_previous_max_stars integer := 0;
    v_is_replay boolean;
    v_word_id uuid;
    v_item jsonb;
    v_mastery_result jsonb;
    v_mastery_results jsonb := '[]'::jsonb;
BEGIN
    -- 1. Validate & Lock Attempt for Idempotency
    SELECT * INTO v_attempt
    FROM public.stage_attempts
    WHERE id = p_attempt_id AND student_id = p_student_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'STAGE_ATTEMPT_NOT_FOUND';
    END IF;

    -- If already completed, return cached state without re-awarding and without re-recording mastery
    IF v_attempt.status = 'COMPLETED' THEN
        SELECT * INTO v_path FROM public.learning_paths WHERE student_id = p_student_id;
        RETURN jsonb_build_object(
            'already_completed', true,
            'passed', (v_attempt.accuracy >= 60),
            'score', v_attempt.score,
            'accuracy', v_attempt.accuracy,
            'earned_coins', v_attempt.coins_awarded,
            'earned_exp', v_attempt.exp_awarded,
            'current_stage', v_path.current_stage
        );
    END IF;

    -- 2. Lock learning_paths
    SELECT * INTO v_path
    FROM public.learning_paths
    WHERE student_id = p_student_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'LEARNING_PATH_NOT_FOUND';
    END IF;

    v_is_boss := (p_stage_number % 10 = 0);
    v_is_replay := (p_stage_number < COALESCE(v_path.current_stage, 1));

    -- 3. Calculate rewards on server (Anti-cheat)
    IF p_passed THEN
        -- Base coins & EXP by rank
        v_earned_coins := CASE COALESCE(v_path.current_rank, 1)
            WHEN 1 THEN 30
            WHEN 2 THEN 40
            WHEN 3 THEN 50
            WHEN 4 THEN 60
            ELSE 70
        END;
        v_earned_exp := 15 * CASE COALESCE(v_path.current_rank, 1)
            WHEN 1 THEN 1.0
            WHEN 2 THEN 1.0
            WHEN 3 THEN 1.2
            WHEN 4 THEN 1.4
            WHEN 5 THEN 1.7
            ELSE 2.0
        END;

        IF v_is_boss THEN
            v_earned_coins := v_earned_coins * 2;
            v_earned_exp := v_earned_exp * 2;
        END IF;

        IF p_used_hints = 0 THEN
            v_earned_coins := round(v_earned_coins * 1.2);
            v_earned_exp := round(v_earned_exp * 1.2);
        END IF;

        IF p_accuracy >= 100 THEN
            v_earned_coins := round(v_earned_coins * 1.3);
            v_earned_exp := round(v_earned_exp * 1.3);
        END IF;

        -- Replay and star multipliers
        SELECT COALESCE(MAX(stars), 0) INTO v_previous_max_stars
        FROM public.stage_results
        WHERE user_id = p_student_id AND stage_number = p_stage_number;

        IF p_mission_level = 1 AND v_previous_max_stars = 0 THEN
            v_star_multiplier := 1.0;
        ELSIF p_mission_level = 2 AND v_previous_max_stars < 2 THEN
            v_star_multiplier := 0.3;
        ELSIF p_mission_level = 3 AND v_previous_max_stars < 3 THEN
            v_star_multiplier := 0.5;
        ELSIF v_is_replay THEN
            v_star_multiplier := 0.1; -- Replay without star upgrade (Anti-farming)
        END IF;

        v_earned_coins := round(v_earned_coins * v_star_multiplier);
        v_earned_exp := round(v_earned_exp * v_star_multiplier);
    END IF;

    -- 4. Advance progress without regressing replay stages
    v_new_coins := COALESCE(v_path.coins, 0) + v_earned_coins;
    v_new_exp := COALESCE(v_path.exp, 0) + v_earned_exp;
    v_new_total_exp := COALESCE(v_path.total_exp, v_path.exp, 0) + v_earned_exp;
    
    IF p_passed THEN
        v_next_stage := LEAST(100, GREATEST(COALESCE(v_path.current_stage, 1), p_stage_number + 1));
    ELSE
        v_next_stage := COALESCE(v_path.current_stage, 1);
    END IF;

    UPDATE public.learning_paths
    SET coins = v_new_coins,
        exp = v_new_exp,
        total_exp = v_new_total_exp,
        current_stage = v_next_stage,
        last_active_date = p_now
    WHERE student_id = p_student_id;

    -- 5. Mark attempt completed
    UPDATE public.stage_attempts
    SET status = 'COMPLETED',
        score = p_score,
        accuracy = p_accuracy,
        coins_awarded = v_earned_coins,
        exp_awarded = v_earned_exp,
        completed_at = p_now
    WHERE id = p_attempt_id;

    -- 6. Insert into stage_results
    INSERT INTO public.stage_results (
        user_id, stage_number, rank_at_play, score, accuracy,
        response_time_avg, passed, used_hints, stars
    ) VALUES (
        p_student_id, p_stage_number, COALESCE(v_path.current_rank, 1),
        p_score, p_accuracy, p_response_time_avg, p_passed, p_used_hints,
        CASE WHEN p_passed THEN p_mission_level ELSE 0 END
    );

    -- 7. Log economy transaction
    IF v_earned_coins > 0 OR v_earned_exp > 0 THEN
        INSERT INTO public.economy_transactions (
            student_id, transaction_type, source, reference_id,
            coins_delta, exp_delta, balance_after, metadata
        ) VALUES (
            p_student_id, 'STAGE_REWARD', 'STAGE', p_attempt_id::text,
            v_earned_coins, v_earned_exp,
            jsonb_build_object('coins', v_new_coins, 'total_exp', v_new_total_exp),
            jsonb_build_object('stage_number', p_stage_number, 'stars', p_mission_level, 'passed', p_passed)
        );
    END IF;

    -- 8. Upsert wrong words
    IF p_wrong_word_ids IS NOT NULL AND array_length(p_wrong_word_ids, 1) > 0 THEN
        FOREACH v_word_id IN ARRAY p_wrong_word_ids LOOP
            INSERT INTO public.wrong_words (student_id, word_id, error_count, last_attempt_at)
            VALUES (p_student_id, v_word_id, 1, p_now)
            ON CONFLICT (student_id, word_id) DO UPDATE
            SET error_count = public.wrong_words.error_count + 1,
                last_attempt_at = p_now;
        END LOOP;
    END IF;

    -- 9. ATOMIC MASTERY TELEMETRY & HISTORY (Executed within same transaction)
    IF p_word_attempts IS NOT NULL AND jsonb_array_length(p_word_attempts) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_word_attempts)
        LOOP
            v_mastery_result := public.record_word_attempt_v2(
                p_student_id,
                p_attempt_id,
                (v_item->>'word_id')::uuid,
                (v_item->>'is_correct')::boolean,
                (v_item->>'response_time_ms')::integer,
                p_now
            );
            v_mastery_results := v_mastery_results || jsonb_build_array(v_mastery_result);
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'passed', p_passed,
        'earned_coins', v_earned_coins,
        'earned_exp', v_earned_exp,
        'new_coins', v_new_coins,
        'new_total_exp', v_new_total_exp,
        'current_stage', v_next_stage,
        'mastery_results', v_mastery_results
    );
END;
$$;

-- Revoke from public/anon/authenticated and grant exclusively to service_role
REVOKE ALL ON FUNCTION public.complete_stage_with_mastery_v2 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_stage_with_mastery_v2 TO service_role;


