const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('post_tests').select('*');
  console.log('Post tests:', data, error ? error : '');
  
  const { data: lp } = await supabase.from('learning_paths').select('user_id, current_stage').order('current_stage', {ascending: false}).limit(10);
  console.log('Top stages:', lp);
}
run();
