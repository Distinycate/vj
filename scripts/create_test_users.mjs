import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Service Role Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser(username, password, roleType, extraDetails = {}) {
  const email = `${username}@school.local`;
  console.log(`Creating Auth User: ${email}...`);

  // 1. Create user in Supabase Auth via Admin API (bypasses email confirmation)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true
  });

  if (authError) {
    console.error(`Error creating auth user for ${username}:`, authError.message);
    return null;
  }

  const userId = authData.user.id;
  console.log(`Successfully created auth user for ${username} (ID: ${userId})`);

  if (roleType === 'STUDENT') {
    // Check/create classroom first
    let classroomId = null;
    const { data: existingClass } = await supabase.from('classrooms').select('id').eq('class_name', 'ม.1/1').maybeSingle();
    if (existingClass) {
      classroomId = existingClass.id;
    } else {
      const { data: newClass } = await supabase.from('classrooms').insert([{ class_name: 'ม.1/1' }]).select().single();
      if (newClass) classroomId = newClass.id;
    }

    console.log(`Creating Student Profile for ${username}...`);
    const { error: profileError } = await supabase.from('students').insert([{
      id: userId,
      student_id: `STD-${username.toUpperCase()}`,
      username: username,
      student_name: `นักเรียนทดสอบ ${username.toUpperCase()}`,
      classroom_id: classroomId,
      academic_year: '2569'
    }]);

    if (profileError) {
      console.error(`Error creating student profile:`, profileError.message);
    } else {
      console.log(`Profile created. Initializing learning path...`);
      // Initial learning path
      await supabase.from('learning_paths').insert([{
        student_id: userId,
        current_rank: 1,
        current_stage: 1,
        coins: 100, // Gift 100 coins for testing shop items!
        exp: 0
      }]);
    }

  } else if (roleType === 'TEACHER' || roleType === 'EXECUTIVE') {
    console.log(`Creating Teacher/Executive Profile for ${username} (Role: ${roleType})...`);
    const { error: teacherError } = await supabase.from('teachers').insert([{
      id: userId,
      username: username,
      name: `${roleType === 'TEACHER' ? 'คุณครู' : 'ผู้บริหาร'} ${username.toUpperCase()}`,
      role: roleType
    }]);

    if (teacherError) {
      console.error(`Error creating teacher profile:`, teacherError.message);
    }
  }

  console.log(`--- Finished ${username} ---`);
}

async function main() {
  // Let's try passwords 'test1', 'test2', 'test3'
  // If your Supabase configuration requires 6+ chars, we will log it.
  console.log("Seeding test accounts...");

  // Student Account (test1)
  await createTestUser('test1', 'test111111', 'STUDENT');

  // Teacher Account (test2)
  await createTestUser('test2', 'test222222', 'TEACHER');

  // Executive Account (test3)
  await createTestUser('test3', 'test333333', 'EXECUTIVE');

  console.log("Seeding complete!");
}

main();
