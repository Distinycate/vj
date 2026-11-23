import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const room = '01234567-0000-4000-8000-000000000001';
const row = (username, student_id) => ({ username, student_id, classroom_id: room, password: 'fixture-only', student_name: 'Test' });
const run = rows => db.query('select import_new_season_students($1::jsonb) as created', [JSON.stringify(rows)]);
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), username text UNIQUE, student_id text,
      password text, student_name text, first_name text, last_name text, grade_level text, room_number text,
      classroom_id uuid, academic_year text, user_type text, is_active boolean, is_verified boolean);
    CREATE TABLE learning_paths (student_id uuid PRIMARY KEY REFERENCES students(id), current_stage int,
      current_rank int, coins int, exp int, total_exp int, free_pull_tickets int);
    WITH saved AS (INSERT INTO students (username,student_id,password,is_active)
      VALUES ('fixture-existing','0001','old-fixture-hash',false) RETURNING id)
    INSERT INTO learning_paths SELECT id,21,3,567,100,100,4 FROM saved;
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/20261123160536_import_new_students_without_reset.sql', import.meta.url), 'utf8'));
  assert.equal((await run([row('fixture-new','0002')])).rows[0].created, 1);
  await assert.rejects(run([row('fixture-transient','0003'), row('fixture-existing','0004')]), /ROSTER_CHANGED/);
  await assert.rejects(run([row('fixture-new','0002')]), /ROSTER_CHANGED/);
  assert.deepEqual((await db.query('select username,password,is_active,current_stage,coins,free_pull_tickets from students join learning_paths on students.id=learning_paths.student_id order by username')).rows, [
    { username: 'fixture-existing', password: 'old-fixture-hash', is_active: false, current_stage: 21, coins: 567, free_pull_tickets: 4 },
    { username: 'fixture-new', password: 'fixture-only', is_active: true, current_stage: 1, coins: 0, free_pull_tickets: 0 },
  ]);
  await db.exec('SET ROLE anon');
  await assert.rejects(run([row('fixture-anon','0005')]), /permission denied/);
  console.log('PASS: existing credentials, status and progress untouched; add-only, collision rollback, retry and RPC permissions');
} finally { await db.close(); }
