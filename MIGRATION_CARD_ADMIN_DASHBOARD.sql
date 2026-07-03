-- Teacher card-management audit and safe disciplinary adjustments.
-- Additive migration. Run after MIGRATION_CARD_BATTLE.sql.

CREATE TABLE IF NOT EXISTS public.card_admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (
    action_type IN ('TICKET_AWARD', 'TICKET_REMOVAL', 'CARD_REMOVAL')
  ),
  card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
  amount integer NOT NULL CHECK (amount > 0),
  reason text NOT NULL,
  balance_before integer NOT NULL CHECK (balance_before >= 0),
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS card_admin_actions_student_created_idx
  ON public.card_admin_actions(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS card_admin_actions_teacher_created_idx
  ON public.card_admin_actions(teacher_id, created_at DESC);

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
    teacher_id, student_id, action_type, amount, reason, balance_before, balance_after
  )
  VALUES (
    p_teacher_id, p_student_id,
    CASE WHEN p_amount > 0 THEN 'TICKET_AWARD' ELSE 'TICKET_REMOVAL' END,
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
    teacher_id, student_id, action_type, card_id, amount, reason,
    balance_before, balance_after
  )
  VALUES (
    p_teacher_id, p_student_id, 'CARD_REMOVAL', p_card_id, p_amount, trim(p_reason),
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

GRANT EXECUTE ON FUNCTION public.teacher_adjust_free_pull_tickets(
  uuid, uuid, integer, text
) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_remove_student_card(
  uuid, uuid, uuid, integer, text
) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_free_pull_tickets(
  uuid, uuid[], integer, text
) TO anon, authenticated;
