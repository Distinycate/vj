-- 1. Add active shields to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS active_reflect_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_defense_count integer NOT NULL DEFAULT 0;

-- 2. Add teacher execution state to card_logs
ALTER TABLE public.card_logs 
ADD COLUMN IF NOT EXISTS teacher_executed boolean NOT NULL DEFAULT false;

-- 3. Update create_card_action to handle auto-resolve and pre-cast logic
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

  -- Validate target requirement for attacks
  IF v_card.effect_type = 'ATTACK' AND p_target_id IS NULL AND (p_metadata->>'additionalTargets') IS NULL THEN
    RAISE EXCEPTION 'TARGET_REQUIRED';
  END IF;

  -- Check inventory
  SELECT * INTO v_inventory
  FROM public.card_inventory
  WHERE student_id = p_attacker_id AND card_id = p_card_id
  FOR UPDATE;
  
  -- We don't check reserved_quantity here anymore, we deduct quantity directly.
  IF NOT FOUND OR v_inventory.quantity < 1 THEN
    RAISE EXCEPTION 'CARD_NOT_AVAILABLE';
  END IF;

  -- Deduct card directly (no more reservation)
  UPDATE public.card_inventory
  SET quantity = quantity - 1, updated_at = now()
  WHERE id = v_inventory.id;

  -- Default values
  v_actual_target_id := p_target_id;
  v_status := 'RESOLVED';
  v_final_result := NULL;

  -- Logic Branching based on effect_type
  IF v_card.effect_type = 'REFLECT' THEN
    -- Pre-cast Reflect
    UPDATE public.students 
    SET active_reflect_count = active_reflect_count + 1 
    WHERE id = p_attacker_id;
    
    v_actual_target_id := NULL;
    v_final_result := 'กางโล่สะท้อนกลับล่วงหน้าสำเร็จ';
    
  ELSIF v_card.effect_type = 'DEFENSE' THEN
    -- Pre-cast Defense
    UPDATE public.students 
    SET active_defense_count = active_defense_count + 1 
    WHERE id = p_attacker_id;
    
    v_actual_target_id := NULL;
    v_final_result := 'กางโล่ป้องกันล่วงหน้าสำเร็จ';

  ELSIF v_card.effect_type = 'BUFF' AND v_card.card_code = 'EARLY_HOME' THEN
    -- EARLY_HOME requires teacher approval
    v_status := 'PENDING';
    
  ELSIF v_card.effect_type = 'ATTACK' THEN
    -- Get target to check shields
    SELECT * INTO v_target FROM public.students WHERE id = p_target_id FOR UPDATE;
    
    IF v_target.active_reflect_count > 0 THEN
      -- Target has reflect! Consume 1 reflect charge and bounce back to attacker
      UPDATE public.students 
      SET active_reflect_count = active_reflect_count - 1 
      WHERE id = p_target_id;
      
      v_actual_target_id := p_attacker_id; -- Bounces back to attacker
      v_final_result := 'เป้าหมายสะท้อนการโจมตีกลับ!';
      
    ELSIF v_target.active_defense_count > 0 THEN
      -- Target has defense! Consume 1 defense charge and neutralize
      UPDATE public.students 
      SET active_defense_count = active_defense_count - 1 
      WHERE id = p_target_id;
      
      v_status := 'REJECTED';
      v_final_result := 'เป้าหมายป้องกันการโจมตีไว้ได้!';
      
    ELSE
      -- Hits target successfully
      v_final_result := 'การโจมตีสำเร็จ!';
    END IF;
  END IF;

  -- Create log
  INSERT INTO public.card_logs(
    attacker_id, 
    target_id, 
    played_card_id, 
    metadata, 
    status, 
    final_result_text
  )
  VALUES (
    p_attacker_id, 
    v_actual_target_id, 
    p_card_id, 
    p_metadata, 
    v_status, 
    v_final_result
  )
  RETURNING * INTO v_log;
  
  RETURN v_log;
END;
$$;

-- 4. Mark execution API for teachers
CREATE OR REPLACE FUNCTION public.teacher_mark_card_executed(
  p_teacher_id uuid,
  p_log_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Basic validation
  IF NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = p_teacher_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  
  UPDATE public.card_logs
  SET teacher_executed = true, updated_at = now()
  WHERE id = p_log_id;
END;
$$;
