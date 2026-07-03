-- 1. Add metadata column to card_logs to support additional targets
ALTER TABLE public.card_logs ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 2. Update create_card_action to accept metadata
CREATE OR REPLACE FUNCTION public.create_card_action(
  p_attacker_id uuid,
  p_card_id uuid,
  p_target_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS public.card_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card public.cards%ROWTYPE;
  v_inventory public.card_inventory%ROWTYPE;
  v_log public.card_logs%ROWTYPE;
BEGIN
  SELECT * INTO v_card FROM public.cards WHERE id = p_card_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'CARD_NOT_FOUND'; END IF;
  
  -- Allow ATTACK cards to skip single target validation if they provide multiple targets in metadata
  IF v_card.effect_type IN ('ATTACK') AND p_target_id IS NULL AND (p_metadata->>'additionalTargets') IS NULL THEN
    RAISE EXCEPTION 'TARGET_REQUIRED';
  END IF;
  
  IF v_card.effect_type = 'REFLECT' THEN
    RAISE EXCEPTION 'COUNTER_CARD_CANNOT_START_ACTION';
  END IF;
  IF v_card.effect_type = 'DEFENSE' AND p_target_id IS NOT NULL THEN
    RAISE EXCEPTION 'DEFENSE_MUST_TARGET_SELF';
  END IF;
  IF p_target_id = p_attacker_id THEN RAISE EXCEPTION 'SELF_TARGET_NOT_ALLOWED'; END IF;

  SELECT * INTO v_inventory
  FROM public.card_inventory
  WHERE student_id = p_attacker_id AND card_id = p_card_id
  FOR UPDATE;
  IF NOT FOUND OR v_inventory.quantity - v_inventory.reserved_quantity < 1 THEN
    RAISE EXCEPTION 'CARD_NOT_AVAILABLE';
  END IF;

  UPDATE public.card_inventory
  SET reserved_quantity = reserved_quantity + 1, updated_at = now()
  WHERE id = v_inventory.id;

  INSERT INTO public.card_logs(attacker_id, target_id, played_card_id, metadata)
  VALUES (p_attacker_id, p_target_id, p_card_id, p_metadata)
  RETURNING * INTO v_log;
  RETURN v_log;
END;
$$;
