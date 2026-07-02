import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(new URL('../../MIGRATION_CARD_BATTLE.sql', import.meta.url), 'utf8');

test('card battle migration exposes every atomic workflow RPC', () => {
  for (const functionName of [
    'pull_gacha_card',
    'create_card_action',
    'announce_card_action',
    'counter_card_action',
    'resolve_card_action',
    'award_free_pull_tickets',
    'close_and_reward_team_season',
  ]) {
    assert.match(migration, new RegExp(`FUNCTION public\\.${functionName}\\(`));
  }
});

test('gacha consumes free tickets before coins', () => {
  const ticketBranch = migration.indexOf('IF v_path.free_pull_tickets > 0 THEN');
  const coinBranch = migration.indexOf('ELSIF v_path.coins >= p_coin_cost THEN');
  assert.ok(ticketBranch >= 0);
  assert.ok(coinBranch > ticketBranch);
});

test('drop weights match the O2O 55/20/15/5/4/1 specification', () => {
  for (const [code, rarity, weight] of [
    ['DUD_SALT', 'N', 55],
    ['CLEAN_ROOM', 'R', 20],
    ['MEDITATE_10', 'R', 15],
    ['SHIELD', 'SR', 5],
    ['REFLECT', 'SSR', 4],
    ['EARLY_HOME', 'UR', 1],
  ] as const) {
    assert.ok(
      migration.includes(`('${code}',`) &&
      migration.includes(`'${rarity}', ${weight},`),
      `${code} should use rarity ${rarity} and weight ${weight}`,
    );
  }
});

test('every tenth paid pull excludes dud cards without counting tickets', () => {
  assert.match(migration, /paid_gacha_pulls = paid_gacha_pulls \+ 1/);
  assert.match(migration, /v_is_pity := \(v_paid_pull_count % 10 = 0\)/);
  assert.match(migration, /NOT v_is_pity OR c\.effect_type <> 'DUD'/);
  const ticketBranch = migration.slice(
    migration.indexOf('IF v_path.free_pull_tickets > 0 THEN'),
    migration.indexOf('ELSIF v_path.coins >= p_coin_cost THEN'),
  );
  assert.doesNotMatch(ticketBranch, /paid_gacha_pulls/);
});

test('announcement opens a thirty minute counter window', () => {
  assert.match(migration, /p_counter_seconds integer DEFAULT 1800/);
  assert.match(migration, /คุณมีเวลา 30 นาที/);
});

test('card stock is reserved before approval and consumed only on resolve', () => {
  assert.match(migration, /reserved_quantity = reserved_quantity \+ 1/);
  assert.match(migration, /quantity = quantity - 1, reserved_quantity = reserved_quantity - 1/);
  assert.match(migration, /status = CASE WHEN p_approve THEN 'RESOLVED' ELSE 'REJECTED' END/);
});

test('season rewards cannot be distributed twice to the same student', () => {
  assert.match(migration, /UNIQUE \(season_id, student_id\)/);
  assert.match(migration, /IF v_season\.status = 'REWARDED'/);
});
