const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getRankFromStage(stage) {
  if (stage >= 81) return 5;
  if (stage >= 61) return 4;
  if (stage >= 41) return 3;
  if (stage >= 21) return 2;
  return 1;
}

async function backfillRanks() {
  console.log('Fetching all learning paths...');
  const { data: paths, error: fetchErr } = await supabase
    .from('learning_paths')
    .select('student_id, current_stage, current_rank');

  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    process.exit(1);
  }

  console.log(`Found ${paths.length} learning paths.`);
  let updatedCount = 0;
  const now = new Date().toISOString();

  for (const lp of paths) {
    const curRank = lp.current_rank || 1;
    const stage = lp.current_stage || 1;
    const targetRank = Math.max(curRank, getRankFromStage(stage));

    if (targetRank > curRank) {
      const { error: updateErr } = await supabase
        .from('learning_paths')
        .update({
          current_rank: targetRank,
          rank_updated_at: now,
        })
        .eq('student_id', lp.student_id);

      if (updateErr) {
        console.error(`Failed to update student ${lp.student_id}:`, updateErr);
      } else {
        updatedCount++;
        console.log(`Student ${lp.student_id}: Stage ${stage} -> Promoted Rank ${curRank} to ${targetRank}`);
      }
    }
  }

  console.log(`\nBackfill complete! Promoted ${updatedCount} students.`);
}

backfillRanks();

