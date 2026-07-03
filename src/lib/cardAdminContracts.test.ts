import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../../MIGRATION_CARD_ADMIN_DASHBOARD.sql', import.meta.url),
  'utf8',
);

test('teacher card and ticket changes are audited', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.card_admin_actions/);
  assert.match(migration, /'TICKET_AWARD', 'TICKET_REMOVAL', 'CARD_REMOVAL'/);
  assert.match(migration, /teacher_id uuid NOT NULL/);
  assert.match(migration, /reason text NOT NULL/);
  assert.match(migration, /balance_before integer NOT NULL/);
  assert.match(migration, /balance_after integer NOT NULL/);
});

test('ticket adjustment locks balance and prevents a negative result', () => {
  assert.match(migration, /FUNCTION public\.teacher_adjust_free_pull_tickets\(/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /IF v_after < 0 THEN RAISE EXCEPTION 'INSUFFICIENT_TICKETS'/);
});

test('card removal cannot consume reserved cards', () => {
  assert.match(migration, /v_available := v_inventory\.quantity - v_inventory\.reserved_quantity/);
  assert.match(migration, /IF v_available < p_amount THEN RAISE EXCEPTION 'INSUFFICIENT_AVAILABLE_CARDS'/);
});

test('bulk teacher awards reuse the audited adjustment function', () => {
  assert.match(migration, /FUNCTION public\.award_free_pull_tickets\(/);
  assert.match(migration, /PERFORM public\.teacher_adjust_free_pull_tickets/);
});
