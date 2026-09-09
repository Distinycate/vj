-- ==============================================================================
-- Secure Auth Migration
-- Resolves the "sensitive_columns_exposed" security warning from Supabase
-- by revoking public read access to the password columns and providing
-- secure RPC functions for authentication.
-- ==============================================================================

-- 1. Create secure login function for students
CREATE OR REPLACE FUNCTION public.login_student(
    p_username text,
    p_password text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student public.students%ROWTYPE;
BEGIN
    SELECT * INTO v_student
    FROM public.students
    WHERE lower(username) = lower(p_username) AND password = p_password;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Return student data excluding password
    RETURN jsonb_build_object(
        'id', v_student.id,
        'student_id', v_student.student_id,
        'username', v_student.username,
        'student_name', v_student.student_name,
        'classroom_id', v_student.classroom_id,
        'academic_year', v_student.academic_year,
        'is_active', v_student.is_active,
        'user_type', v_student.user_type,
        'school_name', v_student.school_name
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.login_student(text, text) TO anon, authenticated;

-- 2. Create secure login function for teachers
CREATE OR REPLACE FUNCTION public.login_teacher(
    p_username text,
    p_password text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_teacher public.teachers%ROWTYPE;
BEGIN
    SELECT * INTO v_teacher
    FROM public.teachers
    WHERE lower(username) = lower(p_username) AND password = p_password;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Return teacher data excluding password
    RETURN jsonb_build_object(
        'id', v_teacher.id,
        'name', v_teacher.name,
        'username', v_teacher.username,
        'role', v_teacher.role,
        'is_active', v_teacher.is_active
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.login_teacher(text, text) TO anon, authenticated;

-- 3. Revoke read access to password columns
-- This tells PostgREST that these columns are not readable, clearing the Supabase warning.
REVOKE SELECT (password) ON public.students FROM public, anon, authenticated;
REVOKE SELECT (password) ON public.teachers FROM public, anon, authenticated;
