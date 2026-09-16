-- PRODUCTION_V3_SECURITY_DETAIL_READONLY.sql
DO $$
DECLARE
    v_results jsonb := '[]'::jsonb;
    v_tbl record;
    v_has_rls boolean;
    v_force_rls boolean;
    v_grants jsonb;
    v_policies jsonb;
    v_classification text;
BEGIN
    FOR v_tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename IN ('stage_attempts', 'stages', 'learning_paths', 'economy_transactions', 'stage_results', 'students')
    LOOP
        -- Check RLS
        SELECT rowsecurity INTO v_has_rls FROM pg_tables WHERE schemaname = 'public' AND tablename = v_tbl.tablename;
        
        -- Check force RLS
        SELECT relforcerowsecurity INTO v_force_rls FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = v_tbl.tablename;

        -- Check Grants
        SELECT jsonb_build_object(
            'public', COALESCE(bool_or(grantee = 'PUBLIC'), false),
            'anon', COALESCE(bool_or(grantee = 'anon'), false),
            'authenticated', COALESCE(bool_or(grantee = 'authenticated'), false),
            'service_role', COALESCE(bool_or(grantee = 'service_role'), false)
        ) INTO v_grants
        FROM information_schema.role_table_grants
        WHERE table_schema = 'public' AND table_name = v_tbl.tablename AND privilege_type = 'SELECT';

        -- Get policies
        SELECT COALESCE(jsonb_agg(policyname), '[]'::jsonb) INTO v_policies
        FROM pg_policies WHERE schemaname = 'public' AND tablename = v_tbl.tablename;

        -- Classify
        IF NOT v_has_rls THEN
            IF (v_grants->>'anon')::boolean = true OR (v_grants->>'authenticated')::boolean = true OR (v_grants->>'public')::boolean = true THEN
                v_classification := 'SECURITY_BLOCKER';
            ELSE
                v_classification := 'SAFE_SERVER_ONLY';
            END IF;
        ELSE
            v_classification := 'EXPECTED_LEGACY';
        END IF;

        v_results := v_results || jsonb_build_object(
            'table_name', v_tbl.tablename,
            'rls_enabled', v_has_rls,
            'force_rls', v_force_rls,
            'grants', v_grants,
            'policies', v_policies,
            'classification', v_classification
        );
    END LOOP;

    PERFORM set_config('vj.security_detail', v_results::text, false);
END $$;

SELECT 
    table_name, 
    rls_enabled, 
    force_rls,
    grants->>'public' AS grant_public,
    grants->>'anon' AS grant_anon,
    grants->>'authenticated' AS grant_authenticated,
    grants->>'service_role' AS grant_service_role,
    policies,
    classification
FROM jsonb_to_recordset(current_setting('vj.security_detail', true)::jsonb) 
AS x(table_name text, rls_enabled boolean, force_rls boolean, grants jsonb, policies jsonb, classification text)
ORDER BY 
    CASE classification WHEN 'SECURITY_BLOCKER' THEN 1 WHEN 'SAFE_SERVER_ONLY' THEN 2 ELSE 3 END, table_name;
