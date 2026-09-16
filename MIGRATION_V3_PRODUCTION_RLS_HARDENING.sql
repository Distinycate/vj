BEGIN;

-- MIGRATION_V3_PRODUCTION_RLS_HARDENING.sql
-- Atomic security migration for Phase 3.2C.

DO $$
DECLARE
    v_server_only_tables text[] := ARRAY[
        'students', 'teachers', 'learning_paths', 'analytics_summary', 
        'card_inventory', 'card_admin_actions', 'user_sessions', 
        'economy_transactions', 'shop_purchases', 'stage_attempts', 
        'attempts', 'attempt_hint_events', 'student_stage_progress',
        'stage_results'
    ];
    v_client_read_only_tables text[] := ARRAY['stages'];
    v_table text;
    v_missing_count int := 0;
BEGIN
    -- PRECONDITION: Check all server-only tables exist
    FOREACH v_table IN ARRAY v_server_only_tables LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_table) THEN
            RAISE WARNING 'Precondition failed: Table % does not exist.', v_table;
            v_missing_count := v_missing_count + 1;
        END IF;
    END LOOP;
    
    -- PRECONDITION: Check client-read-only tables exist
    FOREACH v_table IN ARRAY v_client_read_only_tables LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_table) THEN
            RAISE WARNING 'Precondition failed: Table % does not exist.', v_table;
            v_missing_count := v_missing_count + 1;
        END IF;
    END LOOP;

    IF v_missing_count > 0 THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: % tables missing. V3 migration must precede hardening.', v_missing_count;
    END IF;

    -- PRECONDITION: Check RPCs exist with exact signatures
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'record_word_attempt_v2'
          AND pg_get_function_identity_arguments(p.oid) = 'p_student_id uuid, p_stage_attempt_id uuid, p_word_id uuid, p_is_correct boolean, p_response_time_ms integer, p_now timestamp with time zone'
    ) THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: RPC record_word_attempt_v2 exact signature missing.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'complete_stage_with_progression_v3'
          AND pg_get_function_identity_arguments(p.oid) = 'p_attempt_id uuid, p_student_id uuid, p_word_attempts jsonb, p_now timestamp with time zone'
    ) THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: RPC complete_stage_with_progression_v3 exact signature missing.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'record_attempt_hint_v3'
          AND pg_get_function_identity_arguments(p.oid) = 'p_student_id uuid, p_stage_attempt_id uuid, p_question_vocabulary_id uuid'
    ) THEN
        RAISE EXCEPTION 'PRECONDITION FAILED: RPC record_attempt_hint_v3 exact signature missing.';
    END IF;

    -- MUTATIONS: Server Only Tables
    FOREACH v_table IN ARRAY v_server_only_tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', v_table);
        EXECUTE format('REVOKE ALL ON public.%I FROM public, anon, authenticated;', v_table);
        EXECUTE format('GRANT ALL ON public.%I TO service_role;', v_table);
    END LOOP;

    -- MUTATIONS: Client Read-Only Content Tables
    FOREACH v_table IN ARRAY v_client_read_only_tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', v_table);
        EXECUTE format('REVOKE ALL ON public.%I FROM public, anon, authenticated;', v_table);
        EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated;', v_table);
        EXECUTE format('GRANT ALL ON public.%I TO service_role;', v_table);
    END LOOP;
END $$;

-- Legacy stages policy handling & explicit read policy
DROP POLICY IF EXISTS "Authenticated users can read stages" ON public.stages;
DROP POLICY IF EXISTS "Allow anon and authenticated to read stages" ON public.stages;
CREATE POLICY "Allow anon and authenticated to read stages" ON public.stages FOR SELECT TO anon, authenticated USING (true);

-- Hardening RPCs
ALTER FUNCTION public.record_word_attempt_v2(uuid, uuid, uuid, boolean, integer, timestamptz) SET search_path = pg_catalog, public;
REVOKE EXECUTE ON FUNCTION public.record_word_attempt_v2(uuid, uuid, uuid, boolean, integer, timestamptz) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_word_attempt_v2(uuid, uuid, uuid, boolean, integer, timestamptz) TO service_role;

ALTER FUNCTION public.complete_stage_with_progression_v3(uuid, uuid, jsonb, timestamptz) SET search_path = pg_catalog, public;
REVOKE EXECUTE ON FUNCTION public.complete_stage_with_progression_v3(uuid, uuid, jsonb, timestamptz) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_stage_with_progression_v3(uuid, uuid, jsonb, timestamptz) TO service_role;

ALTER FUNCTION public.record_attempt_hint_v3(uuid, uuid, uuid) SET search_path = pg_catalog, public;
REVOKE EXECUTE ON FUNCTION public.record_attempt_hint_v3(uuid, uuid, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_attempt_hint_v3(uuid, uuid, uuid) TO service_role;

COMMIT;
