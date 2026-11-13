const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: lp } = await supabase.from('learning_paths').select('*').limit(1);
  console.log('lp columns:', Object.keys(lp[0] || {}));
  
  // Find users with stage > 10
  const { data: topUsers } = await supabase.from('learning_paths').select('student_id, current_stage').gte('current_stage', 10).order('current_stage', {ascending: false});
  console.log('Users with stage >= 10:', topUsers?.length);
  
  if (topUsers && topUsers.length > 0) {
      console.log('Max stage:', topUsers[0].current_stage);
  }
}
run();
