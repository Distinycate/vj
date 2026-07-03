-- Vocab Journey: Student Account Verification and Cleanup
-- This script adds a verification flag to students and provides secure functions to purge duplicates.

-- 1. Add verification column
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- 2. Allow students to verify their own account
CREATE OR REPLACE FUNCTION public.student_verify_account(p_student_id uuid) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.students
  SET is_verified = true
  WHERE id = p_student_id;
  RETURN true;
END;
$$;

-- 3. Allow teacher to purge unverified students in a classroom
CREATE OR REPLACE FUNCTION public.teacher_purge_unverified(
  p_teacher_id uuid,
  p_classroom_id uuid
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = p_teacher_id AND is_active = true) THEN
    RAISE EXCEPTION 'TEACHER_NOT_FOUND';
  END IF;

  -- Delete all unverified students in the specified classroom.
  -- Thanks to ON DELETE CASCADE, all related records (attempts, logs, etc.) will be cleaned up automatically.
  DELETE FROM public.students
  WHERE classroom_id = p_classroom_id AND is_verified = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 4. Allow teacher to delete a specific student account manually
CREATE OR REPLACE FUNCTION public.teacher_delete_student_account(
  p_teacher_id uuid,
  p_student_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = p_teacher_id AND is_active = true) THEN
    RAISE EXCEPTION 'TEACHER_NOT_FOUND';
  END IF;

  DELETE FROM public.students
  WHERE id = p_student_id;
  
  RETURN true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.student_verify_account(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_purge_unverified(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_delete_student_account(uuid, uuid) TO anon, authenticated;
