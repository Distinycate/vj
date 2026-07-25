-- Vocab Journey: allow card actions to target students across classrooms.
-- Safe to run repeatedly. The approval workflow remains unchanged:
-- student creates a PENDING card_logs row, teacher announces COUNTER_PHASE,
-- and teacher resolves/rejects the final result.

ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS target_scope text DEFAULT 'school'
CHECK (target_scope IN ('self', 'classroom', 'school'));

UPDATE public.cards
SET target_scope = 'school'
WHERE effect_type = 'ATTACK';

UPDATE public.cards
SET target_scope = 'self'
WHERE effect_type IN ('DEFENSE', 'BUFF', 'DUD');

COMMENT ON COLUMN public.cards.target_scope IS
  'ATTACK cards target any active student in the school; DEFENSE/BUFF/DUD are self/counter-use only. Teacher approval in card_logs is still required.';
