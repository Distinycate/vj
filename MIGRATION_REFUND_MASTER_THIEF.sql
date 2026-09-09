-- ==============================================================================
-- Vocab Journey - Refund Broken Master Thief Cards
-- This script refunds the "Master Thief" cards that were used by students
-- and approved by teachers *today* before the instant-use patch was applied.
-- ==============================================================================

BEGIN;

-- 1. Refund the Master Thief card back to the student's inventory
UPDATE public.card_inventory ci
SET quantity = ci.quantity + 1
FROM public.card_logs cl
JOIN public.cards c ON cl.played_card_id = c.id
WHERE cl.attacker_id = ci.student_id
  AND c.card_code = 'THIEF_MASTER'
  AND cl.status IN ('SUCCESS', 'APPROVED', 'COUNTER_PHASE')
  AND cl.created_at >= CURRENT_DATE
  AND ci.card_id = c.id;

-- 2. Optional: If the student completely ran out of the card (quantity = 0 or row was deleted),
-- we need to insert it back if it's missing (though our system usually leaves quantity = 0).
INSERT INTO public.card_inventory (student_id, card_id, quantity)
SELECT cl.attacker_id, cl.played_card_id, 1
FROM public.card_logs cl
JOIN public.cards c ON cl.played_card_id = c.id
WHERE c.card_code = 'THIEF_MASTER'
  AND cl.status IN ('SUCCESS', 'APPROVED', 'COUNTER_PHASE')
  AND cl.created_at >= CURRENT_DATE
  AND NOT EXISTS (
    SELECT 1 FROM public.card_inventory ci 
    WHERE ci.student_id = cl.attacker_id AND ci.card_id = cl.played_card_id
  );

-- 3. Mark the refunded logs as 'REJECTED' (or 'REFUNDED' if supported) 
-- with a note so they don't get processed again or confuse the student.
UPDATE public.card_logs
SET status = 'REJECTED',
    metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{refund_reason}', '"Refunded due to Master Thief update"')
FROM public.cards c
WHERE card_logs.played_card_id = c.id
  AND c.card_code = 'THIEF_MASTER'
  AND card_logs.status IN ('SUCCESS', 'APPROVED', 'COUNTER_PHASE')
  AND card_logs.created_at >= CURRENT_DATE;

COMMIT;
