-- Script: Force Pretest Retake
-- Deletes all records from pre_tests.
-- This forces everyone to retake the pretest upon next login because their pretest count will be 0.

BEGIN;

TRUNCATE TABLE public.pre_tests CASCADE;

-- Also reset any summary metrics if needed
UPDATE public.analytics_summary SET pretest_score = 0 WHERE pretest_score IS NOT NULL;

COMMIT;
