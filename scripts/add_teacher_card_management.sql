CREATE OR REPLACE FUNCTION public.teacher_remove_student_card(
  p_teacher_id uuid,
  p_student_id uuid,
  p_card_id uuid,
  p_amount integer DEFAULT 1
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify teacher exists
  IF NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = p_teacher_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  -- Verify student has the card
  IF NOT EXISTS (
    SELECT 1 FROM public.card_inventory 
    WHERE student_id = p_student_id AND card_id = p_card_id AND quantity >= p_amount
  ) THEN
    RAISE EXCEPTION 'INSUFFICIENT_CARDS';
  END IF;

  -- Deduct card
  UPDATE public.card_inventory
  SET quantity = GREATEST(0, quantity - p_amount),
      updated_at = now()
  WHERE student_id = p_student_id AND card_id = p_card_id;
END;
$$;
