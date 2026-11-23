import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const sql = await readFile(new URL('../supabase/migrations/20261124121500_campaign_guest_reward_guard.sql', import.meta.url), 'utf8');
const v3 = await readFile(new URL('../MIGRATION_RANK_AND_PASS_SCORE_UPDATE.sql', import.meta.url), 'utf8');
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const answers = count => JSON.stringify(Array.from({ length: 10 }, (_, i) => ({
  word_id: id(100 + i), is_correct: i < count, response_time_ms: 1000,
})));
const finish = (attempt, student, correct) => db.query(
  'SELECT complete_stage_with_progression_v3($1,$2,$3,now()) AS result',
  [id(attempt),id(student),answers(correct)]
).then(({ rows }) => rows[0].result);
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE students(id uuid, user_type text);
    CREATE TABLE learning_paths(student_id uuid, coins int, exp int, total_exp int, current_stage int,
      current_rank int, rank_updated_at timestamptz, last_active_date timestamptz, campaign_completed_at timestamptz);
    CREATE TABLE stage_attempts(id uuid PRIMARY KEY, student_id uuid, status text, stage_number int, stage_id uuid,
      expires_at timestamptz, question_ids jsonb, score int, accuracy numeric, stars int, coins_awarded int,
      exp_awarded int, hint_count int, completed_at timestamptz);
    CREATE TABLE stages(id uuid, stage_number int);
    CREATE TABLE student_stage_progress(id uuid DEFAULT gen_random_uuid(), student_id uuid,stage_id uuid,stage_number int,
      best_stars int,latest_stars int,best_accuracy numeric,latest_accuracy numeric,best_score int,attempt_count int,
      hint_count_last int,completed boolean,first_passed_at timestamptz,last_played_at timestamptz,last_attempt_id uuid,
      progress_source text,created_at timestamptz,updated_at timestamptz);
    CREATE TABLE attempt_hint_events(stage_attempt_id uuid);
    CREATE TABLE stage_results(user_id uuid,stage_number int,rank_at_play int,score int,accuracy numeric,
      response_time_avg int,passed boolean,used_hints int,stars int);
    CREATE TABLE economy_transactions(student_id uuid,transaction_type text,source text,reference_id text,coins_delta int,
      exp_delta int,balance_after jsonb,primary_reason text,bonus_flags text[],metadata jsonb,UNIQUE(student_id,source,reference_id));
    CREATE FUNCTION record_word_attempt_v2(uuid,uuid,uuid,boolean,int,timestamptz) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
    INSERT INTO students VALUES ('${id(1)}','EXTERNAL'),('${id(2)}','INTERNAL');
    INSERT INTO learning_paths SELECT id,40,8,8,21,2,now(),now(),NULL FROM students;
    INSERT INTO stages VALUES ('${id(30)}',21);
    INSERT INTO stage_attempts(id,student_id,status,stage_number,question_ids)
      VALUES ('${id(3)}','${id(1)}','ACTIVE',21,'${answers(0)}'),
             ('${id(4)}','${id(2)}','ACTIVE',21,'${answers(0)}'),
             ('${id(5)}','${id(1)}','ACTIVE',21,'${answers(0)}');
  `);
  // Install the actual rank-aware function without its unrelated rank backfill.
  await db.exec(v3.slice(v3.indexOf('CREATE OR REPLACE FUNCTION'), v3.indexOf('REVOKE ALL')));
  await db.exec(sql);
  await db.exec(sql);
  assert.equal((await finish(5,1,6)).passed,false);
  assert.equal((await db.query('SELECT current_stage FROM learning_paths WHERE student_id=$1',[id(1)])).rows[0].current_stage,21);
  const guest = await finish(3,1,7);
  const internal = await finish(4,2,7);
  assert.deepEqual([guest.passed,guest.current_stage,guest.new_coins,guest.new_total_exp],[true,22,40,8]);
  assert.deepEqual([internal.passed,internal.current_stage,internal.new_coins,internal.new_total_exp],[true,22,60,28]);
  assert.deepEqual((await db.query('SELECT student_id FROM economy_transactions')).rows,[{student_id:id(2)}]);
  assert.equal((await finish(3,1,7)).earned_coins,0);
  await db.exec('SET ROLE anon');
  await assert.rejects(finish(3,1,7), /permission denied/);
  console.log('PASS guest campaign reward guard: guest balances preserved, internal reward unchanged, no direct public RPC');
} finally { await db.close(); }
