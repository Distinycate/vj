BEGIN;

-- ====================================================================
-- MIGRATION_GAME_PROGRESSION_V3.sql
-- Vocab Journey Phase 3.2C — Game Progression & World System
-- ====================================================================
-- Frozen Spec: Phase 3.2B v1.2 (2026-09-12)
--
-- INVARIANTS THIS MIGRATION MUST PRESERVE:
--   1. Main Campaign = Stage 1-100. Stages 101-105 = LEGACY_OVERFLOW.
--      No student_stage_progress rows written for stage_number > 100.
--   2. learning_paths.current_stage always in [1, 100].
--      campaign_completed_at signals endgame -- never current_stage = 101.
--   3. student_stage_progress is the progression authority.
--      stage_results remains immutable historical log (not mutated here).
--      learning_paths.current_stage demoted to compatibility pointer.
--   4. Backfill priority: STAGE_RESULT > LEGACY_ATTEMPT > INFERRED.
--      STAGE_RESULT evidence NEVER overwritten by weaker evidence.
--      NULL accuracy preserved for LEGACY/INFERRED rows.
--   5. Hint authority: DB-ledger only (attempt_hint_events + stage_attempts.hint_count).
--      Client-supplied usedHints NEVER used for star/economy calculation.
--   6. Stars computed server-side. 3-star response-time criterion = display only.
--      2->3 star upgrade = PRACTICE_REPLAY economy semantics (0.1x reward).
--      Only 1->2 (PASSED->SKILLED) upgrade is economy-eligible at STAR_UPGRADE rate.
--   7. BOSS_FIRST_CLEAR bonus applies to MINI_BOSS, WORLD_BOSS, and FINAL_BOSS.
--   8. Boss defeat authority: server accuracy >= 60%. HP/Damage = presentation only.
--   9. Atomic completion: all side effects in one PostgreSQL transaction.
--      Duplicate attempt completion returns cached result with ZERO new side effects.
--  10. Phase 3.1 Mastery contract (complete_stage_with_mastery_v2, record_word_attempt_v2)
--      is NOT modified by this migration.
--
-- SCHEMA DISCOVERY (confirmed from production code before writing):
--   stage_attempts: status CHECK IN ('ACTIVE','COMPLETED','EXPIRED','CANCELLED')
--                   question_ids jsonb (array of {id, word, correct_answer, correct_word_id, choices})
--                   authoritative question identity = object's "id" field = vocabulary.id (UUID)
--   stages: UNIQUE(stage_number) already exists (SUPABASE_SCHEMA.sql line 139)
--   stage_results: stars column already exists (MIGRATION_VOCAB_JOURNEY_V2.sql)
--   economy_transactions: metadata jsonb exists; primary_reason/bonus_flags to be added
--   learning_paths: no campaign_completed_at -- to be added
--
-- ROLLBACK (if ever needed):
--   1. DROP FUNCTION IF EXISTS public.complete_stage_with_progression_v3 CASCADE;
--   2. DROP FUNCTION IF EXISTS public.record_attempt_hint_v3 CASCADE;
--   3. DROP TABLE IF EXISTS public.student_stage_progress CASCADE;
--   4. DROP TABLE IF EXISTS public.attempt_hint_events CASCADE;
--   5. ALTER TABLE public.stage_attempts
--          DROP COLUMN IF EXISTS hint_count,
--          DROP COLUMN IF EXISTS stars,
--          DROP COLUMN IF EXISTS stage_id;
--   6. ALTER TABLE public.learning_paths
--          DROP COLUMN IF EXISTS campaign_completed_at;
--   7. ALTER TABLE public.economy_transactions
--          DROP COLUMN IF EXISTS primary_reason,
--          DROP COLUMN IF EXISTS bonus_flags;
--   8. ALTER TABLE public.stages
--          DROP CONSTRAINT IF EXISTS stages_id_stage_number_unique;
-- ====================================================================

-- ====================================================================
-- SECTION 0: PREFLIGHT ASSERTIONS
-- ====================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.stages'::regclass
          AND contype = 'u'
          AND conname IN ('stages_stage_number_key', 'stages_stage_number_unique')
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAIL: stages.stage_number UNIQUE constraint not found.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'stage_attempts' AND column_name = 'question_ids'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAIL: stage_attempts.question_ids not found.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'learning_paths'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAIL: learning_paths table not found.';
    END IF;

    RAISE NOTICE 'PREFLIGHT: All assertions passed. Proceeding with Phase 3.2C migration.';
END $$;

-- ====================================================================
-- SECTION 1: STAGES TABLE - COMPOSITE UNIQUE FOR FK INTEGRITY
-- ====================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.stages'::regclass
          AND contype = 'u'
          AND conname = 'stages_id_stage_number_unique'
    ) THEN
        ALTER TABLE public.stages
            ADD CONSTRAINT stages_id_stage_number_unique UNIQUE (id, stage_number);
        RAISE NOTICE 'Added stages_id_stage_number_unique constraint.';
    ELSE
        RAISE NOTICE 'stages_id_stage_number_unique already exists, skipping.';
    END IF;
END $$;

-- ====================================================================
-- SECTION 2: stage_attempts - ADD PHASE 3.2 COLUMNS
-- ====================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'stage_attempts' AND column_name = 'hint_count'
    ) THEN
        ALTER TABLE public.stage_attempts ADD COLUMN hint_count integer NOT NULL DEFAULT 0 CHECK (hint_count >= 0);
        RAISE NOTICE 'Added stage_attempts.hint_count';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'stage_attempts' AND column_name = 'stars'
    ) THEN
        ALTER TABLE public.stage_attempts ADD COLUMN stars integer CHECK (stars BETWEEN 0 AND 3);
        RAISE NOTICE 'Added stage_attempts.stars';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'stage_attempts' AND column_name = 'stage_id'
    ) THEN
        ALTER TABLE public.stage_attempts ADD COLUMN stage_id uuid REFERENCES public.stages(id) ON DELETE RESTRICT;
        RAISE NOTICE 'Added stage_attempts.stage_id';
    END IF;
END $$;

-- ====================================================================
-- SECTION 3: attempt_hint_events - NEW IDEMPOTENCY LEDGER
-- question_id = vocabulary.id (UUID) confirmed from /api/game/start:
--   authoritativeQuestions[i].id = target.id (vocabulary row primary key)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.attempt_hint_events (
    id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    stage_attempt_id    uuid NOT NULL REFERENCES public.stage_attempts(id) ON DELETE CASCADE,
    question_id         uuid NOT NULL REFERENCES public.vocabulary(id) ON DELETE CASCADE,
    created_at          timestamptz DEFAULT now() NOT NULL,
    UNIQUE(stage_attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_attempt_hint_events_attempt
    ON public.attempt_hint_events(stage_attempt_id);

ALTER TABLE public.attempt_hint_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.attempt_hint_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.attempt_hint_events TO service_role;

-- ====================================================================
-- SECTION 4: student_stage_progress - NEW PROGRESSION AUTHORITY
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.student_stage_progress (
    id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id          uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    stage_id            uuid NOT NULL,
    stage_number        integer NOT NULL,
    FOREIGN KEY (stage_id, stage_number)
        REFERENCES public.stages(id, stage_number) ON DELETE RESTRICT,

    best_stars          integer NOT NULL DEFAULT 0 CHECK (best_stars BETWEEN 0 AND 3),
    latest_stars        integer NOT NULL DEFAULT 0 CHECK (latest_stars BETWEEN 0 AND 3),

    -- NULLABLE: NULL = no authoritative accuracy on record (LEGACY / INFERRED)
    -- 0.00 is a valid measured value - never use as "no data" sentinel
    best_accuracy       numeric(5,2),
    latest_accuracy     numeric(5,2),

    best_score          integer NOT NULL DEFAULT 0,
    attempt_count       integer NOT NULL DEFAULT 0,
    hint_count_last     integer NOT NULL DEFAULT 0,
    completed           boolean NOT NULL DEFAULT false,
    first_passed_at     timestamptz,
    last_played_at      timestamptz DEFAULT now() NOT NULL,
    last_attempt_id     uuid REFERENCES public.stage_attempts(id) ON DELETE SET NULL,
    progress_source     text CHECK (progress_source IN (
                            'STAGE_RESULT',
                            'LEGACY_ATTEMPT',
                            'INFERRED_CURRENT_STAGE',
                            'DIRECT_COMPLETION'
                        )),
    created_at          timestamptz DEFAULT now() NOT NULL,
    updated_at          timestamptz DEFAULT now() NOT NULL,
    UNIQUE(student_id, stage_id),
    CONSTRAINT ssp_campaign_stage_range CHECK (stage_number BETWEEN 1 AND 105)
);

CREATE INDEX IF NOT EXISTS idx_ssp_student_stage
    ON public.student_stage_progress(student_id, stage_number);

CREATE INDEX IF NOT EXISTS idx_ssp_student_completed
    ON public.student_stage_progress(student_id, stage_id) WHERE completed = true;

CREATE INDEX IF NOT EXISTS idx_ssp_stage_map
    ON public.student_stage_progress(student_id, stage_number ASC);

CREATE INDEX IF NOT EXISTS idx_ssp_unlock_check
    ON public.student_stage_progress(student_id, stage_number, completed)
    WHERE completed = true;

CREATE OR REPLACE FUNCTION public.ssp_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_ssp_updated_at ON public.student_stage_progress;
CREATE TRIGGER trg_ssp_updated_at
    BEFORE UPDATE ON public.student_stage_progress
    FOR EACH ROW EXECUTE FUNCTION public.ssp_set_updated_at();

ALTER TABLE public.student_stage_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_stage_progress FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.student_stage_progress TO service_role;

DROP POLICY IF EXISTS "Students read own progress" ON public.student_stage_progress;
CREATE POLICY "Students read own progress"
    ON public.student_stage_progress
    FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

-- ====================================================================
-- SECTION 5: learning_paths - ADD campaign_completed_at
-- ====================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'learning_paths'
          AND column_name = 'campaign_completed_at'
    ) THEN
        ALTER TABLE public.learning_paths
            ADD COLUMN campaign_completed_at timestamptz DEFAULT NULL;
        RAISE NOTICE 'Added learning_paths.campaign_completed_at';
    END IF;
END $$;

-- ====================================================================
-- SECTION 6: economy_transactions - ADD STRUCTURED REWARD COLUMNS
-- ====================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'economy_transactions'
          AND column_name = 'primary_reason'
    ) THEN
        ALTER TABLE public.economy_transactions
            ADD COLUMN primary_reason text CHECK (primary_reason IN (
                'FIRST_CLEAR', 'STAR_UPGRADE', 'PRACTICE_REPLAY', 'OTHER'
            ));
        RAISE NOTICE 'Added economy_transactions.primary_reason';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'economy_transactions'
          AND column_name = 'bonus_flags'
    ) THEN
        ALTER TABLE public.economy_transactions
            ADD COLUMN bonus_flags text[] DEFAULT '{}';
        RAISE NOTICE 'Added economy_transactions.bonus_flags';
    END IF;
END $$;

-- ====================================================================
-- SECTION 7: ATOMIC HINT REGISTRATION RPC
-- record_attempt_hint_v3(p_student_id, p_stage_attempt_id, p_question_vocabulary_id)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.record_attempt_hint_v3(
    p_student_id             uuid,
    p_stage_attempt_id       uuid,
    p_question_vocabulary_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_attempt            public.stage_attempts%ROWTYPE;
    v_already_registered boolean := false;
    v_new_hint_count     integer;
    v_question_found     boolean;
    v_rows_inserted      integer;
BEGIN
    SELECT * INTO v_attempt
    FROM public.stage_attempts
    WHERE id = p_stage_attempt_id AND student_id = p_student_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'HINT_ATTEMPT_NOT_FOUND: attempt % not found for student %',
            p_stage_attempt_id, p_student_id;
    END IF;

    IF v_attempt.status != 'ACTIVE' THEN
        RAISE EXCEPTION 'HINT_ATTEMPT_NOT_ACTIVE: attempt % has status %, expected ACTIVE',
            p_stage_attempt_id, v_attempt.status;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_attempt.question_ids) AS q
        WHERE (q->>'id')::uuid = p_question_vocabulary_id
    ) INTO v_question_found;

    IF NOT v_question_found THEN
        RAISE EXCEPTION 'HINT_QUESTION_NOT_IN_ATTEMPT: vocabulary_id % is not in attempt %',
            p_question_vocabulary_id, p_stage_attempt_id;
    END IF;

    INSERT INTO public.attempt_hint_events(stage_attempt_id, question_id)
    VALUES (p_stage_attempt_id, p_question_vocabulary_id)
    ON CONFLICT (stage_attempt_id, question_id) DO NOTHING;

    GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;
    v_already_registered := (v_rows_inserted = 0);

    SELECT COUNT(*) INTO v_new_hint_count
    FROM public.attempt_hint_events
    WHERE stage_attempt_id = p_stage_attempt_id;

    UPDATE public.stage_attempts
    SET hint_count = v_new_hint_count
    WHERE id = p_stage_attempt_id;

    RETURN jsonb_build_object(
        'success',            true,
        'hint_count',         v_new_hint_count,
        'already_registered', v_already_registered
    );
END;
$$;

REVOKE ALL ON FUNCTION public.record_attempt_hint_v3 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_attempt_hint_v3 TO service_role;

-- ====================================================================
-- SECTION 8: ATOMIC STAGE COMPLETION V3 RPC
-- complete_stage_with_progression_v3(p_attempt_id, p_student_id, p_word_attempts, p_now)
--
-- THE SOLE PROGRESSION PERSISTENCE AUTHORITY.
-- Accepts only: authoritative attempt identity + session-bound student + server-evaluated word results.
-- ALL other values derived server-side within this function.
-- ====================================================================
CREATE OR REPLACE FUNCTION public.complete_stage_with_progression_v3(
    p_attempt_id    uuid,
    p_student_id    uuid,
    p_word_attempts jsonb,
    p_now           timestamptz DEFAULT now()
) RETURNS jsonb
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
            'accuracy',           COALESCE(v_attempt.accuracy, 0),
            'earned_coins',       COALESCE(v_attempt.coins_awarded, 0),
            'earned_exp',         COALESCE(v_attempt.exp_awarded, 0),
            'current_stage',      COALESCE(v_path.current_stage, 1),
            'campaign_completed_at', v_path.campaign_completed_at
        );
    END IF;

    IF v_attempt.status != 'ACTIVE' THEN
        RAISE EXCEPTION 'COMPLETION_ATTEMPT_INVALID_STATUS: attempt % has status %',
            p_attempt_id, v_attempt.status;
    END IF;

    -- STEP 2: Derive stage from DB (never trust caller-supplied values)
    SELECT * INTO v_stage FROM public.stages WHERE stage_number = v_attempt.stage_number;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'COMPLETION_STAGE_NOT_FOUND: stage_number % not in stages table',
            v_attempt.stage_number;
    END IF;
    v_stage_number := v_stage.stage_number;
    v_stage_id     := v_stage.id;

    v_stage_type := CASE
        WHEN v_stage_number = 100          THEN 'FINAL_BOSS'
        WHEN v_stage_number % 10 = 0      THEN 'WORLD_BOSS'
        WHEN v_stage_number % 10 = 5      THEN 'MINI_BOSS'
        WHEN v_stage_number % 10 IN (4,9) THEN 'REVIEW_CHECKPOINT'
        WHEN v_stage_number > 100         THEN 'LEGACY_OVERFLOW'
        ELSE                                   'STANDARD'
    END;

    IF v_stage_type = 'LEGACY_OVERFLOW' THEN
        RAISE EXCEPTION 'COMPLETION_LEGACY_OVERFLOW: stage_number % is LEGACY_OVERFLOW', v_stage_number;
    END IF;

    -- STEP 3: Read authoritative hint count from DB ledger
    v_authoritative_hints := COALESCE(v_attempt.hint_count, 0);

    -- STEP 4: Evaluate answers from server-trusted p_word_attempts
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

    v_score  := v_correct_count;
    v_passed := v_accuracy >= 60;

    -- STEP 5: Compute stars (display) and trusted_performance_tier (economy authority)
    v_earned_stars := CASE
        WHEN v_accuracy < 60                                                    THEN 0
        WHEN v_accuracy >= 90
             AND v_authoritative_hints = 0
             AND v_response_time_avg_ms <= 12000                                THEN 3
        WHEN v_accuracy >= 80 AND v_authoritative_hints <= 1                   THEN 2
        ELSE                                                                         1
    END;

    -- Trusted tier: no response time (server-verifiable signals only)
    v_trusted_perf_tier := CASE
        WHEN v_accuracy < 60                                   THEN 'FAILED'
        WHEN v_accuracy >= 80 AND v_authoritative_hints <= 1  THEN 'SKILLED'
        ELSE                                                        'PASSED'
    END;

    -- STEP 6: Lock learning_paths and load existing progress snapshot
    SELECT * INTO v_path FROM public.learning_paths
    WHERE student_id = p_student_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'COMPLETION_LEARNING_PATH_NOT_FOUND: no learning_path for student %', p_student_id;
    END IF;

    SELECT * INTO v_existing_progress
    FROM public.student_stage_progress
    WHERE student_id = p_student_id AND stage_id = v_stage_id;
    v_found_existing := FOUND;

    v_prev_best_stars := COALESCE(v_existing_progress.best_stars, 0);
    v_is_first_clear  := NOT v_found_existing OR NOT COALESCE(v_existing_progress.completed, false);

    -- STEP 7: Determine primary_reason + bonus_flags
    v_primary_reason := CASE
        WHEN v_is_first_clear AND v_passed                         THEN 'FIRST_CLEAR'
        WHEN NOT v_is_first_clear
             AND v_trusted_perf_tier = 'SKILLED'
             AND v_prev_best_stars < 2                             THEN 'STAR_UPGRADE'
        ELSE                                                            'PRACTICE_REPLAY'
    END;

    -- BOSS_FIRST_CLEAR: MINI_BOSS, WORLD_BOSS, FINAL_BOSS on first clear
    IF v_primary_reason = 'FIRST_CLEAR'
       AND v_stage_type IN ('MINI_BOSS', 'WORLD_BOSS', 'FINAL_BOSS') THEN
        v_bonus_flags := array_append(v_bonus_flags, 'BOSS_FIRST_CLEAR');
    END IF;

    -- WORLD_CLEAR: World Boss first-ever clear
    IF v_primary_reason = 'FIRST_CLEAR' AND v_stage_type = 'WORLD_BOSS'
       AND (NOT v_found_existing OR NOT COALESCE(v_existing_progress.completed, false)) THEN
        v_bonus_flags := array_append(v_bonus_flags, 'WORLD_CLEAR');
    END IF;

    -- FINAL_BOSS_CLEAR: Stage 100 first clear, campaign not yet complete
    IF v_primary_reason = 'FIRST_CLEAR' AND v_stage_type = 'FINAL_BOSS'
       AND v_path.campaign_completed_at IS NULL THEN
        v_bonus_flags := array_append(v_bonus_flags, 'FINAL_BOSS_CLEAR');
    END IF;

    -- STEP 8: Compute economy rewards
    v_base_reward_coins := CASE v_primary_reason
        WHEN 'FIRST_CLEAR'     THEN 20
        WHEN 'STAR_UPGRADE'    THEN 6
        WHEN 'PRACTICE_REPLAY' THEN 2
        ELSE                        0
    END;
    v_base_reward_exp := CASE v_primary_reason
        WHEN 'FIRST_CLEAR'     THEN 15
        WHEN 'STAR_UPGRADE'    THEN 4
        WHEN 'PRACTICE_REPLAY' THEN 1
        ELSE                        0
    END;

    IF 'BOSS_FIRST_CLEAR' = ANY(v_bonus_flags) THEN
        v_base_reward_coins := v_base_reward_coins * 2;
        v_base_reward_exp   := v_base_reward_exp * 2;
    END IF;

    IF 'WORLD_CLEAR' = ANY(v_bonus_flags) THEN
        v_bonus_coins     := v_bonus_coins + 50;
        v_base_reward_exp := v_base_reward_exp + 30;
    END IF;
    IF 'FINAL_BOSS_CLEAR' = ANY(v_bonus_flags) THEN
        v_bonus_coins     := v_bonus_coins + 200;
        v_base_reward_exp := v_base_reward_exp + 100;
    END IF;

    v_earned_coins := v_base_reward_coins + v_bonus_coins;
    v_earned_exp   := v_base_reward_exp;

    -- STEP 9: UPSERT student_stage_progress
    v_new_best_stars := GREATEST(v_prev_best_stars, v_earned_stars);
    v_completed      := v_passed OR COALESCE(v_existing_progress.completed, false);
    v_first_passed_at := CASE
        WHEN v_passed AND NOT COALESCE(v_existing_progress.completed, false) THEN p_now
        ELSE v_existing_progress.first_passed_at
    END;
    v_new_best_accuracy := CASE
        WHEN v_existing_progress.best_accuracy IS NULL THEN v_accuracy
        ELSE GREATEST(v_existing_progress.best_accuracy, v_accuracy)
    END;

    INSERT INTO public.student_stage_progress (
        student_id, stage_id, stage_number,
        best_stars, latest_stars,
        best_accuracy, latest_accuracy,
        best_score, attempt_count, hint_count_last,
        completed, first_passed_at, last_played_at, last_attempt_id,
        progress_source, created_at, updated_at
    ) VALUES (
        p_student_id, v_stage_id, v_stage_number,
        v_new_best_stars, v_earned_stars,
        v_new_best_accuracy, v_accuracy,
        GREATEST(v_score, COALESCE(v_existing_progress.best_score, 0)),
        COALESCE(v_existing_progress.attempt_count, 0) + 1,
        v_authoritative_hints,
        v_completed, v_first_passed_at, p_now, p_attempt_id,
        'DIRECT_COMPLETION', p_now, p_now
    )
    ON CONFLICT (student_id, stage_id) DO UPDATE SET
        best_stars      = EXCLUDED.best_stars,
        latest_stars    = EXCLUDED.latest_stars,
        best_accuracy   = EXCLUDED.best_accuracy,
        latest_accuracy = EXCLUDED.latest_accuracy,
        best_score      = EXCLUDED.best_score,
        attempt_count   = EXCLUDED.attempt_count,
        hint_count_last = EXCLUDED.hint_count_last,
        completed       = EXCLUDED.completed,
        first_passed_at = EXCLUDED.first_passed_at,
        last_played_at  = EXCLUDED.last_played_at,
        last_attempt_id = EXCLUDED.last_attempt_id,
        progress_source = EXCLUDED.progress_source,
        updated_at      = p_now;

    -- STEP 10: Update learning_paths
    -- current_stage = compatibility pointer, clamped [1, 100], NEVER 101+
    v_next_stage := CASE
        WHEN v_passed AND v_stage_number < 100
        THEN GREATEST(COALESCE(v_path.current_stage, 1), v_stage_number + 1)
        ELSE COALESCE(v_path.current_stage, 1)
    END;
    v_next_stage    := LEAST(v_next_stage, 100);
    v_new_coins     := COALESCE(v_path.coins, 0) + v_earned_coins;
    v_new_exp       := COALESCE(v_path.exp, 0) + v_earned_exp;
    v_new_total_exp := COALESCE(v_path.total_exp, 0) + v_earned_exp;

    UPDATE public.learning_paths SET
        coins                 = v_new_coins,
        exp                   = v_new_exp,
        total_exp             = v_new_total_exp,
        current_stage         = v_next_stage,
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
        hint_count    = v_authoritative_hints,
        stage_id      = v_stage_id,
        coins_awarded = v_earned_coins,
        exp_awarded   = v_earned_exp,
        completed_at  = p_now
    WHERE id = p_attempt_id;

    -- STEP 12: INSERT stage_results (immutable historical log)
    INSERT INTO public.stage_results (
        user_id, stage_number, rank_at_play, score, accuracy,
        response_time_avg, passed, used_hints, stars
    ) VALUES (
        p_student_id, v_stage_number,
        COALESCE(v_path.current_rank, 1),
        v_score, v_accuracy, v_response_time_avg_ms,
        v_passed, v_authoritative_hints, v_earned_stars
    );

    -- STEP 13: INSERT economy_transactions with structured reward breakdown
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

    -- STEP 14: Boss presentation values (derived, NOT progression authority)
    -- boss_defeated = server accuracy >= 60% (NOT HP)
    IF v_stage_type IN ('MINI_BOSS', 'WORLD_BOSS', 'FINAL_BOSS') THEN
        v_boss_defeated := v_passed;
        v_damage        := LEAST(100, (v_correct_count * 100) / GREATEST(v_total_questions, 1));
        v_remaining_hp  := GREATEST(0, 100 - v_damage);
    END IF;

    -- STEP 15: Phase 3.1 Mastery contract (inline, same transaction)
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

-- ====================================================================
-- SECTION 9: LEGACY BACKFILL - student_stage_progress
-- Three-tier priority: STAGE_RESULT > LEGACY_ATTEMPT > INFERRED
-- ====================================================================

-- PRIORITY 1: From stage_results (highest confidence)
INSERT INTO public.student_stage_progress (
    student_id, stage_id, stage_number,
    best_stars, latest_stars,
    best_accuracy, latest_accuracy,
    best_score, attempt_count,
    hint_count_last, completed,
    first_passed_at, last_played_at,
    progress_source, created_at, updated_at
)
SELECT
    sr.user_id                                AS student_id,
    s.id                                      AS stage_id,
    sr.stage_number,
    MAX(sr.stars)                             AS best_stars,
    (SELECT stars FROM public.stage_results r2
     WHERE r2.user_id = sr.user_id AND r2.stage_number = sr.stage_number
     ORDER BY r2.created_at DESC LIMIT 1)     AS latest_stars,
    MAX(CASE WHEN sr.passed THEN sr.accuracy::numeric(5,2) ELSE NULL END) AS best_accuracy,
    (SELECT accuracy::numeric(5,2) FROM public.stage_results r3
     WHERE r3.user_id = sr.user_id AND r3.stage_number = sr.stage_number
     ORDER BY r3.created_at DESC LIMIT 1)     AS latest_accuracy,
    MAX(sr.score)                             AS best_score,
    COUNT(*)                                  AS attempt_count,
    MAX(COALESCE(sr.used_hints, 0))           AS hint_count_last,
    true                                      AS completed,
    MIN(CASE WHEN sr.passed THEN sr.created_at ELSE NULL END) AS first_passed_at,
    MAX(sr.created_at)                        AS last_played_at,
    'STAGE_RESULT'                            AS progress_source,
    now()                                     AS created_at,
    now()                                     AS updated_at
FROM public.stage_results sr
JOIN public.stages s ON s.stage_number = sr.stage_number
WHERE sr.passed = true
  AND sr.stage_number BETWEEN 1 AND 100
GROUP BY sr.user_id, sr.stage_number, s.id
ON CONFLICT (student_id, stage_id) DO NOTHING;

-- PRIORITY 2: From legacy attempts (medium confidence)
-- Only inserts where no STAGE_RESULT row exists
INSERT INTO public.student_stage_progress (
    student_id, stage_id, stage_number,
    best_stars, latest_stars,
    best_accuracy, latest_accuracy,
    best_score, attempt_count,
    hint_count_last, completed,
    first_passed_at, last_played_at,
    progress_source, created_at, updated_at
)
SELECT
    a.student_id,
    a.stage_id,
    s.stage_number,
    1               AS best_stars,
    1               AS latest_stars,
    NULL            AS best_accuracy,
    NULL            AS latest_accuracy,
    MAX(a.score)    AS best_score,
    COUNT(*)        AS attempt_count,
    0               AS hint_count_last,
    true            AS completed,
    MIN(a.created_at) AS first_passed_at,
    MAX(a.created_at) AS last_played_at,
    'LEGACY_ATTEMPT' AS progress_source,
    now()           AS created_at,
    now()           AS updated_at
FROM public.attempts a
JOIN public.stages s ON s.id = a.stage_id
WHERE a.is_passed = true
  AND s.stage_number BETWEEN 1 AND 100
GROUP BY a.student_id, a.stage_id, s.stage_number
ON CONFLICT (student_id, stage_id) DO NOTHING;

-- PRIORITY 3: Inferred from learning_paths.current_stage
-- Stages 1 to (current_stage - 1) only; current_stage itself NOT inserted
INSERT INTO public.student_stage_progress (
    student_id, stage_id, stage_number,
    best_stars, latest_stars,
    best_accuracy, latest_accuracy,
    best_score, attempt_count,
    hint_count_last, completed,
    first_passed_at, last_played_at,
    progress_source, created_at, updated_at
)
SELECT
    lp.student_id,
    s.id            AS stage_id,
    s.stage_number,
    1               AS best_stars,
    1               AS latest_stars,
    NULL            AS best_accuracy,
    NULL            AS latest_accuracy,
    0               AS best_score,
    0               AS attempt_count,
    0               AS hint_count_last,
    true            AS completed,
    NULL            AS first_passed_at,
    now()           AS last_played_at,
    'INFERRED_CURRENT_STAGE' AS progress_source,
    now()           AS created_at,
    now()           AS updated_at
FROM public.learning_paths lp
CROSS JOIN public.stages s
WHERE s.stage_number < lp.current_stage
  AND s.stage_number BETWEEN 1 AND 100
  AND lp.current_stage BETWEEN 1 AND 100
ON CONFLICT (student_id, stage_id) DO NOTHING;

-- ====================================================================
-- SECTION 10: POST-BACKFILL INTEGRITY VERIFICATION
-- ====================================================================
DO $$
DECLARE v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.student_stage_progress WHERE stage_number > 100;
    IF v_count > 0 THEN
        RAISE WARNING 'INTEGRITY V1 FAILED: % rows with stage_number > 100', v_count;
    ELSE
        RAISE NOTICE 'INTEGRITY V1 PASSED: No LEGACY_OVERFLOW rows in student_stage_progress';
    END IF;
END $$;

DO $$
DECLARE v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.learning_paths WHERE current_stage > 100;
    IF v_count > 0 THEN
        RAISE WARNING 'INTEGRITY V2 FAILED: % students with current_stage > 100', v_count;
    ELSE
        RAISE NOTICE 'INTEGRITY V2 PASSED: All current_stage values <= 100';
    END IF;
END $$;

DO $$
DECLARE v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.student_stage_progress ssp
    WHERE ssp.progress_source = 'LEGACY_ATTEMPT'
      AND EXISTS (
        SELECT 1 FROM public.stage_results sr
        WHERE sr.user_id = ssp.student_id AND sr.stage_number = ssp.stage_number AND sr.passed = true
    );
    IF v_count > 0 THEN
        RAISE WARNING 'INTEGRITY V3 FAILED: % rows where LEGACY_ATTEMPT overwrote STAGE_RESULT', v_count;
    ELSE
        RAISE NOTICE 'INTEGRITY V3 PASSED: STAGE_RESULT evidence not overwritten';
    END IF;
END $$;

DO $$
DECLARE v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.student_stage_progress
    WHERE progress_source = 'STAGE_RESULT' AND best_accuracy IS NULL;
    IF v_count > 0 THEN
        RAISE WARNING 'INTEGRITY V4 FAILED: % STAGE_RESULT rows with NULL best_accuracy', v_count;
    ELSE
        RAISE NOTICE 'INTEGRITY V4 PASSED: All STAGE_RESULT rows have non-null accuracy';
    END IF;
END $$;

DO $$
DECLARE v_total integer; v_sr integer; v_la integer; v_inf integer; v_dc integer;
BEGIN
    SELECT COUNT(*) INTO v_total FROM public.student_stage_progress;
    SELECT COUNT(*) INTO v_sr  FROM public.student_stage_progress WHERE progress_source = 'STAGE_RESULT';
    SELECT COUNT(*) INTO v_la  FROM public.student_stage_progress WHERE progress_source = 'LEGACY_ATTEMPT';
    SELECT COUNT(*) INTO v_inf FROM public.student_stage_progress WHERE progress_source = 'INFERRED_CURRENT_STAGE';
    SELECT COUNT(*) INTO v_dc  FROM public.student_stage_progress WHERE progress_source = 'DIRECT_COMPLETION';
    RAISE NOTICE 'BACKFILL SUMMARY: Total=% | STAGE_RESULT=% | LEGACY_ATTEMPT=% | INFERRED=% | DIRECT=%',
        v_total, v_sr, v_la, v_inf, v_dc;
END $$;

-- ====================================================================
-- MIGRATION COMPLETE
-- Phase 3.2C done. Proceed to:
--   3.2D: worldHierarchy.ts, starRating.ts, unlockRules.ts
--   3.2E: bossEngine.ts
--   3.2F: /api/game/start (unlock guard), /api/game/hint (new), /api/game/complete (V3 RPC)
-- ====================================================================
COMMIT;
