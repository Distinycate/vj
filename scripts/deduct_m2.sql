BEGIN;

-- ปรับเหรียญของนักเรียน ม.2 โดยหักออกคนละ 1000 เหรียญ (หากมีไม่ถึง 1000 จะเหลือ 0)
UPDATE public.learning_paths
SET coins = GREATEST(0, coins - 1000)
WHERE student_id IN (
  SELECT id FROM public.students 
  WHERE classroom_id IN (SELECT id FROM public.classrooms WHERE class_name LIKE '%ม.2%')
);

-- บันทึกประวัติการหักเหรียญ
INSERT INTO public.coins_transactions (student_id, amount, source)
SELECT id, -1000, 'SYSTEM_DEDUCT'
FROM public.students
WHERE classroom_id IN (SELECT id FROM public.classrooms WHERE class_name LIKE '%ม.2%');

COMMIT;
