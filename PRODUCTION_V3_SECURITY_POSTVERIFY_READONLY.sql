-- PRODUCTION_V3_SECURITY_POSTVERIFY_READONLY.sql
-- Verifies that RLS and proper grants are configured on all sensitive tables post-migration.

DO $$
DECLARE
    v_results jsonb := '[]'::jsonb;
    v_tbl record;
    v_has_rls boolean;
    v_grants jsonb;
    v_policies jsonb;
    v_expected text;
    v_classification text;
    v_rpc record;
    v_rpc_safe boolean;
    v_blocker_count int := 0;
    v_public_select boolean;
    v_public_insert boolean;
    v_public_update boolean;
    v_public_delete boolean;
    v_public_execute boolean;
BEGIN
    FOR v_tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename IN (
              'students', 'teachers', 'learning_paths', 'analytics_summary', 
              'card_inventory', 'card_admin_actions', 'user_sessions', 
              'economy_transactions', 'shop_purchases', 'stage_attempts', 
              'stage_results', 'attempts', 'attempt_hint_events', 
              'student_stage_progress', 'stages'
          )
    LOOP
        -- Check RLS
        SELECT rowsecurity INTO v_has_rls FROM pg_tables WHERE schemaname = 'public' AND tablename = v_tbl.tablename;
        
        -- Get PUBLIC privileges safely via catalog
        SELECT COALESCE(bool_or(privilege_type = 'SELECT'), false),
               COALESCE(bool_or(privilege_type = 'INSERT'), false),
               COALESCE(bool_or(privilege_type = 'UPDATE'), false),
               COALESCE(bool_or(privilege_type = 'DELETE'), false)
        INTO v_public_select, v_public_insert, v_public_update, v_public_delete
        FROM information_schema.table_privileges 
        WHERE table_schema = 'public' AND table_name = v_tbl.tablename AND grantee = 'PUBLIC';

        -- Check Grants for all DML operations robustly (NULL-safe)
        v_grants := jsonb_build_object(
            'SELECT', jsonb_build_object(
                'public', v_public_select,
                'anon', COALESCE(has_table_privilege('anon', 'public.' || v_tbl.tablename, 'SELECT'), false),
                'authenticated', COALESCE(has_table_privilege('authenticated', 'public.' || v_tbl.tablename, 'SELECT'), false),
                'service_role', COALESCE(has_table_privilege('service_role', 'public.' || v_tbl.tablename, 'SELECT'), false)
            ),
            'INSERT', jsonb_build_object(
                'public', v_public_insert,
                'anon', COALESCE(has_table_privilege('anon', 'public.' || v_tbl.tablename, 'INSERT'), false),
                'authenticated', COALESCE(has_table_privilege('authenticated', 'public.' || v_tbl.tablename, 'INSERT'), false),
                'service_role', COALESCE(has_table_privilege('service_role', 'public.' || v_tbl.tablename, 'INSERT'), false)
            ),
            'UPDATE', jsonb_build_object(
                'public', v_public_update,
                'anon', COALESCE(has_table_privilege('anon', 'public.' || v_tbl.tablename, 'UPDATE'), false),
                'authenticated', COALESCE(has_table_privilege('authenticated', 'public.' || v_tbl.tablename, 'UPDATE'), false),
                'service_role', COALESCE(has_table_privilege('service_role', 'public.' || v_tbl.tablename, 'UPDATE'), false)
            ),
            'DELETE', jsonb_build_object(
                'public', v_public_delete,
                'anon', COALESCE(has_table_privilege('anon', 'public.' || v_tbl.tablename, 'DELETE'), false),
                'authenticated', COALESCE(has_table_privilege('authenticated', 'public.' || v_tbl.tablename, 'DELETE'), false),
                'service_role', COALESCE(has_table_privilege('service_role', 'public.' || v_tbl.tablename, 'DELETE'), false)
            )
        );

        -- Get policies
        SELECT COALESCE(jsonb_agg(policyname), '[]'::jsonb) INTO v_policies
        FROM pg_policies WHERE schemaname = 'public' AND tablename = v_tbl.tablename;

        IF v_tbl.tablename = 'stages' THEN
            v_expected := 'CLIENT_READ_ONLY_CONTENT';
        ELSE
            v_expected := 'SERVER_ONLY';
        END IF;

        -- Classify
        IF NOT v_has_rls THEN
            v_classification := 'SECURITY_BLOCKER (RLS Disabled)';
            v_blocker_count := v_blocker_count + 1;
        ELSIF v_expected = 'SERVER_ONLY' THEN
            IF (
                (v_grants->'SELECT'->>'anon')::boolean = true OR (v_grants->'SELECT'->>'authenticated')::boolean = true OR (v_grants->'SELECT'->>'public')::boolean = true OR
                (v_grants->'INSERT'->>'anon')::boolean = true OR (v_grants->'INSERT'->>'authenticated')::boolean = true OR (v_grants->'INSERT'->>'public')::boolean = true OR
                (v_grants->'UPDATE'->>'anon')::boolean = true OR (v_grants->'UPDATE'->>'authenticated')::boolean = true OR (v_grants->'UPDATE'->>'public')::boolean = true OR
                (v_grants->'DELETE'->>'anon')::boolean = true OR (v_grants->'DELETE'->>'authenticated')::boolean = true OR (v_grants->'DELETE'->>'public')::boolean = true OR
                (v_grants->'SELECT'->>'service_role')::boolean = false OR (v_grants->'INSERT'->>'service_role')::boolean = false OR (v_grants->'UPDATE'->>'service_role')::boolean = false OR (v_grants->'DELETE'->>'service_role')::boolean = false
            ) THEN
                v_classification := 'SECURITY_BLOCKER (Over-granted/Under-granted server_only)';
                v_blocker_count := v_blocker_count + 1;
            ELSE
                v_classification := 'SAFE_SERVER_ONLY';
            END IF;
        ELSIF v_expected = 'CLIENT_READ_ONLY_CONTENT' THEN
            IF (
                (v_grants->'SELECT'->>'anon')::boolean = false OR (v_grants->'SELECT'->>'authenticated')::boolean = false OR (v_grants->'SELECT'->>'public')::boolean = true
            ) OR (
                (v_grants->'INSERT'->>'anon')::boolean = true OR (v_grants->'INSERT'->>'authenticated')::boolean = true OR (v_grants->'INSERT'->>'public')::boolean = true OR
                (v_grants->'UPDATE'->>'anon')::boolean = true OR (v_grants->'UPDATE'->>'authenticated')::boolean = true OR (v_grants->'UPDATE'->>'public')::boolean = true OR
                (v_grants->'DELETE'->>'anon')::boolean = true OR (v_grants->'DELETE'->>'authenticated')::boolean = true OR (v_grants->'DELETE'->>'public')::boolean = true OR
                (v_grants->'SELECT'->>'service_role')::boolean = false OR (v_grants->'INSERT'->>'service_role')::boolean = false OR (v_grants->'UPDATE'->>'service_role')::boolean = false OR (v_grants->'DELETE'->>'service_role')::boolean = false
            ) THEN
                v_classification := 'SECURITY_BLOCKER (Over-granted/Under-granted read_only_content)';
                v_blocker_count := v_blocker_count + 1;
            ELSE
                -- Check for explicit policy matching SELECT intent
                IF v_policies::text NOT LIKE '%Allow anon and authenticated to read stages%' THEN
                    v_classification := 'SECURITY_BLOCKER (Missing explicit read policy)';
                    v_blocker_count := v_blocker_count + 1;
                ELSE
                    v_classification := 'SAFE_CLIENT_READ_ONLY';
                END IF;
            END IF;
        END IF;

        v_results := v_results || jsonb_build_object(
            'table_name', v_tbl.tablename,
            'rls_enabled', v_has_rls,
            'grants', v_grants,
            'policies', v_policies,
            'expected_model', v_expected,
            'classification', v_classification
        );
    END LOOP;

    -- Verify RPCs search_path
    SELECT count(*) = 3 INTO v_rpc_safe
    FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proconfig::text LIKE '%search_path%pg_catalog, public%'
      AND (
          (p.proname = 'record_word_attempt_v2' AND pg_get_function_identity_arguments(p.oid) = 'p_student_id uuid, p_stage_attempt_id uuid, p_word_id uuid, p_is_correct boolean, p_response_time_ms integer, p_now timestamp with time zone') OR
          (p.proname = 'complete_stage_with_progression_v3' AND pg_get_function_identity_arguments(p.oid) = 'p_attempt_id uuid, p_student_id uuid, p_word_attempts jsonb, p_now timestamp with time zone') OR
          (p.proname = 'record_attempt_hint_v3' AND pg_get_function_identity_arguments(p.oid) = 'p_student_id uuid, p_stage_attempt_id uuid, p_question_vocabulary_id uuid')
      );

    IF NOT v_rpc_safe THEN
        v_results := v_results || jsonb_build_object('table_name', 'RPC search_path', 'expected_model', 'SAFE_RPC', 'classification', 'SECURITY_BLOCKER (Missing safe search_path or exact signature)');
        v_blocker_count := v_blocker_count + 1;
    ELSE
        v_results := v_results || jsonb_build_object('table_name', 'RPC search_path', 'expected_model', 'SAFE_RPC', 'classification', 'SAFE');
    END IF;

    -- Verify RPC Execute privileges explicitly and strictly per exact identity
    FOR v_rpc IN 
        SELECT p.oid, p.proname, p.proacl 
        FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
          AND (
              (p.proname = 'record_word_attempt_v2' AND pg_get_function_identity_arguments(p.oid) = 'p_student_id uuid, p_stage_attempt_id uuid, p_word_id uuid, p_is_correct boolean, p_response_time_ms integer, p_now timestamp with time zone') OR
              (p.proname = 'complete_stage_with_progression_v3' AND pg_get_function_identity_arguments(p.oid) = 'p_attempt_id uuid, p_student_id uuid, p_word_attempts jsonb, p_now timestamp with time zone') OR
              (p.proname = 'record_attempt_hint_v3' AND pg_get_function_identity_arguments(p.oid) = 'p_student_id uuid, p_stage_attempt_id uuid, p_question_vocabulary_id uuid')
          )
    LOOP
        -- Check PUBLIC execute explicitly taking NULL default into account
        IF v_rpc.proacl IS NULL THEN
            v_public_execute := true;
        ELSE
            SELECT COALESCE(bool_or(grantee = 0 AND privilege_type = 'EXECUTE'), false) INTO v_public_execute
            FROM aclexplode(v_rpc.proacl);
        END IF;
        
        IF v_public_execute OR 
           has_function_privilege('anon', v_rpc.oid, 'EXECUTE') OR 
           has_function_privilege('authenticated', v_rpc.oid, 'EXECUTE') OR
           NOT has_function_privilege('service_role', v_rpc.oid, 'EXECUTE') THEN
            
            v_results := v_results || jsonb_build_object(
                'table_name', 'RPC EXECUTE ' || v_rpc.proname, 
                'expected_model', 'SAFE_RPC',
                'classification', 'SECURITY_BLOCKER (Over-granted execute or missing service_role)'
            );
            v_blocker_count := v_blocker_count + 1;
        ELSE
            v_results := v_results || jsonb_build_object('table_name', 'RPC EXECUTE ' || v_rpc.proname, 'expected_model', 'SAFE_RPC', 'classification', 'SAFE');
        END IF;
    END LOOP;

    v_results := v_results || jsonb_build_object('table_name', 'OVERALL_SECURITY_POSTVERIFY', 'expected_model', 'PASS', 'classification', CASE WHEN v_blocker_count > 0 THEN 'BLOCKER' ELSE 'PASS' END);

    PERFORM set_config('vj.security_postverify', v_results::text, false);
END $$;

SELECT 
    table_name, 
    rls_enabled, 
    expected_model,
    classification,
    grants,
    policies
FROM jsonb_to_recordset(current_setting('vj.security_postverify', true)::jsonb) 
AS x(table_name text, rls_enabled boolean, grants jsonb, policies jsonb, expected_model text, classification text)
ORDER BY 
    CASE table_name WHEN 'OVERALL_SECURITY_POSTVERIFY' THEN 0 ELSE 1 END,
    CASE WHEN classification LIKE 'SECURITY_BLOCKER%' THEN 1 WHEN classification LIKE 'BLOCKER%' THEN 2 ELSE 3 END, table_name;
