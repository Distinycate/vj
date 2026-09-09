-- 1. Add New Cards
INSERT INTO public.cards (card_code, name, description, rarity, effect_type, image_url, drop_weight, target_scope, is_stealable)
VALUES 
  ('BOMB', 'การ์ดระเบิด', 'สุ่มทำลายการ์ดของเพื่อนแบบสุ่ม 5 ใบ', 'SSR', 'ATTACK', '💣', 15, 'school', false),
  ('NINJA', 'การ์ดนินจา', 'เลือกทำลายการ์ดของเพื่อนแบบเจาะจง 2 ใบ', 'UR', 'ATTACK', '🥷', 5, 'school', false),
  ('DEMON_TEACHER', 'การ์ดครูปีศาจ', 'คำสาป! เมื่อสุ่มได้การ์ดนี้ ระบบจะทำลายการ์ดในคลังของคุณแบบสุ่ม 10 ใบทันที', 'UR', 'DUD', '👹', 8, 'self', false),
  ('ANGEL', 'การ์ดนางฟ้า', 'ส่งความช่วยเหลือ กางโล่ป้องกันการโจมตีให้เพื่อน 1 ครั้ง', 'SR', 'BUFF', '👼', 20, 'school', true),
  ('CLEAN_CLASS', 'สั่งทำความสะอาดห้อง', 'ทำโทษเพื่อน 1 คนให้ไปทำความสะอาดห้องเรียน', 'R', 'ATTACK', '🧹', 35, 'school', true),
  ('PICK_TRASH', 'สั่งเก็บขยะ', 'ทำโทษเพื่อน 1 คนให้ไปเดินเก็บขยะ', 'N', 'ATTACK', '🗑️', 50, 'school', true)
ON CONFLICT (card_code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  rarity = EXCLUDED.rarity,
  effect_type = EXCLUDED.effect_type,
  image_url = EXCLUDED.image_url,
  drop_weight = EXCLUDED.drop_weight;

-- 2. Update `pull_gacha_card` to handle DEMON_TEACHER
CREATE OR REPLACE FUNCTION public.pull_gacha_card(
  p_student_id uuid,
  p_coin_cost integer DEFAULT 200
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path public.learning_paths%ROWTYPE;
  v_card public.cards%ROWTYPE;
  v_payment text;
  v_total_weight numeric;
  v_roll numeric;
  v_paid_pull_count integer;
  v_is_pity boolean := false;
  v_destroyed_cards integer := 0;
BEGIN
  IF p_coin_cost < 0 THEN
    RAISE EXCEPTION 'INVALID_COIN_COST';
  END IF;

  SELECT * INTO v_path FROM public.learning_paths WHERE student_id = p_student_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'LEARNING_PATH_NOT_FOUND'; END IF;

  IF v_path.free_pull_tickets > 0 THEN
    UPDATE public.learning_paths SET free_pull_tickets = free_pull_tickets - 1 WHERE student_id = p_student_id;
    v_payment := 'FREE_TICKET';
  ELSIF v_path.coins >= p_coin_cost THEN
    UPDATE public.learning_paths
    SET coins = coins - p_coin_cost, paid_gacha_pulls = paid_gacha_pulls + 1
    WHERE student_id = p_student_id
    RETURNING paid_gacha_pulls INTO v_paid_pull_count;
    
    INSERT INTO public.coins_transactions(student_id, amount, source)
    VALUES (p_student_id, -p_coin_cost, 'CARD_GACHA_PULL');
    
    v_payment := 'COINS';
    v_is_pity := (v_paid_pull_count % 10 = 0);
  ELSE
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  SELECT sum(drop_weight) INTO v_total_weight FROM public.cards WHERE is_active = true AND (NOT v_is_pity OR effect_type <> 'DUD');
  IF coalesce(v_total_weight, 0) <= 0 THEN RAISE EXCEPTION 'NO_ACTIVE_CARDS'; END IF;

  v_roll := random() * v_total_weight;

  SELECT c.* INTO v_card FROM public.cards c
  WHERE c.id = (
    SELECT picked.id FROM (
      SELECT c.id, sum(c.drop_weight) OVER (ORDER BY c.id) AS cumulative_weight
      FROM public.cards c
      WHERE c.is_active = true AND (NOT v_is_pity OR c.effect_type <> 'DUD')
    ) picked
    WHERE picked.cumulative_weight >= v_roll
    ORDER BY picked.cumulative_weight
    LIMIT 1
  );

  -- DEMON TEACHER TRAP LOGIC
  IF v_card.card_code = 'DEMON_TEACHER' THEN
    -- Delete up to 10 random cards
    WITH targets AS (
      SELECT id FROM public.card_inventory
      WHERE student_id = p_student_id AND quantity > 0
      ORDER BY random()
      LIMIT 10
    )
    UPDATE public.card_inventory
    SET quantity = quantity - 1
    WHERE id IN (SELECT id FROM targets);
    
    -- Actually just return a message saying destroyed
  ELSE
    -- Normal card addition
    INSERT INTO public.card_inventory(student_id, card_id, quantity)
    VALUES (p_student_id, v_card.id, 1)
    ON CONFLICT (student_id, card_id)
    DO UPDATE SET quantity = public.card_inventory.quantity + 1, updated_at = now();
  END IF;

  INSERT INTO public.gacha_pulls(student_id, card_id, payment_type, coin_cost)
  VALUES (
    p_student_id, v_card.id, v_payment,
    CASE WHEN v_payment = 'COINS' THEN p_coin_cost ELSE 0 END
  );

  RETURN jsonb_build_object(
    'card', to_jsonb(v_card),
    'payment_type', v_payment,
    'is_pity', v_is_pity,
    'paid_gacha_pulls', (SELECT paid_gacha_pulls FROM public.learning_paths WHERE student_id = p_student_id),
    'coins', (SELECT coins FROM public.learning_paths WHERE student_id = p_student_id),
    'free_pull_tickets', (SELECT free_pull_tickets FROM public.learning_paths WHERE student_id = p_student_id)
  );
END;
$$;


-- 3. Execute BOMB logic
CREATE OR REPLACE FUNCTION public.execute_bomb_card(
  p_attacker_id uuid,
  p_target_id uuid,
  p_bomb_card_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inventory public.card_inventory%ROWTYPE;
  v_target public.students%ROWTYPE;
  v_destroyed_count integer := 0;
BEGIN
  -- Deduct bomb card
  SELECT * INTO v_inventory FROM public.card_inventory WHERE student_id = p_attacker_id AND card_id = p_bomb_card_id FOR UPDATE;
  IF NOT FOUND OR v_inventory.quantity < 1 THEN RAISE EXCEPTION 'CARD_NOT_AVAILABLE'; END IF;
  UPDATE public.card_inventory SET quantity = quantity - 1 WHERE id = v_inventory.id;

  -- Get target to check shields
  SELECT * INTO v_target FROM public.students WHERE id = p_target_id FOR UPDATE;
  IF v_target.active_reflect_count > 0 THEN
    -- Reflected! Bomb hits attacker
    UPDATE public.students SET active_reflect_count = active_reflect_count - 1 WHERE id = p_target_id;
    p_target_id := p_attacker_id;
  ELSIF v_target.active_defense_count > 0 THEN
    -- Defended! Bomb neutralized
    UPDATE public.students SET active_defense_count = active_defense_count - 1 WHERE id = p_target_id;
    RETURN jsonb_build_object('success', false, 'reason', 'TARGET_IS_PROTECTED');
  END IF;

  -- Bomb effect: destroy up to 5 cards randomly
  WITH targets AS (
    SELECT id FROM public.card_inventory
    WHERE student_id = p_target_id AND quantity > 0
    ORDER BY random()
    LIMIT 5
  )
  UPDATE public.card_inventory
  SET quantity = quantity - 1
  WHERE id IN (SELECT id FROM targets);

  SELECT count(*) INTO v_destroyed_count FROM (
    SELECT id FROM public.card_inventory WHERE student_id = p_target_id AND quantity > 0 ORDER BY random() LIMIT 5
  ) t;

  -- Create log
  INSERT INTO public.card_logs(attacker_id, target_id, played_card_id, status, final_result_text, teacher_executed)
  VALUES (p_attacker_id, p_target_id, p_bomb_card_id, 'RESOLVED', 'ระเบิดการ์ดเป้าหมายสำเร็จ', true);

  RETURN jsonb_build_object('success', true, 'destroyed_count', coalesce(v_destroyed_count, 5));
END;
$$;


-- 4. Execute NINJA logic
CREATE OR REPLACE FUNCTION public.execute_ninja_card(
  p_attacker_id uuid,
  p_target_id uuid,
  p_ninja_card_id uuid,
  p_target_card_1_id uuid,
  p_target_card_2_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inventory public.card_inventory%ROWTYPE;
  v_target public.students%ROWTYPE;
BEGIN
  -- Deduct ninja card
  SELECT * INTO v_inventory FROM public.card_inventory WHERE student_id = p_attacker_id AND card_id = p_ninja_card_id FOR UPDATE;
  IF NOT FOUND OR v_inventory.quantity < 1 THEN RAISE EXCEPTION 'CARD_NOT_AVAILABLE'; END IF;
  UPDATE public.card_inventory SET quantity = quantity - 1 WHERE id = v_inventory.id;

  -- Get target to check shields
  SELECT * INTO v_target FROM public.students WHERE id = p_target_id FOR UPDATE;
  IF v_target.active_reflect_count > 0 THEN
    -- Reflected! Ninja neutralized
    UPDATE public.students SET active_reflect_count = active_reflect_count - 1 WHERE id = p_target_id;
    RETURN jsonb_build_object('success', false, 'reason', 'TARGET_IS_PROTECTED');
  ELSIF v_target.active_defense_count > 0 THEN
    -- Defended! Ninja neutralized
    UPDATE public.students SET active_defense_count = active_defense_count - 1 WHERE id = p_target_id;
    RETURN jsonb_build_object('success', false, 'reason', 'TARGET_IS_PROTECTED');
  END IF;

  -- Ninja effect: deduct specified cards
  UPDATE public.card_inventory SET quantity = quantity - 1 WHERE student_id = p_target_id AND card_id = p_target_card_1_id AND quantity > 0;
  IF p_target_card_2_id IS NOT NULL THEN
    UPDATE public.card_inventory SET quantity = quantity - 1 WHERE student_id = p_target_id AND card_id = p_target_card_2_id AND quantity > 0;
  END IF;

  -- Create log
  INSERT INTO public.card_logs(attacker_id, target_id, played_card_id, status, final_result_text, teacher_executed)
  VALUES (p_attacker_id, p_target_id, p_ninja_card_id, 'RESOLVED', 'ลอบทำลายการ์ดเป้าหมายสำเร็จ', true);

  RETURN jsonb_build_object('success', true);
END;
$$;


-- 5. Update `create_card_action` for ANGEL logic
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
  v_target public.students%ROWTYPE;
  v_log public.card_logs%ROWTYPE;
  v_actual_target_id uuid;
  v_status text;
  v_final_result text;
BEGIN
  -- Validate card exists and is active
  SELECT * INTO v_card FROM public.cards WHERE id = p_card_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'CARD_NOT_FOUND'; END IF;
  
  -- Prevent self-target for attacks
  IF p_target_id = p_attacker_id AND v_card.effect_type = 'ATTACK' THEN 
    RAISE EXCEPTION 'SELF_TARGET_NOT_ALLOWED'; 
  END IF;

  -- Validate target requirement for attacks and Angel
  IF (v_card.effect_type = 'ATTACK' OR v_card.card_code = 'ANGEL') AND p_target_id IS NULL AND (p_metadata->>'additionalTargets') IS NULL THEN
    RAISE EXCEPTION 'TARGET_REQUIRED';
  END IF;

  -- Check inventory
  SELECT * INTO v_inventory FROM public.card_inventory
  WHERE student_id = p_attacker_id AND card_id = p_card_id FOR UPDATE;
  
  IF NOT FOUND OR v_inventory.quantity < 1 THEN RAISE EXCEPTION 'CARD_NOT_AVAILABLE'; END IF;

  -- Deduct card directly
  UPDATE public.card_inventory SET quantity = quantity - 1, updated_at = now() WHERE id = v_inventory.id;

  v_actual_target_id := p_target_id;
  v_status := 'RESOLVED';
  v_final_result := NULL;

  -- Logic Branching based on effect_type
  IF v_card.effect_type = 'REFLECT' THEN
    UPDATE public.students SET active_reflect_count = active_reflect_count + 1 WHERE id = p_attacker_id;
    v_actual_target_id := NULL;
    v_final_result := 'กางโล่สะท้อนกลับล่วงหน้าสำเร็จ';
    
  ELSIF v_card.effect_type = 'DEFENSE' THEN
    UPDATE public.students SET active_defense_count = active_defense_count + 1 WHERE id = p_attacker_id;
    v_actual_target_id := NULL;
    v_final_result := 'กางโล่ป้องกันล่วงหน้าสำเร็จ';

  ELSIF v_card.card_code = 'ANGEL' THEN
    -- Angel cast shield on target
    UPDATE public.students SET active_defense_count = active_defense_count + 1 WHERE id = p_target_id;
    v_final_result := 'กางโล่ให้เพื่อนล่วงหน้าสำเร็จ';

  ELSIF v_card.effect_type = 'BUFF' AND v_card.card_code = 'EARLY_HOME' THEN
    v_status := 'PENDING';
    
  ELSIF v_card.effect_type = 'ATTACK' THEN
    SELECT * INTO v_target FROM public.students WHERE id = p_target_id FOR UPDATE;
    
    IF v_target.active_reflect_count > 0 THEN
      UPDATE public.students SET active_reflect_count = active_reflect_count - 1 WHERE id = p_target_id;
      v_actual_target_id := p_attacker_id; 
      v_final_result := 'เป้าหมายสะท้อนการโจมตีกลับ!';
    ELSIF v_target.active_defense_count > 0 THEN
      UPDATE public.students SET active_defense_count = active_defense_count - 1 WHERE id = p_target_id;
      v_status := 'REJECTED';
      v_final_result := 'เป้าหมายป้องกันการโจมตีไว้ได้!';
    ELSE
      v_final_result := 'การโจมตีสำเร็จ!';
    END IF;
  END IF;

  INSERT INTO public.card_logs(attacker_id, target_id, played_card_id, metadata, status, final_result_text)
  VALUES (p_attacker_id, v_actual_target_id, p_card_id, p_metadata, v_status, v_final_result)
  RETURNING * INTO v_log;
  
  RETURN v_log;
END;
$$;
