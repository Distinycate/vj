-- ====================================================================
-- MIGRATION_RANK_AND_PASS_SCORE_UPDATE.sql
-- Rank Promotion & Tiered Pass Score Thresholds
--
-- SPECIFICATION:
--   Rank 1 (Bronze):   Stages 1–20   => Pass Score 60%
--   Rank 2 (Silver):   Stages 21–40  => Pass Score 70%
--   Rank 3 (Gold):     Stages 41–60  => Pass Score 80%
--   Rank 4 (Platinum): Stages 61–80  => Pass Score 90%
--   Rank 5 (Diamond):  Stages 81–100 => Pass Score 100%
--
-- 1. Updates complete_stage_with_progression_v3 with dynamic pass threshold
--    and automatic current_rank & rank_updated_at updates.
-- 2. Backfills learning_paths.current_rank for all existing students.
-- ====================================================================

-- ── PART 1: REPLACE complete_stage_with_progression_v3 ───────────────
CREATE OR REPLACE FUNCTION public.complete_stage_with_progression_v3(
    p_attempt_id            uuid,
    p_student_id            uuid,
    p_word_attempts         jsonb,
    p_now                   timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_attempt               public.stage_attempts%ROWTYPE;
    v_stage                 public.stages%ROWTYPE;
    v_stage_number          integer;
    v_stage_id              uuid;
    v_stage_type            text;

    v_total_questions       integer;
    v_correct_count         integer := 0;
    v_score                 integer;
    v_accuracy              numeric(5,2);
    v_response_time_sum     bigint := 0;
    v_response_time_avg_ms  integer;
    v_item                  jsonb;
    v_clamped_time          integer;

    v_authoritative_hints   integer;
    v_earned_stars          integer;
    v_trusted_perf_tier     text;

    v_path                  public.learning_paths%ROWTYPE;
    v_existing_progress     public.student_stage_progress%ROWTYPE;
    v_found_existing        boolean := false;
    v_is_first_clear        boolean;
    v_prev_best_stars       integer := 0;
    v_new_best_stars        integer;
    v_new_best_accuracy     numeric(5,2);
    v_completed             boolean;
    v_first_passed_at       timestamptz;
    v_next_stage            integer;
    v_next_rank             integer;
    v_pass_threshold        integer;

    v_primary_reason        text;
    v_bonus_flags           text[] := '{}';
    v_base_reward_coins     integer;
    v_base_reward_exp       integer;
    v_bonus_coins           integer := 0;
    v_earned_coins          integer;
    v_earned_exp            integer;
    v_new_coins             integer;
    v_new_exp               integer;
    v_new_total_exp         integer;

    v_boss_defeated         boolean := false;
    v_damage                integer := 0;
    v_remaining_hp          integer := 100;

    v_mastery_result        jsonb;
    v_mastery_results       jsonb := '[]'::jsonb;
    v_passed                boolean;
    v_word_id               uuid;
BEGIN
    -- STEP 1: Lock attempt, verify ownership, check idempotency
    SELECT * INTO v_attempt
    FROM public.stage_attempts
    WHERE id = p_attempt_id AND student_id = p_student_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'COMPLETION_ATTEMPT_NOT_FOUND: attempt % not found for student %',
            p_attempt_id, p_student_id;
    END IF;

    IF v_attempt.status = 'COMPLETED' THEN
        SELECT * INTO v_path FROM public.learning_paths WHERE student_id = p_student_id;
        RETURN jsonb_build_object(
            'success',            true,
            'already_completed',  true,
            'passed',             COALESCE(v_attempt.accuracy, 0) >= 60,
            'stars',              COALESCE(v_attempt.stars, 0),
            'earned_coins',       COALESCE(v_attempt.coins_awarded, 0),
            'earned_exp',         COALESCE(v_attempt.exp_awarded, 0),
            'new_coins',          COALESCE(v_path.coins, 0),
            'new_total_exp',      COALESCE(v_path.total_exp, 0),
            'current_stage',      COALESCE(v_path.current_stage, v_attempt.stage_number),
            'current_rank',       COALESCE(v_path.current_rank, 1),
            'campaign_completed', v_path.campaign_completed_at IS NOT NULL
        );
    END IF;

    -- STEP 2: Verify not expired
    IF v_attempt.expires_at IS NOT NULL AND v_attempt.expires_at < p_now THEN
        UPDATE public.stage_attempts SET status = 'EXPIRED' WHERE id = p_attempt_id;
        RAISE EXCEPTION 'COMPLETION_ATTEMPT_EXPIRED: attempt % expired at %',
            p_attempt_id, v_attempt.expires_at;
    END IF;

    v_stage_number := v_attempt.stage_number;

    -- STEP 3: Resolve stage row
    IF v_attempt.stage_id IS NOT NULL THEN
        SELECT * INTO v_stage FROM public.stages WHERE id = v_attempt.stage_id;
    ELSE
        SELECT * INTO v_stage FROM public.stages WHERE stage_number = v_stage_number;
    END IF;

    IF FOUND THEN
        v_stage_id   := v_stage.id;
    ELSE
        v_stage_id   := NULL;
    END IF;

    v_stage_type := CASE
        WHEN v_stage_number = 100               THEN 'FINAL_BOSS'
        WHEN v_stage_number % 10 = 0            THEN 'WORLD_BOSS'
        WHEN v_stage_number % 10 = 5            THEN 'MINI_BOSS'
        ELSE                                         'NORMAL'
    END;

    -- STEP 3.5: Read authoritative hint count
    SELECT COUNT(*) INTO v_authoritative_hints FROM public.attempt_hint_events WHERE stage_attempt_id = p_attempt_id;

    IF v_authoritative_hints = 0 AND v_attempt.hint_count IS NOT NULL THEN
        v_authoritative_hints := v_attempt.hint_count;
    END IF;

    -- STEP 4: Evaluate answers
    v_total_questions := jsonb_array_length(v_attempt.question_ids);

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_word_attempts)
    LOOP
        IF (v_item->>'is_correct')::boolean THEN
            v_correct_count := v_correct_count + 1;
        END IF;
        v_clamped_time := GREATEST(300, LEAST(60000,
            COALESCE((v_item->>'response_time_ms')::integer, 1500)));
        v_response_time_sum := v_response_time_sum + v_clamped_time;
    END LOOP;

    IF v_total_questions > 0 THEN
        v_accuracy := ROUND((v_correct_count::numeric / v_total_questions::numeric) * 100, 2);
        v_response_time_avg_ms := ROUND(v_response_time_sum::numeric / v_total_questions);
    ELSE
        v_accuracy := 0;
        v_response_time_avg_ms := 1500;
    END IF;

    -- Dynamic pass threshold based on stage rank
    v_pass_threshold := CASE
        WHEN v_stage_number >= 81 THEN 100
        WHEN v_stage_number >= 61 THEN 90
        WHEN v_stage_number >= 41 THEN 80
        WHEN v_stage_number >= 21 THEN 70
        ELSE 60
    END;

    v_score  := v_correct_count;
    v_passed := (v_accuracy >= v_pass_threshold) AND (v_correct_count > 0);

    -- STEP 5: Compute stars and performance tier
    v_earned_stars := CASE
        WHEN NOT v_passed                                                        THEN 0
        WHEN v_accuracy >= 100
             AND v_authoritative_hints = 0
             AND v_response_time_avg_ms <= 12000                                THEN 3
        WHEN v_accuracy >= v_pass_threshold AND v_authoritative_hints <= 1      THEN 2
        ELSE                                                                         1
    END;

    v_trusted_perf_tier := CASE
        WHEN NOT v_passed                                      THEN 'FAILED'
        WHEN v_accuracy >= 80 AND v_authoritative_hints <= 1  THEN 'SKILLED'
        ELSE                                                        'PASSED'
    END;

    -- STEP 6: Lock learning_paths
    SELECT * INTO v_path FROM public.learning_paths
    WHERE student_id = p_student_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'COMPLETION_LEARNING_PATH_NOT_FOUND: no learning_path for student %', p_student_id;
    END IF;

    IF v_stage_id IS NOT NULL THEN
        SELECT * INTO v_existing_progress
        FROM public.student_stage_progress
        WHERE student_id = p_student_id AND stage_id = v_stage_id
        FOR UPDATE;
        v_found_existing := FOUND;
    END IF;

    -- STEP 7: Classify first clear vs replay
    IF v_found_existing AND v_existing_progress.completed THEN
        v_is_first_clear  := false;
        v_prev_best_stars := COALESCE(v_existing_progress.best_stars, 0);
    ELSE
        v_is_first_clear  := v_passed;
        v_prev_best_stars := 0;
    END IF;

    -- STEP 8: Economy calculation
    IF v_stage_type = 'FINAL_BOSS' THEN
        v_base_reward_coins := 100;
        v_base_reward_exp   := 200;
    ELSIF v_stage_type = 'WORLD_BOSS' THEN
        v_base_reward_coins := 50;
        v_base_reward_exp   := 100;
    ELSIF v_stage_type = 'MINI_BOSS' THEN
        v_base_reward_coins := 25;
        v_base_reward_exp   := 50;
    ELSE
        v_base_reward_coins := 10;
        v_base_reward_exp   := 20;
    END IF;

    IF NOT v_passed THEN
        v_primary_reason    := 'FAILED';
        v_earned_coins      := 0;
        v_earned_exp        := 0;
    ELSIF v_is_first_clear THEN
        v_primary_reason    := 'FIRST_CLEAR';
        v_bonus_coins       := 0;

        IF v_accuracy = 100 THEN
            v_bonus_flags := array_append(v_bonus_flags, 'PERFECT_ACCURACY');
            v_bonus_coins := v_bonus_coins + 15;
        END IF;

        IF v_authoritative_hints = 0 THEN
            v_bonus_flags := array_append(v_bonus_flags, 'NO_HINTS');
            v_bonus_coins := v_bonus_coins + 10;
        END IF;

        IF v_stage_type = 'FINAL_BOSS' THEN
            v_bonus_flags := array_append(v_bonus_flags, 'FINAL_BOSS_CLEAR');
        END IF;

        v_earned_coins := v_base_reward_coins + v_bonus_coins;
        v_earned_exp   := v_base_reward_exp;
    ELSE
        v_new_best_stars := GREATEST(v_prev_best_stars, v_earned_stars);
        IF v_new_best_stars > v_prev_best_stars THEN
            v_primary_reason := 'STAR_IMPROVEMENT';
            v_earned_coins   := (v_new_best_stars - v_prev_best_stars) * 5;
            v_earned_exp     := (v_new_best_stars - v_prev_best_stars) * 10;
            v_bonus_flags    := array_append(v_bonus_flags, 'STAR_UPGRADE');
        ELSE
            v_primary_reason := 'REPLAY_NO_UPGRADE';
            v_earned_coins   := 1;
            v_earned_exp     := 2;
        END IF;
    END IF;

    -- STEP 9: Upsert student_stage_progress
    IF v_stage_id IS NOT NULL AND v_stage_number BETWEEN 1 AND 100 THEN
        IF v_found_existing THEN
            v_new_best_stars    := GREATEST(v_existing_progress.best_stars, v_earned_stars);
            v_new_best_accuracy := GREATEST(COALESCE(v_existing_progress.best_accuracy, 0), v_accuracy);
            v_completed         := v_existing_progress.completed OR v_passed;
            v_first_passed_at   := CASE
                WHEN v_existing_progress.completed THEN v_existing_progress.first_passed_at
                WHEN v_passed                      THEN p_now
                ELSE                                    NULL
            END;

            UPDATE public.student_stage_progress SET
                best_stars       = v_new_best_stars,
                latest_stars     = v_earned_stars,
                best_accuracy    = v_new_best_accuracy,
                latest_accuracy  = v_accuracy,
                best_score       = GREATEST(COALESCE(best_score, 0), v_score),
                attempt_count    = attempt_count + 1,
                hint_count_last  = v_authoritative_hints,
                completed        = v_completed,
                first_passed_at  = v_first_passed_at,
                last_played_at   = p_now,
                last_attempt_id  = p_attempt_id,
                updated_at       = p_now
            WHERE id = v_existing_progress.id;
        ELSE
            INSERT INTO public.student_stage_progress (
                student_id, stage_id, stage_number,
                best_stars, latest_stars,
                best_accuracy, latest_accuracy,
                best_score, attempt_count,
                hint_count_last, completed,
                first_passed_at, last_played_at,
                last_attempt_id, progress_source,
                created_at, updated_at
            ) VALUES (
                p_student_id, v_stage_id, v_stage_number,
                v_earned_stars, v_earned_stars,
                v_accuracy, v_accuracy,
                v_score, 1,
                v_authoritative_hints, v_passed,
                CASE WHEN v_passed THEN p_now ELSE NULL END, p_now,
                p_attempt_id, 'DIRECT_COMPLETION',
                p_now, p_now
            );
        END IF;
    END IF;

    -- STEP 10: Update learning_paths (current_stage & current_rank)
    v_next_stage := CASE
        WHEN v_passed AND v_stage_number < 100
        THEN GREATEST(COALESCE(v_path.current_stage, 1), v_stage_number + 1)
        ELSE COALESCE(v_path.current_stage, 1)
    END;
    v_next_stage := LEAST(v_next_stage, 100);

    -- Rank mapping: 1-20: 1, 21-40: 2, 41-60: 3, 61-80: 4, 81-100: 5
    v_next_rank := CASE
        WHEN v_next_stage >= 81 THEN 5
        WHEN v_next_stage >= 61 THEN 4
        WHEN v_next_stage >= 41 THEN 3
        WHEN v_next_stage >= 21 THEN 2
        ELSE 1
    END;
    v_next_rank := GREATEST(COALESCE(v_path.current_rank, 1), v_next_rank);

    v_new_coins     := COALESCE(v_path.coins, 0) + v_earned_coins;
    v_new_exp       := COALESCE(v_path.exp, 0) + v_earned_exp;
    v_new_total_exp := COALESCE(v_path.total_exp, 0) + v_earned_exp;

    UPDATE public.learning_paths SET
        coins                 = v_new_coins,
        exp                   = v_new_exp,
        total_exp             = v_new_total_exp,
        current_stage         = v_next_stage,
        current_rank          = v_next_rank,
        rank_updated_at       = CASE WHEN v_next_rank > COALESCE(v_path.current_rank, 1) THEN p_now ELSE v_path.rank_updated_at END,
        last_active_date      = p_now,
        campaign_completed_at = CASE
            WHEN 'FINAL_BOSS_CLEAR' = ANY(v_bonus_flags) AND v_path.campaign_completed_at IS NULL
            THEN p_now
            ELSE v_path.campaign_completed_at
        END
    WHERE student_id = p_student_id;

    -- STEP 11: Mark attempt COMPLETED
    UPDATE public.stage_attempts SET
        status        = 'COMPLETED',
        score         = v_score,
        accuracy      = v_accuracy,
        stars         = v_earned_stars,
        coins_awarded = v_earned_coins,
        exp_awarded   = v_earned_exp,
        hint_count    = v_authoritative_hints,
        completed_at  = p_now
    WHERE id = p_attempt_id;

    -- STEP 12: Insert stage_results historical log
    INSERT INTO public.stage_results (
        user_id, stage_number, rank_at_play, score, accuracy,
        response_time_avg, passed, used_hints, stars
    ) VALUES (
        p_student_id, v_stage_number,
        COALESCE(v_path.current_rank, 1),
        v_score, v_accuracy, v_response_time_avg_ms,
        v_passed, v_authoritative_hints, v_earned_stars
    );

    -- STEP 13: Economy transactions ledger
    IF v_earned_coins > 0 OR v_earned_exp > 0 THEN
        INSERT INTO public.economy_transactions (
            student_id, transaction_type, source, reference_id,
            coins_delta, exp_delta, balance_after,
            primary_reason, bonus_flags, metadata
        ) VALUES (
            p_student_id, 'STAGE_REWARD', 'STAGE', p_attempt_id::text,
            v_earned_coins, v_earned_exp,
            jsonb_build_object('coins', v_new_coins, 'total_exp', v_new_total_exp),
            v_primary_reason,
            v_bonus_flags,
            jsonb_build_object(
                'stage_number',  v_stage_number,
                'stage_type',    v_stage_type,
                'stars',         v_earned_stars,
                'accuracy',      v_accuracy,
                'hint_count',    v_authoritative_hints,
                'base_reward',   v_base_reward_coins,
                'bonus_amount',  v_bonus_coins,
                'passed',        v_passed
            )
        )
        ON CONFLICT (student_id, source, reference_id) DO NOTHING;
    END IF;

    -- STEP 14: Boss values
    IF v_stage_type IN ('MINI_BOSS', 'WORLD_BOSS', 'FINAL_BOSS') THEN
        v_boss_defeated := v_passed;
        v_damage        := LEAST(100, (v_correct_count * 100) / GREATEST(v_total_questions, 1));
        v_remaining_hp  := GREATEST(0, 100 - v_damage);
    END IF;

    -- STEP 15: Mastery tracking
    IF p_word_attempts IS NOT NULL AND jsonb_array_length(p_word_attempts) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_word_attempts)
        LOOP
            v_mastery_result := public.record_word_attempt_v2(
                p_student_id,
                p_attempt_id,
                (v_item->>'word_id')::uuid,
                (v_item->>'is_correct')::boolean,
                GREATEST(300, LEAST(60000, COALESCE((v_item->>'response_time_ms')::integer, 1500))),
                p_now
            );
            v_mastery_results := v_mastery_results || jsonb_build_array(v_mastery_result);
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success',             true,
        'already_completed',   false,
        'passed',              v_passed,
        'score',               v_score,
        'accuracy',            v_accuracy,
        'earned_stars',        v_earned_stars,
        'earned_coins',        v_earned_coins,
        'earned_exp',          v_earned_exp,
        'new_coins',           v_new_coins,
        'new_total_exp',       v_new_total_exp,
        'current_stage',       v_next_stage,
        'current_rank',        v_next_rank,
        'primary_reason',      v_primary_reason,
        'bonus_flags',         to_jsonb(v_bonus_flags),
        'boss_defeated',       v_boss_defeated,
        'boss_damage',         v_damage,
        'boss_remaining_hp',   v_remaining_hp,
        'boss_max_hp',         100,
        'campaign_completed',  ('FINAL_BOSS_CLEAR' = ANY(v_bonus_flags)),
        'mastery_results',     v_mastery_results
    );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_stage_with_progression_v3 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_stage_with_progression_v3 TO service_role;

-- ── PART 2: BACKFILL EXISTING STUDENTS ───────────────────────────────
UPDATE public.learning_paths
SET current_rank = CASE
    WHEN current_stage >= 81 THEN 5
    WHEN current_stage >= 61 THEN 4
    WHEN current_stage >= 41 THEN 3
    WHEN current_stage >= 21 THEN 2
    ELSE 1
END,
rank_updated_at = NOW()
WHERE current_rank < CASE
    WHEN current_stage >= 81 THEN 5
    WHEN current_stage >= 61 THEN 4
    WHEN current_stage >= 41 THEN 3
    WHEN current_stage >= 21 THEN 2
    ELSE 1
END;

