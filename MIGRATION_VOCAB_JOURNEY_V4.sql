-- ==============================================================================
-- Vocab Journey - V4 Migration
-- Features: Source Reference for Vocabulary, Post-test enhancements
-- ==============================================================================

-- 1. Add source_reference column to vocabulary table
-- This allows tracking which academic source each word comes from (e.g. Oxford 3000, CEFR wordlists)
ALTER TABLE public.vocabulary
ADD COLUMN IF NOT EXISTS source_reference text DEFAULT 'Oxford 3000';

-- 2. Update existing vocabulary records to set source_reference
-- Words with CEFR A1-A2 are typically from Oxford 3000 core vocabulary
UPDATE public.vocabulary
SET source_reference = 'Oxford 3000'
WHERE source_reference IS NULL OR source_reference = '';

-- 3. Add index on post_tests for faster monthly aggregation queries
CREATE INDEX IF NOT EXISTS idx_post_tests_student_created 
ON public.post_tests(student_id, created_at);

-- 4. Add index on pre_tests for faster monthly aggregation queries
CREATE INDEX IF NOT EXISTS idx_pre_tests_student_created 
ON public.pre_tests(student_id, created_at);
