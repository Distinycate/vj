-- 1. Add schema columns
ALTER TABLE public.learning_paths ADD COLUMN IF NOT EXISTS last_active_date date DEFAULT CURRENT_DATE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_skull boolean DEFAULT false;

-- 2. Update Card Balances (Drop Weights total to 1000)
-- N (30%)
UPDATE public.cards SET drop_weight = 150 WHERE card_code = 'DUD_SALT';
UPDATE public.cards SET drop_weight = 150 WHERE card_code = 'PICK_TRASH';

-- R (30%)
UPDATE public.cards SET drop_weight = 100 WHERE card_code = 'CLEAN_CLASS';
UPDATE public.cards SET drop_weight = 80 WHERE card_code = 'CLEAN_ROOM';
UPDATE public.cards SET drop_weight = 60 WHERE card_code = 'MEDITATE_10';
UPDATE public.cards SET rarity = 'R', drop_weight = 60 WHERE card_code = 'BOMB';

-- SR (20%)
UPDATE public.cards SET drop_weight = 60 WHERE card_code = 'ANGEL';
UPDATE public.cards SET drop_weight = 60 WHERE card_code = 'THIEF_RANDOM';
UPDATE public.cards SET rarity = 'SR', drop_weight = 50 WHERE card_code = 'DEMON_TEACHER';
UPDATE public.cards SET drop_weight = 30 WHERE card_code = 'SHIELD';

-- SSR (12%)
UPDATE public.cards SET drop_weight = 70 WHERE card_code = 'REFLECT';
UPDATE public.cards SET rarity = 'SSR', drop_weight = 50 WHERE card_code = 'NINJA';

-- UR (8%)
UPDATE public.cards SET drop_weight = 50 WHERE card_code = 'THIEF_MASTER';
UPDATE public.cards SET drop_weight = 30 WHERE card_code = 'EARLY_HOME';

-- 3. Create Card Decay Function
CREATE OR REPLACE FUNCTION public.trigger_card_decay(p_student_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path public.learning_paths%ROWTYPE;
  v_days_inactive integer;
  v_cards_to_destroy integer;
  v_destroyed_count integer := 0;
  v_id uuid;
BEGIN
  -- 1. Fetch path
  SELECT * INTO v_path FROM public.learning_paths WHERE student_id = p_student_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- 2. Calculate days inactive
  v_days_inactive := (CURRENT_DATE - v_path.last_active_date);

  -- 3. Update last_active_date immediately
  UPDATE public.learning_paths SET last_active_date = CURRENT_DATE WHERE student_id = p_student_id;

  -- 4. Check decay condition
  IF v_days_inactive > 3 THEN
    v_cards_to_destroy := v_days_inactive - 3;
    
    -- Limit the destruction just in case they were gone for a year to not be an insanely huge loop
    IF v_cards_to_destroy > 30 THEN
      v_cards_to_destroy := 30;
    END IF;

    -- Destroy cards
    FOR i IN 1..v_cards_to_destroy LOOP
      -- Find a random card to destroy
      SELECT id INTO v_id 
      FROM public.card_inventory 
      WHERE student_id = p_student_id AND quantity > 0
      ORDER BY random() 
      LIMIT 1;

      IF FOUND THEN
        UPDATE public.card_inventory 
        SET quantity = quantity - 1 
        WHERE id = v_id;
        v_destroyed_count := v_destroyed_count + 1;
      ELSE
        -- No more cards to destroy
        EXIT;
      END IF;
    END LOOP;
  END IF;

  RETURN v_destroyed_count;
END;
$$;
