const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Check if students have passed boss stages
  const { data: bossStages, error: err1 } = await supabase
    .from('stage_results')
    .select('user_id, stage_number, accuracy, passed')
    .eq('passed', true)
    .in('stage_number', [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    
  console.log('Boss stages passed:', bossStages?.length, err1 ? err1 : '');
  
  if (bossStages && bossStages.length > 0) {
      console.log('Sample boss stages:', bossStages.slice(0, 3));
  }

  // Check analytics_summary
  const { data: analytics, error: err2 } = await supabase
    .from('analytics_summary')
    .select('student_id, pretest_score, posttest_score, learning_gain')
    .order('posttest_score', { ascending: false })
    .limit(5);
    
  console.log('Analytics summary (top post test):', analytics, err2 ? err2 : '');
}

run();
