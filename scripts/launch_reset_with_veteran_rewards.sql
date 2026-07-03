-- Vocab Journey: Launch Reset & Veteran Rewards Script
-- This script resets all gameplay progression while keeping accounts intact.
-- It grants existing users (who participated in the beta/trial) a Veteran Reward.

BEGIN;

-- 1. Clear operational analytics and logs
TRUNCATE TABLE public.student_analytics CASCADE;
TRUNCATE TABLE public.item_analysis CASCADE;
TRUNCATE TABLE public.wrong_words CASCADE;
TRUNCATE TABLE public.student_answers CASCADE;
TRUNCATE TABLE public.stage_logs CASCADE;
TRUNCATE TABLE public.card_notifications CASCADE;
TRUNCATE TABLE public.card_logs CASCADE;

-- 2. Clear inventory and shop purchases
TRUNCATE TABLE public.inventory CASCADE;
TRUNCATE TABLE public.student_purchases CASCADE;

-- 3. Clear Team Battle Data
-- This also deletes team_members, team_score_events, and season_reward_distributions via CASCADE (if configured)
-- but to be safe, truncate them explicitly.
TRUNCATE TABLE public.team_score_events CASCADE;
TRUNCATE TABLE public.season_reward_distributions CASCADE;
TRUNCATE TABLE public.team_members CASCADE;
TRUNCATE TABLE public.teams CASCADE;
TRUNCATE TABLE public.team_battle_seasons CASCADE;

-- 4. Clear Coin Transactions
TRUNCATE TABLE public.coins_transactions CASCADE;

-- 5. Reset Learning Paths & Grant Veteran Rewards
-- Instead of truncating learning_paths, we reset the progress to stage 1.
-- For every existing student, grant 1000 coins and 5 tickets.
UPDATE public.learning_paths
SET 
  current_stage = 1,
  current_rank = 1,
  exp = 0,
  total_exp = 0,
  coins = 1000,
  free_pull_tickets = 5,
  paid_gacha_pulls = 0,
  streak_days = 0,
  last_active_date = NULL;

-- Log the veteran rewards
INSERT INTO public.coins_transactions (student_id, amount, source)
SELECT student_id, 1000, 'VETERAN_REWARD'
FROM public.learning_paths;

-- Grant notification for veteran reward
INSERT INTO public.card_notifications (student_id, notification_type, title, message, data)
SELECT student_id, 'SYSTEM', 'ขอบคุณที่ร่วมทดสอบ Vocab Journey! 🎉',
  'ระบบได้ทำการรีเซ็ตด่านเริ่มต้นใหม่ทั้งหมด แต่คุณได้รับของขวัญเริ่มต้น 1,000 Coins และตั๋วสุ่ม 5 ใบ',
  jsonb_build_object('coins', 1000, 'tickets', 5)
FROM public.learning_paths;

COMMIT;

-- Notice: Accounts (public.students and public.teachers) are kept intact.
