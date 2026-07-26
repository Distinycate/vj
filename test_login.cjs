const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ljgpljhszzlneawwpcwt.supabase.co', 'sb_publishable_1q4wrxi1BKsCrKrFCL3_YA_0HL6SQfE');

async function test() {
  const { data, error } = await supabase.from('students').select('*').eq('username', 'เสมา').eq('password', 'ZX123').maybeSingle();
  console.log("Login result:", data, "Error:", error);
}
test();
