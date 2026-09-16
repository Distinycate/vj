-- PRODUCTION_V3_POST_MIGRATION_VERIFY.sql
-- Post-migration read-only verification script.
DO $$
DECLARE
    v_results jsonb := '[]'::jsonb;
    v_count bigint;
    v_val boolean;
    v_blocker_count int := 0;
    v_objects_exist boolean := false;
BEGIN
    -- 1. V3 objects all exist
    SELECT count(*) = 10 INTO v_objects_exist FROM (
        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_stage_progress'
        UNION ALL SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attempt_hint_events'
        UNION ALL SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stage_attempts' AND column_name = 'hint_count'
        UNION ALL SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stage_attempts' AND column_name = 'stars'
        UNION ALL SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stage_attempts' AND column_name = 'stage_id'
        UNION ALL SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'learning_paths' AND column_name = 'campaign_completed_at'
        UNION ALL SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'economy_transactions' AND column_name = 'primary_reason'
        UNION ALL SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'economy_transactions' AND column_name = 'bonus_flags'
        UNION ALL SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'record_attempt_hint_v3' AND pg_get_function_identity_arguments(p.oid) = 'p_student_id uuid, p_stage_attempt_id uuid, p_question_vocabulary_id uuid'
        UNION ALL SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'complete_stage_with_progression_v3' AND pg_get_function_identity_arguments(p.oid) = 'p_attempt_id uuid, p_student_id uuid, p_word_attempts jsonb, p_now timestamp with time zone'
    ) x;
    
    IF v_objects_exist THEN
        v_results := v_results || jsonb_build_object('check_name', '1. V3 Objects Exist', 'status', 'PASS', 'detail', 'Verified 10/10 V3 target schema objects (with exact RPC signatures).');
    ELSE
        v_results := v_results || jsonb_build_object('check_name', '1. V3 Objects Exist', 'status', 'BLOCKER', 'detail', 'V3 migration not present/incomplete.');
        v_blocker_count := v_blocker_count + 1;
    END IF;

    -- Only proceed with data checks if V3 tables exist to prevent PL/pgSQL crashes
    IF v_objects_exist THEN
        -- 2. student_stage_progress row counts
        EXECUTE 'SELECT count(*) FROM public.student_stage_progress' INTO v_count;
        v_results := v_results || jsonb_build_object('check_name', '2. student_stage_progress count', 'status', 'INFO', 'detail', v_count || ' rows.');

        -- 3. No stage_number > 100 in student_stage_progress
        EXECUTE 'SELECT count(*) FROM public.student_stage_progress ssp JOIN public.stages s ON ssp.stage_id = s.id WHERE s.stage_number > 100' INTO v_count;
        IF v_count = 0 THEN
            v_results := v_results || jsonb_build_object('check_name', '3. No >100 stages in progress', 'status', 'PASS', 'detail', 'Found ' || v_count || ' invalid rows.');
        ELSE
            v_results := v_results || jsonb_build_object('check_name', '3. No >100 stages in progress', 'status', 'BLOCKER', 'detail', 'Found ' || v_count || ' invalid rows.');
            v_blocker_count := v_blocker_count + 1;
        END IF;

        -- 4. No orphan progression rows
        EXECUTE 'SELECT count(*) FROM public.student_stage_progress ssp LEFT JOIN public.stages s ON ssp.stage_id = s.id WHERE s.id IS NULL' INTO v_count;
        IF v_count = 0 THEN
            v_results := v_results || jsonb_build_object('check_name', '4. No orphan progression', 'status', 'PASS', 'detail', 'Found ' || v_count || ' orphan rows.');
        ELSE
            v_results := v_results || jsonb_build_object('check_name', '4. No orphan progression', 'status', 'BLOCKER', 'detail', 'Found ' || v_count || ' orphan rows.');
            v_blocker_count := v_blocker_count + 1;
        END IF;

        -- 5. No duplicate student/stage progression
        EXECUTE 'SELECT count(*) FROM (SELECT student_id, stage_id FROM public.student_stage_progress GROUP BY student_id, stage_id HAVING count(*) > 1) dupes' INTO v_count;
        IF v_count = 0 THEN
            v_results := v_results || jsonb_build_object('check_name', '5. Unique progression constraint', 'status', 'PASS', 'detail', 'Found ' || v_count || ' duplicate student/stage pairs.');
        ELSE
            v_results := v_results || jsonb_build_object('check_name', '5. Unique progression constraint', 'status', 'BLOCKER', 'detail', 'Found ' || v_count || ' duplicate student/stage pairs.');
            v_blocker_count := v_blocker_count + 1;
        END IF;

        -- 6. V3 SECURITY DEFINER search_path
        SELECT count(*) = 2 INTO v_val FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
          AND (
              (p.proname = 'record_attempt_hint_v3' AND pg_get_function_identity_arguments(p.oid) = 'p_student_id uuid, p_stage_attempt_id uuid, p_question_vocabulary_id uuid') OR
              (p.proname = 'complete_stage_with_progression_v3' AND pg_get_function_identity_arguments(p.oid) = 'p_attempt_id uuid, p_student_id uuid, p_word_attempts jsonb, p_now timestamp with time zone')
          )
          AND p.proconfig::text LIKE '%search_path%pg_catalog, public%';
        
        IF v_val THEN
            v_results := v_results || jsonb_build_object('check_name', '6. RPC search_path Hardening', 'status', 'PASS', 'detail', 'Both exact V3 RPC signatures possess pg_catalog, public search_path.');
        ELSE
            v_results := v_results || jsonb_build_object('check_name', '6. RPC search_path Hardening', 'status', 'BLOCKER', 'detail', 'Search path not safely configured.');
            v_blocker_count := v_blocker_count + 1;
        END IF;

        -- 7. Privileged V3 RPC EXECUTE explicitly verified
        SELECT (count(*) = 2) INTO v_val
        FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
          AND (
              (p.proname = 'record_attempt_hint_v3' AND pg_get_function_identity_arguments(p.oid) = 'p_student_id uuid, p_stage_attempt_id uuid, p_question_vocabulary_id uuid') OR
              (p.proname = 'complete_stage_with_progression_v3' AND pg_get_function_identity_arguments(p.oid) = 'p_attempt_id uuid, p_student_id uuid, p_word_attempts jsonb, p_now timestamp with time zone')
          )
          AND p.proacl IS NOT NULL AND NOT EXISTS (SELECT 1 FROM aclexplode(p.proacl) WHERE grantee = 0 AND privilege_type = 'EXECUTE')
          AND has_function_privilege('anon', p.oid, 'EXECUTE') = false
          AND has_function_privilege('authenticated', p.oid, 'EXECUTE') = false
          AND has_function_privilege('service_role', p.oid, 'EXECUTE') = true;

        IF v_val THEN
            v_results := v_results || jsonb_build_object('check_name', '7. RPC Execute Restrictions', 'status', 'PASS', 'detail', 'Confirmed anon/authenticated cannot execute V3 exact progression RPCs, service_role can.');
        ELSE
            v_results := v_results || jsonb_build_object('check_name', '7. RPC Execute Restrictions', 'status', 'BLOCKER', 'detail', 'RPC execute grants are incorrect.');
            v_blocker_count := v_blocker_count + 1;
        END IF;

        -- 8. V3 table RLS enabled
        SELECT count(*) = 2 INTO v_val FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('student_stage_progress', 'attempt_hint_events') AND rowsecurity = true;
        IF v_val THEN
            v_results := v_results || jsonb_build_object('check_name', '8. New Tables RLS Enabled', 'status', 'PASS', 'detail', 'RLS is enabled on all new tables.');
        ELSE
            v_results := v_results || jsonb_build_object('check_name', '8. New Tables RLS Enabled', 'status', 'BLOCKER', 'detail', 'RLS is NOT enabled on all new tables.');
            v_blocker_count := v_blocker_count + 1;
        END IF;

        -- 9. Check economy unaltered by migration
        v_results := v_results || jsonb_build_object('check_name', '9. Economy Verification', 'status', 'INFO', 'detail', 'Run snapshot script to compare total coins/exp.');

    ELSE
        v_results := v_results || jsonb_build_object('check_name', 'DATA_CHECKS_SKIPPED', 'status', 'WARNING', 'detail', 'Data checks skipped because V3 objects are missing.');
    END IF;

    -- Summary
    v_results := v_results || jsonb_build_object('check_name', 'POST_MIGRATION_SUMMARY', 'status', CASE WHEN v_blocker_count > 0 THEN 'BLOCKER' ELSE 'PASS' END, 'detail', 'Blockers: ' || v_blocker_count);
    
    PERFORM set_config('vj.postverify', v_results::text, false);
END $$;

SELECT check_name, status, detail
FROM jsonb_to_recordset(current_setting('vj.postverify', true)::jsonb) 
AS x(check_name text, status text, detail text)
ORDER BY 
    CASE check_name WHEN 'POST_MIGRATION_SUMMARY' THEN 0 ELSE 1 END,
    CASE status WHEN 'BLOCKER' THEN 1 WHEN 'WARNING' THEN 2 WHEN 'PASS' THEN 3 ELSE 4 END, check_name;
