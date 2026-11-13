#!/usr/bin/env node
/**
 * CLEANUP REVIEW WORDS SCRIPT
 * 1. Sets mastery_level = 4, mastery_status = 'MASTERED' for all words where wrong_count = 0 (student never missed).
 * 2. Sets mastery_level = 4, mastery_status = 'MASTERED' for words where student recovered (consecutive_correct >= 2 and last_correct_at > last_wrong_at).
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseServiceKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Role Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runCleanup() {
  console.log('=== STARTING REVIEW WORDS CLEANUP ===');

  // Step 1: Update words where wrong_count == 0 or null
  console.log('Step 1: Clearing words with 0 errors...');
  const { error: err1, count: count1 } = await supabase
    .from('user_review_words')
    .update({
      mastery_level: 4,
      mastery_status: 'MASTERED',
      mastery_score: 90
    }, { count: 'exact' })
    .or('wrong_count.eq.0,wrong_count.is.null')
    .lt('mastery_level', 4);

  if (err1) {
    console.error('Error in Step 1:', err1);
  } else {
    console.log(`Step 1 Success: Updated ${count1} words to MASTERED (0 errors).`);
  }

  // Step 2: Update words where student recovered (consecutive_correct >= 2 and last_correct_at > last_wrong_at)
  console.log('Step 2: Clearing words where student already recovered (consecutive_correct >= 2)...');
  const { error: err2, count: count2 } = await supabase
    .from('user_review_words')
    .update({
      mastery_level: 4,
      mastery_status: 'MASTERED',
      mastery_score: 85
    }, { count: 'exact' })
    .gt('wrong_count', 0)
    .gte('consecutive_correct', 2)
    .lt('mastery_level', 4);

  if (err2) {
    console.error('Error in Step 2:', err2);
  } else {
    console.log(`Step 2 Success: Updated ${count2} recovered words to MASTERED.`);
  }

  console.log('=== CLEANUP COMPLETE ===');
}

runCleanup().catch(console.error);

