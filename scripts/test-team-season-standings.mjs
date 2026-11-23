import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const result = async (sql,args=[]) => (await db.query('select '+sql+' as result',args)).rows[0].result;
const board = room => result('team_scope_leaderboard_v1($1,$2)',[room ? 'classroom':'school',room ? id(room):null]);
const preview = n => result('team_reward_preview_v1($1)',[id(n)]);
const close = (n,revision) => result('close_team_season_v3($1,$2,$3)',[id(n),id(99),revision]);
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE classrooms(id uuid PRIMARY KEY);
    INSERT INTO classrooms VALUES ('${id(50)}'),('${id(51)}'),('${id(52)}');
    CREATE TABLE team_battle_seasons (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),season_name text,scope text,
      classroom_id uuid,grade_level text,status text,is_active boolean,start_at timestamptz,end_at timestamptz,closed_at timestamptz);
    CREATE TABLE teams(id uuid PRIMARY KEY,team_name text,team_type text,classroom_id uuid,grade_level text,is_active boolean,
      team_icon text DEFAULT 'X',team_color text DEFAULT '#555555');
    CREATE TABLE students(id uuid PRIMARY KEY,classroom_id uuid,user_type text,is_active boolean);
    CREATE TABLE team_members(team_id uuid,user_id uuid,is_active boolean);
    CREATE TABLE team_score_events(team_id uuid,season_id uuid,user_id uuid,event_type text,points numeric,metadata jsonb,created_at timestamptz DEFAULT now());
    CREATE TABLE stage_attempts(id uuid PRIMARY KEY,student_id uuid,status text,score int,accuracy numeric,stage_number int,completed_at timestamptz);
    CREATE TABLE learning_paths(student_id uuid PRIMARY KEY,free_pull_tickets int NOT NULL);
    CREATE TABLE season_reward_distributions(season_id uuid,team_id uuid,student_id uuid,ticket_amount int,awarded_by_id uuid,UNIQUE(season_id,student_id));
    CREATE TABLE card_inventory(id uuid PRIMARY KEY,student_id uuid,quantity int,reserved_quantity int,updated_at timestamptz);
    CREATE TABLE card_notifications(student_id uuid,notification_type text,title text,message text,data jsonb);
    CREATE FUNCTION record_team_score_event(uuid,text,numeric,jsonb) RETURNS int LANGUAGE sql AS $$ SELECT 0 $$;
    CREATE FUNCTION randomize_all_teams() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{"shuffled":true}'::jsonb $$;
    CREATE FUNCTION ensure_student_team_memberships(p_student_id uuid) RETURNS jsonb LANGUAGE plpgsql AS $$
      BEGIN
        INSERT INTO public.team_members VALUES ('${id(15)}',p_student_id,true);
        RETURN '{}';
      END;
    $$;
    INSERT INTO team_battle_seasons(id,season_name,scope,classroom_id,status,is_active,start_at,end_at) VALUES
      ('${id(30)}','School','school',NULL,'ACTIVE',true,now()-interval '1 day',now()+interval '1 day'),
      ('${id(31)}','Class A','classroom','${id(50)}','ACTIVE',true,now()-interval '1 day',now()+interval '1 day'),
      ('${id(32)}','Class B','classroom','${id(51)}','ACTIVE',true,now()-interval '1 day',now()+interval '1 day');
    INSERT INTO teams(id,team_name,team_type,classroom_id,grade_level,is_active) VALUES
      ('${id(11)}','A','class','${id(50)}','M1',true),('${id(12)}','B','class','${id(50)}','M1',true),
      ('${id(13)}','No activity','class','${id(50)}','M1',true),('${id(14)}','Other','class','${id(51)}','M1',true),
      ('${id(15)}','School Team','school',NULL,NULL,true);
    INSERT INTO students VALUES ('${id(1)}','${id(50)}','INTERNAL',true),('${id(2)}','${id(50)}','INTERNAL',true),
      ('${id(3)}','${id(50)}','INTERNAL',true),('${id(4)}','${id(51)}','INTERNAL',true),
      ('${id(5)}','${id(50)}','EXTERNAL',true),('${id(6)}','${id(50)}','INTERNAL',true);
    INSERT INTO learning_paths SELECT id,5 FROM students;
    INSERT INTO team_members VALUES ('${id(11)}','${id(1)}',true),('${id(11)}','${id(2)}',true),('${id(12)}','${id(3)}',true),
      ('${id(14)}','${id(4)}',true),('${id(11)}','${id(5)}',true),('${id(13)}','${id(6)}',true),
      ('${id(15)}','${id(1)}',true),('${id(15)}','${id(5)}',true);
    INSERT INTO team_score_events(team_id,season_id,user_id,event_type,points) VALUES
      ('${id(11)}','${id(31)}','${id(1)}','fixture',60),('${id(12)}','${id(31)}','${id(3)}','fixture',20),
      ('${id(11)}','${id(31)}','${id(5)}','fixture',1000),('${id(11)}','${id(31)}','${id(4)}','fixture',1000),
      ('${id(11)}','${id(30)}','${id(1)}','fixture',5000);
    INSERT INTO stage_attempts(id,student_id,status,score,accuracy,stage_number) VALUES
      ('${id(101)}','${id(1)}','ACTIVE',7,70,21),('${id(102)}','${id(5)}','ACTIVE',10,100,21),
      ('${id(103)}','${id(1)}','ACTIVE',6,60,21),('${id(104)}','${id(4)}','ACTIVE',10,100,20);
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/20261124130000_team_season_standings.sql',import.meta.url),'utf8'));
  const classroom = await board(50);
  assert.equal(classroom.season.id,id(31));
  assert.deepEqual(classroom.teams.map(t=>[t.team_name,t.totalScore,t.finalScore]),[['B',20,130],['A',60,46],['No activity',0,0]]);
  assert.equal((await board(51)).season.id,id(32));
  assert.equal((await board()).season.id,id(30));
  assert.equal((await board(52)).season,null);
  await assert.rejects(result('shuffle_teams_when_idle_v1()'),/TEAM_SEASON_IN_PROGRESS/);
  const newClass = await result("to_jsonb(open_classroom_team_season_v1('Class C',$1))",[id(52)]);
  assert.equal(newClass.classroom_id,id(52));
  await assert.rejects(result("open_classroom_team_season_v1('duplicate',$1)",[id(52)]),/ACTIVE_CLASSROOM_SEASON/);
  const noRewards = await result('team_reward_preview_v1($1)',[newClass.id]);
  assert.deepEqual((await result('close_team_season_v3($1,$2,$3)',[newClass.id,id(99),noRewards.revision])).rewards,[]);
  const before = await preview(31);
  assert.deepEqual(before.teams.map(t=>t.id),classroom.teams.map(t=>t.id));
  await db.exec("ALTER TABLE team_score_events ADD CONSTRAINT fixture_score_failure CHECK (campaign_attempt_id IS NULL)");
  await assert.rejects(db.query("UPDATE stage_attempts SET status='COMPLETED',completed_at=now() WHERE id=$1",[id(101)]),/fixture_score_failure/);
  assert.equal((await db.query('SELECT status FROM stage_attempts WHERE id=$1',[id(101)])).rows[0].status,'ACTIVE');
  await db.exec("ALTER TABLE team_score_events DROP CONSTRAINT fixture_score_failure");
  await db.query("UPDATE stage_attempts SET status='COMPLETED',completed_at=now() WHERE id<>$1",[id(104)]);
  await db.exec("UPDATE stage_attempts SET status='COMPLETED' WHERE status='COMPLETED'");
  assert.deepEqual((await db.query('select season_id, sum(points)::int as points,count(*)::int as events from team_score_events where campaign_attempt_id is not null group by season_id order by season_id')).rows,
    [{season_id:id(30),points:15,events:2},{season_id:id(31),points:15,events:2}]);
  await db.query("UPDATE stage_attempts SET status='COMPLETED',completed_at=now() WHERE id=$1",[id(104)]);
  assert.deepEqual((await board(51)).teams.map(t=>[t.team_name,t.totalScore]),[['Other',55]]);
  assert.equal((await preview(30)).teams[0].tickets,10);
  await assert.rejects(close(31,before.revision),/STALE_TEAM_PREVIEW/);
  const after = await preview(31);
  await db.exec("ALTER TABLE card_notifications ADD CONSTRAINT fixture_failure CHECK (1=0)");
  await assert.rejects(close(31,after.revision),/fixture_failure/);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM season_reward_distributions')).rows[0].n,0);
  await db.exec("ALTER TABLE card_notifications DROP CONSTRAINT fixture_failure");
  const payout = await close(31,after.revision);
  assert.deepEqual(payout.rewards.map(t=>[t.teamName,t.ticketsAwarded]),[['B',3],['A',2]]);
  assert.equal((await close(31,after.revision)).alreadyClosed,true);
  assert.deepEqual((await db.query('SELECT free_pull_tickets FROM learning_paths ORDER BY student_id')).rows.map(r=>r.free_pull_tickets),[7,7,8,5,5,5]);
  await db.exec('UPDATE team_members SET is_active=false');
  assert.deepEqual((await board(50)).teams,after.teams);
  await db.exec("UPDATE team_battle_seasons SET status='CLOSED',is_active=false WHERE status='ACTIVE'");
  assert.deepEqual(await result('shuffle_teams_when_idle_v1()'),{shuffled:true});
  await db.exec('SET ROLE anon');
  await assert.rejects(board(50),/permission denied/);
  await assert.rejects(result("record_team_score_event(NULL,'stage_completed',1,'{}')"),/permission denied/);
  await assert.rejects(result('randomize_all_teams()'),/permission denied/);
  await assert.rejects(db.query('SELECT * FROM team_score_events'),/permission denied/);
  console.log('PASS team standings: scope, shared weighted ranking, trusted and atomic points, preview check, frozen results and no repeat payout');
} finally { await db.close(); }
