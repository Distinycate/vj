import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const submit = async (stage, score, attempt) => (await db.query(
  'select submit_remedial_stage_v1($1,$2,$3,$4,$5,$6) as result',
  [id(1), id(2), 'fixture', stage, score, id(attempt)]
)).rows[0].result;
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE classrooms(id uuid PRIMARY KEY); CREATE TABLE teachers(id uuid PRIMARY KEY);
    CREATE TABLE students(id uuid PRIMARY KEY); INSERT INTO students VALUES ('${id(2)}');`);
  await db.exec(await readFile(new URL('../MIGRATION_REMEDIAL_EVENT_RUNS.sql', import.meta.url), 'utf8'));
  await db.exec(`INSERT INTO event_runs(id, template_id, title) VALUES ('${id(1)}','fixture','Fixture');
    INSERT INTO event_participants(event_run_id, student_id,target_stages) VALUES ('${id(1)}','${id(2)}',2);`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261124120000_atomic_remedial_stage.sql', import.meta.url), 'utf8'));
  assert.equal((await submit(2, 10, 10)).error, 'LOCKED');
  assert.equal((await submit(3, 10, 10)).error, 'OUT_OF_RANGE');
  await db.exec('ALTER TABLE event_participants ADD CONSTRAINT fixture_fail CHECK (total_attempts = 0)');
  await assert.rejects(submit(1, 8, 11), /fixture_fail/);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM event_progress')).rows[0].n, 0);
  await db.exec('ALTER TABLE event_participants DROP CONSTRAINT fixture_fail');
  const first = await submit(1, 8, 11);
  assert.deepEqual(await submit(1, 8, 11), first);
  assert.equal((await submit(1, 10, 11)).error, 'ATTEMPT_CONFLICT');
  assert.equal((await submit(2, 10, 12)).isEventCompleted, true);
  const before = (await db.query('SELECT completed_at FROM event_participants')).rows[0].completed_at;
  await db.exec('UPDATE event_participants SET teacher_seen=true');
  assert.equal((await submit(1, 0, 13)).eventStatus, 'passed');
  assert.deepEqual((await db.query('SELECT completed_at,teacher_seen,total_attempts FROM event_participants')).rows[0],
    { completed_at: before, teacher_seen: true, total_attempts: 3 });
  await db.exec("UPDATE event_runs SET status='closed'");
  assert.equal((await submit(1, 9, 14)).error, 'INACTIVE');
  await db.exec('SET ROLE anon');
  await assert.rejects(submit(1, 8, 11), /permission denied/);
  await assert.rejects(db.query('SELECT * FROM remedial_stage_submissions'), /permission denied/);
  await assert.rejects(db.query('SELECT * FROM event_participants'), /permission denied/);
  await assert.rejects(db.query('SELECT * FROM event_progress'), /permission denied/);
  console.log('PASS remedial: locked/closed, rollback, replay, preservation of completion, private execution');
} finally { await db.close(); }
