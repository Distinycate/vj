const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('team_members').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Update team_members:', error ? error.message : 'Success');
}
run();
