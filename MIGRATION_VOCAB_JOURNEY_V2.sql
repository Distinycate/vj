-- Vocab Journey V2 Expansion Migration
-- Features: Cross-classroom cards, Thief Cards, 1-3 Stars Stages, Realtime Rank Support

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Schools Table & Linkage
CREATE TABLE IF NOT EXISTS public.schools (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL UNIQUE,
    allow_cross_class_cards boolean DEFAULT true,
    allow_random_thief boolean DEFAULT true,
    allow_master_thief boolean DEFAULT true,
    card_theft_daily_limit integer DEFAULT 1,
    theft_protection_hours integer DEFAULT 24,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert a default school for existing users
INSERT INTO public.schools (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default School')
ON CONFLICT (name) DO NOTHING;

-- Add school_id to existing tables
ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.classrooms
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL DEFAULT '00000000-0000-0000-0000-000000000001',
ADD COLUMN IF NOT EXISTS theft_protection_until timestamp with time zone;

-- 2. Card Table Enhancements
ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS target_scope text DEFAULT 'classroom' CHECK (target_scope IN ('self', 'classroom', 'school')),
ADD COLUMN IF NOT EXISTS is_stealable boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_bound boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cooldown_hours integer DEFAULT 0;

-- Adjust existing cards
UPDATE public.cards SET is_stealable = false, is_bound = true, target_scope = 'self' WHERE effect_type = 'DEFENSE';
UPDATE public.cards SET is_stealable = true, is_bound = false, target_scope = 'classroom' WHERE effect_type = 'ATTACK';
UPDATE public.cards SET is_stealable = false, target_scope = 'self' WHERE effect_type = 'DUD';
UPDATE public.cards SET is_stealable = false, target_scope = 'self' WHERE effect_type = 'BUFF';

-- Add Thief Cards
INSERT INTO public.cards (card_code, name, description, rarity, drop_weight, effect_type, image_url, target_scope, is_stealable, is_bound, cooldown_hours)
VALUES 
    ('THIEF_RANDOM', 'การ์ดขโมยการ์ด', 'สุ่มขโมยการ์ดที่สามารถขโมยได้ 1 ใบ จากผู้เล่น 1 คนแบบสุ่มในโรงเรียนเดียวกัน', 'SR', 10, 'ATTACK', '🎭', 'school', false, true, 0),
    ('THIEF_MASTER', 'การ์ดขโมยมืออาชีพ', 'เลือกผู้เล่นในโรงเรียน 1 คน และเลือกการ์ดของเขาเพื่อขโมย 1 ใบ', 'UR', 2, 'ATTACK', '🕵️‍♂️', 'school', false, true, 24)
ON CONFLICT (card_code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    rarity = EXCLUDED.rarity,
    drop_weight = EXCLUDED.drop_weight,
    effect_type = EXCLUDED.effect_type,
    image_url = EXCLUDED.image_url,
    target_scope = EXCLUDED.target_scope,
    is_stealable = EXCLUDED.is_stealable,
    is_bound = EXCLUDED.is_bound,
    cooldown_hours = EXCLUDED.cooldown_hours,
    is_active = true;

-- 3. Card Transactions Audit Log
CREATE TABLE IF NOT EXISTS public.card_transactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type text NOT NULL,
    actor_user_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
    target_user_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
    card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
    source_inventory_id uuid REFERENCES public.card_inventory(id) ON DELETE SET NULL,
    destination_inventory_id uuid REFERENCES public.card_inventory(id) ON DELETE SET NULL,
    school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
    classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Rank & Stage Progress Enhancements
ALTER TABLE public.learning_paths
ADD COLUMN IF NOT EXISTS rank_score numeric(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS rank_updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

ALTER TABLE public.stage_results
ADD COLUMN IF NOT EXISTS stars integer DEFAULT 0 CHECK (stars BETWEEN 0 AND 3);

-- Update existing records to 1 star for legacy passed stages (assuming score >= 75 is a pass)
UPDATE public.stage_results 
SET stars = 1 
WHERE stars = 0 AND score >= 75;

ALTER TABLE public.rank_history
ADD COLUMN IF NOT EXISTS rank_score numeric(5,2) DEFAULT 0.00;

-- 5. RLS Policies
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read schools" ON public.schools;
CREATE POLICY "Anyone can read schools" ON public.schools FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage schools" ON public.schools;
CREATE POLICY "Admins can manage schools" ON public.schools FOR ALL USING (
    EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = auth.uid() AND t.role = 'ADMIN')
);

DROP POLICY IF EXISTS "Internal read card transactions" ON public.card_transactions;
CREATE POLICY "Internal read card transactions" ON public.card_transactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Internal insert card transactions" ON public.card_transactions;
CREATE POLICY "Internal insert card transactions" ON public.card_transactions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Students can read own transactions" ON public.card_transactions;
CREATE POLICY "Students can read own transactions" ON public.card_transactions FOR SELECT USING (actor_user_id = auth.uid() OR target_user_id = auth.uid());

-- 6. RPC: Execute Random Thief
CREATE OR REPLACE FUNCTION public.execute_random_thief(
    p_attacker_id uuid,
    p_thief_card_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_attacker public.students%ROWTYPE;
    v_thief_inventory public.card_inventory%ROWTYPE;
    v_school public.schools%ROWTYPE;
    v_target RECORD;
    v_stolen_inventory RECORD;
    v_transaction_id uuid;
    v_today_thefts integer;
BEGIN
    -- 1. Validate Attacker & Card
    SELECT * INTO v_attacker FROM public.students WHERE id = p_attacker_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'ATTACKER_NOT_FOUND'; END IF;

    SELECT * INTO v_school FROM public.schools WHERE id = v_attacker.school_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'SCHOOL_NOT_FOUND'; END IF;

    IF NOT v_school.allow_random_thief THEN
        RAISE EXCEPTION 'RANDOM_THIEF_DISABLED';
    END IF;

    SELECT * INTO v_thief_inventory FROM public.card_inventory
    WHERE student_id = p_attacker_id AND card_id = p_thief_card_id FOR UPDATE;
    
    IF NOT FOUND OR v_thief_inventory.quantity - v_thief_inventory.reserved_quantity < 1 THEN
        RAISE EXCEPTION 'THIEF_CARD_NOT_AVAILABLE';
    END IF;

    -- 2. Find eligible targets
    SELECT s.id as target_id, s.classroom_id, s.theft_protection_until
    INTO v_target
    FROM public.students s
    WHERE s.school_id = v_attacker.school_id
      AND s.id != p_attacker_id
      AND (s.theft_protection_until IS NULL OR s.theft_protection_until < now())
      AND (
          SELECT count(*) FROM public.card_transactions ct
          WHERE ct.action_type IN ('random_card_stolen', 'selected_card_stolen')
            AND ct.target_user_id = s.id
            AND ct.created_at >= date_trunc('day', now())
      ) < v_school.card_theft_daily_limit
      AND EXISTS (
          SELECT 1 FROM public.card_inventory ci
          JOIN public.cards c ON ci.card_id = c.id
          WHERE ci.student_id = s.id
            AND ci.quantity > 0
            AND c.is_stealable = true
            AND c.is_bound = false
      )
    ORDER BY random()
    LIMIT 1;

    IF v_target IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'NO_ELIGIBLE_TARGETS');
    END IF;

    -- 3. Randomly select 1 stealable card from target
    SELECT ci.id as inventory_id, ci.card_id, c.name as card_name
    INTO v_stolen_inventory
    FROM public.card_inventory ci
    JOIN public.cards c ON ci.card_id = c.id
    WHERE ci.student_id = v_target.target_id
      AND ci.quantity > 0
      AND c.is_stealable = true
      AND c.is_bound = false
    ORDER BY random()
    LIMIT 1;

    -- 4. Execute atomic transfer
    UPDATE public.card_inventory
    SET quantity = quantity - 1, updated_at = now()
    WHERE id = v_thief_inventory.id;

    UPDATE public.card_inventory
    SET quantity = quantity - 1, updated_at = now()
    WHERE id = v_stolen_inventory.inventory_id;

    INSERT INTO public.card_inventory (student_id, card_id, quantity)
    VALUES (p_attacker_id, v_stolen_inventory.card_id, 1)
    ON CONFLICT (student_id, card_id) DO UPDATE
    SET quantity = public.card_inventory.quantity + 1, updated_at = now();

    UPDATE public.students
    SET theft_protection_until = now() + (v_school.theft_protection_hours || ' hours')::interval
    WHERE id = v_target.target_id;

    -- 5. Logging
    INSERT INTO public.card_transactions (
        action_type, actor_user_id, target_user_id, card_id, school_id, classroom_id, metadata
    ) VALUES (
        'random_card_stolen', p_attacker_id, v_target.target_id, v_stolen_inventory.card_id, v_school.id, v_target.classroom_id,
        jsonb_build_object('thief_card_id', p_thief_card_id, 'stolen_card_name', v_stolen_inventory.card_name)
    ) RETURNING id INTO v_transaction_id;

    INSERT INTO public.card_notifications(student_id, notification_type, title, message, data)
    VALUES 
        (p_attacker_id, 'CARD_THEFT_SUCCESS', '🎭 สุ่มขโมยการ์ดสำเร็จ', 'คุณสุ่มขโมย ' || v_stolen_inventory.card_name || ' สำเร็จ', jsonb_build_object('card_id', v_stolen_inventory.card_id, 'card_name', v_stolen_inventory.card_name)),
        (v_target.target_id, 'CARD_THEFT_VICTIM', '🚨 การ์ดของคุณถูกขโมยไป 1 ใบ', 'การ์ดที่สูญเสีย: ' || v_stolen_inventory.card_name, jsonb_build_object('card_id', v_stolen_inventory.card_id, 'card_name', v_stolen_inventory.card_name));

    RETURN jsonb_build_object(
        'success', true, 
        'stolen_card_id', v_stolen_inventory.card_id,
        'stolen_card_name', v_stolen_inventory.card_name,
        'target_id', v_target.target_id
    );
END;
$$;

-- 7. RPC: Execute Master Thief
CREATE OR REPLACE FUNCTION public.execute_master_thief(
    p_attacker_id uuid,
    p_target_id uuid,
    p_thief_card_id uuid,
    p_target_card_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_attacker public.students%ROWTYPE;
    v_target public.students%ROWTYPE;
    v_thief_inventory public.card_inventory%ROWTYPE;
    v_school public.schools%ROWTYPE;
    v_stolen_inventory RECORD;
    v_stolen_card public.cards%ROWTYPE;
    v_transaction_id uuid;
    v_today_thefts integer;
    v_recent_master_theft integer;
    v_total_cards integer;
BEGIN
    -- 1. Validate Attacker & Target
    SELECT * INTO v_attacker FROM public.students WHERE id = p_attacker_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'ATTACKER_NOT_FOUND'; END IF;

    SELECT * INTO v_target FROM public.students WHERE id = p_target_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'TARGET_NOT_FOUND'; END IF;

    IF v_attacker.school_id != v_target.school_id THEN
        RAISE EXCEPTION 'TARGET_NOT_IN_SAME_SCHOOL';
    END IF;

    SELECT * INTO v_school FROM public.schools WHERE id = v_attacker.school_id;
    IF NOT v_school.allow_master_thief THEN
        RAISE EXCEPTION 'MASTER_THIEF_DISABLED';
    END IF;

    -- Cooldown check
    SELECT count(*) INTO v_recent_master_theft
    FROM public.card_transactions
    WHERE actor_user_id = p_attacker_id 
      AND action_type = 'selected_card_stolen'
      AND created_at >= now() - interval '24 hours';
    IF v_recent_master_theft > 0 THEN
        RAISE EXCEPTION 'COOLDOWN_ACTIVE';
    END IF;

    -- 7 day rule check
    SELECT count(*) INTO v_recent_master_theft
    FROM public.card_transactions
    WHERE actor_user_id = p_attacker_id
      AND target_user_id = p_target_id
      AND action_type IN ('selected_card_stolen', 'random_card_stolen')
      AND created_at >= now() - interval '7 days';
    IF v_recent_master_theft > 0 THEN
        RAISE EXCEPTION 'TARGET_ON_COOLDOWN';
    END IF;

    IF v_target.theft_protection_until IS NOT NULL AND v_target.theft_protection_until > now() THEN
        RAISE EXCEPTION 'TARGET_IS_PROTECTED';
    END IF;

    SELECT count(*) INTO v_today_thefts FROM public.card_transactions ct
    WHERE ct.action_type IN ('random_card_stolen', 'selected_card_stolen')
      AND ct.target_user_id = p_target_id
      AND ct.created_at >= date_trunc('day', now());
    IF v_today_thefts >= v_school.card_theft_daily_limit THEN
        RAISE EXCEPTION 'TARGET_DAILY_LIMIT_REACHED';
    END IF;

    -- 2. Validate Cards
    SELECT * INTO v_thief_inventory FROM public.card_inventory
    WHERE student_id = p_attacker_id AND card_id = p_thief_card_id FOR UPDATE;
    
    IF NOT FOUND OR v_thief_inventory.quantity - v_thief_inventory.reserved_quantity < 1 THEN
        RAISE EXCEPTION 'THIEF_CARD_NOT_AVAILABLE';
    END IF;

    SELECT * INTO v_stolen_card FROM public.cards WHERE id = p_target_card_id;
    IF NOT v_stolen_card.is_stealable OR v_stolen_card.is_bound THEN
        RAISE EXCEPTION 'CARD_NOT_STEALABLE';
    END IF;

    SELECT ci.id as inventory_id, ci.card_id, ci.quantity
    INTO v_stolen_inventory
    FROM public.card_inventory ci
    WHERE ci.student_id = p_target_id AND ci.card_id = p_target_card_id;

    SELECT coalesce(sum(quantity), 0) INTO v_total_cards
    FROM public.card_inventory WHERE student_id = p_target_id;
    IF v_total_cards <= 1 THEN
        RAISE EXCEPTION 'TARGET_HAS_ONLY_ONE_CARD';
    END IF;

    IF v_stolen_inventory IS NULL OR v_stolen_inventory.quantity < 1 THEN
        RAISE EXCEPTION 'TARGET_DOES_NOT_HAVE_CARD';
    END IF;

    -- 3. Execute transfer
    UPDATE public.card_inventory
    SET quantity = quantity - 1, updated_at = now()
    WHERE id = v_thief_inventory.id;

    UPDATE public.card_inventory
    SET quantity = quantity - 1, updated_at = now()
    WHERE id = v_stolen_inventory.inventory_id;

    INSERT INTO public.card_inventory (student_id, card_id, quantity)
    VALUES (p_attacker_id, p_target_card_id, 1)
    ON CONFLICT (student_id, card_id) DO UPDATE
    SET quantity = public.card_inventory.quantity + 1, updated_at = now();

    UPDATE public.students
    SET theft_protection_until = now() + (v_school.theft_protection_hours || ' hours')::interval
    WHERE id = p_target_id;

    -- 4. Logging
    INSERT INTO public.card_transactions (
        action_type, actor_user_id, target_user_id, card_id, school_id, classroom_id, metadata
    ) VALUES (
        'selected_card_stolen', p_attacker_id, p_target_id, p_target_card_id, v_school.id, v_target.classroom_id,
        jsonb_build_object('thief_card_id', p_thief_card_id, 'stolen_card_name', v_stolen_card.name)
    ) RETURNING id INTO v_transaction_id;

    INSERT INTO public.card_notifications(student_id, notification_type, title, message, data)
    VALUES 
        (p_attacker_id, 'CARD_THEFT_SUCCESS', '🕵️‍♂️ ขโมยมืออาชีพสำเร็จ', 'คุณขโมย ' || v_stolen_card.name || ' จาก ' || v_target.student_name || ' สำเร็จ', jsonb_build_object('card_id', p_target_card_id, 'card_name', v_stolen_card.name)),
        (p_target_id, 'CARD_THEFT_VICTIM', '🚨 การ์ดของคุณถูกขโมยไป 1 ใบ', 'การ์ดที่สูญเสีย: ' || v_stolen_card.name, jsonb_build_object('card_id', p_target_card_id, 'card_name', v_stolen_card.name));

    RETURN jsonb_build_object(
        'success', true, 
        'stolen_card_id', p_target_card_id,
        'stolen_card_name', v_stolen_card.name
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_random_thief(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_master_thief(uuid, uuid, uuid, uuid) TO anon, authenticated;
