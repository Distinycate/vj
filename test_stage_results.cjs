const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('stage_results')
    .select('*')
    .eq('passed', true)
    .in('stage_number', [10, 20, 30, 40, 50])
    .limit(5);
  console.log('Past boss results:', data, error ? error : '');
  
  // also check if any exist at all
  const { count } = await supabase.from('stage_results')
    .select('*', { count: 'exact', head: true })
    .in('stage_number', [10, 20, 30, 40, 50])
    .eq('passed', true);
  console.log('Total past boss results:', count);
}
run();
