import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(new URL('../../MIGRATION_TEAM_BATTLE_FIX.sql', import.meta.url), 'utf8');

test('team repair seeds school teams and one active season', () => {
  for (const team of ['Phoenix', 'Ocean', 'Thunder', 'Forest', 'Guardian', 'Rocket']) {
    assert.match(migration, new RegExp(`\\('${team}'`));
  }
  assert.match(migration, /one_active_school_season/);
  assert.match(migration, /WHERE NOT EXISTS \(\s*SELECT 1[\s\S]*scope = 'school' AND is_active = true/);
});

test('team assignment and scoring are atomic database functions', () => {
  assert.match(migration, /FUNCTION public\.ensure_student_team_memberships\(/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /FUNCTION public\.record_team_score_event\(/);
  assert.match(migration, /PERFORM public\.ensure_student_team_memberships\(p_student_id\)/);
});

test('score events require a currently active season', () => {
  assert.match(migration, /start_at <= now\(\)/);
  assert.match(migration, /end_at > now\(\)/);
  assert.match(migration, /RAISE EXCEPTION 'NO_ACTIVE_TEAM_SEASON'/);
});

test('starting a season closes the previous season in one transaction', () => {
  assert.match(migration, /FUNCTION public\.start_school_team_season\(/);
  assert.match(migration, /UPDATE public\.team_battle_seasons\s+SET is_active = false/);
});
