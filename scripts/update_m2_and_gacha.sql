BEGIN;

-- 1. ปรับเหรียญของนักเรียน ม.2 โดยหักออกคนละ 1000 เหรียญ (หากมีไม่ถึง 1000 จะเหลือ 0)
UPDATE public.learning_paths
SET coins = GREATEST(0, coins - 1000)
WHERE student_id IN (
  SELECT id FROM public.students 
  WHERE classroom_id IN (SELECT id FROM public.classrooms WHERE class_name LIKE '%ม.2%')
);

-- บันทึกประวัติการหักเหรียญลงระบบ
INSERT INTO public.coins_transactions (student_id, amount, source)
SELECT id, -1000, 'SYSTEM_DEDUCT'
FROM public.students
WHERE classroom_id IN (SELECT id FROM public.classrooms WHERE class_name LIKE '%ม.2%');

-- 2. ปรับอัตราการดรอป (Drop Weight) ของระบบกาชา (รวม = 100)
-- 70% ได้เกลือ (ไม่ได้อะไรเลย) และ 30% เฉลี่ยให้การ์ดอื่นๆ ตามระดับความหายาก
UPDATE public.cards SET drop_weight = 70 WHERE card_code = 'DUD_SALT';
UPDATE public.cards SET drop_weight = 12 WHERE card_code = 'CLEAN_ROOM';
UPDATE public.cards SET drop_weight = 10 WHERE card_code = 'MEDITATE_10';
UPDATE public.cards SET drop_weight = 5  WHERE card_code = 'SHIELD';
UPDATE public.cards SET drop_weight = 2  WHERE card_code = 'REFLECT';
UPDATE public.cards SET drop_weight = 1  WHERE card_code = 'EARLY_HOME';

COMMIT;
