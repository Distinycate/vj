import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

test('student roster is not a public asset or generated into public', () => {
  assert.equal(existsSync('public/students_season2_summary.csv'), false);
  assert.doesNotMatch(readFileSync('scripts/build_students_season2.py', 'utf8'), /public\/students_season2_summary/);
});

test('legacy network login uses the session API and remembered credentials omit passwords', () => {
  const guest = readFileSync('src/app/register/network/page.tsx', 'utf8');
  assert.match(guest, /fetch\('\/api\/network\/auth\/login'/);
  assert.doesNotMatch(guest, /\.rpc\('login_student'/);
  for (const path of ['src/app/page.tsx', 'src/app/register/network/page.tsx']) {
    const page = readFileSync(path, 'utf8');
    assert.doesNotMatch(page, /setLoginPassword\(parsed\.password\)|localStorage\.setItem\(\s*'vj_saved_(?:user|guest)',\s*JSON\.stringify\(\{[^}]*\bpassword:/);
  }
});

test('assessment writes use only the epoch-aware transaction', () => {
  const route = readFileSync('src/app/api/student/assessment/route.ts', 'utf8');
  assert.match(route, /\.rpc\('submit_assessment_v2'/);
  assert.match(route, /p_epoch: epoch/);
  assert.match(route, /p_submission_id: submissionId/);
  assert.doesNotMatch(route, /\.from\('(pre_tests|post_tests|analytics_summary)'\)/);
});

test('bulk import previews first and never updates existing rows', () => {
  const route = readFileSync('src/app/api/admin/students/import-season/route.ts', 'utf8');
  const sql = readFileSync('supabase/migrations/20261123160536_import_new_students_without_reset.sql', 'utf8');
  assert.match(route, /requireInternalTeacherRole\(\['ADMIN'\]\)/);
  assert.match(route, /body.revision !== preview.revision/);
  assert.match(route, /process.env.SEASON_ROSTER_JSON/);
  assert.doesNotMatch(route.replace(/createHash\('sha256'\)\.update\(/g, ''), /\.(update|upsert)\(/);
  assert.match(sql, /RAISE EXCEPTION 'ROSTER_CHANGED'/);
  assert.doesNotMatch(sql, /UPDATE public\./i);
});

test('remedial stage GET checks access and POST rechecks it in the write transaction', () => {
  const route = readFileSync('src/app/api/events/runs/[runId]/stage/[stageNum]/route.ts', 'utf8');
  const sql = readFileSync('supabase/migrations/20261124120000_atomic_remedial_stage.sql', 'utf8');
  assert.match(route, /await verifyStageAccess\(runId, session.subjectId, stageNum, participant.target_stages\)/);
  assert.match(route, /run.status !== 'active'/);
  const post = route.slice(route.indexOf('export async function POST'));
  assert.match(post, /\.rpc\('submit_remedial_stage_v1'/);
  assert.match(post, /p_student_id: session.subjectId/);
  assert.doesNotMatch(post, /\.(upsert|update)\(/);
  assert.match(sql, /v_run.status <> 'active'/);
  assert.match(sql, /stage_number = p_stage - 1 AND passed/);
});
