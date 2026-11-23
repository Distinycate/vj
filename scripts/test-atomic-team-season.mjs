import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const close = async n => (await db.query('select close_team_season_v2($1,$2) as result',[id(n),id(99)])).rows[0].result;
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE team_battle_seasons (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), season_name text CHECK(season_name <> 'fail'),
      scope text, classroom_id uuid, grade_level text, status text CHECK (status IN ('ACTIVE','CLOSED','REWARDED')),
      is_active boolean, start_at timestamptz, end_at timestamptz, closed_at timestamptz);
    CREATE TABLE teams (id uuid PRIMARY KEY,team_name text,team_type text,classroom_id uuid,grade_level text,is_active boolean);
    CREATE TABLE students (id uuid PRIMARY KEY, classroom_id uuid,user_type text,is_active boolean);
    CREATE TABLE team_members (team_id uuid,user_id uuid,is_active boolean);
    CREATE TABLE team_score_events (team_id uuid,season_id uuid,points int);
    CREATE TABLE learning_paths (student_id uuid PRIMARY KEY,free_pull_tickets int NOT NULL);
    CREATE TABLE season_reward_distributions (season_id uuid,team_id uuid,student_id uuid,ticket_amount int,awarded_by_id uuid,UNIQUE(season_id,student_id));
    CREATE TABLE card_inventory (id uuid PRIMARY KEY,student_id uuid,quantity int,reserved_quantity int,updated_at timestamptz);
    CREATE TABLE card_notifications (student_id uuid,notification_type text,title text,message text,data jsonb);
    INSERT INTO team_battle_seasons (id,season_name,scope,classroom_id,status,is_active) VALUES
      ('${id(30)}','School','school',null,'ACTIVE',true),
      ('${id(31)}','Class','classroom','${id(50)}','ACTIVE',true);
    INSERT INTO teams VALUES
      ('${id(11)}','A','class','${id(50)}','M1',true),
      ('${id(12)}','B','class','${id(50)}','M1',true),
      ('${id(13)}','C','class','${id(50)}','M1',true),
      ('${id(14)}','D','class','${id(50)}','M1',true),
      ('${id(15)}','Other','class','${id(51)}','M1',true);
    INSERT INTO students VALUES
      ('${id(1)}','${id(50)}','INTERNAL',true),
      ('${id(2)}','${id(50)}','EXTERNAL',true),
      ('${id(3)}','${id(50)}','INTERNAL',true),
      ('${id(4)}','${id(51)}','INTERNAL',true);
    INSERT INTO learning_paths SELECT id,5 FROM students;
    INSERT INTO team_members VALUES ('${id(11)}','${id(1)}',true),('${id(11)}','${id(2)}',true),
      ('${id(14)}','${id(3)}',true),('${id(11)}','${id(4)}',true),('${id(15)}','${id(4)}',true);
    INSERT INTO card_inventory VALUES ('${id(40)}','${id(3)}',5,3,now());
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/20261123163451_atomic_team_season.sql', import.meta.url),'utf8'));
  await assert.rejects(db.query("select open_school_team_season_v2('fail')"), /check constraint/);
  assert.equal((await db.query("select count(*)::int n from team_battle_seasons where is_active")).rows[0].n,2);
  await db.exec("select open_school_team_season_v2('Next')");
  assert.equal((await db.query("select count(*)::int n from team_battle_seasons where is_active")).rows[0].n,2);
  await db.exec("alter table card_notifications add constraint fixture_fail check(notification_type <> 'SEASON_PENALTY')");
  await assert.rejects(close(31), /fixture_fail/);
  assert.equal((await db.query("select count(*)::int n from season_reward_distributions")).rows[0].n,0);
  await db.exec("alter table card_notifications drop constraint fixture_fail");
  assert.equal((await close(31)).rewards[0].ticketsAwarded,3);
  assert.equal((await close(31)).alreadyClosed,true);
  assert.deepEqual((await db.query("select free_pull_tickets from learning_paths order by student_id")).rows.map(x=>x.free_pull_tickets),[8,5,5,5]);
  assert.equal((await db.query("select quantity from card_inventory")).rows[0].quantity,3);
  await db.exec("set role anon");
  await assert.rejects(close(31),/permission denied/);
  console.log('PASS Team Battle: classroom isolation, no repeat, reserved cards, failed open/close roll back, service-only execution');
} finally { await db.close(); }
