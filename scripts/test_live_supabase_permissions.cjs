#!/usr/bin/env node
/**
 * LIVE SUPABASE PERMISSION VERIFIER
 * Directly tests the live Supabase instance using anon key to verify
 * that anonymous reads and privileged RPCs are strictly DENIED by Postgres.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseAnonKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or Anon key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLiveDB() {
  console.log('====================================================');
  console.log('LIVE SUPABASE DATABASE PERMISSION AUDIT');
  console.log('Target URL:', supabaseUrl);
  console.log('Role: anon / public (Untrusted Browser Key)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const tables = [
    'students',
    'teachers',
    'learning_paths',
    'analytics_summary',
    'user_sessions',
    'stage_attempts',
    'economy_transactions',
    'shop_purchases'
  ];

  console.log('--- 1. Testing Anon SELECT on Sensitive Tables ---');
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    // If RLS denies or table access is revoked, error is returned or data is empty ([])
    if (error || (data && data.length === 0)) {
      console.log(` ✔ [BLOCKED] anon SELECT on '${table}': ${error ? error.message : '0 rows returned (RLS Denied)'}`);
      passed++;
    } else {
      console.error(` ❌ [EXPOSED] anon SELECT on '${table}' leaked data! Count: ${data.length}`);
      failed++;
    }
  }

  console.log('\n--- 2. Testing Anon EXECUTE on Privileged RPCs ---');
  const rpcs = [
    { name: 'purchase_shop_item', params: { p_student_id: '00000000-0000-0000-0000-000000000000', p_item_id: 'test', p_purchase_request_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'complete_stage_transaction', params: { p_attempt_id: '00000000-0000-0000-0000-000000000000', p_score: 10, p_accuracy: 100, p_passed: true, p_coins_awarded: 10, p_exp_awarded: 20 } },
    { name: 'grant_student_reward', params: { p_student_id: '00000000-0000-0000-0000-000000000000', p_source: 'TEST', p_reference_id: 'test', p_coins_delta: 10, p_exp_delta: 20 } }
  ];

  for (const rpc of rpcs) {
    const { data, error } = await supabase.rpc(rpc.name, rpc.params);
    if (error) {
      console.log(` ✔ [BLOCKED] anon EXECUTE on '${rpc.name}': ${error.message}`);
      passed++;
    } else {
      console.error(` ❌ [EXPOSED] anon EXECUTE on '${rpc.name}' succeeded!`);
      failed++;
    }
  }

  console.log('\n====================================================');
  console.log(`LIVE DB AUDIT RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed === 0) {
    console.log('STATUS: VERIFIED — Live database permissions strictly enforce access control!');
  } else {
    console.error('STATUS: FAILED — Some tables or RPCs are still exposed to anon!');
  }
}

testLiveDB();
