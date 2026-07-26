const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ljgpljhszzlneawwpcwt.supabase.co', 'sb_publishable_1q4wrxi1BKsCrKrFCL3_YA_0HL6SQfE');

async function test() {
  const { data, error } = await supabase.from('learning_paths').select('*').eq('student_id', 'e729ab54-c7bf-4e60-a283-4226a26b81ef').single();
  console.log("Learning Paths:", data, "Error:", error);
}
test();
