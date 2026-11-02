-- ====================================================
-- Vocab Journey: Season 2 Student Accounts Setup
-- Total Students: 71 (ม.1: 25, ม.2: 20, ม.3: 26)
-- Username: 13-digit National ID (เลขประจำตัวประชาชน)
-- Password: 4-digit Student ID (เลขประจำตัวนักเรียน)
-- ====================================================

-- 1. Ensure classrooms exist
INSERT INTO public.classrooms (grade_level, room_number, class_name)
VALUES 
  ('ม.1', '1', 'ม.1/1'),
  ('ม.2', '1', 'ม.2/1'),
  ('ม.3', '1', 'ม.3/1')
ON CONFLICT (grade_level, room_number) DO NOTHING;

-- ม.1/1 | 4785 | เด็กชายนพกร บุญชู
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1300101311341' OR student_id = '4785' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1300101311341',
            student_id = '4785',
            password = '$2b$10$VQ3ytgOKbC1TKlQj7lhtTegDad41WzfppyxAUfhZV094CBPM6lLDa',
            student_name = 'เด็กชายนพกร บุญชู',
            first_name = 'นพกร',
            last_name = 'บุญชู',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1300101311341', '4785', '$2b$10$VQ3ytgOKbC1TKlQj7lhtTegDad41WzfppyxAUfhZV094CBPM6lLDa', 'เด็กชายนพกร บุญชู', 'นพกร', 'บุญชู', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 4878 | เด็กชายพัทธพงษ์ กะชินรัมย์
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800706751' OR student_id = '4878' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800706751',
            student_id = '4878',
            password = '$2b$10$mP6p8YwZpJdkz38QpQ3VZ.evtgHT0xDXXRc84ZSurwKqEA0PnbPPS',
            student_name = 'เด็กชายพัทธพงษ์ กะชินรัมย์',
            first_name = 'พัทธพงษ์',
            last_name = 'กะชินรัมย์',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800706751', '4878', '$2b$10$mP6p8YwZpJdkz38QpQ3VZ.evtgHT0xDXXRc84ZSurwKqEA0PnbPPS', 'เด็กชายพัทธพงษ์ กะชินรัมย์', 'พัทธพงษ์', 'กะชินรัมย์', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 4890 | เด็กชายวันเฉลิม ศรีสุข
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1119902779082' OR student_id = '4890' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1119902779082',
            student_id = '4890',
            password = '$2b$10$EFzhkcGiR4zv59RGmQyoHO79M4PThhqSMD3hKCKLBlFqVTPgHivp.',
            student_name = 'เด็กชายวันเฉลิม ศรีสุข',
            first_name = 'วันเฉลิม',
            last_name = 'ศรีสุข',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1119902779082', '4890', '$2b$10$EFzhkcGiR4zv59RGmQyoHO79M4PThhqSMD3hKCKLBlFqVTPgHivp.', 'เด็กชายวันเฉลิม ศรีสุข', 'วันเฉลิม', 'ศรีสุข', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 4892 | เด็กชายณัฐพล สมเย็น
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800681553' OR student_id = '4892' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800681553',
            student_id = '4892',
            password = '$2b$10$zA9trAGX4xRAWuO5xrcESOHH1lHbm5sB/TdTVxVh.m4U3Y1s9bPM2',
            student_name = 'เด็กชายณัฐพล สมเย็น',
            first_name = 'ณัฐพล',
            last_name = 'สมเย็น',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800681553', '4892', '$2b$10$zA9trAGX4xRAWuO5xrcESOHH1lHbm5sB/TdTVxVh.m4U3Y1s9bPM2', 'เด็กชายณัฐพล สมเย็น', 'ณัฐพล', 'สมเย็น', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 4899 | เด็กชายกรฤทธ์ กางรัมย์
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800702569' OR student_id = '4899' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800702569',
            student_id = '4899',
            password = '$2b$10$pB/aR4ty4CNzAEBM13eq1eJa8wwU3v2quKS3JUUAqgbPHCWZSsIf2',
            student_name = 'เด็กชายกรฤทธ์ กางรัมย์',
            first_name = 'กรฤทธ์',
            last_name = 'กางรัมย์',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800702569', '4899', '$2b$10$pB/aR4ty4CNzAEBM13eq1eJa8wwU3v2quKS3JUUAqgbPHCWZSsIf2', 'เด็กชายกรฤทธ์ กางรัมย์', 'กรฤทธ์', 'กางรัมย์', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 4902 | เด็กชายเอกบดินทร์ คุณวงค์
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1639200043499' OR student_id = '4902' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1639200043499',
            student_id = '4902',
            password = '$2b$10$sXpSFgrmVEPH.pyzD9j8xucsaTsoUZ6zpziArJFVbl2C4Gu20ZVqu',
            student_name = 'เด็กชายเอกบดินทร์ คุณวงค์',
            first_name = 'เอกบดินทร์',
            last_name = 'คุณวงค์',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1639200043499', '4902', '$2b$10$sXpSFgrmVEPH.pyzD9j8xucsaTsoUZ6zpziArJFVbl2C4Gu20ZVqu', 'เด็กชายเอกบดินทร์ คุณวงค์', 'เอกบดินทร์', 'คุณวงค์', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 4904 | เด็กชายอิทธิภัทร วารินกุฏ
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1101501525309' OR student_id = '4904' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1101501525309',
            student_id = '4904',
            password = '$2b$10$9hyKVPaEw2KCzPw76twIY.uKKLfe09.FeLFEt0ZNBTbDJWDwN3Lem',
            student_name = 'เด็กชายอิทธิภัทร วารินกุฏ',
            first_name = 'อิทธิภัทร',
            last_name = 'วารินกุฏ',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1101501525309', '4904', '$2b$10$9hyKVPaEw2KCzPw76twIY.uKKLfe09.FeLFEt0ZNBTbDJWDwN3Lem', 'เด็กชายอิทธิภัทร วารินกุฏ', 'อิทธิภัทร', 'วารินกุฏ', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 4905 | เด็กชายนคเรศ โด่งดัง
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800697417' OR student_id = '4905' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800697417',
            student_id = '4905',
            password = '$2b$10$0bhBO0ybiXaVCYackgk1JetA5p0qo.ENU5nduQGXiZPi8RoKSJWba',
            student_name = 'เด็กชายนคเรศ โด่งดัง',
            first_name = 'นคเรศ',
            last_name = 'โด่งดัง',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800697417', '4905', '$2b$10$0bhBO0ybiXaVCYackgk1JetA5p0qo.ENU5nduQGXiZPi8RoKSJWba', 'เด็กชายนคเรศ โด่งดัง', 'นคเรศ', 'โด่งดัง', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 4980 | เด็กชายวิชยุตม์ พิศงาม
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1129701586309' OR student_id = '4980' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1129701586309',
            student_id = '4980',
            password = '$2b$10$GHT0r/bnWERPTqk1I1PEL.OFqKtLc8tQReRD5.uds81VO.Fw8yhdW',
            student_name = 'เด็กชายวิชยุตม์ พิศงาม',
            first_name = 'วิชยุตม์',
            last_name = 'พิศงาม',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1129701586309', '4980', '$2b$10$GHT0r/bnWERPTqk1I1PEL.OFqKtLc8tQReRD5.uds81VO.Fw8yhdW', 'เด็กชายวิชยุตม์ พิศงาม', 'วิชยุตม์', 'พิศงาม', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 5092 | เด็กชายกฤติเดช พุ่มพวง
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319901554760' OR student_id = '5092' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319901554760',
            student_id = '5092',
            password = '$2b$10$yhHjiwn93WkCerCvrWXhN.5kdx9a3QeQzDnu/rqBi3Q8wyHrF19gC',
            student_name = 'เด็กชายกฤติเดช พุ่มพวง',
            first_name = 'กฤติเดช',
            last_name = 'พุ่มพวง',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319901554760', '5092', '$2b$10$yhHjiwn93WkCerCvrWXhN.5kdx9a3QeQzDnu/rqBi3Q8wyHrF19gC', 'เด็กชายกฤติเดช พุ่มพวง', 'กฤติเดช', 'พุ่มพวง', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 5100 | เด็กชายสรวิชญ์ ประกายแก้ว
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800681821' OR student_id = '5100' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800681821',
            student_id = '5100',
            password = '$2b$10$sLAg7OQfSTLVhYfz25Zbeuq4NxHETnMqg4koa1E19nmjkpu5uDtYq',
            student_name = 'เด็กชายสรวิชญ์ ประกายแก้ว',
            first_name = 'สรวิชญ์',
            last_name = 'ประกายแก้ว',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800681821', '5100', '$2b$10$sLAg7OQfSTLVhYfz25Zbeuq4NxHETnMqg4koa1E19nmjkpu5uDtYq', 'เด็กชายสรวิชญ์ ประกายแก้ว', 'สรวิชญ์', 'ประกายแก้ว', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 5167 | เด็กชายพรชัย รักพินิจ
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319200135451' OR student_id = '5167' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319200135451',
            student_id = '5167',
            password = '$2b$10$eZfVhim6CSY0vJ1t9vxKEuCnnnl7QCaQgkwXW2qHbtI5uFvYBN3la',
            student_name = 'เด็กชายพรชัย รักพินิจ',
            first_name = 'พรชัย',
            last_name = 'รักพินิจ',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319200135451', '5167', '$2b$10$eZfVhim6CSY0vJ1t9vxKEuCnnnl7QCaQgkwXW2qHbtI5uFvYBN3la', 'เด็กชายพรชัย รักพินิจ', 'พรชัย', 'รักพินิจ', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 5170 | เด็กชายเกียรติศักดิ์ หนูช้างเผือก
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800698634' OR student_id = '5170' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800698634',
            student_id = '5170',
            password = '$2b$10$WwZX9eCpWpLkoEiUuimPXeCG99cehVRU.z0wp5YWu.kPlNAJK4xNO',
            student_name = 'เด็กชายเกียรติศักดิ์ หนูช้างเผือก',
            first_name = 'เกียรติศักดิ์',
            last_name = 'หนูช้างเผือก',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800698634', '5170', '$2b$10$WwZX9eCpWpLkoEiUuimPXeCG99cehVRU.z0wp5YWu.kPlNAJK4xNO', 'เด็กชายเกียรติศักดิ์ หนูช้างเผือก', 'เกียรติศักดิ์', 'หนูช้างเผือก', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 5208 | เด็กชายจิรพัฒน์ จัตุภัทรกุล
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800704685' OR student_id = '5208' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800704685',
            student_id = '5208',
            password = '$2b$10$B2QZb6OnxO32jPe1YMgwhuCy5EjTvSeBvmoePQOGLP7T9B1BLNPMi',
            student_name = 'เด็กชายจิรพัฒน์ จัตุภัทรกุล',
            first_name = 'จิรพัฒน์',
            last_name = 'จัตุภัทรกุล',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800704685', '5208', '$2b$10$B2QZb6OnxO32jPe1YMgwhuCy5EjTvSeBvmoePQOGLP7T9B1BLNPMi', 'เด็กชายจิรพัฒน์ จัตุภัทรกุล', 'จิรพัฒน์', 'จัตุภัทรกุล', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 5209 | เด็กชายบุญธวัช นุชสาย
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800699169' OR student_id = '5209' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800699169',
            student_id = '5209',
            password = '$2b$10$NYlPMkHr4xlzN1gSRRWxUuc6pXi7blukDo7Tl42KmJrFybVhxtHYS',
            student_name = 'เด็กชายบุญธวัช นุชสาย',
            first_name = 'บุญธวัช',
            last_name = 'นุชสาย',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800699169', '5209', '$2b$10$NYlPMkHr4xlzN1gSRRWxUuc6pXi7blukDo7Tl42KmJrFybVhxtHYS', 'เด็กชายบุญธวัช นุชสาย', 'บุญธวัช', 'นุชสาย', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 4889 | เด็กหญิงศิริญญา จันทร์สิงห์
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800680875' OR student_id = '4889' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800680875',
            student_id = '4889',
            password = '$2b$10$R/JihKQnFY.rEG1D7E29.usgTkQ8SzbP85r6NL4LNux2pkyuZWJua',
            student_name = 'เด็กหญิงศิริญญา จันทร์สิงห์',
            first_name = 'ศิริญญา',
            last_name = 'จันทร์สิงห์',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800680875', '4889', '$2b$10$R/JihKQnFY.rEG1D7E29.usgTkQ8SzbP85r6NL4LNux2pkyuZWJua', 'เด็กหญิงศิริญญา จันทร์สิงห์', 'ศิริญญา', 'จันทร์สิงห์', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 4897 | เด็กหญิงธัญญรัตน์ ปิ่นคล้าย
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1248000045598' OR student_id = '4897' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1248000045598',
            student_id = '4897',
            password = '$2b$10$QFX9xuYtQdq6tGh6IK2x5ugGm.jCvmZbBWvVZ/b0IjhLS/1Z.XDX6',
            student_name = 'เด็กหญิงธัญญรัตน์ ปิ่นคล้าย',
            first_name = 'ธัญญรัตน์',
            last_name = 'ปิ่นคล้าย',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1248000045598', '4897', '$2b$10$QFX9xuYtQdq6tGh6IK2x5ugGm.jCvmZbBWvVZ/b0IjhLS/1Z.XDX6', 'เด็กหญิงธัญญรัตน์ ปิ่นคล้าย', 'ธัญญรัตน์', 'ปิ่นคล้าย', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 4903 | เด็กหญิงอรธิรา ชัยศรีรัมย์
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800698570' OR student_id = '4903' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800698570',
            student_id = '4903',
            password = '$2b$10$s.8Hvc5WVU7eW9drl9Q3uOgR3zYQV0NH9LPeyZ6nKGT/DStW9Sxai',
            student_name = 'เด็กหญิงอรธิรา ชัยศรีรัมย์',
            first_name = 'อรธิรา',
            last_name = 'ชัยศรีรัมย์',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800698570', '4903', '$2b$10$s.8Hvc5WVU7eW9drl9Q3uOgR3zYQV0NH9LPeyZ6nKGT/DStW9Sxai', 'เด็กหญิงอรธิรา ชัยศรีรัมย์', 'อรธิรา', 'ชัยศรีรัมย์', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 4906 | เด็กหญิงวริสรา อาญาเมือง
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319901559630' OR student_id = '4906' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319901559630',
            student_id = '4906',
            password = '$2b$10$26nOR68vy4AqXYNKLE3c7.4jKhIojpEyudDkyXG5GOQIoYsziKnI.',
            student_name = 'เด็กหญิงวริสรา อาญาเมือง',
            first_name = 'วริสรา',
            last_name = 'อาญาเมือง',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319901559630', '4906', '$2b$10$26nOR68vy4AqXYNKLE3c7.4jKhIojpEyudDkyXG5GOQIoYsziKnI.', 'เด็กหญิงวริสรา อาญาเมือง', 'วริสรา', 'อาญาเมือง', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 4909 | เด็กหญิงภัครมัย บุญไกร
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1209601826854' OR student_id = '4909' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1209601826854',
            student_id = '4909',
            password = '$2b$10$eQoqyOrNi/fMnXduKIc9qeDdIReOxWuOrFNPAueNWJhtQbBx3UfWe',
            student_name = 'เด็กหญิงภัครมัย บุญไกร',
            first_name = 'ภัครมัย',
            last_name = 'บุญไกร',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1209601826854', '4909', '$2b$10$eQoqyOrNi/fMnXduKIc9qeDdIReOxWuOrFNPAueNWJhtQbBx3UfWe', 'เด็กหญิงภัครมัย บุญไกร', 'ภัครมัย', 'บุญไกร', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 4913 | เด็กหญิงรุ่งนภา วิเสโส
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800689597' OR student_id = '4913' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800689597',
            student_id = '4913',
            password = '$2b$10$I4t3UHGeSzZyGB3OKwAL6eEAWgHPhulQfl9elP2LLvpr3sCnVCeqm',
            student_name = 'เด็กหญิงรุ่งนภา วิเสโส',
            first_name = 'รุ่งนภา',
            last_name = 'วิเสโส',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800689597', '4913', '$2b$10$I4t3UHGeSzZyGB3OKwAL6eEAWgHPhulQfl9elP2LLvpr3sCnVCeqm', 'เด็กหญิงรุ่งนภา วิเสโส', 'รุ่งนภา', 'วิเสโส', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 5058 | เด็กหญิงนภัสวรรณ์ พูนบาล
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1130201233531' OR student_id = '5058' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1130201233531',
            student_id = '5058',
            password = '$2b$10$JTtwXy5AASIroe/dqdkOj.ErL66FD0OOg2T/lsAq2VHvSM3mleSnC',
            student_name = 'เด็กหญิงนภัสวรรณ์ พูนบาล',
            first_name = 'นภัสวรรณ์',
            last_name = 'พูนบาล',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1130201233531', '5058', '$2b$10$JTtwXy5AASIroe/dqdkOj.ErL66FD0OOg2T/lsAq2VHvSM3mleSnC', 'เด็กหญิงนภัสวรรณ์ พูนบาล', 'นภัสวรรณ์', 'พูนบาล', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 5096 | เด็กหญิงวสุนันท์ โทวะดี
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1239900573257' OR student_id = '5096' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1239900573257',
            student_id = '5096',
            password = '$2b$10$svs1I2zorFMW58ICEoBQWuhwIkmTF3OFTiTp1IFCuRxflpXvrkBae',
            student_name = 'เด็กหญิงวสุนันท์ โทวะดี',
            first_name = 'วสุนันท์',
            last_name = 'โทวะดี',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1239900573257', '5096', '$2b$10$svs1I2zorFMW58ICEoBQWuhwIkmTF3OFTiTp1IFCuRxflpXvrkBae', 'เด็กหญิงวสุนันท์ โทวะดี', 'วสุนันท์', 'โทวะดี', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 5210 | เด็กหญิงณัฐณิชา พัฒน์สิริวงศ์
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800701562' OR student_id = '5210' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800701562',
            student_id = '5210',
            password = '$2b$10$csgXdGEa4mLPPhj/N/inruTz6C77OkYVhraXqbAdo8vxnztHSiCHi',
            student_name = 'เด็กหญิงณัฐณิชา พัฒน์สิริวงศ์',
            first_name = 'ณัฐณิชา',
            last_name = 'พัฒน์สิริวงศ์',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800701562', '5210', '$2b$10$csgXdGEa4mLPPhj/N/inruTz6C77OkYVhraXqbAdo8vxnztHSiCHi', 'เด็กหญิงณัฐณิชา พัฒน์สิริวงศ์', 'ณัฐณิชา', 'พัฒน์สิริวงศ์', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.1/1 | 5211 | เด็กหญิงพัทธ์ชราภา วนาลัย
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.1' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800699223' OR student_id = '5211' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800699223',
            student_id = '5211',
            password = '$2b$10$LvUMaqjwbRIfWacvpfuaF.zQzBGSK5XH1HxPykKztcaYv15kPrVe.',
            student_name = 'เด็กหญิงพัทธ์ชราภา วนาลัย',
            first_name = 'พัทธ์ชราภา',
            last_name = 'วนาลัย',
            grade_level = 'ม.1',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800699223', '5211', '$2b$10$LvUMaqjwbRIfWacvpfuaF.zQzBGSK5XH1HxPykKztcaYv15kPrVe.', 'เด็กหญิงพัทธ์ชราภา วนาลัย', 'พัทธ์ชราภา', 'วนาลัย', 'ม.1', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.2/1 | 4756 | นายอรรถพล วิสิทธิมูล
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.2' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1341501530670' OR student_id = '4756' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1341501530670',
            student_id = '4756',
            password = '$2b$10$HQmGq17clA2Aru5EkWygquMxBx8sxY.moWPwJq9GvUFO.M6kPeT46',
            student_name = 'นายอรรถพล วิสิทธิมูล',
            first_name = 'อรรถพล',
            last_name = 'วิสิทธิมูล',
            grade_level = 'ม.2',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1341501530670', '4756', '$2b$10$HQmGq17clA2Aru5EkWygquMxBx8sxY.moWPwJq9GvUFO.M6kPeT46', 'นายอรรถพล วิสิทธิมูล', 'อรรถพล', 'วิสิทธิมูล', 'ม.2', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.2/1 | 4787 | เด็กชายพชร ชนิดดา
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.2' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1209000610873' OR student_id = '4787' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1209000610873',
            student_id = '4787',
            password = '$2b$10$K/zZVqaY/Bzsq0n3XIKYnec.52faHqbMQz85/iqpssUbh0p6riK7K',
            student_name = 'เด็กชายพชร ชนิดดา',
            first_name = 'พชร',
            last_name = 'ชนิดดา',
            grade_level = 'ม.2',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1209000610873', '4787', '$2b$10$K/zZVqaY/Bzsq0n3XIKYnec.52faHqbMQz85/iqpssUbh0p6riK7K', 'เด็กชายพชร ชนิดดา', 'พชร', 'ชนิดดา', 'ม.2', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.2/1 | 4836 | เด็กชายกิตติศักดิ์ เนตรแสง
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.2' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800678722' OR student_id = '4836' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800678722',
            student_id = '4836',
            password = '$2b$10$69qYJKOqPtloG.BBZhy2jOXQk113T4AhdnIj/8QeON.5R9pLaV2ju',
            student_name = 'เด็กชายกิตติศักดิ์ เนตรแสง',
            first_name = 'กิตติศักดิ์',
            last_name = 'เนตรแสง',
            grade_level = 'ม.2',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800678722', '4836', '$2b$10$69qYJKOqPtloG.BBZhy2jOXQk113T4AhdnIj/8QeON.5R9pLaV2ju', 'เด็กชายกิตติศักดิ์ เนตรแสง', 'กิตติศักดิ์', 'เนตรแสง', 'ม.2', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.2/1 | 4837 | เด็กชายชินภัทร นาคประสพ
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.2' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800655579' OR student_id = '4837' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800655579',
            student_id = '4837',
            password = '$2b$10$AWNg9mXf.CxrgIPRUDguveOhQs4rFdMGGRz2WAqpkyrdgBvdoyQIa',
            student_name = 'เด็กชายชินภัทร นาคประสพ',
            first_name = 'ชินภัทร',
            last_name = 'นาคประสพ',
            grade_level = 'ม.2',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800655579', '4837', '$2b$10$AWNg9mXf.CxrgIPRUDguveOhQs4rFdMGGRz2WAqpkyrdgBvdoyQIa', 'เด็กชายชินภัทร นาคประสพ', 'ชินภัทร', 'นาคประสพ', 'ม.2', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.2/1 | 4838 | เด็กชายธนวันต์ สีดา
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.2' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800672457' OR student_id = '4838' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800672457',
            student_id = '4838',
            password = '$2b$10$wriSG2lp.jbd8FEIUTq2kOyyDm5AiZXz39MqUiQqlUxrN8iG.uSqe',
            student_name = 'เด็กชายธนวันต์ สีดา',
            first_name = 'ธนวันต์',
            last_name = 'สีดา',
            grade_level = 'ม.2',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800672457', '4838', '$2b$10$wriSG2lp.jbd8FEIUTq2kOyyDm5AiZXz39MqUiQqlUxrN8iG.uSqe', 'เด็กชายธนวันต์ สีดา', 'ธนวันต์', 'สีดา', 'ม.2', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.2/1 | 4839 | เด็กชายปารัช น้อมเกลี้ยง
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.2' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800665531' OR student_id = '4839' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800665531',
            student_id = '4839',
            password = '$2b$10$iXhOv23v7ZrZSEM2M0SaMOrzKHw4DFwUmPOFvVaZr9xZbfmcmpmiu',
            student_name = 'เด็กชายปารัช น้อมเกลี้ยง',
            first_name = 'ปารัช',
            last_name = 'น้อมเกลี้ยง',
            grade_level = 'ม.2',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800665531', '4839', '$2b$10$iXhOv23v7ZrZSEM2M0SaMOrzKHw4DFwUmPOFvVaZr9xZbfmcmpmiu', 'เด็กชายปารัช น้อมเกลี้ยง', 'ปารัช', 'น้อมเกลี้ยง', 'ม.2', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.2/1 | 4841 | เด็กชายพงษธร แถวอุทุม
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.2' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1119902736278' OR student_id = '4841' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1119902736278',
            student_id = '4841',
            password = '$2b$10$rWHeY/WKPKckJ5nRXYt7KuflDpEsW2tWnocsMVCr6LIC1JfnR7E3C',
            student_name = 'เด็กชายพงษธร แถวอุทุม',
            first_name = 'พงษธร',
            last_name = 'แถวอุทุม',
            grade_level = 'ม.2',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1119902736278', '4841', '$2b$10$rWHeY/WKPKckJ5nRXYt7KuflDpEsW2tWnocsMVCr6LIC1JfnR7E3C', 'เด็กชายพงษธร แถวอุทุม', 'พงษธร', 'แถวอุทุม', 'ม.2', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.2/1 | 4843 | เด็กชายสุริยัณห์ รักษา
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.2' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800674662' OR student_id = '4843' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800674662',
            student_id = '4843',
            password = '$2b$10$CksTHOIyWnQ7fJcPIQg4DOirWz3tHPpSEdX3KnIdtfcUBaUhcMQkK',
            student_name = 'เด็กชายสุริยัณห์ รักษา',
            first_name = 'สุริยัณห์',
            last_name = 'รักษา',
            grade_level = 'ม.2',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800674662', '4843', '$2b$10$CksTHOIyWnQ7fJcPIQg4DOirWz3tHPpSEdX3KnIdtfcUBaUhcMQkK', 'เด็กชายสุริยัณห์ รักษา', 'สุริยัณห์', 'รักษา', 'ม.2', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.2/1 | 4844 | เด็กชายอภิชาติ นักรบ
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.2' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800664021' OR student_id = '4844' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800664021',
            student_id = '4844',
            password = '$2b$10$PMZ8IWuLMhzbHx29O9wkxeU5hXWeGJzUSLqd7ONv71bdmXD2caeva',
            student_name = 'เด็กชายอภิชาติ นักรบ',
            first_name = 'อภิชาติ',
            last_name = 'นักรบ',
            grade_level = 'ม.2',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800664021', '4844', '$2b$10$PMZ8IWuLMhzbHx29O9wkxeU5hXWeGJzUSLqd7ONv71bdmXD2caeva', 'เด็กชายอภิชาติ นักรบ', 'อภิชาติ', 'นักรบ', 'ม.2', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.2/1 | 4845 | เด็กชายมงคลชัย วิเศษบันดิษฐ์
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.2' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800651336' OR student_id = '4845' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800651336',
            student_id = '4845',
            password = '$2b$10$QFa7Gye/xlo0mhXdWvlV6ur5pVyfCv3XX7UbRGQAt/eUEBPsYd6R.',
            student_name = 'เด็กชายมงคลชัย วิเศษบันดิษฐ์',
            first_name = 'มงคลชัย',
            last_name = 'วิเศษบันดิษฐ์',
            grade_level = 'ม.2',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800651336', '4845', '$2b$10$QFa7Gye/xlo0mhXdWvlV6ur5pVyfCv3XX7UbRGQAt/eUEBPsYd6R.', 'เด็กชายมงคลชัย วิเศษบันดิษฐ์', 'มงคลชัย', 'วิเศษบันดิษฐ์', 'ม.2', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.2/1 | 4854 | เด็กชายพัฒน์พงศ์ วิสิทธิมูล
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.2' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800659850' OR student_id = '4854' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800659850',
            student_id = '4854',
            password = '$2b$10$UIjAIPGrG/OtdLny1J/6j.GeJgT1WQNH.Yh35.lxKd0rN/05vdz76',
            student_name = 'เด็กชายพัฒน์พงศ์ วิสิทธิมูล',
            first_name = 'พัฒน์พงศ์',
            last_name = 'วิสิทธิมูล',
            grade_level = 'ม.2',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800659850', '4854', '$2b$10$UIjAIPGrG/OtdLny1J/6j.GeJgT1WQNH.Yh35.lxKd0rN/05vdz76', 'เด็กชายพัฒน์พงศ์ วิสิทธิมูล', 'พัฒน์พงศ์', 'วิสิทธิมูล', 'ม.2', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.2/1 | 4855 | เด็กชายมโนพัศ นวลปักษี
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.2' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1551200068479' OR student_id = '4855' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1551200068479',
            student_id = '4855',
            password = '$2b$10$vlljM31gpy4jm0Gyn9jZgeqYK9VOu2fXNxlhGtm0vU1EQKp6dgsGW',
            student_name = 'เด็กชายมโนพัศ นวลปักษี',
            first_name = 'มโนพัศ',
            last_name = 'นวลปักษี',
            grade_level = 'ม.2',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1551200068479', '4855', '$2b$10$vlljM31gpy4jm0Gyn9jZgeqYK9VOu2fXNxlhGtm0vU1EQKp6dgsGW', 'เด็กชายมโนพัศ นวลปักษี', 'มโนพัศ', 'นวลปักษี', 'ม.2', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.2/1 | 4856 | เด็กชายมิถุนา เนตรนี
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.2' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800654572' OR student_id = '4856' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800654572',
            student_id = '4856',
            password = '$2b$10$/N0WDFhtJqOw0qbaPnjhzuvNRXX2jtV/EhcyKeqmafC/6z/OQatge',
            student_name = 'เด็กชายมิถุนา เนตรนี',
            first_name = 'มิถุนา',
            last_name = 'เนตรนี',
            grade_level = 'ม.2',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800654572', '4856', '$2b$10$/N0WDFhtJqOw0qbaPnjhzuvNRXX2jtV/EhcyKeqmafC/6z/OQatge', 'เด็กชายมิถุนา เนตรนี', 'มิถุนา', 'เนตรนี', 'ม.2', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.2/1 | 5109 | นายอภิวัฒน์ คุณวงค์
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.2' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1329400137333' OR student_id = '5109' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1329400137333',
            student_id = '5109',
            password = '$2b$10$L/CT9vn1BuiUTju3oB5SJ.SYUdXws5uqEbv5CYvkfSg8d3pFbruW2',
            student_name = 'นายอภิวัฒน์ คุณวงค์',
            first_name = 'อภิวัฒน์',
            last_name = 'คุณวงค์',
            grade_level = 'ม.2',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1329400137333', '5109', '$2b$10$L/CT9vn1BuiUTju3oB5SJ.SYUdXws5uqEbv5CYvkfSg8d3pFbruW2', 'นายอภิวัฒน์ คุณวงค์', 'อภิวัฒน์', 'คุณวงค์', 'ม.2', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.2/1 | 5145 | เด็กชายปิยพัทธ์ วนาลัย
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.2' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1749800574206' OR student_id = '5145' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1749800574206',
            student_id = '5145',
            password = '$2b$10$tyI3QhUSVHsWBdlxVqpqO.xPrEMXKBrq.iSzoA84vYxLMLVGR/Fci',
            student_name = 'เด็กชายปิยพัทธ์ วนาลัย',
            first_name = 'ปิยพัทธ์',
            last_name = 'วนาลัย',
            grade_level = 'ม.2',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1749800574206', '5145', '$2b$10$tyI3QhUSVHsWBdlxVqpqO.xPrEMXKBrq.iSzoA84vYxLMLVGR/Fci', 'เด็กชายปิยพัทธ์ วนาลัย', 'ปิยพัทธ์', 'วนาลัย', 'ม.2', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.2/1 | 5146 | เด็กชายอครินทร์ ศรีซองเชษฐ์
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.2' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1329901816926' OR student_id = '5146' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1329901816926',
            student_id = '5146',
            password = '$2b$10$8WoxWP0Jsn3r6PVaOBU0y.KvrSKBLcs.nHrEwi5Lif5rl5NBkCJTC',
            student_name = 'เด็กชายอครินทร์ ศรีซองเชษฐ์',
            first_name = 'อครินทร์',
            last_name = 'ศรีซองเชษฐ์',
            grade_level = 'ม.2',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1329901816926', '5146', '$2b$10$8WoxWP0Jsn3r6PVaOBU0y.KvrSKBLcs.nHrEwi5Lif5rl5NBkCJTC', 'เด็กชายอครินทร์ ศรีซองเชษฐ์', 'อครินทร์', 'ศรีซองเชษฐ์', 'ม.2', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.2/1 | 5171 | นายปลวัชร ประกายแก้ว
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.2' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800616000' OR student_id = '5171' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800616000',
            student_id = '5171',
            password = '$2b$10$F7YgfySnJYD0Khu/D6Jhb.FPNc1.drdD18BJ3Nuoe.V4qt2f/xLb.',
            student_name = 'นายปลวัชร ประกายแก้ว',
            first_name = 'ปลวัชร',
            last_name = 'ประกายแก้ว',
            grade_level = 'ม.2',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800616000', '5171', '$2b$10$F7YgfySnJYD0Khu/D6Jhb.FPNc1.drdD18BJ3Nuoe.V4qt2f/xLb.', 'นายปลวัชร ประกายแก้ว', 'ปลวัชร', 'ประกายแก้ว', 'ม.2', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.2/1 | 4848 | เด็กหญิงเบญจมาศ ณะจันทร์
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.2' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800662036' OR student_id = '4848' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800662036',
            student_id = '4848',
            password = '$2b$10$skxFMUefIW2BOcJBj1bKqOQ1MCYwjNadBf9YkXYGgKLV8qheb3kvm',
            student_name = 'เด็กหญิงเบญจมาศ ณะจันทร์',
            first_name = 'เบญจมาศ',
            last_name = 'ณะจันทร์',
            grade_level = 'ม.2',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800662036', '4848', '$2b$10$skxFMUefIW2BOcJBj1bKqOQ1MCYwjNadBf9YkXYGgKLV8qheb3kvm', 'เด็กหญิงเบญจมาศ ณะจันทร์', 'เบญจมาศ', 'ณะจันทร์', 'ม.2', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.2/1 | 4849 | เด็กหญิงพิณนะภัตร เลิศสกุล
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.2' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800662419' OR student_id = '4849' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800662419',
            student_id = '4849',
            password = '$2b$10$YkJiZuLJVEmJmv.9CiWYh.HqmLK2HyRAVKzuOb0uhoJ1R69mRAFwS',
            student_name = 'เด็กหญิงพิณนะภัตร เลิศสกุล',
            first_name = 'พิณนะภัตร',
            last_name = 'เลิศสกุล',
            grade_level = 'ม.2',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800662419', '4849', '$2b$10$YkJiZuLJVEmJmv.9CiWYh.HqmLK2HyRAVKzuOb0uhoJ1R69mRAFwS', 'เด็กหญิงพิณนะภัตร เลิศสกุล', 'พิณนะภัตร', 'เลิศสกุล', 'ม.2', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.2/1 | 4851 | เด็กหญิงอัญมณี ศรีเมือง
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.2' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1749800581075' OR student_id = '4851' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1749800581075',
            student_id = '4851',
            password = '$2b$10$RAOTn17UZch6x0gunNG3U.SFaqwDnzorpPyQwlLMAlfYU/49/Zor6',
            student_name = 'เด็กหญิงอัญมณี ศรีเมือง',
            first_name = 'อัญมณี',
            last_name = 'ศรีเมือง',
            grade_level = 'ม.2',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1749800581075', '4851', '$2b$10$RAOTn17UZch6x0gunNG3U.SFaqwDnzorpPyQwlLMAlfYU/49/Zor6', 'เด็กหญิงอัญมณี ศรีเมือง', 'อัญมณี', 'ศรีเมือง', 'ม.2', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 4753 | นายสหรัฐ สวัสดี
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800607981' OR student_id = '4753' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800607981',
            student_id = '4753',
            password = '$2b$10$FPRLLD6HEn9rweQYJMvVeef.cgFFk9YWNBt5w6aMx4fhZkzYHDfaO',
            student_name = 'นายสหรัฐ สวัสดี',
            first_name = 'สหรัฐ',
            last_name = 'สวัสดี',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800607981', '4753', '$2b$10$FPRLLD6HEn9rweQYJMvVeef.cgFFk9YWNBt5w6aMx4fhZkzYHDfaO', 'นายสหรัฐ สวัสดี', 'สหรัฐ', 'สวัสดี', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 4781 | นายกมลภพ บวชประโคน
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800624649' OR student_id = '4781' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800624649',
            student_id = '4781',
            password = '$2b$10$Occa2i./A50h8AN/LZZ2F.5827W8AWMwol2Va9aIfrw7iMXpOhTcy',
            student_name = 'นายกมลภพ บวชประโคน',
            first_name = 'กมลภพ',
            last_name = 'บวชประโคน',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800624649', '4781', '$2b$10$Occa2i./A50h8AN/LZZ2F.5827W8AWMwol2Va9aIfrw7iMXpOhTcy', 'นายกมลภพ บวชประโคน', 'กมลภพ', 'บวชประโคน', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 4786 | เด็กชายปรองดอง ทะเรรัมย์
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800642221' OR student_id = '4786' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800642221',
            student_id = '4786',
            password = '$2b$10$pTSDAiyLfNsRsPCjYHZu/eMOOnQ/9CStdYzTClmW8ili2dlVANPcO',
            student_name = 'เด็กชายปรองดอง ทะเรรัมย์',
            first_name = 'ปรองดอง',
            last_name = 'ทะเรรัมย์',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800642221', '4786', '$2b$10$pTSDAiyLfNsRsPCjYHZu/eMOOnQ/9CStdYzTClmW8ili2dlVANPcO', 'เด็กชายปรองดอง ทะเรรัมย์', 'ปรองดอง', 'ทะเรรัมย์', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 4789 | เด็กชายภัทรดนัย เทพบำรุง
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1200901645750' OR student_id = '4789' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1200901645750',
            student_id = '4789',
            password = '$2b$10$wYFXNDcHUB6CHTGxUs/kO.CoyO1v.zXoysS4IVjsTysXYXptolKyG',
            student_name = 'เด็กชายภัทรดนัย เทพบำรุง',
            first_name = 'ภัทรดนัย',
            last_name = 'เทพบำรุง',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1200901645750', '4789', '$2b$10$wYFXNDcHUB6CHTGxUs/kO.CoyO1v.zXoysS4IVjsTysXYXptolKyG', 'เด็กชายภัทรดนัย เทพบำรุง', 'ภัทรดนัย', 'เทพบำรุง', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 4790 | เด็กชายภาคิน อินทร์ชื่น
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800644909' OR student_id = '4790' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800644909',
            student_id = '4790',
            password = '$2b$10$cHhDSY9lsbh4k1p4rw87zeO7E8VIal6o2ZGauqpkO4s9G/e1.9vGm',
            student_name = 'เด็กชายภาคิน อินทร์ชื่น',
            first_name = 'ภาคิน',
            last_name = 'อินทร์ชื่น',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800644909', '4790', '$2b$10$cHhDSY9lsbh4k1p4rw87zeO7E8VIal6o2ZGauqpkO4s9G/e1.9vGm', 'เด็กชายภาคิน อินทร์ชื่น', 'ภาคิน', 'อินทร์ชื่น', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 4791 | เด็กชายอดิศักดิ์ พิมพ์ทอง
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800627974' OR student_id = '4791' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800627974',
            student_id = '4791',
            password = '$2b$10$eN4mO6ydeHvY0DuziDcm3./Vug/tapsxoP97ujqYhfH0lNZoH6llG',
            student_name = 'เด็กชายอดิศักดิ์ พิมพ์ทอง',
            first_name = 'อดิศักดิ์',
            last_name = 'พิมพ์ทอง',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800627974', '4791', '$2b$10$eN4mO6ydeHvY0DuziDcm3./Vug/tapsxoP97ujqYhfH0lNZoH6llG', 'เด็กชายอดิศักดิ์ พิมพ์ทอง', 'อดิศักดิ์', 'พิมพ์ทอง', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 4793 | เด็กชายอัฏฐพล สดมสุข
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1579901519423' OR student_id = '4793' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1579901519423',
            student_id = '4793',
            password = '$2b$10$LxeI0hXZckwxKMb3OhVg1u355qsAd4IKc0cSdzA3JFvcaB/orvuzS',
            student_name = 'เด็กชายอัฏฐพล สดมสุข',
            first_name = 'อัฏฐพล',
            last_name = 'สดมสุข',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1579901519423', '4793', '$2b$10$LxeI0hXZckwxKMb3OhVg1u355qsAd4IKc0cSdzA3JFvcaB/orvuzS', 'เด็กชายอัฏฐพล สดมสุข', 'อัฏฐพล', 'สดมสุข', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 4868 | นายศิรสิทธิ์ รักพินิจ
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1321400064487' OR student_id = '4868' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1321400064487',
            student_id = '4868',
            password = '$2b$10$Jq8JNp/fgjunjZVj5By/Xe8lKAaHSWo3Q1KegYunqurFK0urObJRm',
            student_name = 'นายศิรสิทธิ์ รักพินิจ',
            first_name = 'ศิรสิทธิ์',
            last_name = 'รักพินิจ',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1321400064487', '4868', '$2b$10$Jq8JNp/fgjunjZVj5By/Xe8lKAaHSWo3Q1KegYunqurFK0urObJRm', 'นายศิรสิทธิ์ รักพินิจ', 'ศิรสิทธิ์', 'รักพินิจ', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 5059 | เด็กชายธนากร พูนมาล
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1118700212277' OR student_id = '5059' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1118700212277',
            student_id = '5059',
            password = '$2b$10$OneOQYVjcFxi8.IHB1CX9uSzDHBz3IuG1EKeGZ/YOwPaP2821cwS.',
            student_name = 'เด็กชายธนากร พูนมาล',
            first_name = 'ธนากร',
            last_name = 'พูนมาล',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1118700212277', '5059', '$2b$10$OneOQYVjcFxi8.IHB1CX9uSzDHBz3IuG1EKeGZ/YOwPaP2821cwS.', 'เด็กชายธนากร พูนมาล', 'ธนากร', 'พูนมาล', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 5105 | นายไกรสิทธิ ด้วงพิทักษ์
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1309801631584' OR student_id = '5105' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1309801631584',
            student_id = '5105',
            password = '$2b$10$ShEgaHF65aaHKQD6auP6Fefb5ajLoWw38ZN49ie0Hol7OYJsiedCK',
            student_name = 'นายไกรสิทธิ ด้วงพิทักษ์',
            first_name = 'ไกรสิทธิ',
            last_name = 'ด้วงพิทักษ์',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1309801631584', '5105', '$2b$10$ShEgaHF65aaHKQD6auP6Fefb5ajLoWw38ZN49ie0Hol7OYJsiedCK', 'นายไกรสิทธิ ด้วงพิทักษ์', 'ไกรสิทธิ', 'ด้วงพิทักษ์', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 4794 | เด็กหญิงกัญญารัตน์ ศรีเมือง
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800633541' OR student_id = '4794' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800633541',
            student_id = '4794',
            password = '$2b$10$e2UGbOcg0l98XHPpuX0lHeZd79NuJBprK8uydu.2Ybs4OXhNPk966',
            student_name = 'เด็กหญิงกัญญารัตน์ ศรีเมือง',
            first_name = 'กัญญารัตน์',
            last_name = 'ศรีเมือง',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800633541', '4794', '$2b$10$e2UGbOcg0l98XHPpuX0lHeZd79NuJBprK8uydu.2Ybs4OXhNPk966', 'เด็กหญิงกัญญารัตน์ ศรีเมือง', 'กัญญารัตน์', 'ศรีเมือง', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 4795 | เด็กหญิงกัญนิกา สมเย็น
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800635578' OR student_id = '4795' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800635578',
            student_id = '4795',
            password = '$2b$10$Q5HDIwlHJ6n8xI04Jb1HQOQX9bPTbD/pOlV01hkgz68MfN78Y7nnm',
            student_name = 'เด็กหญิงกัญนิกา สมเย็น',
            first_name = 'กัญนิกา',
            last_name = 'สมเย็น',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800635578', '4795', '$2b$10$Q5HDIwlHJ6n8xI04Jb1HQOQX9bPTbD/pOlV01hkgz68MfN78Y7nnm', 'เด็กหญิงกัญนิกา สมเย็น', 'กัญนิกา', 'สมเย็น', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 4796 | เด็กหญิงกันยาวีร์ ยางศิลา
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1739902559567' OR student_id = '4796' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1739902559567',
            student_id = '4796',
            password = '$2b$10$ProdNYwiTFKCKVlr7xd6xel0q1S5WPOngDAN9rP1yxADnNpwnAgUe',
            student_name = 'เด็กหญิงกันยาวีร์ ยางศิลา',
            first_name = 'กันยาวีร์',
            last_name = 'ยางศิลา',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1739902559567', '4796', '$2b$10$ProdNYwiTFKCKVlr7xd6xel0q1S5WPOngDAN9rP1yxADnNpwnAgUe', 'เด็กหญิงกันยาวีร์ ยางศิลา', 'กันยาวีร์', 'ยางศิลา', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 4797 | เด็กหญิงจริยา อะรัญ
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800646375' OR student_id = '4797' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800646375',
            student_id = '4797',
            password = '$2b$10$MV8GxQRAn45Cy1RPiaiyY.28d/5QaqkfpNlcv8.N97k3Z.yVo0Spa',
            student_name = 'เด็กหญิงจริยา อะรัญ',
            first_name = 'จริยา',
            last_name = 'อะรัญ',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800646375', '4797', '$2b$10$MV8GxQRAn45Cy1RPiaiyY.28d/5QaqkfpNlcv8.N97k3Z.yVo0Spa', 'เด็กหญิงจริยา อะรัญ', 'จริยา', 'อะรัญ', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 4800 | เด็กหญิงสุฐิตา จะเชิญรัมย์
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800631882' OR student_id = '4800' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800631882',
            student_id = '4800',
            password = '$2b$10$HnT5FyUo0/Y5glyWYGB8TezI/nO9AAMXfPOp74o5Qw3WDmobDuIQ.',
            student_name = 'เด็กหญิงสุฐิตา จะเชิญรัมย์',
            first_name = 'สุฐิตา',
            last_name = 'จะเชิญรัมย์',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800631882', '4800', '$2b$10$HnT5FyUo0/Y5glyWYGB8TezI/nO9AAMXfPOp74o5Qw3WDmobDuIQ.', 'เด็กหญิงสุฐิตา จะเชิญรัมย์', 'สุฐิตา', 'จะเชิญรัมย์', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 4801 | เด็กหญิงณัฐลดา คำคนซื่อ
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800628512' OR student_id = '4801' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800628512',
            student_id = '4801',
            password = '$2b$10$laP4GPb1unBK00cte60g/u6TZkI9xvVROr8BS5dcfnNngVfq27qc2',
            student_name = 'เด็กหญิงณัฐลดา คำคนซื่อ',
            first_name = 'ณัฐลดา',
            last_name = 'คำคนซื่อ',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800628512', '4801', '$2b$10$laP4GPb1unBK00cte60g/u6TZkI9xvVROr8BS5dcfnNngVfq27qc2', 'เด็กหญิงณัฐลดา คำคนซื่อ', 'ณัฐลดา', 'คำคนซื่อ', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 4802 | เด็กหญิงฑิตฐิตา แต้มสี
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1317600022210' OR student_id = '4802' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1317600022210',
            student_id = '4802',
            password = '$2b$10$AANcGB37fV.vlg3gD/x.eOOjOa3Pz1VXAJ0dmAWEtkAAvQB2DD4by',
            student_name = 'เด็กหญิงฑิตฐิตา แต้มสี',
            first_name = 'ฑิตฐิตา',
            last_name = 'แต้มสี',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1317600022210', '4802', '$2b$10$AANcGB37fV.vlg3gD/x.eOOjOa3Pz1VXAJ0dmAWEtkAAvQB2DD4by', 'เด็กหญิงฑิตฐิตา แต้มสี', 'ฑิตฐิตา', 'แต้มสี', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 4803 | เด็กหญิงทองไพลิน เลิศเมือง
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1317600022473' OR student_id = '4803' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1317600022473',
            student_id = '4803',
            password = '$2b$10$hNowrjkAlNQ7wYdO0Isb7eUNIX/nlCecA.VcM3b6KFjmLMgnKoeEu',
            student_name = 'เด็กหญิงทองไพลิน เลิศเมือง',
            first_name = 'ทองไพลิน',
            last_name = 'เลิศเมือง',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1317600022473', '4803', '$2b$10$hNowrjkAlNQ7wYdO0Isb7eUNIX/nlCecA.VcM3b6KFjmLMgnKoeEu', 'เด็กหญิงทองไพลิน เลิศเมือง', 'ทองไพลิน', 'เลิศเมือง', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 4808 | นางสาวพิมพ์ชนก สวนเกษ
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800625912' OR student_id = '4808' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800625912',
            student_id = '4808',
            password = '$2b$10$WLIBKYI.VhVlMrUyX7VLrO..2NdDwM8W4oJjKCjZVD50GVfYvFJ.C',
            student_name = 'นางสาวพิมพ์ชนก สวนเกษ',
            first_name = 'พิมพ์ชนก',
            last_name = 'สวนเกษ',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800625912', '4808', '$2b$10$WLIBKYI.VhVlMrUyX7VLrO..2NdDwM8W4oJjKCjZVD50GVfYvFJ.C', 'นางสาวพิมพ์ชนก สวนเกษ', 'พิมพ์ชนก', 'สวนเกษ', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 4811 | เด็กหญิงวรดา จันทร์วิเชียร
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1317600022295' OR student_id = '4811' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1317600022295',
            student_id = '4811',
            password = '$2b$10$6AL0o1P3VmAQ673qhtW4tOQqlFL6o2r1p/8kejhCuYZXHvayV9.LO',
            student_name = 'เด็กหญิงวรดา จันทร์วิเชียร',
            first_name = 'วรดา',
            last_name = 'จันทร์วิเชียร',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1317600022295', '4811', '$2b$10$6AL0o1P3VmAQ673qhtW4tOQqlFL6o2r1p/8kejhCuYZXHvayV9.LO', 'เด็กหญิงวรดา จันทร์วิเชียร', 'วรดา', 'จันทร์วิเชียร', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 4813 | เด็กหญิงสุพรรษา หวังสำราญ
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800626609' OR student_id = '4813' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800626609',
            student_id = '4813',
            password = '$2b$10$sgvcBCe.nCvPSN9ENnKcG.ket3savccBd5XkTkjtOmRM1BMkM/FoG',
            student_name = 'เด็กหญิงสุพรรษา หวังสำราญ',
            first_name = 'สุพรรษา',
            last_name = 'หวังสำราญ',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800626609', '4813', '$2b$10$sgvcBCe.nCvPSN9ENnKcG.ket3savccBd5XkTkjtOmRM1BMkM/FoG', 'เด็กหญิงสุพรรษา หวังสำราญ', 'สุพรรษา', 'หวังสำราญ', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 4814 | เด็กหญิงไอริณ โอสถประสาท
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1119902632961' OR student_id = '4814' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1119902632961',
            student_id = '4814',
            password = '$2b$10$WrqhGeWhwrqGoaM4i/rQQu9jSr48x.5WwJZjrwClgH.bfj1wDosa2',
            student_name = 'เด็กหญิงไอริณ โอสถประสาท',
            first_name = 'ไอริณ',
            last_name = 'โอสถประสาท',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1119902632961', '4814', '$2b$10$WrqhGeWhwrqGoaM4i/rQQu9jSr48x.5WwJZjrwClgH.bfj1wDosa2', 'เด็กหญิงไอริณ โอสถประสาท', 'ไอริณ', 'โอสถประสาท', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 4815 | เด็กหญิงไอลดา โอสถประสาท
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1119902632987' OR student_id = '4815' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1119902632987',
            student_id = '4815',
            password = '$2b$10$KfMyZaTGGT/N.pcm6SDaouchIq1ujFEY9mhA1Hw/cd9JisS76p7yC',
            student_name = 'เด็กหญิงไอลดา โอสถประสาท',
            first_name = 'ไอลดา',
            last_name = 'โอสถประสาท',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1119902632987', '4815', '$2b$10$KfMyZaTGGT/N.pcm6SDaouchIq1ujFEY9mhA1Hw/cd9JisS76p7yC', 'เด็กหญิงไอลดา โอสถประสาท', 'ไอลดา', 'โอสถประสาท', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 4818 | เด็กหญิงสุดาภรณ์ ทองเกลี้ยง
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800640326' OR student_id = '4818' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800640326',
            student_id = '4818',
            password = '$2b$10$wjN5W/ErNMjuBBjvrS.ITOHnM1ejBAn1rkeuH95n2cTVUHcEN/b4e',
            student_name = 'เด็กหญิงสุดาภรณ์ ทองเกลี้ยง',
            first_name = 'สุดาภรณ์',
            last_name = 'ทองเกลี้ยง',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800640326', '4818', '$2b$10$wjN5W/ErNMjuBBjvrS.ITOHnM1ejBAn1rkeuH95n2cTVUHcEN/b4e', 'เด็กหญิงสุดาภรณ์ ทองเกลี้ยง', 'สุดาภรณ์', 'ทองเกลี้ยง', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 4825 | เด็กหญิงนรินธร วงศ์ศักดิ์
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1319800641365' OR student_id = '4825' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1319800641365',
            student_id = '4825',
            password = '$2b$10$nWDiW.dMxiQFJRVeQoxeBelE84qkFnW5zRvVa78GNI/5CBZF4PcmW',
            student_name = 'เด็กหญิงนรินธร วงศ์ศักดิ์',
            first_name = 'นรินธร',
            last_name = 'วงศ์ศักดิ์',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1319800641365', '4825', '$2b$10$nWDiW.dMxiQFJRVeQoxeBelE84qkFnW5zRvVa78GNI/5CBZF4PcmW', 'เด็กหญิงนรินธร วงศ์ศักดิ์', 'นรินธร', 'วงศ์ศักดิ์', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;

-- ม.3/1 | 5064 | เด็กหญิงสุพรรษา แสนโคตร
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = 'ม.3' AND room_number = '1' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '1309903910300' OR student_id = '5064' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '1309903910300',
            student_id = '5064',
            password = '$2b$10$642jwjiyFjKZ/9gW0FLbYewnZarH3KdEe6ky/E3fdQWvaSk0jime.',
            student_name = 'เด็กหญิงสุพรรษา แสนโคตร',
            first_name = 'สุพรรษา',
            last_name = 'แสนโคตร',
            grade_level = 'ม.3',
            room_number = '1',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '1309903910300', '5064', '$2b$10$642jwjiyFjKZ/9gW0FLbYewnZarH3KdEe6ky/E3fdQWvaSk0jime.', 'เด็กหญิงสุพรรษา แสนโคตร', 'สุพรรษา', 'แสนโคตร', 'ม.3', '1', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;
