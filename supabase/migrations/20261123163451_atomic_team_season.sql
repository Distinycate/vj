-- Install-only. No seasons, tickets or inventories change until an admin calls these RPCs.
BEGIN;
CREATE OR REPLACE FUNCTION public.open_school_team_season_v2(p_name text)
RETURNS public.team_battle_seasons LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_season public.team_battle_seasons%ROWTYPE;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'INVALID_SEASON_NAME'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('school-team-season'));
  UPDATE public.team_battle_seasons SET status = 'CLOSED', is_active = false, closed_at = now()
    WHERE scope = 'school' AND is_active = true;
  INSERT INTO public.team_battle_seasons (season_name, scope, status, is_active, start_at, end_at)
    VALUES (trim(p_name), 'school', 'ACTIVE', true, now(), now() + interval '30 days') RETURNING * INTO v_season;
  RETURN v_season;
END $$;
CREATE OR REPLACE FUNCTION public.close_team_season_v2(p_season_id uuid, p_actor_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_season public.team_battle_seasons%ROWTYPE;
  v_team record; v_member record; v_card record;
  v_tickets integer; v_penalty integer; v_removed integer; v_take integer;
  v_rewards jsonb := '[]'::jsonb; v_penalties jsonb := '[]'::jsonb;
  v_penalized uuid[] := ARRAY[]::uuid[];
BEGIN
  IF p_actor_id IS NULL THEN RAISE EXCEPTION 'ACTOR_REQUIRED'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('school-team-season'));
  SELECT * INTO v_season FROM public.team_battle_seasons WHERE id = p_season_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SEASON_NOT_FOUND'; END IF;
  IF v_season.status = 'REWARDED' THEN
    RETURN jsonb_build_object('success',true,'alreadyClosed',true,'rewards',v_rewards,'penalties',v_penalties);
  END IF;
  FOR v_team IN
    WITH scores AS (
      SELECT t.id,t.team_name,coalesce(sum(e.points),0) AS score
      FROM public.teams t
      LEFT JOIN public.team_score_events e ON e.team_id=t.id AND e.season_id=v_season.id
      WHERE t.is_active AND (
        (v_season.scope='school' AND t.team_type='school')
        OR (v_season.scope='classroom' AND t.team_type='class' AND t.classroom_id=v_season.classroom_id)
        OR (v_season.scope='grade' AND t.team_type='class' AND t.grade_level=v_season.grade_level)
      )
      GROUP BY t.id,t.team_name
    ) SELECT *, row_number() OVER (ORDER BY score DESC,id) AS place,
      count(*) OVER () AS teams_count FROM scores ORDER BY place
  LOOP
    v_tickets := CASE WHEN v_team.place <= 3 THEN
      CASE WHEN v_season.scope='school' THEN (ARRAY[10,7,5])[v_team.place::int]
      ELSE (ARRAY[3,2,1])[v_team.place::int] END ELSE 0 END;
    v_penalty := CASE WHEN v_team.place>3 AND v_team.teams_count-v_team.place<3
      THEN (3-(v_team.teams_count-v_team.place))::int ELSE 0 END;
    IF v_tickets = 0 AND v_penalty = 0 THEN CONTINUE; END IF;
    FOR v_member IN
      SELECT DISTINCT s.id FROM public.team_members m
      JOIN public.students s ON s.id=m.user_id
      JOIN public.learning_paths lp ON lp.student_id=s.id
      WHERE m.team_id=v_team.id AND m.is_active AND s.user_type='INTERNAL' AND s.is_active
        AND (v_season.scope<>'classroom' OR s.classroom_id=v_season.classroom_id)
      ORDER BY s.id
    LOOP
      IF v_tickets > 0 THEN
        INSERT INTO public.season_reward_distributions(season_id,team_id,student_id,ticket_amount,awarded_by_id)
          VALUES(v_season.id,v_team.id,v_member.id,v_tickets,p_actor_id) ON CONFLICT (season_id,student_id) DO NOTHING;
        IF FOUND THEN
          UPDATE public.learning_paths SET free_pull_tickets=coalesce(free_pull_tickets,0)+v_tickets WHERE student_id=v_member.id;
          IF NOT FOUND THEN RAISE EXCEPTION 'REWARD_BALANCE_NOT_FOUND'; END IF;
          INSERT INTO public.card_notifications(student_id,notification_type,title,message,data)
            VALUES(v_member.id,'SEASON_REWARD','รางวัล Team Battle',
              format('ทีม %s ได้อันดับ %s ได้รับตั๋ว %s ใบ',v_team.team_name,v_team.place,v_tickets),
              jsonb_build_object('teamName',v_team.team_name,'season',v_season.season_name,'rank',v_team.place,
                'reward',jsonb_build_object('type','FREE_PULL_TICKET','amount',v_tickets)));
        END IF;
      ELSIF NOT (v_member.id = ANY(v_penalized)) AND NOT EXISTS (SELECT 1 FROM public.season_reward_distributions d
        WHERE d.season_id=v_season.id AND d.student_id=v_member.id) THEN
        v_penalized := array_append(v_penalized,v_member.id);
        v_removed := 0;
        FOR v_card IN SELECT id,quantity,reserved_quantity FROM public.card_inventory
          WHERE student_id=v_member.id AND quantity>reserved_quantity ORDER BY id FOR UPDATE LOOP
          EXIT WHEN v_removed >= v_penalty;
          v_take := least(v_penalty-v_removed,v_card.quantity-v_card.reserved_quantity);
          UPDATE public.card_inventory SET quantity=quantity-v_take,updated_at=now() WHERE id=v_card.id;
          v_removed := v_removed+v_take;
        END LOOP;
        INSERT INTO public.card_notifications(student_id,notification_type,title,message,data)
          VALUES(v_member.id,'SEASON_PENALTY','ผล Team Battle',format('ทีม %s ถูกหักการ์ด %s ใบ',v_team.team_name,v_removed),
            jsonb_build_object('teamName',v_team.team_name,'season',v_season.season_name,'actualRemoved',v_removed));
      END IF;
    END LOOP;
    IF v_tickets > 0 THEN
      v_rewards := v_rewards || jsonb_build_array(jsonb_build_object('teamName',v_team.team_name,'rank',v_team.place,'score',v_team.score,'ticketsAwarded',v_tickets));
    ELSE
      v_penalties := v_penalties || jsonb_build_array(jsonb_build_object('teamName',v_team.team_name,'score',v_team.score,'penaltyCardsPerMember',v_penalty));
    END IF;
  END LOOP;
  IF v_rewards = '[]'::jsonb THEN RAISE EXCEPTION 'NO_ELIGIBLE_TEAMS'; END IF;
  UPDATE public.team_battle_seasons SET status='REWARDED',is_active=false,closed_at=now()
    WHERE id=v_season.id;
  RETURN jsonb_build_object('success',true,'season_id',v_season.id,'rewards',v_rewards,'penalties',v_penalties);
END $$;
REVOKE ALL ON FUNCTION public.open_school_team_season_v2(text), public.close_team_season_v2(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.open_school_team_season_v2(text), public.close_team_season_v2(uuid,uuid) TO service_role;
COMMIT;
