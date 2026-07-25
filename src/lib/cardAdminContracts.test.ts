import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../../MIGRATION_CARD_ADMIN_DASHBOARD.sql', import.meta.url),
  'utf8',
);
const cardTeacherAccess = readFileSync(
  new URL('../app/card-teacher/page.tsx', import.meta.url),
  'utf8',
);
const cardTeacherDashboard = readFileSync(
  new URL('../app/card-teacher/dashboard/page.tsx', import.meta.url),
  'utf8',
);
const adminCardPage = readFileSync(
  new URL('../app/admin/cards/page.tsx', import.meta.url),
  'utf8',
);

test('teacher card and ticket changes are audited', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.card_admin_actions/);
  for (const action of ['COIN_AWARD', 'COIN_REMOVAL', 'TICKET_AWARD', 'TICKET_REMOVAL', 'CARD_REMOVAL']) {
    assert.match(migration, new RegExp(`'${action}'`));
  }
  assert.match(migration, /teacher_id uuid NOT NULL/);
  assert.match(migration, /reason text NOT NULL/);
  assert.match(migration, /balance_before integer NOT NULL/);
  assert.match(migration, /balance_after integer NOT NULL/);
});

test('migration upgrades the existing first-version audit table without deleting history', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS behavior_category/);
  assert.match(migration, /DROP CONSTRAINT IF EXISTS card_admin_actions_action_type_check/);
  assert.doesNotMatch(migration, /DROP TABLE/);
});

test('self-registered card teachers receive a card-only role', () => {
  assert.match(migration, /FUNCTION public\.register_card_teacher\(/);
  assert.match(migration, /'CARD_TEACHER'/);
  assert.match(migration, /USERNAME_ALREADY_EXISTS/);
});

test('card-teacher and admin sessions use separate dashboard entry points', () => {
  assert.match(cardTeacherAccess, /vocab_journey_card_teacher/);
  assert.match(cardTeacherAccess, /\/card-teacher\/dashboard/);
  assert.match(cardTeacherDashboard, /vocab_journey_card_teacher/);
  assert.doesNotMatch(cardTeacherDashboard, /vocab_journey_teacher/);
  assert.match(adminCardPage, /vocab_journey_teacher/);
  assert.doesNotMatch(adminCardPage, /vocab_journey_card_teacher/);
});

test('card-teacher login accepts existing teacher usernames case-insensitively', () => {
  assert.match(cardTeacherAccess, /\.ilike\('username', username\.trim\(\)\)/);
  assert.doesNotMatch(cardTeacherAccess, /\.eq\('username', username\.trim\(\)\.toLowerCase\(\)\)/);
});

test('coin awards and deductions use the learning path balance and audit log', () => {
  assert.match(migration, /FUNCTION public\.teacher_adjust_student_coins\(/);
  assert.match(migration, /v_after := v_path\.coins \+ p_amount/);
  assert.match(migration, /IF v_after < 0 THEN RAISE EXCEPTION 'INSUFFICIENT_COINS'/);
  assert.match(migration, /CARD_TEACHER_REWARD/);
  assert.match(migration, /CARD_TEACHER_PENALTY/);
});

test('conduct records require a supported behavior category', () => {
  for (const category of [
    'POSITIVE_BEHAVIOR', 'RESPONSIBILITY', 'VOLUNTEER',
    'DISCIPLINE', 'RULE_VIOLATION', 'OTHER',
  ]) {
    assert.match(migration, new RegExp(`'${category}'`));
  }
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
