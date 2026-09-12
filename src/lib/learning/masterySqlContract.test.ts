import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  SRS_INTERVAL_HOURS,
  MIN_RESPONSE_TIME_MS,
  MAX_RESPONSE_TIME_MS,
} from './masteryModel.ts';

test('SQL Migration matches TypeScript Reference Model contract', () => {
  const sqlPath = path.join(process.cwd(), 'MIGRATION_MASTERY_V2.sql');
  assert.ok(fs.existsSync(sqlPath), 'MIGRATION_MASTERY_V2.sql must exist');

  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // Check table creation
  assert.match(
    sqlContent,
    /CREATE TABLE IF NOT EXISTS public\.word_attempt_history/i,
    'Creates word_attempt_history table'
  );

  // Check schema constraints
  assert.match(
    sqlContent,
    /CHECK \(mastery_status IN \('LEARNING', 'FAMILIAR', 'MASTERED'\)\)/i,
    'Enforces valid mastery statuses'
  );
  assert.match(
    sqlContent,
    /CHECK \(review_step >= 0 AND review_step <= 5\)/i,
    'Enforces review_step bounds 0..5'
  );

  // Check SRS Intervals match in SQL
  assert.equal(SRS_INTERVAL_HOURS[0], 4);
  assert.equal(SRS_INTERVAL_HOURS[1], 24);
  assert.equal(SRS_INTERVAL_HOURS[2], 72);
  assert.equal(SRS_INTERVAL_HOURS[3], 168);
  assert.equal(SRS_INTERVAL_HOURS[4], 336);
  assert.equal(SRS_INTERVAL_HOURS[5], 720);

  assert.match(sqlContent, /WHEN 0 THEN 4/);
  assert.match(sqlContent, /WHEN 1 THEN 24/);
  assert.match(sqlContent, /WHEN 2 THEN 72/);
  assert.match(sqlContent, /WHEN 3 THEN 168/);
  assert.match(sqlContent, /WHEN 4 THEN 336/);
  assert.match(sqlContent, /ELSE 720/);

  // Check Clamping
  assert.equal(MIN_RESPONSE_TIME_MS, 300);
  assert.equal(MAX_RESPONSE_TIME_MS, 60000);
  assert.match(sqlContent, /GREATEST\(300, LEAST\(60000/);

  // Check Anti-Grinding 24h retention constraint in SQL
  assert.match(sqlContent, /retention_interval >= interval '24 hours'/i);
  assert.match(sqlContent, /consecutive_correct >= 5/);
  assert.match(sqlContent, /raw_score >= 85\.0/);
  assert.match(sqlContent, /successful_review_count >= 1/);

  // Check Conservative backfill avoids MASTERED
  assert.match(sqlContent, /mastery_level.*>=.*4/i);
  assert.match(sqlContent, /80\.00/i);
  assert.doesNotMatch(
    sqlContent,
    /UPDATE.*SET.*mastery_status = 'MASTERED'/i,
    'Backfill MUST NEVER set legacy records to MASTERED directly'
  );

  // Check RLS protection & server-established identity boundary
  assert.match(sqlContent, /ALTER TABLE public\.word_attempt_history ENABLE ROW LEVEL SECURITY/i);
  assert.match(sqlContent, /REVOKE ALL ON public\.word_attempt_history FROM PUBLIC, anon, authenticated/i);
  assert.match(sqlContent, /GRANT ALL ON public\.word_attempt_history TO service_role/i);

  // Check Atomic Unified Completion RPC (Type A: Single Transaction)
  assert.match(
    sqlContent,
    /CREATE OR REPLACE FUNCTION public\.complete_stage_with_mastery_v2/i,
    'Defines unified atomic complete_stage_with_mastery_v2'
  );
  assert.match(
    sqlContent,
    /FOR UPDATE/i,
    'Enforces FOR UPDATE row lock for attempt idempotency'
  );
  assert.match(
    sqlContent,
    /v_attempt\.status = 'COMPLETED'/i,
    'Checks completed state to prevent duplicate rewards and mastery writes'
  );
  assert.match(
    sqlContent,
    /INSERT INTO public\.economy_transactions/i,
    'Logs economy transaction inside unified RPC'
  );
  assert.match(
    sqlContent,
    /public\.record_word_attempt_v2/i,
    'Records word attempt mastery within unified transaction'
  );
  assert.match(
    sqlContent,
    /REVOKE ALL ON FUNCTION public\.complete_stage_with_mastery_v2 FROM PUBLIC, anon, authenticated/i
  );
  assert.match(
    sqlContent,
    /GRANT EXECUTE ON FUNCTION public\.complete_stage_with_mastery_v2 TO service_role/i
  );
});
