const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('stage_results').select('*').limit(5);
  console.log('Sample stage results:', data, error ? error : '');
  
  const { count } = await supabase.from('stage_results').select('*', { count: 'exact', head: true });
  console.log('Total stage results:', count);
}
run();
