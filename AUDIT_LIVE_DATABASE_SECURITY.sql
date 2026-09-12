-- ==============================================================================
-- VOCAB JOURNEY — PHASE 2 FINAL RE-AUDIT: LIVE DATABASE SECURITY VERIFICATION
-- Purpose: Inspect live database state for Table Privileges, Function Privileges,
--          RLS Status, RLS Policies, and SECURITY DEFINER search_path configurations.
-- ==============================================================================

-- 1. TABLE PRIVILEGES INSPECTION
-- Verify that anon and authenticated have NO privileges on sensitive tables.
-- Expected: Only 'service_role' (or postgres) has permissions; 'anon' and 'authenticated' return 0 rows.
SELECT
    table_schema,
    table_name,
    grantee,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name IN (
      'students',
      'teachers',
      'learning_paths',
      'analytics_summary',
      'card_inventory',
      'card_admin_actions',
      'user_sessions',
      'economy_transactions',
      'shop_purchases',
      'stage_attempts'
  )
GROUP BY table_schema, table_name, grantee
ORDER BY table_name, grantee;

-- 2. FUNCTION / ROUTINE PRIVILEGES INSPECTION
-- Verify that privileged transactional RPCs are NOT executable by PUBLIC, anon, or authenticated.
-- Expected: Only 'service_role' has EXECUTE privilege.
SELECT
    routine_schema,
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN (
      'purchase_shop_item',
      'complete_stage_transaction',
      'grant_student_reward',
      'award_coins',
      'award_xp',
      'consume_energy',
      'repair_all_student_profiles'
  )
ORDER BY routine_name, grantee;

-- 3. ROW LEVEL SECURITY (RLS) ENABLED STATUS
-- Verify that rowsecurity = true for all sensitive tables.
-- Expected: rowsecurity = true on all rows.
SELECT
    schemaname,
    tablename,
    rowsecurity AS is_rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
      'students',
      'teachers',
      'learning_paths',
      'analytics_summary',
      'card_inventory',
      'card_admin_actions',
      'user_sessions',
      'economy_transactions',
      'shop_purchases',
      'stage_attempts'
  )
ORDER BY tablename;

-- 4. ACTIVE ROW LEVEL SECURITY POLICIES
-- Inspect all policies attached to sensitive tables.
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
      'students',
      'teachers',
      'learning_paths',
      'analytics_summary',
      'card_inventory',
      'card_admin_actions',
      'user_sessions',
      'economy_transactions',
      'shop_purchases',
      'stage_attempts'
  )
ORDER BY tablename, policyname;

-- 5. SECURITY DEFINER FUNCTIONS & SEARCH_PATH CONFIGURATION
-- Verify that all sensitive functions have:
--  - prosecdef = true (SECURITY DEFINER)
--  - proconfig = '{search_path=public,pg_temp}' (Prevents search_path hijacking)
SELECT
    p.proname AS function_name,
    pg_get_userbyid(p.proowner) AS function_owner,
    p.prosecdef AS is_security_definer,
    p.proconfig AS search_path_configuration
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
      'purchase_shop_item',
      'complete_stage_transaction',
      'grant_student_reward'
  )
ORDER BY p.proname;

-- 6. LIVE PLAINTEXT PASSWORD MIGRATION METRICS
-- Measures the remaining legacy plaintext credentials in students and teachers.
SELECT
  'students' AS account_type,
  COUNT(*) FILTER (WHERE password LIKE '$2%') AS bcrypt_count,
  COUNT(*) FILTER (WHERE password NOT LIKE '$2%' OR password IS NULL) AS legacy_plaintext_count,
  COUNT(*) AS total_accounts,
  ROUND((COUNT(*) FILTER (WHERE password LIKE '$2%')::numeric / NULLIF(COUNT(*), 0)) * 100, 2) AS migration_percentage
FROM public.students

UNION ALL

SELECT
  'teachers' AS account_type,
  COUNT(*) FILTER (WHERE password LIKE '$2%') AS bcrypt_count,
  COUNT(*) FILTER (WHERE password NOT LIKE '$2%' OR password IS NULL) AS legacy_plaintext_count,
  COUNT(*) AS total_accounts,
  ROUND((COUNT(*) FILTER (WHERE password LIKE '$2%')::numeric / NULLIF(COUNT(*), 0)) * 100, 2) AS migration_percentage
FROM public.teachers;
