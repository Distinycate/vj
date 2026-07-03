-- Update team battle rewards to support top 3 ranking
-- 1st: 3 tickets (classroom) / 10 tickets (school)
-- 2nd: 2 tickets (classroom) / 7 tickets (school)
-- 3rd: 1 ticket (classroom) / 5 tickets (school)

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
  v_team record;
  v_rank integer := 1;
  v_rewarded integer := 0;
  v_reward_ticket_amount integer;
BEGIN
  SELECT * INTO v_season
  FROM public.team_battle_seasons WHERE id = p_season_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SEASON_NOT_FOUND'; END IF;
  IF v_season.status = 'REWARDED' THEN RAISE EXCEPTION 'SEASON_ALREADY_REWARDED'; END IF;

  -- Loop through top 3 teams
  FOR v_team IN (
    SELECT t.id, t.team_name, coalesce(sum(e.points), 0) as score
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
    LIMIT 3
  ) LOOP
    -- Determine reward based on scope and rank
    IF v_season.scope = 'school' THEN
      IF v_rank = 1 THEN v_reward_ticket_amount := 10;
      ELSIF v_rank = 2 THEN v_reward_ticket_amount := 7;
      ELSIF v_rank = 3 THEN v_reward_ticket_amount := 5;
      END IF;
    ELSE
      IF v_rank = 1 THEN v_reward_ticket_amount := 3;
      ELSIF v_rank = 2 THEN v_reward_ticket_amount := 2;
      ELSIF v_rank = 3 THEN v_reward_ticket_amount := 1;
      END IF;
    END IF;

    -- Distribute rewards
    INSERT INTO public.season_reward_distributions(
      season_id, team_id, student_id, ticket_amount, awarded_by_id
    )
    SELECT v_season.id, v_team.id, tm.user_id, v_reward_ticket_amount, p_teacher_id
    FROM public.team_members tm
    WHERE tm.team_id = v_team.id AND tm.is_active = true
    ON CONFLICT (season_id, student_id) DO NOTHING;
    
    -- Notifications
    INSERT INTO public.card_notifications(student_id, notification_type, title, message, data)
    SELECT tm.user_id, 'SEASON_REWARD', '🏆 รางวัล Team Battle!',
      'ยินดีด้วย! ทีม ' || v_team.team_name || ' ได้อันดับที่ ' || v_rank || ' และได้รับตั๋วสุ่มฟรี ' || v_reward_ticket_amount || ' ใบ',
      jsonb_build_object(
        'teamName', v_team.team_name, 'season', v_season.season_name, 'rank', v_rank,
        'reward', jsonb_build_object('type', 'FREE_PULL_TICKET', 'amount', v_reward_ticket_amount)
      )
    FROM public.team_members tm
    WHERE tm.team_id = v_team.id AND tm.is_active = true;

    v_rank := v_rank + 1;
  END LOOP;

  -- Apply tickets to balances (only for the newly added distributions)
  UPDATE public.learning_paths lp
  SET free_pull_tickets = lp.free_pull_tickets + rewards.ticket_amount
  FROM public.season_reward_distributions rewards
  WHERE rewards.season_id = v_season.id
    AND rewards.student_id = lp.student_id
    AND rewards.awarded_at >= transaction_timestamp();

  UPDATE public.team_battle_seasons
  SET status = 'REWARDED', is_active = false
  WHERE id = v_season.id;

  SELECT count(*) INTO v_rewarded
  FROM public.season_reward_distributions
  WHERE season_id = v_season.id;

  RETURN jsonb_build_object('season_id', v_season.id, 'rewarded_count', v_rewarded);
END;
$$;
