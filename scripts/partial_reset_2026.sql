BEGIN;

-- 1. ลบประวัติการหักแต้ม / หักเหรียญ / การใช้การ์ดของทุกห้อง
-- Truncate card logs and notifications to clear all attack/deduction history
TRUNCATE TABLE public.card_logs CASCADE;
TRUNCATE TABLE public.card_notifications CASCADE;

-- 2. ลบประวัติทุกอย่างของชั้น ม.1 และ ม.3 ให้เหมือนเริ่มใหม่
-- ลบข้อมูลการวิเคราะห์และประวัติการตอบ
DELETE FROM public.wrong_words WHERE student_id IN (
  SELECT id FROM public.students WHERE classroom_id IN (SELECT id FROM public.classrooms WHERE class_name LIKE '%ม.1%' OR class_name LIKE '%ม.3%')
);
DELETE FROM public.pre_tests WHERE student_id IN (
  SELECT id FROM public.students WHERE classroom_id IN (SELECT id FROM public.classrooms WHERE class_name LIKE '%ม.1%' OR class_name LIKE '%ม.3%')
);

-- ลบการ์ดและประวัติการสุ่ม
DELETE FROM public.card_inventory WHERE student_id IN (
  SELECT id FROM public.students WHERE classroom_id IN (SELECT id FROM public.classrooms WHERE class_name LIKE '%ม.1%' OR class_name LIKE '%ม.3%')
);
DELETE FROM public.gacha_pulls WHERE student_id IN (
  SELECT id FROM public.students WHERE classroom_id IN (SELECT id FROM public.classrooms WHERE class_name LIKE '%ม.1%' OR class_name LIKE '%ม.3%')
);
DELETE FROM public.coins_transactions WHERE student_id IN (
  SELECT id FROM public.students WHERE classroom_id IN (SELECT id FROM public.classrooms WHERE class_name LIKE '%ม.1%' OR class_name LIKE '%ม.3%')
);

-- รีเซ็ต Analytics สำหรับม.1 และม.3
UPDATE public.analytics_summary 
SET pretest_score = 0, posttest_score = 0, success_rate = 0, attempt_count = 0
WHERE student_id IN (
  SELECT id FROM public.students WHERE classroom_id IN (SELECT id FROM public.classrooms WHERE class_name LIKE '%ม.1%' OR class_name LIKE '%ม.3%')
);

-- รีเซ็ตความก้าวหน้ากลับไปเริ่มที่ด่าน 1 และเริ่มเก็บค่าต่างๆ ใหม่
UPDATE public.learning_paths
SET 
  current_stage = 1,
  current_rank = 1,
  exp = 0,
  total_exp = 0,
  coins = 0,
  free_pull_tickets = 0,
  paid_gacha_pulls = 0,
  streak_days = 0,
  last_active_date = NULL
WHERE student_id IN (
  SELECT id FROM public.students WHERE classroom_id IN (SELECT id FROM public.classrooms WHERE class_name LIKE '%ม.1%' OR class_name LIKE '%ม.3%')
);

-- 3. แจกเหรียญ 1000 เหรียญให้ทุกคน (ที่ยังมีไอดีอยู่)
-- Add 1000 coins to EVERY student currently in the system
UPDATE public.learning_paths
SET coins = coins + 1000
WHERE student_id IS NOT NULL;

-- Log the transaction for the 1000 coins giveaway
INSERT INTO public.coins_transactions (student_id, amount, source)
SELECT student_id, 1000, 'SYSTEM_GIFT'
FROM public.learning_paths
WHERE student_id IS NOT NULL;

-- Notify everyone about the gift
INSERT INTO public.card_notifications (student_id, notification_type, title, message, data)
SELECT student_id, 'SYSTEM', 'ของขวัญพิเศษจากระบบ! 🎁',
  'ระบบได้ทำการแจกเหรียญ 1,000 Coins ให้กับนักเรียนทุกคน!',
  jsonb_build_object('coins', 1000)
FROM public.learning_paths
WHERE student_id IS NOT NULL;

COMMIT;
