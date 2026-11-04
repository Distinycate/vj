// Disposable PostgreSQL-compatible integration test. No production connection.
// PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node scripts/test-assessment-season.mjs
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const sql = await readFile(new URL('../supabase/migrations/20261104050458_assessment_season_atomic_reset.sql', import.meta.url), 'utf8');
const id = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
async function fixture() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE students (id uuid PRIMARY KEY, user_type text, is_active boolean);
    CREATE TABLE learning_paths (student_id uuid PRIMARY KEY, current_stage int, current_rank int DEFAULT 1,
      campaign_completed_at timestamptz, coins int DEFAULT 500, free_pull_tickets int DEFAULT 3);
    CREATE TABLE student_stage_progress (student_id uuid, stage_number int, completed boolean);
    CREATE TABLE stage_attempts (student_id uuid, status text);
    CREATE TABLE pre_tests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, score int NOT NULL,
      total_questions int DEFAULT 25, time_spent_sec int NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE post_tests (LIKE pre_tests INCLUDING ALL);
    CREATE TABLE analytics_summary (student_id uuid PRIMARY KEY, pretest_score int DEFAULT 0, posttest_score int DEFAULT 0,
      learning_gain numeric, normalized_gain numeric, success_rate numeric DEFAULT 0, attempt_count int DEFAULT 0,
      total_time_on_task_sec int DEFAULT 0, last_updated_at timestamptz DEFAULT now());
    INSERT INTO students VALUES ('${id(1)}','INTERNAL',true),('${id(2)}','EXTERNAL',true),('${id(3)}','INTERNAL',false);
    INSERT INTO learning_paths (student_id,current_stage) VALUES ('${id(1)}',21),('${id(2)}',31),('${id(3)}',41);
    INSERT INTO student_stage_progress VALUES ('${id(1)}',20,true),('${id(2)}',30,true);
    INSERT INTO stage_attempts VALUES ('${id(1)}','ACTIVE'),('${id(2)}','ACTIVE');
    INSERT INTO pre_tests (student_id,score,time_spent_sec) SELECT '${id(1)}',score,10 FROM unnest(ARRAY[14,13,13,15,9]) score;
    INSERT INTO pre_tests (student_id,score,time_spent_sec) VALUES ('${id(2)}',20,10),('${id(3)}',10,10);
  `);
  return db;
}
const db = await fixture();
try {
  await assert.rejects(db.query('INSERT INTO analytics_summary (student_id,pretest_score) VALUES ($1,$2)', [id(1), '12.8']), /integer/);
  await db.exec(sql);
  const row = async (query, params = []) => (await db.query(query, params)).rows[0];
  assert.equal(Number((await row('SELECT pretest_score FROM analytics_summary WHERE student_id=$1', [id(1)])).pretest_score), 12.8);
  assert.equal((await row('SELECT current_stage FROM learning_paths WHERE student_id=$1', [id(1)])).current_stage, 21, 'schema install must not reset stages');
  const oldEpoch = (await row('SELECT assessment_epoch FROM learning_paths WHERE student_id=$1', [id(1)])).assessment_epoch;
  const reset = () => row('SELECT restart_learning_campaign_v2($1) AS result', [id(99)]);
  assert.equal((await reset()).result.studentCount, 1);
  const archive = await row('SELECT * FROM learning_campaign_archives');
  assert.equal(archive.pre_tests.length, 5);
  assert.equal(archive.learning_path.current_stage, 21);
  assert.equal(archive.stage_progress.length, 1);
  assert.equal(Number(archive.analytics.pretest_score), 12.8);
  assert.equal((await row('SELECT count(*)::int AS n FROM pre_tests WHERE student_id=$1', [id(1)])).n, 0);
  assert.equal((await row('SELECT count(*)::int AS n FROM pre_tests WHERE student_id<>$1', [id(1)])).n, 2);
  assert.equal((await row('SELECT status FROM stage_attempts WHERE student_id=$1', [id(1)])).status, 'CANCELLED');
  assert.equal((await row('SELECT status FROM stage_attempts WHERE student_id=$1', [id(2)])).status, 'ACTIVE');
  const path = await row('SELECT * FROM learning_paths WHERE student_id=$1', [id(1)]);
  assert.equal(path.current_stage, 1); assert.equal(path.coins, 500); assert.equal(path.free_pull_tickets, 3);
  assert.notEqual(path.assessment_epoch, oldEpoch);
  await assert.rejects(db.query('INSERT INTO stage_attempts VALUES ($1, $2)', [id(1), 'ACTIVE']), /PRETEST_REQUIRED/);
  await db.query('INSERT INTO stage_attempts VALUES ($1, $2)', [id(2), 'ACTIVE']);
  const submit = (n, score, epoch = path.assessment_epoch, type = 'PRE_TEST') => row(
    'SELECT submit_assessment_v2($1,$2,$3,$4,$5,25,10) AS result', [id(1), epoch, id(n), type, score]);
  await assert.rejects(submit(10, 14, oldEpoch), /ASSESSMENT_SEASON_CHANGED/);
  await assert.rejects(submit(10, 26), /INVALID_ASSESSMENT/);
  await assert.rejects(submit(10, 14, path.assessment_epoch, 'POST_TEST'), /PRETEST_REQUIRED/);
  for (const [i, score] of [14, 13, 13, 15, 9].entries()) await submit(10 + i, score);
  const repeat = await submit(14, 9);
  assert.equal(Number(repeat.result.preScore), 12.8); assert.equal(repeat.result.completedAll, true);
  assert.equal(repeat.result.newStage, 1);
  await db.query('INSERT INTO stage_attempts VALUES ($1, $2)', [id(1), 'ACTIVE']);
  assert.equal((await row('SELECT total_time_on_task_sec FROM analytics_summary WHERE student_id=$1', [id(1)])).total_time_on_task_sec, 50);
  await assert.rejects(submit(14, 10), /ASSESSMENT_ID_CONFLICT/);
  await assert.rejects(submit(15, 10), /ASSESSMENT_ALREADY_COMPLETE/);
  const post = await submit(20, 20, path.assessment_epoch, 'POST_TEST');
  assert.equal(Number(post.result.normalizedGain), 59.02, 'gain uses the existing percent scale');
  await submit(20, 20, path.assessment_epoch, 'POST_TEST');
  assert.equal((await row('SELECT total_time_on_task_sec FROM analytics_summary WHERE student_id=$1', [id(1)])).total_time_on_task_sec, 60);
  // A summary failure must undo the raw insert rather than report partial success.
  await db.exec(`CREATE FUNCTION fail_summary() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'forced-summary-error'; END$$;
    CREATE TRIGGER fail_summary BEFORE UPDATE ON analytics_summary FOR EACH ROW EXECUTE FUNCTION fail_summary();`);
  await assert.rejects(submit(21, 21, path.assessment_epoch, 'POST_TEST'), /forced-summary-error/);
  assert.equal((await row('SELECT count(*)::int AS n FROM post_tests WHERE id=$1', [id(21)])).n, 0);
  await db.exec('DROP TRIGGER fail_summary ON analytics_summary');
  await db.query('UPDATE learning_paths SET current_stage=4 WHERE student_id=$1', [id(1)]);
  assert.equal((await reset()).result.alreadyReset, true);
  assert.equal((await row('SELECT current_stage FROM learning_paths WHERE student_id=$1', [id(1)])).current_stage, 4);
  assert.equal((await row('SELECT count(*)::int AS n FROM pre_tests WHERE student_id=$1', [id(1)])).n, 5);
  await db.exec('SET ROLE anon');
  await assert.rejects(reset(), /permission denied/);
  await assert.rejects(db.query('SELECT * FROM learning_campaign_archives'), /permission denied/);
  await db.exec('RESET ROLE');
  console.log('PASS decimal regression, install-only, reset archive, isolation, epoch, idempotency, rollback, privileges');
} finally { await db.close(); }
const missing = await fixture();
try {
  await missing.exec(sql);
  await missing.query('DELETE FROM learning_paths WHERE student_id=$1', [id(1)]);
  await assert.rejects(missing.query('SELECT restart_learning_campaign_v2($1)', [id(99)]), /RESET_PREFLIGHT_FAILED/);
  assert.equal((await missing.query('SELECT count(*)::int AS n FROM pre_tests WHERE student_id=$1', [id(1)])).rows[0].n, 5);
  assert.equal((await missing.query('SELECT count(*)::int AS n FROM learning_campaign_resets')).rows[0].n, 0);
  console.log('PASS missing-path preflight leaves all data intact');
} finally { await missing.close(); }
