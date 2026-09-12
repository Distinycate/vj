#!/usr/bin/env node
/**
 * ONE-TIME OFFLINE PASSWORD HASH MIGRATION HELPER
 * This script provides the exact SQL to hash legacy plaintext passwords
 * so dormant accounts become 100% bcrypt in one execution.
 */

console.log(`
-- ==============================================================================
-- ONE-TIME BATCH PASSWORD MIGRATION SCRIPT (RUN IN SUPABASE SQL EDITOR)
-- Purpose: Convert all remaining plaintext passwords to bcrypt in one click.
-- ==============================================================================

-- 1. Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Upgrade all remaining plaintext student passwords to bcrypt ($2a$)
UPDATE public.students
SET password = crypt(password, gen_salt('bf', 10))
WHERE password IS NOT NULL 
  AND password NOT LIKE '$2%';

-- 3. Upgrade all remaining plaintext teacher passwords to bcrypt ($2a$)
UPDATE public.teachers
SET password = crypt(password, gen_salt('bf', 10))
WHERE password IS NOT NULL 
  AND password NOT LIKE '$2%';

-- 4. Verify that legacy plaintext count is now ZERO
SELECT
  'students' AS account_type,
  COUNT(*) FILTER (WHERE password LIKE '$2%') AS bcrypt_count,
  COUNT(*) FILTER (WHERE password NOT LIKE '$2%' OR password IS NULL) AS legacy_plaintext_count
FROM public.students
UNION ALL
SELECT
  'teachers' AS account_type,
  COUNT(*) FILTER (WHERE password LIKE '$2%') AS bcrypt_count,
  COUNT(*) FILTER (WHERE password NOT LIKE '$2%' OR password IS NULL) AS legacy_plaintext_count
FROM public.teachers;
`);
