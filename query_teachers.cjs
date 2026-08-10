const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('teachers').select('id, name, username, role, is_active').ilike('username', 'distinycate1313').eq('password', 'plasser1313').eq('is_active', true).in('role', ['CARD_TEACHER', 'TEACHER', 'ADMIN']).maybeSingle();
  console.log(data, error);
}
run();
