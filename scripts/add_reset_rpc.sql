-- Admin Reset Students RPC Functions
-- Adds functions to allow teachers/admins to reset students' progress completely.
-- Reset includes: learning_paths (stage, exp, coins, tickets), inventory (cards), student_purchases

BEGIN;

-- 1. Reset Individual Student
CREATE OR REPLACE FUNCTION public.teacher_reset_student(
  p_teacher_id uuid,
  p_student_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify teacher exists
  IF NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = p_teacher_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Reset learning path to completely fresh state
  UPDATE public.learning_paths
  SET current_stage = 1, current_rank = 1, exp = 0, total_exp = 0,
      coins = 0, free_pull_tickets = 0, paid_gacha_pulls = 0,
      streak_days = 0
  WHERE student_id = p_student_id;

  -- Clear pre_tests for this student
  DELETE FROM public.pre_tests WHERE student_id = p_student_id;
  UPDATE public.analytics_summary SET pretest_score = 0 WHERE student_id = p_student_id;

  -- Clear inventory (cards)
  DELETE FROM public.card_inventory WHERE student_id = p_student_id;
  DELETE FROM public.gacha_pulls WHERE student_id = p_student_id;
  DELETE FROM public.card_logs WHERE attacker_id = p_student_id OR target_id = p_student_id;
  DELETE FROM public.card_notifications WHERE student_id = p_student_id;
END;
$$;


-- 2. Reset All Students
CREATE OR REPLACE FUNCTION public.teacher_reset_all_students(
  p_teacher_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify teacher exists
  IF NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = p_teacher_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Reset all learning paths
  UPDATE public.learning_paths
  SET current_stage = 1, current_rank = 1, exp = 0, total_exp = 0,
      coins = 0, free_pull_tickets = 0, paid_gacha_pulls = 0,
      streak_days = 0
  WHERE student_id IS NOT NULL;

  -- Clear pre_tests
  TRUNCATE TABLE public.pre_tests CASCADE;
  UPDATE public.analytics_summary SET pretest_score = 0 WHERE student_id IS NOT NULL;

  -- Clear inventory (cards)
  TRUNCATE TABLE public.card_inventory CASCADE;
  TRUNCATE TABLE public.gacha_pulls CASCADE;
  TRUNCATE TABLE public.card_logs CASCADE;
  TRUNCATE TABLE public.card_notifications CASCADE;
END;
$$;

COMMIT;
