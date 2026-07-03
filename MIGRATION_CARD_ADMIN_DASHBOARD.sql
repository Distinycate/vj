-- Teacher card-management audit and safe disciplinary adjustments.
-- Additive migration. Run after MIGRATION_CARD_BATTLE.sql.

ALTER TABLE public.teachers
  DROP CONSTRAINT IF EXISTS teachers_role_check;
ALTER TABLE public.teachers
  ADD CONSTRAINT teachers_role_check
  CHECK (role IN ('TEACHER', 'ADMIN', 'EXECUTIVE', 'CARD_TEACHER'));

CREATE TABLE IF NOT EXISTS public.card_admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (
    action_type IN (
      'COIN_AWARD', 'COIN_REMOVAL',
      'TICKET_AWARD', 'TICKET_REMOVAL', 'CARD_REMOVAL'
    )
  ),
  behavior_category text NOT NULL DEFAULT 'OTHER' CHECK (
    behavior_category IN (
      'POSITIVE_BEHAVIOR', 'RESPONSIBILITY', 'VOLUNTEER',
      'DISCIPLINE', 'RULE_VIOLATION', 'OTHER'
    )
  ),
  card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
  amount integer NOT NULL CHECK (amount > 0),
  reason text NOT NULL,
  balance_before integer NOT NULL CHECK (balance_before >= 0),
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Upgrade installations that already have the first audit-table version.
ALTER TABLE public.card_admin_actions
  ADD COLUMN IF NOT EXISTS behavior_category text NOT NULL DEFAULT 'OTHER';
ALTER TABLE public.card_admin_actions
  DROP CONSTRAINT IF EXISTS card_admin_actions_action_type_check;
ALTER TABLE public.card_admin_actions
  ADD CONSTRAINT card_admin_actions_action_type_check CHECK (
    action_type IN (
      'COIN_AWARD', 'COIN_REMOVAL',
      'TICKET_AWARD', 'TICKET_REMOVAL', 'CARD_REMOVAL'
    )
  );
ALTER TABLE public.card_admin_actions
  DROP CONSTRAINT IF EXISTS card_admin_actions_behavior_category_check;
ALTER TABLE public.card_admin_actions
  ADD CONSTRAINT card_admin_actions_behavior_category_check CHECK (
    behavior_category IN (
      'POSITIVE_BEHAVIOR', 'RESPONSIBILITY', 'VOLUNTEER',
      'DISCIPLINE', 'RULE_VIOLATION', 'OTHER'
    )
  );

CREATE INDEX IF NOT EXISTS card_admin_actions_student_created_idx
  ON public.card_admin_actions(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS card_admin_actions_teacher_created_idx
  ON public.card_admin_actions(teacher_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.register_card_teacher(
  p_name text,
  p_username text,
  p_password text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_teacher public.teachers%ROWTYPE;
BEGIN
  IF length(trim(p_name)) < 2 THEN RAISE EXCEPTION 'INVALID_TEACHER_NAME'; END IF;
  IF length(trim(p_username)) < 4 THEN RAISE EXCEPTION 'INVALID_USERNAME'; END IF;
  IF length(p_password) < 4 THEN RAISE EXCEPTION 'INVALID_PASSWORD'; END IF;

  INSERT INTO public.teachers(id, name, username, password, role, is_active)
  VALUES (gen_random_uuid(), trim(p_name), lower(trim(p_username)), p_password, 'CARD_TEACHER', true)
  RETURNING * INTO v_teacher;

  RETURN jsonb_build_object(
    'id', v_teacher.id,
    'name', v_teacher.name,
    'username', v_teacher.username,
    'role', v_teacher.role
  );
EXCEPTION
  WHEN unique_violation THEN RAISE EXCEPTION 'USERNAME_ALREADY_EXISTS';
END;
$$;

CREATE OR REPLACE FUNCTION public.teacher_adjust_student_coins(
  p_teacher_id uuid,
  p_student_id uuid,
  p_amount integer,
  p_reason text,
  p_behavior_category text DEFAULT 'OTHER'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path public.learning_paths%ROWTYPE;
  v_after integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.teachers
    WHERE id = p_teacher_id
      AND is_active = true
      AND role IN ('TEACHER', 'ADMIN', 'CARD_TEACHER')
  ) THEN RAISE EXCEPTION 'TEACHER_NOT_FOUND'; END IF;
  IF p_amount = 0 OR abs(p_amount) > 10000 THEN RAISE EXCEPTION 'INVALID_COIN_AMOUNT'; END IF;
  IF nullif(trim(p_reason), '') IS NULL THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
  IF p_behavior_category NOT IN (
    'POSITIVE_BEHAVIOR', 'RESPONSIBILITY', 'VOLUNTEER',
    'DISCIPLINE', 'RULE_VIOLATION', 'OTHER'
  ) THEN RAISE EXCEPTION 'INVALID_BEHAVIOR_CATEGORY'; END IF;

  SELECT * INTO v_path
  FROM public.learning_paths
  WHERE student_id = p_student_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'LEARNING_PATH_NOT_FOUND'; END IF;

  v_after := v_path.coins + p_amount;
  IF v_after < 0 THEN RAISE EXCEPTION 'INSUFFICIENT_COINS'; END IF;

  UPDATE public.learning_paths SET coins = v_after WHERE student_id = p_student_id;
  INSERT INTO public.coins_transactions(student_id, amount, source)
  VALUES (
    p_student_id, p_amount,
    CASE WHEN p_amount > 0 THEN 'CARD_TEACHER_REWARD' ELSE 'CARD_TEACHER_PENALTY' END
  );
  INSERT INTO public.card_admin_actions(
    teacher_id, student_id, action_type, behavior_category,
    amount, reason, balance_before, balance_after
  )
  VALUES (
    p_teacher_id, p_student_id,
    CASE WHEN p_amount > 0 THEN 'COIN_AWARD' ELSE 'COIN_REMOVAL' END,
    p_behavior_category, abs(p_amount), trim(p_reason), v_path.coins, v_after
  );

  RETURN jsonb_build_object(
    'student_id', p_student_id, 'amount', p_amount,
    'balance_before', v_path.coins, 'balance_after', v_after
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.teacher_adjust_free_pull_tickets(
  p_teacher_id uuid,
  p_student_id uuid,
  p_amount integer,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path public.learning_paths%ROWTYPE;
  v_after integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.teachers
    WHERE id = p_teacher_id AND is_active = true
  ) THEN RAISE EXCEPTION 'TEACHER_NOT_FOUND'; END IF;
  IF p_amount = 0 OR abs(p_amount) > 100 THEN RAISE EXCEPTION 'INVALID_TICKET_AMOUNT'; END IF;
  IF nullif(trim(p_reason), '') IS NULL THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;

  SELECT * INTO v_path
  FROM public.learning_paths
  WHERE student_id = p_student_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'LEARNING_PATH_NOT_FOUND'; END IF;

  v_after := v_path.free_pull_tickets + p_amount;
  IF v_after < 0 THEN RAISE EXCEPTION 'INSUFFICIENT_TICKETS'; END IF;

  UPDATE public.learning_paths
  SET free_pull_tickets = v_after
  WHERE student_id = p_student_id;

  INSERT INTO public.card_admin_actions(
    teacher_id, student_id, action_type, behavior_category,
    amount, reason, balance_before, balance_after
  )
  VALUES (
    p_teacher_id, p_student_id,
    CASE WHEN p_amount > 0 THEN 'TICKET_AWARD' ELSE 'TICKET_REMOVAL' END,
    CASE WHEN p_amount > 0 THEN 'POSITIVE_BEHAVIOR' ELSE 'DISCIPLINE' END,
    abs(p_amount), trim(p_reason), v_path.free_pull_tickets, v_after
  );

  INSERT INTO public.card_notifications(student_id, notification_type, title, message, data)
  VALUES (
    p_student_id,
    CASE WHEN p_amount > 0 THEN 'TEACHER_TICKET_REWARD' ELSE 'TEACHER_TICKET_REMOVAL' END,
    CASE WHEN p_amount > 0 THEN '🎟️ ครูมอบตั๋วสุ่มฟรี' ELSE 'แจ้งการหักตั๋วสุ่มฟรี' END,
    trim(p_reason),
    jsonb_build_object('amount', p_amount, 'balance', v_after, 'teacher_id', p_teacher_id)
  );

  RETURN jsonb_build_object(
    'student_id', p_student_id,
    'amount', p_amount,
    'balance_before', v_path.free_pull_tickets,
    'balance_after', v_after
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.teacher_adjust_student_tickets(
  p_teacher_id uuid,
  p_student_id uuid,
  p_amount integer,
  p_reason text,
  p_behavior_category text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF p_behavior_category NOT IN (
    'POSITIVE_BEHAVIOR', 'RESPONSIBILITY', 'VOLUNTEER',
    'DISCIPLINE', 'RULE_VIOLATION', 'OTHER'
  ) THEN RAISE EXCEPTION 'INVALID_BEHAVIOR_CATEGORY'; END IF;

  v_result := public.teacher_adjust_free_pull_tickets(
    p_teacher_id, p_student_id, p_amount, p_reason
  );
  UPDATE public.card_admin_actions
  SET behavior_category = p_behavior_category
  WHERE id = (
    SELECT id FROM public.card_admin_actions
    WHERE teacher_id = p_teacher_id
      AND student_id = p_student_id
      AND action_type = CASE WHEN p_amount > 0 THEN 'TICKET_AWARD' ELSE 'TICKET_REMOVAL' END
    ORDER BY created_at DESC
    LIMIT 1
  );
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.teacher_remove_student_card(
  p_teacher_id uuid,
  p_student_id uuid,
  p_card_id uuid,
  p_amount integer DEFAULT 1,
  p_reason text DEFAULT 'ครูริบการ์ดตามระเบียบ'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inventory public.card_inventory%ROWTYPE;
  v_available integer;
  v_after integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.teachers
    WHERE id = p_teacher_id AND is_active = true
  ) THEN RAISE EXCEPTION 'TEACHER_NOT_FOUND'; END IF;
  IF p_amount <= 0 OR p_amount > 100 THEN RAISE EXCEPTION 'INVALID_CARD_AMOUNT'; END IF;
  IF nullif(trim(p_reason), '') IS NULL THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;

  SELECT * INTO v_inventory
  FROM public.card_inventory
  WHERE student_id = p_student_id AND card_id = p_card_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CARD_NOT_FOUND_IN_INVENTORY'; END IF;

  v_available := v_inventory.quantity - v_inventory.reserved_quantity;
  IF v_available < p_amount THEN RAISE EXCEPTION 'INSUFFICIENT_AVAILABLE_CARDS'; END IF;
  v_after := v_inventory.quantity - p_amount;

  UPDATE public.card_inventory
  SET quantity = v_after, updated_at = now()
  WHERE id = v_inventory.id;

  INSERT INTO public.card_admin_actions(
    teacher_id, student_id, action_type, behavior_category, card_id, amount, reason,
    balance_before, balance_after
  )
  VALUES (
    p_teacher_id, p_student_id, 'CARD_REMOVAL', 'DISCIPLINE',
    p_card_id, p_amount, trim(p_reason),
    v_inventory.quantity, v_after
  );

  INSERT INTO public.card_notifications(student_id, notification_type, title, message, data)
  VALUES (
    p_student_id, 'TEACHER_CARD_REMOVAL', 'แจ้งการริบการ์ดโดยครู', trim(p_reason),
    jsonb_build_object(
      'card_id', p_card_id, 'amount', p_amount, 'balance', v_after,
      'teacher_id', p_teacher_id
    )
  );

  RETURN jsonb_build_object(
    'student_id', p_student_id,
    'card_id', p_card_id,
    'amount', p_amount,
    'balance_before', v_inventory.quantity,
    'balance_after', v_after
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.teacher_remove_student_card_categorized(
  p_teacher_id uuid,
  p_student_id uuid,
  p_card_id uuid,
  p_amount integer,
  p_reason text,
  p_behavior_category text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  IF p_behavior_category NOT IN (
    'POSITIVE_BEHAVIOR', 'RESPONSIBILITY', 'VOLUNTEER',
    'DISCIPLINE', 'RULE_VIOLATION', 'OTHER'
  ) THEN RAISE EXCEPTION 'INVALID_BEHAVIOR_CATEGORY'; END IF;
  v_result := public.teacher_remove_student_card(
    p_teacher_id, p_student_id, p_card_id, p_amount, p_reason
  );
  UPDATE public.card_admin_actions
  SET behavior_category = p_behavior_category
  WHERE id = (
    SELECT id FROM public.card_admin_actions
    WHERE teacher_id = p_teacher_id
      AND student_id = p_student_id
      AND action_type = 'CARD_REMOVAL'
      AND card_id = p_card_id
    ORDER BY created_at DESC
    LIMIT 1
  );
  RETURN v_result;
END;
$$;

-- Preserve the existing bulk-award API while making every teacher award auditable.
CREATE OR REPLACE FUNCTION public.award_free_pull_tickets(
  p_teacher_id uuid,
  p_student_ids uuid[],
  p_amount integer,
  p_reason text DEFAULT 'TEACHER_REWARD'
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_count integer := 0;
BEGIN
  IF p_amount <= 0 OR p_amount > 100 THEN RAISE EXCEPTION 'INVALID_TICKET_AMOUNT'; END IF;
  FOREACH v_student_id IN ARRAY p_student_ids LOOP
    PERFORM public.teacher_adjust_free_pull_tickets(
      p_teacher_id, v_student_id, p_amount, p_reason
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

ALTER TABLE public.card_admin_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Internal read card admin actions" ON public.card_admin_actions;
CREATE POLICY "Internal read card admin actions"
  ON public.card_admin_actions FOR SELECT USING (true);
GRANT SELECT ON public.card_admin_actions TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_card_teacher(
  text, text, text
) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_adjust_student_coins(
  uuid, uuid, integer, text, text
) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.teacher_adjust_free_pull_tickets(
  uuid, uuid, integer, text
) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_adjust_student_tickets(
  uuid, uuid, integer, text, text
) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_remove_student_card(
  uuid, uuid, uuid, integer, text
) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_remove_student_card_categorized(
  uuid, uuid, uuid, integer, text, text
) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_free_pull_tickets(
  uuid, uuid[], integer, text
) TO anon, authenticated;
