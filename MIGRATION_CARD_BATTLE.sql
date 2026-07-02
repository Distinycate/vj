-- Vocab Journey: Card Gacha, asynchronous card workflow, and monthly team rewards.
-- Additive migration: does not replace students, teachers, learning_paths, or team tables.
-- Run after SUPABASE_SCHEMA.sql and MIGRATION_TEAM_BATTLE.sql.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.learning_paths
  ADD COLUMN IF NOT EXISTS free_pull_tickets integer NOT NULL DEFAULT 0
  CHECK (free_pull_tickets >= 0),
  ADD COLUMN IF NOT EXISTS paid_gacha_pulls integer NOT NULL DEFAULT 0
  CHECK (paid_gacha_pulls >= 0);

CREATE TABLE IF NOT EXISTS public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  rarity text NOT NULL CHECK (rarity IN ('N', 'R', 'SR', 'SSR', 'UR')),
  drop_weight numeric(10,4) NOT NULL CHECK (drop_weight > 0),
  effect_type text NOT NULL CHECK (effect_type IN ('ATTACK', 'DEFENSE', 'REFLECT', 'BUFF', 'DUD')),
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.card_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity integer NOT NULL DEFAULT 0 CHECK (
    reserved_quantity >= 0 AND reserved_quantity <= quantity
  ),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, card_id)
);

CREATE TABLE IF NOT EXISTS public.card_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  target_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  played_card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE RESTRICT,
  counter_card_id uuid REFERENCES public.cards(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'COUNTER_PHASE', 'RESOLVED', 'REJECTED')),
  counter_deadline timestamptz,
  final_result_text text,
  approved_by_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (target_id IS NULL OR target_id <> attacker_id)
);

CREATE TABLE IF NOT EXISTS public.gacha_pulls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE RESTRICT,
  payment_type text NOT NULL CHECK (payment_type IN ('FREE_TICKET', 'COINS')),
  coin_cost integer NOT NULL DEFAULT 0 CHECK (coin_cost >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.card_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_battle_seasons
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'CLOSED', 'REWARDED')),
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS winner_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reward_ticket_amount integer NOT NULL DEFAULT 1
    CHECK (reward_ticket_amount >= 0);

CREATE TABLE IF NOT EXISTS public.season_reward_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.team_battle_seasons(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  ticket_amount integer NOT NULL CHECK (ticket_amount > 0),
  awarded_by_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, student_id)
);

CREATE INDEX IF NOT EXISTS card_inventory_student_idx
  ON public.card_inventory(student_id);
CREATE INDEX IF NOT EXISTS card_logs_attacker_status_idx
  ON public.card_logs(attacker_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS card_logs_target_status_idx
  ON public.card_logs(target_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS card_notifications_student_unread_idx
  ON public.card_notifications(student_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS team_score_events_season_team_idx
  ON public.team_score_events(season_id, team_id);

INSERT INTO public.cards
  (card_code, name, description, rarity, drop_weight, effect_type, image_url)
VALUES
  ('DUD_SALT', 'การ์ดไม่มีอะไรเลย', 'ไม่มีผลอะไร ใช้สำหรับลุ้นโชคและหมุนเวียนเหรียญในระบบ', 'N', 55, 'DUD', '🧂'),
  ('CLEAN_ROOM', 'สั่งเพื่อน 3 คน ล้างห้องน้ำ 3 ห้อง', 'เลือกเป้าหมายเพื่อลงโทษ โดยครูต้องประกาศและอนุมัติก่อนมีผลจริง', 'R', 20, 'ATTACK', '🧹'),
  ('MEDITATE_10', 'สั่งเพื่อน 1 คน นั่งสมาธิ 10 นาที', 'เลือกเป้าหมายเพื่อลงโทษ โดยครูต้องประกาศและอนุมัติก่อนมีผลจริง', 'R', 15, 'ATTACK', '🧘'),
  ('SHIELD', 'การ์ดกันแบน', 'ใช้ป้องกันการลงโทษหรือการ์ดโจมตี โดยครูเป็นผู้ตัดสินผลสุดท้าย', 'SR', 5, 'DEFENSE', '🛡️'),
  ('REFLECT', 'การ์ดย้อนกลับ', 'สะท้อนผลการลงโทษกลับไปยังผู้เริ่มใช้การ์ด โดยครูเป็นผู้ตัดสินผลสุดท้าย', 'SSR', 4, 'REFLECT', '↩️'),
  ('EARLY_HOME', 'กลับบ้านก่อน', 'สิทธิพิเศษเลิกเรียนก่อนเวลา ซึ่งจะมีผลเมื่อครูอนุมัติเท่านั้น', 'UR', 1, 'BUFF', '🏠')
ON CONFLICT (card_code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  rarity = EXCLUDED.rarity,
  drop_weight = EXCLUDED.drop_weight,
  effect_type = EXCLUDED.effect_type,
  image_url = EXCLUDED.image_url,
  is_active = true;

UPDATE public.cards
SET is_active = false
WHERE card_code = 'HELP_FRIENDS';

CREATE OR REPLACE FUNCTION public.pull_gacha_card(
  p_student_id uuid,
  p_coin_cost integer DEFAULT 500
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
BEGIN
  IF p_coin_cost < 0 THEN
    RAISE EXCEPTION 'INVALID_COIN_COST';
  END IF;

  SELECT * INTO v_path
  FROM public.learning_paths
  WHERE student_id = p_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEARNING_PATH_NOT_FOUND';
  END IF;

  IF v_path.free_pull_tickets > 0 THEN
    UPDATE public.learning_paths
    SET free_pull_tickets = free_pull_tickets - 1
    WHERE student_id = p_student_id;
    v_payment := 'FREE_TICKET';
  ELSIF v_path.coins >= p_coin_cost THEN
    UPDATE public.learning_paths
    SET coins = coins - p_coin_cost,
        paid_gacha_pulls = paid_gacha_pulls + 1
    WHERE student_id = p_student_id
    RETURNING paid_gacha_pulls INTO v_paid_pull_count;
    INSERT INTO public.coins_transactions(student_id, amount, source)
    VALUES (p_student_id, -p_coin_cost, 'CARD_GACHA_PULL');
    v_payment := 'COINS';
    v_is_pity := (v_paid_pull_count % 10 = 0);
  ELSE
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  SELECT sum(drop_weight) INTO v_total_weight
  FROM public.cards
  WHERE is_active = true
    AND (NOT v_is_pity OR effect_type <> 'DUD');
  IF coalesce(v_total_weight, 0) <= 0 THEN
    RAISE EXCEPTION 'NO_ACTIVE_CARDS';
  END IF;

  v_roll := random() * v_total_weight;
  SELECT c.* INTO v_card
  FROM public.cards c
  WHERE c.is_active = true
  ORDER BY c.id
  LIMIT 1;

  SELECT c.* INTO v_card
  FROM public.cards c
  WHERE c.id = (
    SELECT picked.id
    FROM (
    SELECT c.id, sum(c.drop_weight) OVER (ORDER BY c.id) AS cumulative_weight
    FROM public.cards c
    WHERE c.is_active = true
      AND (NOT v_is_pity OR c.effect_type <> 'DUD')
    ) picked
    WHERE picked.cumulative_weight >= v_roll
    ORDER BY picked.cumulative_weight
    LIMIT 1
  );

  INSERT INTO public.card_inventory(student_id, card_id, quantity)
  VALUES (p_student_id, v_card.id, 1)
  ON CONFLICT (student_id, card_id)
  DO UPDATE SET
    quantity = public.card_inventory.quantity + 1,
    updated_at = now();

  INSERT INTO public.gacha_pulls(student_id, card_id, payment_type, coin_cost)
  VALUES (
    p_student_id,
    v_card.id,
    v_payment,
    CASE WHEN v_payment = 'COINS' THEN p_coin_cost ELSE 0 END
  );

  RETURN jsonb_build_object(
    'card', to_jsonb(v_card),
    'payment_type', v_payment,
    'is_pity', v_is_pity,
    'paid_gacha_pulls', (
      SELECT paid_gacha_pulls FROM public.learning_paths WHERE student_id = p_student_id
    ),
    'coins', (SELECT coins FROM public.learning_paths WHERE student_id = p_student_id),
    'free_pull_tickets', (
      SELECT free_pull_tickets FROM public.learning_paths WHERE student_id = p_student_id
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_card_action(
  p_attacker_id uuid,
  p_card_id uuid,
  p_target_id uuid DEFAULT NULL
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
  IF v_card.effect_type IN ('ATTACK') AND p_target_id IS NULL THEN
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

  INSERT INTO public.card_logs(attacker_id, target_id, played_card_id)
  VALUES (p_attacker_id, p_target_id, p_card_id)
  RETURNING * INTO v_log;
  RETURN v_log;
END;
$$;

CREATE OR REPLACE FUNCTION public.announce_card_action(
  p_log_id uuid,
  p_teacher_id uuid,
  p_counter_seconds integer DEFAULT 1800
) RETURNS public.card_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_log public.card_logs%ROWTYPE;
BEGIN
  IF p_counter_seconds < 60 OR p_counter_seconds > 3600 THEN
    RAISE EXCEPTION 'INVALID_COUNTER_WINDOW';
  END IF;
  UPDATE public.card_logs
  SET status = 'COUNTER_PHASE',
      approved_by_id = p_teacher_id,
      counter_deadline = CASE WHEN target_id IS NULL THEN now() ELSE now() + make_interval(secs => p_counter_seconds) END,
      updated_at = now()
  WHERE id = p_log_id AND status = 'PENDING'
  RETURNING * INTO v_log;
  IF NOT FOUND THEN RAISE EXCEPTION 'LOG_NOT_PENDING'; END IF;

  IF v_log.target_id IS NOT NULL THEN
    INSERT INTO public.card_notifications(student_id, notification_type, title, message, data)
    VALUES (
      v_log.target_id, 'CARD_COUNTER_PHASE', '🚨 คุณถูกใช้การ์ด!',
      'คุณมีเวลา 30 นาทีในการใช้การ์ดกันแบนหรือการ์ดย้อนกลับ',
      jsonb_build_object('card_log_id', v_log.id, 'counter_deadline', v_log.counter_deadline)
    );
  END IF;
  RETURN v_log;
END;
$$;

CREATE OR REPLACE FUNCTION public.counter_card_action(
  p_log_id uuid,
  p_target_id uuid,
  p_counter_card_id uuid
) RETURNS public.card_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log public.card_logs%ROWTYPE;
  v_card public.cards%ROWTYPE;
  v_inventory public.card_inventory%ROWTYPE;
BEGIN
  SELECT * INTO v_log FROM public.card_logs WHERE id = p_log_id FOR UPDATE;
  IF NOT FOUND OR v_log.status <> 'COUNTER_PHASE' THEN RAISE EXCEPTION 'COUNTER_PHASE_CLOSED'; END IF;
  IF v_log.target_id IS DISTINCT FROM p_target_id THEN RAISE EXCEPTION 'NOT_ACTION_TARGET'; END IF;
  IF v_log.counter_deadline IS NULL OR now() > v_log.counter_deadline THEN
    RAISE EXCEPTION 'COUNTER_DEADLINE_EXPIRED';
  END IF;
  IF v_log.counter_card_id IS NOT NULL THEN RAISE EXCEPTION 'COUNTER_ALREADY_USED'; END IF;

  SELECT * INTO v_card FROM public.cards WHERE id = p_counter_card_id AND is_active = true;
  IF NOT FOUND OR v_card.effect_type NOT IN ('DEFENSE', 'REFLECT') THEN
    RAISE EXCEPTION 'INVALID_COUNTER_CARD';
  END IF;
  SELECT * INTO v_inventory
  FROM public.card_inventory
  WHERE student_id = p_target_id AND card_id = p_counter_card_id
  FOR UPDATE;
  IF NOT FOUND OR v_inventory.quantity - v_inventory.reserved_quantity < 1 THEN
    RAISE EXCEPTION 'COUNTER_CARD_NOT_AVAILABLE';
  END IF;

  UPDATE public.card_inventory
  SET reserved_quantity = reserved_quantity + 1, updated_at = now()
  WHERE id = v_inventory.id;
  UPDATE public.card_logs
  SET counter_card_id = p_counter_card_id, updated_at = now()
  WHERE id = p_log_id
  RETURNING * INTO v_log;
  RETURN v_log;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_card_action(
  p_log_id uuid,
  p_teacher_id uuid,
  p_approve boolean,
  p_final_result_text text DEFAULT NULL
) RETURNS public.card_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_log public.card_logs%ROWTYPE;
BEGIN
  SELECT * INTO v_log FROM public.card_logs WHERE id = p_log_id FOR UPDATE;
  IF NOT FOUND OR v_log.status NOT IN ('PENDING', 'COUNTER_PHASE') THEN
    RAISE EXCEPTION 'LOG_ALREADY_FINAL';
  END IF;
  IF p_approve AND v_log.status <> 'COUNTER_PHASE' THEN
    RAISE EXCEPTION 'ACTION_NOT_ANNOUNCED';
  END IF;

  IF p_approve THEN
    UPDATE public.card_inventory
    SET quantity = quantity - 1, reserved_quantity = reserved_quantity - 1, updated_at = now()
    WHERE student_id = v_log.attacker_id AND card_id = v_log.played_card_id
      AND quantity >= 1 AND reserved_quantity >= 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'PLAYED_CARD_RESERVATION_MISSING'; END IF;

    IF v_log.counter_card_id IS NOT NULL THEN
      UPDATE public.card_inventory
      SET quantity = quantity - 1, reserved_quantity = reserved_quantity - 1, updated_at = now()
      WHERE student_id = v_log.target_id AND card_id = v_log.counter_card_id
        AND quantity >= 1 AND reserved_quantity >= 1;
      IF NOT FOUND THEN RAISE EXCEPTION 'COUNTER_CARD_RESERVATION_MISSING'; END IF;
    END IF;
  ELSE
    UPDATE public.card_inventory
    SET reserved_quantity = reserved_quantity - 1, updated_at = now()
    WHERE student_id = v_log.attacker_id AND card_id = v_log.played_card_id
      AND reserved_quantity >= 1;
    IF v_log.counter_card_id IS NOT NULL THEN
      UPDATE public.card_inventory
      SET reserved_quantity = reserved_quantity - 1, updated_at = now()
      WHERE student_id = v_log.target_id AND card_id = v_log.counter_card_id
        AND reserved_quantity >= 1;
    END IF;
  END IF;

  UPDATE public.card_logs
  SET status = CASE WHEN p_approve THEN 'RESOLVED' ELSE 'REJECTED' END,
      approved_by_id = p_teacher_id,
      approved_at = now(),
      final_result_text = coalesce(
        nullif(trim(p_final_result_text), ''),
        CASE WHEN p_approve THEN 'ครูอนุมัติผลการใช้การ์ด' ELSE 'ครูไม่อนุมัติและคืนการ์ดแล้ว' END
      ),
      updated_at = now()
  WHERE id = p_log_id
  RETURNING * INTO v_log;

  INSERT INTO public.card_notifications(student_id, notification_type, title, message, data)
  SELECT recipient, 'CARD_RESULT',
    CASE WHEN p_approve THEN 'ผลการใช้การ์ดได้รับการยืนยัน' ELSE 'การ์ดถูกคืนเข้าคลัง' END,
    v_log.final_result_text,
    jsonb_build_object('card_log_id', v_log.id, 'status', v_log.status)
  FROM (
    SELECT v_log.attacker_id AS recipient
    UNION
    SELECT v_log.target_id WHERE v_log.target_id IS NOT NULL
  ) recipients;
  RETURN v_log;
END;
$$;

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
DECLARE v_count integer;
BEGIN
  IF p_amount <= 0 OR p_amount > 100 THEN RAISE EXCEPTION 'INVALID_TICKET_AMOUNT'; END IF;
  UPDATE public.learning_paths
  SET free_pull_tickets = free_pull_tickets + p_amount
  WHERE student_id = ANY(p_student_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.card_notifications(student_id, notification_type, title, message, data)
  SELECT unnest(p_student_ids), 'TEACHER_TICKET_REWARD', '🎟️ ได้รับตั๋วสุ่มฟรี',
    coalesce(nullif(trim(p_reason), ''), 'ครูมอบรางวัล') || ' +' || p_amount,
    jsonb_build_object('amount', p_amount, 'awarded_by_id', p_teacher_id);
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_and_reward_team_season(
  p_season_id uuid,
  p_teacher_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season public.team_battle_seasons%ROWTYPE;
  v_winner_id uuid;
  v_winner_name text;
  v_score numeric;
  v_rewarded integer;
BEGIN
  SELECT * INTO v_season
  FROM public.team_battle_seasons WHERE id = p_season_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SEASON_NOT_FOUND'; END IF;
  IF v_season.status = 'REWARDED' THEN RAISE EXCEPTION 'SEASON_ALREADY_REWARDED'; END IF;

  SELECT t.id, t.team_name, coalesce(sum(e.points), 0)
  INTO v_winner_id, v_winner_name, v_score
  FROM public.teams t
  LEFT JOIN public.team_score_events e
    ON e.team_id = t.id AND e.season_id = v_season.id
  WHERE t.is_active = true
    AND (
      (v_season.scope = 'school' AND t.team_type = 'school')
      OR (v_season.scope = 'classroom' AND t.classroom_id = v_season.classroom_id)
      OR (v_season.scope = 'grade' AND t.grade_level = v_season.grade_level)
    )
  GROUP BY t.id, t.team_name
  ORDER BY coalesce(sum(e.points), 0) DESC, t.id
  LIMIT 1;
  IF v_winner_id IS NULL THEN RAISE EXCEPTION 'NO_ELIGIBLE_TEAM'; END IF;

  INSERT INTO public.season_reward_distributions(
    season_id, team_id, student_id, ticket_amount, awarded_by_id
  )
  SELECT v_season.id, v_winner_id, tm.user_id, v_season.reward_ticket_amount, p_teacher_id
  FROM public.team_members tm
  WHERE tm.team_id = v_winner_id AND tm.is_active = true
  ON CONFLICT (season_id, student_id) DO NOTHING;
  GET DIAGNOSTICS v_rewarded = ROW_COUNT;

  UPDATE public.learning_paths lp
  SET free_pull_tickets = lp.free_pull_tickets + rewards.ticket_amount
  FROM public.season_reward_distributions rewards
  WHERE rewards.season_id = v_season.id
    AND rewards.student_id = lp.student_id
    AND rewards.awarded_at >= transaction_timestamp();

  INSERT INTO public.card_notifications(student_id, notification_type, title, message, data)
  SELECT student_id, 'SEASON_REWARD', '🏆 ชัยชนะประจำเดือน!',
    'ยินดีด้วย! ทีม ' || v_winner_name || ' ชนะฤดูกาลและได้รับตั๋วสุ่มฟรี',
    jsonb_build_object(
      'teamName', v_winner_name, 'season', v_season.season_name,
      'reward', jsonb_build_object('type', 'FREE_PULL_TICKET', 'amount', ticket_amount)
    )
  FROM public.season_reward_distributions
  WHERE season_id = v_season.id AND awarded_at >= transaction_timestamp();

  UPDATE public.team_battle_seasons
  SET is_active = false, status = 'REWARDED', closed_at = now(),
      winner_team_id = v_winner_id
  WHERE id = v_season.id;

  RETURN jsonb_build_object(
    'season_id', v_season.id, 'winner_team_id', v_winner_id,
    'winner_team_name', v_winner_name, 'score', v_score,
    'rewarded_members', v_rewarded,
    'ticket_amount', v_season.reward_ticket_amount
  );
END;
$$;

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gacha_pulls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_reward_distributions ENABLE ROW LEVEL SECURITY;

-- The current internal-school app uses the anon client and its existing direct-login model.
-- RPC functions own mutations; these policies preserve the same read model without changing auth.
DROP POLICY IF EXISTS "Internal read cards" ON public.cards;
CREATE POLICY "Internal read cards" ON public.cards FOR SELECT USING (true);
DROP POLICY IF EXISTS "Internal read card inventory" ON public.card_inventory;
CREATE POLICY "Internal read card inventory" ON public.card_inventory FOR SELECT USING (true);
DROP POLICY IF EXISTS "Internal read card logs" ON public.card_logs;
CREATE POLICY "Internal read card logs" ON public.card_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Internal read gacha pulls" ON public.gacha_pulls;
CREATE POLICY "Internal read gacha pulls" ON public.gacha_pulls FOR SELECT USING (true);
DROP POLICY IF EXISTS "Internal read card notifications" ON public.card_notifications;
CREATE POLICY "Internal read card notifications" ON public.card_notifications FOR SELECT USING (true);
DROP POLICY IF EXISTS "Internal update card notifications" ON public.card_notifications;
CREATE POLICY "Internal update card notifications" ON public.card_notifications FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Internal read season rewards" ON public.season_reward_distributions;
CREATE POLICY "Internal read season rewards" ON public.season_reward_distributions FOR SELECT USING (true);

GRANT EXECUTE ON FUNCTION public.pull_gacha_card(uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_card_action(uuid, uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.announce_card_action(uuid, uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.counter_card_action(uuid, uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_card_action(uuid, uuid, boolean, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_free_pull_tickets(uuid, uuid[], integer, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_and_reward_team_season(uuid, uuid) TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'card_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.card_logs;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'card_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.card_notifications;
  END IF;
END $$;
