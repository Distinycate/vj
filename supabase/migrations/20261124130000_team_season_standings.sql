-- Install-only: no historical scores, current seasons or balances are rewritten.
BEGIN;
ALTER TABLE public.team_battle_seasons ADD COLUMN IF NOT EXISTS final_standings jsonb;
ALTER TABLE public.team_score_events ADD COLUMN IF NOT EXISTS campaign_attempt_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS team_score_campaign_once
  ON public.team_score_events (campaign_attempt_id, season_id, team_id, event_type)
  WHERE campaign_attempt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS team_score_season_team_user
  ON public.team_score_events (season_id, team_id, user_id);
CREATE INDEX IF NOT EXISTS team_members_active_by_user
  ON public.team_members (user_id, team_id) WHERE is_active;

CREATE OR REPLACE FUNCTION public.team_in_season_v1(
  p_season public.team_battle_seasons, p_team public.teams
) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT p_team.is_active AND (
    (p_season.scope = 'school' AND p_team.team_type = 'school')
    OR (p_season.scope = 'classroom' AND p_team.team_type = 'class' AND p_team.classroom_id = p_season.classroom_id)
    OR (p_season.scope = 'grade' AND p_team.team_type = 'class' AND p_team.grade_level = p_season.grade_level)
  );
$$;

CREATE OR REPLACE FUNCTION public.team_season_members_v1(p_season_id uuid, p_student_id uuid DEFAULT NULL)
RETURNS TABLE(team_id uuid, student_id uuid) LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT DISTINCT ON (s.id) t.id, s.id
  FROM public.team_battle_seasons se
  JOIN public.teams t ON public.team_in_season_v1(se, t)
  JOIN public.team_members m ON m.team_id = t.id AND m.is_active
  JOIN public.students s ON s.id = m.user_id AND s.is_active AND s.user_type = 'INTERNAL'
  JOIN public.learning_paths lp ON lp.student_id = s.id
  WHERE se.id = p_season_id AND (se.scope = 'school' OR s.classroom_id = t.classroom_id)
    AND (p_student_id IS NULL OR s.id = p_student_id)
  ORDER BY s.id, t.id;
$$;

CREATE OR REPLACE FUNCTION public.team_season_standings_v1(p_season_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = ''
AS $$
  WITH members AS (
    SELECT * FROM public.team_season_members_v1(p_season_id)
  ), scores AS (
    SELECT t.id, t.team_name, t.team_icon, t.team_color,
      count(DISTINCT m.student_id) AS member_count,
      count(DISTINCT e.user_id) FILTER (WHERE e.points > 0) AS active_count,
      count(e.user_id) AS event_count,
      coalesce(sum(e.points), 0) AS raw_points
    FROM public.team_battle_seasons se
    JOIN public.teams t ON public.team_in_season_v1(se, t)
    LEFT JOIN members m ON m.team_id = t.id
    LEFT JOIN public.team_score_events e ON e.season_id = se.id AND e.team_id = t.id AND e.user_id = m.student_id
    WHERE se.id = p_season_id
    GROUP BY t.id, t.team_name, t.team_icon, t.team_color
  ), participation AS (
    SELECT *, active_count::numeric / greatest(member_count, 1) AS ratio
    FROM scores
  ), final AS (
    SELECT *, round((raw_points / greatest(member_count, 1) * 0.6 + raw_points * 0.4)
      * CASE WHEN ratio >= 0.9 THEN 1.5 WHEN ratio >= 0.7 THEN 1.25 WHEN ratio >= 0.5 THEN 1.1 ELSE 1 END)
      + CASE WHEN ratio >= 0.7 THEN 100 ELSE 0 END AS final_score
    FROM participation
  ), ranked AS (
    SELECT *, row_number() OVER (ORDER BY final_score DESC, id) AS place
    FROM final
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'team_name', team_name, 'team_icon', team_icon, 'team_color', team_color,
    'rank', place, 'totalMembers', member_count, 'activeMembersRate', round(ratio * 100),
    'activeMembersCount', active_count, 'eventsCount', event_count,
    'totalScore', raw_points, 'finalScore', final_score
  ) ORDER BY place), '[]'::jsonb) FROM ranked;
$$;

CREATE OR REPLACE FUNCTION public.team_scope_leaderboard_v1(p_scope text, p_classroom_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = ''
AS $$
DECLARE v_season public.team_battle_seasons%ROWTYPE; v_active boolean;
BEGIN
  IF p_scope NOT IN ('school', 'classroom') OR (p_scope = 'classroom' AND p_classroom_id IS NULL) THEN
    RAISE EXCEPTION 'INVALID_TEAM_SCOPE';
  END IF;
  SELECT * INTO v_season FROM public.team_battle_seasons
  WHERE scope = p_scope AND (p_scope = 'school' OR classroom_id = p_classroom_id)
    AND start_at <= now() AND ((is_active AND status = 'ACTIVE') OR final_standings IS NOT NULL)
  ORDER BY (is_active AND status = 'ACTIVE' AND end_at > now()) DESC, start_at DESC, id
  LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('season',NULL,'teams','[]'::jsonb); END IF;
  v_active := v_season.is_active AND v_season.status = 'ACTIVE' AND v_season.end_at > now();
  RETURN jsonb_build_object('season',jsonb_build_object(
    'id',v_season.id,'name',v_season.season_name,'active',v_active
  ), 'teams',coalesce(v_season.final_standings, public.team_season_standings_v1(v_season.id)));
END;
$$;

CREATE OR REPLACE FUNCTION public.open_classroom_team_season_v1(p_name text, p_classroom_id uuid)
RETURNS public.team_battle_seasons LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE v_season public.team_battle_seasons%ROWTYPE;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'INVALID_SEASON_NAME'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('school-team-season'));
  IF NOT EXISTS (SELECT 1 FROM public.classrooms WHERE id = p_classroom_id) THEN RAISE EXCEPTION 'INVALID_CLASSROOM'; END IF;
  IF EXISTS (SELECT 1 FROM public.team_battle_seasons
    WHERE scope = 'classroom' AND classroom_id = p_classroom_id AND is_active AND status = 'ACTIVE')
    THEN RAISE EXCEPTION 'ACTIVE_CLASSROOM_SEASON'; END IF;
  INSERT INTO public.team_battle_seasons(season_name, scope, classroom_id, status, is_active, start_at, end_at)
    VALUES(trim(p_name), 'classroom', p_classroom_id, 'ACTIVE', true, now(), now() + interval '30 days') RETURNING * INTO v_season;
  RETURN v_season;
END;
$$;

CREATE OR REPLACE FUNCTION public.shuffle_teams_when_idle_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('school-team-season'));
  IF EXISTS (SELECT 1 FROM public.team_battle_seasons WHERE is_active AND status = 'ACTIVE') THEN
    RAISE EXCEPTION 'TEAM_SEASON_IN_PROGRESS';
  END IF;
  RETURN public.randomize_all_teams();
END;
$$;

CREATE OR REPLACE FUNCTION public.add_campaign_team_points_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE v_season_id uuid; v_team_id uuid; v_type text; v_base int; v_bonus int;
BEGIN
  IF NEW.completed_at IS NULL OR coalesce(NEW.score, 0) <= 0 OR NEW.stage_number NOT BETWEEN 1 AND 100
    OR coalesce(NEW.accuracy,0) < (CASE WHEN NEW.stage_number >= 81 THEN 100 WHEN NEW.stage_number >= 61 THEN 90
      WHEN NEW.stage_number >= 41 THEN 80 WHEN NEW.stage_number >= 21 THEN 70 ELSE 60 END)
    THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = NEW.student_id AND user_type = 'INTERNAL' AND is_active)
    THEN RETURN NEW; END IF;

  -- Keep legacy auto-assignment for students who go straight to the game.
  IF EXISTS (
    SELECT 1 FROM public.team_battle_seasons se
    JOIN public.students s ON s.id = NEW.student_id AND s.classroom_id IS NOT NULL
    WHERE se.is_active AND se.status = 'ACTIVE' AND se.start_at <= NEW.completed_at AND se.end_at > NEW.completed_at
      AND (se.scope = 'school' OR (se.scope = 'classroom' AND se.classroom_id = s.classroom_id))
      AND NOT EXISTS (SELECT 1 FROM public.team_season_members_v1(se.id, NEW.student_id))
  ) THEN
    BEGIN
      PERFORM public.ensure_student_team_memberships(NEW.student_id);
    EXCEPTION WHEN OTHERS THEN
      -- A classroom without assigned teams must not prevent a stage result.
      RAISE WARNING 'Team assignment failed on campaign completion (SQLSTATE %)', SQLSTATE;
    END;
  END IF;

  v_type := CASE WHEN NEW.stage_number % 10 = 0 THEN 'boss_completed' ELSE 'stage_completed' END;
  v_base := CASE WHEN NEW.stage_number % 10 = 0 THEN 30 ELSE 10 END;
  v_bonus := CASE WHEN NEW.accuracy >= 100 THEN 25 WHEN NEW.accuracy >= 90 THEN 15
    WHEN NEW.accuracy >= 80 THEN 10 WHEN NEW.accuracy >= 70 THEN 5 ELSE 0 END;

  -- Score only an active competition for each scope. Lock each row against finalization.
  FOR v_season_id IN
    SELECT se.id
    FROM public.team_battle_seasons se
    WHERE se.id IN (
      SELECT DISTINCT ON (candidate.scope) candidate.id
      FROM public.team_battle_seasons candidate
      WHERE candidate.status = 'ACTIVE' AND candidate.is_active
        AND candidate.start_at <= NEW.completed_at AND candidate.end_at > NEW.completed_at
        AND EXISTS (SELECT 1 FROM public.team_season_members_v1(candidate.id, NEW.student_id))
      ORDER BY candidate.scope, candidate.start_at DESC, candidate.id
    ) AND se.status = 'ACTIVE' AND se.is_active
    ORDER BY se.id FOR SHARE OF se
  LOOP
    SELECT team_id INTO v_team_id FROM public.team_season_members_v1(v_season_id, NEW.student_id);
    IF NOT FOUND THEN CONTINUE; END IF;
    INSERT INTO public.team_score_events(team_id, season_id, user_id, event_type, points, metadata, campaign_attempt_id)
    SELECT v_team_id,v_season_id,NEW.student_id,kind,points,
      jsonb_build_object('stageNumber',NEW.stage_number,'accuracy',NEW.accuracy,'attemptId',NEW.id),NEW.id
    FROM (VALUES (v_type,v_base), (CASE WHEN NEW.accuracy >= 100 THEN 'perfect_bonus' ELSE 'accuracy_bonus' END,v_bonus)) entries(kind,points)
    WHERE points > 0
    ON CONFLICT (campaign_attempt_id, season_id, team_id, event_type) WHERE campaign_attempt_id IS NOT NULL DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vj_campaign_team_points ON public.stage_attempts;
CREATE TRIGGER vj_campaign_team_points
  AFTER UPDATE OF status ON public.stage_attempts
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM 'COMPLETED' AND NEW.status = 'COMPLETED')
  EXECUTE FUNCTION public.add_campaign_team_points_v1();

CREATE OR REPLACE FUNCTION public.team_reward_preview_v1(p_season_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = ''
AS $$
DECLARE v_season public.team_battle_seasons%ROWTYPE;
  v_entries jsonb; v_members jsonb; v_eligible int;
BEGIN
  SELECT * INTO v_season FROM public.team_battle_seasons WHERE id = p_season_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'SEASON_NOT_FOUND'; END IF;
  IF v_season.status = 'REWARDED' THEN RETURN jsonb_build_object('alreadyClosed', true); END IF;
  IF NOT v_season.is_active OR v_season.status <> 'ACTIVE' THEN RAISE EXCEPTION 'SEASON_NOT_ACTIVE'; END IF;
  IF EXISTS (SELECT 1 FROM public.season_reward_distributions WHERE season_id = p_season_id) THEN
    RAISE EXCEPTION 'LEGACY_REWARD_REVIEW_REQUIRED';
  END IF;

  v_entries := public.team_season_standings_v1(p_season_id);
  SELECT count(*) INTO v_eligible FROM jsonb_array_elements(v_entries) t WHERE (t->>'totalScore')::numeric > 0;
  SELECT coalesce(jsonb_agg(t || jsonb_build_object(
    'tickets', CASE WHEN (t->>'totalScore')::numeric > 0 AND (t->>'rank')::int <= 3
      THEN CASE WHEN v_season.scope = 'school' THEN (ARRAY[10,7,5])[(t->>'rank')::int]
        ELSE (ARRAY[3,2,1])[(t->>'rank')::int] END ELSE 0 END,
    'penalty', CASE WHEN (t->>'totalScore')::numeric > 0 AND (t->>'rank')::int > 3
      THEN greatest(3 - (v_eligible - (t->>'rank')::int), 0) ELSE 0 END
  ) ORDER BY (t->>'rank')::int), '[]'::jsonb)
  INTO v_entries FROM jsonb_array_elements(v_entries) t;
  SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY student_id), '[]'::jsonb)
    INTO v_members FROM public.team_season_members_v1(p_season_id) m;
  RETURN jsonb_build_object('revision',md5(p_season_id::text || v_entries::text || v_members::text), 'teams',v_entries);
END;
$$;

CREATE OR REPLACE FUNCTION public.close_team_season_v3(p_season_id uuid, p_actor_id uuid, p_revision text)
RETURNS jsonb LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  v_season public.team_battle_seasons%ROWTYPE; v_preview jsonb; v_members jsonb;
  v_team record; v_member record; v_card record; v_removed int; v_take int;
  v_rewards jsonb := '[]'::jsonb; v_penalties jsonb := '[]'::jsonb;
BEGIN
  IF p_actor_id IS NULL THEN RAISE EXCEPTION 'ACTOR_REQUIRED'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('school-team-season'));
  SELECT * INTO v_season FROM public.team_battle_seasons WHERE id = p_season_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'SEASON_NOT_FOUND'; END IF;
  IF v_season.status = 'REWARDED' THEN RETURN jsonb_build_object('success',true,'alreadyClosed',true); END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY student_id), '[]'::jsonb)
    INTO v_members FROM public.team_season_members_v1(p_season_id) m;
  -- Completion writes the learning path before locking the season; use the same order here.
  PERFORM lp.student_id FROM public.learning_paths lp
    JOIN jsonb_to_recordset(v_members) AS m(student_id uuid) ON m.student_id = lp.student_id
    ORDER BY lp.student_id FOR UPDATE OF lp;
  PERFORM 1 FROM public.team_battle_seasons WHERE id = p_season_id FOR UPDATE;
  IF v_members IS DISTINCT FROM (SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY student_id), '[]'::jsonb)
      FROM public.team_season_members_v1(p_season_id) m) THEN RAISE EXCEPTION 'STALE_TEAM_PREVIEW'; END IF;
  v_preview := public.team_reward_preview_v1(p_season_id);
  IF (v_preview->>'revision') IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'STALE_TEAM_PREVIEW'; END IF;

  FOR v_team IN
    SELECT * FROM jsonb_to_recordset(v_preview->'teams') AS t(id uuid,team_name text,rank int,"finalScore" numeric,tickets int,penalty int)
    WHERE tickets > 0 OR penalty > 0 ORDER BY rank
  LOOP
    FOR v_member IN SELECT student_id FROM jsonb_to_recordset(v_members) AS m(team_id uuid,student_id uuid)
      WHERE team_id = v_team.id ORDER BY student_id
    LOOP
      IF v_team.tickets > 0 THEN
        INSERT INTO public.season_reward_distributions(season_id,team_id,student_id,ticket_amount,awarded_by_id)
          VALUES(p_season_id,v_team.id,v_member.student_id,v_team.tickets,p_actor_id);
        UPDATE public.learning_paths SET free_pull_tickets=coalesce(free_pull_tickets,0)+v_team.tickets WHERE student_id=v_member.student_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'REWARD_BALANCE_NOT_FOUND'; END IF;
        INSERT INTO public.card_notifications(student_id,notification_type,title,message,data)
          VALUES(v_member.student_id,'SEASON_REWARD','รางวัล Team Battle',
            format('ทีม %s ได้อันดับ %s ได้รับตั๋ว %s ใบ',v_team.team_name,v_team.rank,v_team.tickets),
            jsonb_build_object('teamName',v_team.team_name,'season',v_season.season_name,'rank',v_team.rank,
              'reward',jsonb_build_object('type','FREE_PULL_TICKET','amount',v_team.tickets)));
      ELSE
        v_removed := 0;
        FOR v_card IN SELECT id,quantity,reserved_quantity FROM public.card_inventory
          WHERE student_id=v_member.student_id AND quantity>reserved_quantity ORDER BY id FOR UPDATE LOOP
          EXIT WHEN v_removed >= v_team.penalty;
          v_take := least(v_team.penalty-v_removed,v_card.quantity-v_card.reserved_quantity);
          UPDATE public.card_inventory SET quantity=quantity-v_take,updated_at=now() WHERE id=v_card.id;
          v_removed := v_removed+v_take;
        END LOOP;
        INSERT INTO public.card_notifications(student_id,notification_type,title,message,data)
          VALUES(v_member.student_id,'SEASON_PENALTY','ผล Team Battle',format('ทีม %s ถูกหักการ์ด %s ใบ',v_team.team_name,v_removed),
            jsonb_build_object('teamName',v_team.team_name,'season',v_season.season_name,'actualRemoved',v_removed));
      END IF;
    END LOOP;
    IF v_team.tickets > 0 THEN
      v_rewards := v_rewards || jsonb_build_array(jsonb_build_object(
        'teamName',v_team.team_name,'rank',v_team.rank,'score',v_team."finalScore",'ticketsAwarded',v_team.tickets));
    ELSE
      v_penalties := v_penalties || jsonb_build_array(jsonb_build_object(
        'teamName',v_team.team_name,'rank',v_team.rank,'score',v_team."finalScore",'penaltyCardsPerMember',v_team.penalty));
    END IF;
  END LOOP;
  UPDATE public.team_battle_seasons SET status='REWARDED',is_active=false,closed_at=now(),final_standings=v_preview->'teams'
    WHERE id=p_season_id;
  RETURN jsonb_build_object('success',true,'season_id',p_season_id,'rewards',v_rewards,'penalties',v_penalties);
END;
$$;

REVOKE ALL ON FUNCTION public.team_in_season_v1(public.team_battle_seasons,public.teams), public.team_season_members_v1(uuid,uuid),
  public.team_season_standings_v1(uuid), public.team_scope_leaderboard_v1(text,uuid), public.open_classroom_team_season_v1(text,uuid),
  public.add_campaign_team_points_v1(), public.team_reward_preview_v1(uuid), public.close_team_season_v3(uuid,uuid,text),
  public.shuffle_teams_when_idle_v1()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.team_in_season_v1(public.team_battle_seasons,public.teams), public.team_season_members_v1(uuid,uuid),
  public.team_season_standings_v1(uuid), public.team_scope_leaderboard_v1(text,uuid), public.open_classroom_team_season_v1(text,uuid),
  public.add_campaign_team_points_v1(), public.team_reward_preview_v1(uuid), public.close_team_season_v3(uuid,uuid,text),
  public.shuffle_teams_when_idle_v1() TO service_role;

-- The browser consumes session-checked aggregate APIs, not individual member/score rows.
REVOKE ALL ON public.team_score_events, public.team_members, public.team_battle_seasons FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_score_events, public.team_members, public.team_battle_seasons TO service_role;
REVOKE EXECUTE ON FUNCTION public.ensure_student_team_memberships(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_student_team_memberships(uuid) TO service_role;

-- Prevent the old API and older open tabs from writing the same campaign score or closing with the old formula.
DO $$
DECLARE v_legacy regprocedure;
BEGIN
  FOR v_legacy IN SELECT unnest(ARRAY[
    to_regprocedure('public.record_team_score_event(uuid,text,numeric,jsonb)'),
    to_regprocedure('public.close_team_season_v2(uuid,uuid)'),
    to_regprocedure('public.close_and_reward_team_season(uuid,uuid)'),
    to_regprocedure('public.start_school_team_season(text)'),
    to_regprocedure('public.randomize_all_teams()')
  ]) LOOP
    IF v_legacy IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role',v_legacy);
    END IF;
  END LOOP;
END;
$$;
COMMIT;
