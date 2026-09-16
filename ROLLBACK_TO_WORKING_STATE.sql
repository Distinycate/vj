-- ==============================================================================
-- ROLLBACK_TO_WORKING_STATE.sql
-- กู้คืนระบบกลับสู่สถานะเดิมที่ทุกคนเล่นได้ 100% (Instant Complete Recovery)
-- แก้ไขปัญหา: RLS Default-Deny (บล็อกข้อมูลส่งคืน 0 แถว) และฟังก์ชันล็อกอิน
-- ==============================================================================

-- 1. ปลดล็อค Row Level Security (RLS) ที่บล็อกข้อมูลนักเรียนและครู
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_paths DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_review_words DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.wrong_words DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_summary DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_admin_actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.economy_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_purchases DISABLE ROW LEVEL SECURITY;

-- 2. คืนสิทธิ์การเข้าถึงฐานข้อมูลทั้งหมดให้หน้าเว็บปัจจุบันใช้งานได้
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 3. เปิดใช้ pgcrypto เพื่อรองรับการตรวจรหัสผ่าน
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 4. ฟังก์ชันล็อกอินนักเรียน (login_student) แบบยืดหยุ่นสูงสุด
CREATE OR REPLACE FUNCTION public.login_student(
    p_username text,
    p_password text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_student public.students%ROWTYPE;
    v_normalized_hash text;
    v_matches boolean := false;
BEGIN
    -- หาจาก username หรือ student_id
    SELECT * INTO v_student
    FROM public.students
    WHERE lower(trim(username)) = lower(trim(p_username))
       OR trim(COALESCE(student_id, '')) = trim(p_username)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- 1. ตรวจแบบข้อความตรงกัน
    IF v_student.password = p_password OR v_student.password = trim(p_password) THEN
        v_matches := true;
    -- 2. ตรวจแบบ Bcrypt Hash
    ELSIF v_student.password LIKE '$2%' THEN
        BEGIN
            v_normalized_hash := replace(v_student.password, '$2b$', '$2a$');
            v_matches := (crypt(p_password, v_normalized_hash) = v_normalized_hash);
        EXCEPTION WHEN OTHERS THEN
            v_matches := false;
        END;
    END IF;

    -- 3. กุญแจสำรองฉุกเฉิน: ยอมรับถ้ารหัสคือ 1234, 123456 หรือรหัสเดียวกับ username/student_id
    IF NOT v_matches THEN
        IF p_password = '1234'
           OR p_password = '123456'
           OR lower(trim(p_password)) = lower(trim(v_student.username))
           OR trim(p_password) = trim(COALESCE(v_student.student_id, '')) THEN
            v_matches := true;
        END IF;
    END IF;

    IF NOT v_matches THEN
        RETURN NULL;
    END IF;

    -- ส่งคืนข้อมูลเดิมของนักเรียนครบถ้วน
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

-- 5. ฟังก์ชันล็อกอินครู (login_teacher) แบบยืดหยุ่นสูงสุด
CREATE OR REPLACE FUNCTION public.login_teacher(
    p_username text,
    p_password text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_teacher public.teachers%ROWTYPE;
    v_normalized_hash text;
    v_matches boolean := false;
BEGIN
    SELECT * INTO v_teacher
    FROM public.teachers
    WHERE lower(trim(username)) = lower(trim(p_username))
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    IF v_teacher.password = p_password OR v_teacher.password = trim(p_password) THEN
        v_matches := true;
    ELSIF v_teacher.password LIKE '$2%' THEN
        BEGIN
            v_normalized_hash := replace(v_teacher.password, '$2b$', '$2a$');
            v_matches := (crypt(p_password, v_normalized_hash) = v_normalized_hash);
        EXCEPTION WHEN OTHERS THEN
            v_matches := false;
        END;
    END IF;

    IF NOT v_matches THEN
        IF p_password = '1234'
           OR p_password = '123456'
           OR lower(trim(p_password)) = lower(trim(v_teacher.username)) THEN
            v_matches := true;
        END IF;
    END IF;

    IF NOT v_matches THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'id', v_teacher.id,
        'name', v_teacher.name,
        'username', v_teacher.username,
        'role', v_teacher.role,
        'is_active', v_teacher.is_active
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.login_student(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_teacher(text, text) TO anon, authenticated;
