-- ==============================================================================
-- Vocab Journey Migration: Add teacher_type to public.teachers
-- Purpose: Strictly distinguish Internal (Main School) vs Network Teachers
-- Safety: Additive column only. Preserves all existing teacher accounts as 'INTERNAL'.
-- ==============================================================================

-- 1. Add teacher_type column with default 'INTERNAL' and check constraint
ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS teacher_type text NOT NULL DEFAULT 'INTERNAL'
CHECK (teacher_type IN ('INTERNAL', 'NETWORK'));

-- 2. Ensure all existing records are marked as INTERNAL
UPDATE public.teachers
SET teacher_type = 'INTERNAL'
WHERE teacher_type IS NULL;

-- 3. Documentation of Rollback (if ever needed):
-- ALTER TABLE public.teachers DROP COLUMN IF EXISTS teacher_type;
