-- ====================================================================
-- MIGRATION_MASTERY_V2.sql
-- Vocab Journey Phase 3.1 — Learning Engine V2 & Vocabulary Mastery System
-- Authoritative State Machine: LEARNING -> FAMILIAR -> MASTERED
-- Append-Only Academic Telemetry: word_attempt_history
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

REVOKE ALL ON public.word_attempt_history FROM PUBLIC, anon;
GRANT ALL ON public.word_attempt_history TO service_role;
GRANT SELECT ON public.word_attempt_history TO authenticated;

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

