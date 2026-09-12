-- ==============================================================================
-- VOCAB JOURNEY: PRODUCTION SECURITY & ECONOMY HARDENING MIGRATION
-- ==============================================================================

-- 1. USER SESSIONS TABLE (Opaque Token Verification & Instant Revocation)
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_type text NOT NULL CHECK (subject_type IN ('STUDENT', 'TEACHER')),
    subject_id uuid NOT NULL,
    role text NOT NULL CHECK (role IN ('STUDENT', 'TEACHER', 'ADMIN', 'EXECUTIVE', 'CARD_TEACHER')),
    token_hash text UNIQUE NOT NULL,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_lookup 
    ON public.user_sessions(token_hash) 
    WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_sessions_subject 
    ON public.user_sessions(subject_id) 
    WHERE revoked_at IS NULL;

-- 2. STAGE ATTEMPTS TABLE (Server-Authoritative Lifecycle & Anti-Cheat)
CREATE TABLE IF NOT EXISTS public.stage_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    stage_number integer NOT NULL,
    mission_level integer NOT NULL DEFAULT 1,
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED')),
    question_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
    score integer,
    accuracy numeric,
    coins_awarded integer DEFAULT 0,
    exp_awarded integer DEFAULT 0,
    started_at timestamptz DEFAULT now(),
    expires_at timestamptz DEFAULT (now() + interval '30 minutes'),
    completed_at timestamptz,
    UNIQUE(student_id, id)
);

CREATE INDEX IF NOT EXISTS idx_stage_attempts_active 
    ON public.stage_attempts(student_id, stage_number) 
    WHERE status = 'ACTIVE';

-- 3. ECONOMY TRANSACTIONS LEDGER (Auditable & Idempotent Rewards)
CREATE TABLE IF NOT EXISTS public.economy_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    transaction_type text NOT NULL,
    source text NOT NULL,
    reference_id text,
    coins_delta integer DEFAULT 0,
    exp_delta integer DEFAULT 0,
    tickets_delta integer DEFAULT 0,
    balance_after jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT uq_economy_idempotent UNIQUE (student_id, source, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_economy_transactions_student 
    ON public.economy_transactions(student_id, created_at DESC);

-- 4. SHOP PURCHASES TABLE (Shop Idempotency & Protection against Double Spend)
CREATE TABLE IF NOT EXISTS public.shop_purchases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
    purchase_request_id uuid NOT NULL,
    price integer NOT NULL,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT uq_shop_purchase_request UNIQUE (student_id, purchase_request_id)
);

-- 5. ATOMIC SHOP PURCHASE RPC (With Row Lock and Idempotency)
CREATE OR REPLACE FUNCTION public.purchase_shop_item(
    p_student_id uuid,
    p_item_id uuid,
    p_purchase_request_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_item public.items%ROWTYPE;
    v_path public.learning_paths%ROWTYPE;
    v_existing_purchase public.shop_purchases%ROWTYPE;
    v_existing_inv public.student_inventory%ROWTYPE;
    v_new_coins integer;
    v_new_quantity integer;
BEGIN
    -- 1. Check idempotency: If this purchaseRequestId was already executed, return success
    SELECT * INTO v_existing_purchase
    FROM public.shop_purchases
    WHERE student_id = p_student_id AND purchase_request_id = p_purchase_request_id;

    IF FOUND THEN
        SELECT coins INTO v_new_coins FROM public.learning_paths WHERE student_id = p_student_id;
        RETURN jsonb_build_object(
            'success', true,
            'already_purchased', true,
            'new_coins', v_new_coins,
            'item_id', p_item_id
        );
    END IF;

    -- 2. Validate item
    SELECT * INTO v_item FROM public.items WHERE id = p_item_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ITEM_NOT_FOUND';
    END IF;

    -- 3. Lock learning_paths row to prevent balance race conditions
    SELECT * INTO v_path
    FROM public.learning_paths
    WHERE student_id = p_student_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'LEARNING_PATH_NOT_FOUND';
    END IF;

    IF COALESCE(v_path.coins, 0) < v_item.price THEN
        RAISE EXCEPTION 'INSUFFICIENT_COINS';
    END IF;

    -- 4. Deduct coins atomically
    v_new_coins := v_path.coins - v_item.price;
    UPDATE public.learning_paths
    SET coins = v_new_coins
    WHERE student_id = p_student_id;

    -- 5. Upsert into student_inventory
    SELECT * INTO v_existing_inv
    FROM public.student_inventory
    WHERE student_id = p_student_id AND item_id = p_item_id;

    IF FOUND THEN
        v_new_quantity := v_existing_inv.quantity + 1;
        UPDATE public.student_inventory
        SET quantity = v_new_quantity
        WHERE id = v_existing_inv.id;
    ELSE
        v_new_quantity := 1;
        INSERT INTO public.student_inventory (student_id, item_id, quantity)
        VALUES (p_student_id, p_item_id, 1);
    END IF;

    -- 6. Record purchase idempotency & economy ledger
    INSERT INTO public.shop_purchases (student_id, item_id, purchase_request_id, price)
    VALUES (p_student_id, p_item_id, p_purchase_request_id, v_item.price);

    INSERT INTO public.economy_transactions (student_id, transaction_type, source, reference_id, coins_delta, balance_after, metadata)
    VALUES (
        p_student_id,
        'SHOP_PURCHASE',
        'SHOP',
        p_purchase_request_id::text,
        -v_item.price,
        jsonb_build_object('coins', v_new_coins),
        jsonb_build_object('item_id', p_item_id, 'item_name', v_item.name)
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_coins', v_new_coins,
        'new_quantity', v_new_quantity,
        'item_id', p_item_id
    );
END;
$$;

-- 6. ATOMIC STAGE COMPLETION RPC (Server-Derived Rewards & Attempt Idempotency)
CREATE OR REPLACE FUNCTION public.complete_stage_transaction(
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
    p_correct_word_ids uuid[]
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_attempt public.stage_attempts%ROWTYPE;
    v_path public.learning_paths%ROWTYPE;
    v_diff RECORD;
    v_is_boss boolean;
    v_earned_coins integer := 0;
    v_earned_exp integer := 0;
    v_new_coins integer;
    v_new_exp integer;
    v_new_total_exp integer;
    v_next_stage integer;
    v_next_streak integer;
    v_star_multiplier numeric := 1.0;
    v_previous_max_stars integer := 0;
    v_is_replay boolean;
    v_word_id uuid;
    v_existing_review public.user_review_words%ROWTYPE;
    v_new_mastery integer;
    v_new_wrong_count integer;
    v_next_review_interval integer;
BEGIN
    -- 1. Validate & Lock Attempt for Idempotency
    SELECT * INTO v_attempt
    FROM public.stage_attempts
    WHERE id = p_attempt_id AND student_id = p_student_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'STAGE_ATTEMPT_NOT_FOUND';
    END IF;

    -- If already completed, return existing results without re-awarding
    IF v_attempt.status = 'COMPLETED' THEN
        SELECT * INTO v_path FROM public.learning_paths WHERE student_id = p_student_id;
        RETURN jsonb_build_object(
            'already_completed', true,
            'passed', v_attempt.score >= (v_attempt.score * 0), -- previous state
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
        last_active_date = now()
    WHERE student_id = p_student_id;

    -- 5. Mark attempt completed
    UPDATE public.stage_attempts
    SET status = 'COMPLETED',
        score = p_score,
        accuracy = p_accuracy,
        coins_awarded = v_earned_coins,
        exp_awarded = v_earned_exp,
        completed_at = now()
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
    IF array_length(p_wrong_word_ids, 1) > 0 THEN
        FOREACH v_word_id IN ARRAY p_wrong_word_ids LOOP
            INSERT INTO public.wrong_words (student_id, word_id, error_count, last_attempt_at)
            VALUES (p_student_id, v_word_id, 1, now())
            ON CONFLICT (student_id, word_id) DO UPDATE
            SET error_count = public.wrong_words.error_count + 1,
                last_attempt_at = now();
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'passed', p_passed,
        'earned_coins', v_earned_coins,
        'earned_exp', v_earned_exp,
        'new_coins', v_new_coins,
        'new_total_exp', v_new_total_exp,
        'current_stage', v_next_stage
    );
END;
$$;

-- 7. UNIFIED EVENT & QUEST REWARD RPC (Idempotent & Atomic)
CREATE OR REPLACE FUNCTION public.grant_student_reward(
    p_student_id uuid,
    p_source text,
    p_reference_id text,
    p_coins_delta integer DEFAULT 0,
    p_exp_delta integer DEFAULT 0,
    p_tickets_delta integer DEFAULT 0,
    p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_path public.learning_paths%ROWTYPE;
    v_new_coins integer;
    v_new_exp integer;
    v_new_total_exp integer;
    v_new_tickets integer;
    v_existing public.economy_transactions%ROWTYPE;
BEGIN
    -- Check idempotency
    SELECT * INTO v_existing
    FROM public.economy_transactions
    WHERE student_id = p_student_id AND source = p_source AND reference_id = p_reference_id;

    IF FOUND THEN
        SELECT * INTO v_path FROM public.learning_paths WHERE student_id = p_student_id;
        RETURN jsonb_build_object(
            'already_granted', true,
            'coins', v_path.coins,
            'total_exp', v_path.total_exp,
            'free_pull_tickets', v_path.free_pull_tickets
        );
    END IF;

    -- Lock learning_paths
    SELECT * INTO v_path
    FROM public.learning_paths
    WHERE student_id = p_student_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'LEARNING_PATH_NOT_FOUND';
    END IF;

    v_new_coins := COALESCE(v_path.coins, 0) + p_coins_delta;
    v_new_exp := COALESCE(v_path.exp, 0) + p_exp_delta;
    v_new_total_exp := COALESCE(v_path.total_exp, v_path.exp, 0) + p_exp_delta;
    v_new_tickets := COALESCE(v_path.free_pull_tickets, 0) + p_tickets_delta;

    UPDATE public.learning_paths
    SET coins = v_new_coins,
        exp = v_new_exp,
        total_exp = v_new_total_exp,
        free_pull_tickets = v_new_tickets,
        last_active_date = now()
    WHERE student_id = p_student_id;

    -- Log transaction
    INSERT INTO public.economy_transactions (
        student_id, transaction_type, source, reference_id,
        coins_delta, exp_delta, tickets_delta, balance_after, metadata
    ) VALUES (
        p_student_id, 'REWARD_GRANT', p_source, p_reference_id,
        p_coins_delta, p_exp_delta, p_tickets_delta,
        jsonb_build_object('coins', v_new_coins, 'total_exp', v_new_total_exp, 'tickets', v_new_tickets),
        p_metadata
    );

    RETURN jsonb_build_object(
        'success', true,
        'coins', v_new_coins,
        'total_exp', v_new_total_exp,
        'free_pull_tickets', v_new_tickets
    );
END;
$$;

-- 8. RESTRICT PRIVILEGED RPC EXECUTION PERMISSIONS
REVOKE EXECUTE ON FUNCTION public.purchase_shop_item(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_shop_item(uuid, uuid, uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.complete_stage_transaction(uuid, uuid, integer, integer, integer, numeric, boolean, integer, numeric, integer, uuid[], uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_stage_transaction(uuid, uuid, integer, integer, integer, numeric, boolean, integer, numeric, integer, uuid[], uuid[]) TO service_role;

REVOKE EXECUTE ON FUNCTION public.grant_student_reward(uuid, text, text, integer, integer, integer, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_student_reward(uuid, text, text, integer, integer, integer, jsonb) TO service_role;

-- 9. DEFENSE-IN-DEPTH: SECURE SENSITIVE TABLES AGAINST DIRECT CLIENT ACCESS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economy_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_purchases ENABLE ROW LEVEL SECURITY;

-- Deny all direct anon/authenticated access to internal sensitive tables
REVOKE ALL ON public.user_sessions FROM anon, authenticated;
REVOKE ALL ON public.stage_attempts FROM anon, authenticated;
REVOKE ALL ON public.economy_transactions FROM anon, authenticated;
REVOKE ALL ON public.shop_purchases FROM anon, authenticated;

-- Allow only service_role (used exclusively by server-only admin client) full access
GRANT ALL ON public.user_sessions TO service_role;
GRANT ALL ON public.stage_attempts TO service_role;
GRANT ALL ON public.economy_transactions TO service_role;
GRANT ALL ON public.shop_purchases TO service_role;

