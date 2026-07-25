-- Fix registration open/close for the app's custom teacher login.
-- The app authenticates teachers from public.teachers, so auth.uid() is not available
-- for this setting toggle. Keep RLS strict and expose a narrow SECURITY DEFINER RPC.

ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS is_registration_open boolean DEFAULT true;

INSERT INTO public.schools (id, name, is_registration_open)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default School', true)
ON CONFLICT (name) DO UPDATE
SET is_registration_open = COALESCE(public.schools.is_registration_open, EXCLUDED.is_registration_open);

CREATE OR REPLACE FUNCTION public.teacher_set_registration_open(
    p_teacher_id uuid,
    p_is_open boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_teacher public.teachers%ROWTYPE;
    v_school_id uuid;
BEGIN
    SELECT *
    INTO v_teacher
    FROM public.teachers
    WHERE id = p_teacher_id
      AND role IN ('ADMIN', 'TEACHER');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ไม่มีสิทธิ์เปลี่ยนสถานะการลงทะเบียน';
    END IF;

    v_school_id := v_teacher.school_id;

    IF v_school_id IS NULL THEN
        SELECT id
        INTO v_school_id
        FROM public.schools
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;

    IF v_school_id IS NULL THEN
        INSERT INTO public.schools (id, name, is_registration_open)
        VALUES ('00000000-0000-0000-0000-000000000001', 'Default School', p_is_open)
        ON CONFLICT (name) DO UPDATE
        SET is_registration_open = EXCLUDED.is_registration_open
        RETURNING id INTO v_school_id;
    ELSE
        UPDATE public.schools
        SET is_registration_open = p_is_open
        WHERE id = v_school_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'school_id', v_school_id,
        'is_registration_open', p_is_open
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.teacher_set_registration_open(uuid, boolean) TO anon, authenticated;
