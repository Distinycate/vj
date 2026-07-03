-- Script: Force Pretest Retake
-- Sets pretest_date and pretest_score to NULL for all students.
-- This forces everyone to retake the 100-question pretest upon next login.

BEGIN;

UPDATE public.learning_paths
SET 
    pretest_date = NULL,
    pretest_score = NULL;

COMMIT;
