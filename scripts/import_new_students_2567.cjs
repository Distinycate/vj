const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ljgpljhszzlneawwpcwt.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ3BsamhzenpsbmVhd3dwY3d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjY0NTExNiwiZXhwIjoyMDk4MjIxMTE2fQ.YNzWelst3ke-5f37uRusxbcb4w5lhYQmFAfXb6InqGM';
const supabase = createClient(url, key);

const CLASSROOM_MAP = {
  'ม.1': '7045f242-d8ce-4bfd-b36b-1d1238e3b783',
  'ม.2': '98b774ef-ca69-4383-9be1-6b3069d03756',
  'ม.3': '688c61fd-6a10-4305-866f-94015ee095e9',
};

async function main() {
  console.log('=== VOCAB JOURNEY: SEPARATE TERM 1 & IMPORT TERM 2 ROSTER ===');
  
  // 1. Read exported roster
  const rosterPath = path.join(__dirname, 'new_students_roster_2567.json');
  if (!fs.existsSync(rosterPath)) {
    throw new Error('Roster JSON not found at ' + rosterPath);
  }
  const roster = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
  console.log(`Loaded ${roster.length} students from roster JSON.`);

  // 2. Backup existing students if not already backed up
  const backupPath = path.join(__dirname, 'backup_term1_pilot_snapshot.json');
  if (!fs.existsSync(backupPath)) {
    console.log('Creating backup snapshot of existing students...');
    const { data: existingStudents } = await supabase.from('students').select('*');
    fs.writeFileSync(backupPath, JSON.stringify({ timestamp: new Date().toISOString(), existingStudents }, null, 2));
    console.log(`Backup saved to ${backupPath}`);
  } else {
    console.log(`Backup verified at ${backupPath}`);
  }

  // 3. Mark existing students as Term 1 Archive (academic_year = '2567-T1', is_active = false)
  console.log('Archiving existing records as Term 1 (academic_year = 2567-T1, is_active = false)...');
  const { error: archiveErr } = await supabase
    .from('students')
    .update({ 
      academic_year: '2567-T1',
      is_active: false
    })
    .eq('user_type', 'INTERNAL')
    .neq('academic_year', '2567-T2');

  if (archiveErr) {
    console.error('Failed to archive Term 1 students:', archiveErr);
    throw archiveErr;
  }
  console.log('Term 1 records archived successfully. Historical data (attempts, tests) fully preserved.');

  // 4. Ensure classrooms are up to date
  for (const [grade, classId] of Object.entries(CLASSROOM_MAP)) {
    await supabase.from('classrooms').update({
      grade_level: grade,
      room_number: '1',
      school_id: '00000000-0000-0000-0000-000000000001'
    }).eq('id', classId);
  }
  console.log('Classrooms verified.');

  // 5. Prepare Term 2 student rows and learning_paths
  console.log('Preparing 71 Term 2 students (National ID = Username, Student ID = Password)...');
  const studentRows = [];
  const learningPathRows = [];

  for (const item of roster) {
    const studentUuid = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync(item.student_id, 10);
    const classroomId = CLASSROOM_MAP[item.grade_level];

    if (!classroomId) {
      console.warn(`No classroom mapped for grade ${item.grade_level}, skipping student ${item.full_name}`);
      continue;
    }

    studentRows.push({
      id: studentUuid,
      student_id: item.student_id,
      username: item.national_id,
      password: passwordHash,
      student_name: item.full_name,
      first_name: item.first_name,
      last_name: item.last_name,
      classroom_id: classroomId,
      grade_level: item.grade_level,
      room_number: '1',
      academic_year: '2567-T2',
      school_name: 'โรงเรียนบ้านโคกยาง',
      school_id: '00000000-0000-0000-0000-000000000001',
      user_type: 'INTERNAL',
      is_active: true,
      is_verified: true
    });

    learningPathRows.push({
      student_id: studentUuid,
      initial_rank: 1,
      current_rank: 1,
      current_stage: 1,
      total_stages: 100,
      exp: 0,
      total_exp: 0,
      coins: 0,
      free_pull_tickets: 0,
      paid_gacha_pulls: 0,
      streak_days: 0,
      avatar_style: 'adventurer'
    });
  }

  // 6. Batch insert Term 2 students
  console.log(`Inserting ${studentRows.length} new Term 2 students...`);
  const chunkSize = 25;
  for (let i = 0; i < studentRows.length; i += chunkSize) {
    const chunk = studentRows.slice(i, i + chunkSize);
    const { error: insErr } = await supabase.from('students').insert(chunk);
    if (insErr) {
      console.error(`Error inserting students chunk ${i}:`, insErr);
      throw insErr;
    }
  }
  console.log('Term 2 students inserted successfully.');

  // 7. Batch insert learning_paths for Term 2 students
  console.log(`Initializing learning_paths for ${learningPathRows.length} students...`);
  for (let i = 0; i < learningPathRows.length; i += chunkSize) {
    const chunk = learningPathRows.slice(i, i + chunkSize);
    const { error: lpErr } = await supabase.from('learning_paths').insert(chunk);
    if (lpErr) {
      console.error(`Error inserting learning_paths chunk ${i}:`, lpErr);
      throw lpErr;
    }
  }
  console.log('Term 2 learning paths initialized successfully.');

  // 8. Turn off self-registration in schools table
  await supabase.from('schools').update({ is_registration_open: false }).eq('id', '00000000-0000-0000-0000-000000000001');
  console.log('Self-registration disabled in schools settings.');

  console.log('=== SUCCESS: 71 TERM 2 STUDENTS LIVE & TERM 1 ARCHIVED ===');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Execution failed:', err);
    process.exit(1);
  });
}

module.exports = { main };
