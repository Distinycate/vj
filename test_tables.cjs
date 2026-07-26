const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: b, error } = await supabase.from('boss_stages').select('*').limit(5);
  console.log('boss_stages:', b, error ? error : '');
  
  const { data: s, error2 } = await supabase.from('stage_results').select('*').limit(5);
  console.log('stage_results:', s, error2 ? error2 : '');
}
run();
