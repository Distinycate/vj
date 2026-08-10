-- Script to find students who abused the free ticket farming exploit
-- Paste this script in the Supabase SQL Editor and hit "Run"

SELECT 
    s.student_name,
    s.student_code,
    c.class_name,
    COUNT(ct.id) AS total_free_pulls,
    MAX(ct.created_at) AS last_pull_time
FROM public.card_transactions ct
JOIN public.students s ON ct.student_id = s.id
LEFT JOIN public.classrooms c ON s.classroom_id = c.id
WHERE ct.action_type = 'gacha_pull'
  AND ct.metadata->>'payment' = 'FREE_TICKET'
GROUP BY s.id, s.student_name, s.student_code, c.class_name
HAVING COUNT(ct.id) > 10 -- Only show students who used more than 10 free tickets
ORDER BY total_free_pulls DESC
LIMIT 50;
