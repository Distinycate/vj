const fs = require('fs');
const bcrypt = require('bcryptjs');

const students = JSON.parse(fs.readFileSync('src/data/students_season2.json', 'utf-8'));

async function main() {
  const hashes = {};
  for (const s of students) {
    const sid = s.sid;
    if (!hashes[sid]) {
      hashes[sid] = await bcrypt.hash(sid, 10);
    }
  }

  const sqlLines = [
    '-- ====================================================',
    '-- Vocab Journey: Season 2 Student Accounts Setup',
    '-- Total Students: 71 (ม.1: 25, ม.2: 20, ม.3: 26)',
    '-- Username: 13-digit National ID (เลขประจำตัวประชาชน)',
    '-- Password: 4-digit Student ID (เลขประจำตัวนักเรียน)',
    '-- ====================================================',
    '',
    '-- 1. Ensure classrooms exist',
    'INSERT INTO public.classrooms (grade_level, room_number, class_name)',
    'VALUES ',
    "  ('ม.1', '1', 'ม.1/1'),",
    "  ('ม.2', '1', 'ม.2/1'),",
    "  ('ม.3', '1', 'ม.3/1')",
    'ON CONFLICT (grade_level, room_number) DO NOTHING;',
    ''
  ];

  for (const s of students) {
    const fullname = `${s.prefix}${s.fname} ${s.lname}`;
    const hp = hashes[s.sid];
    const { grade, room, nid, sid, fname, lname } = s;

    sqlLines.push(`-- ${grade}/1 | ${sid} | ${fullname}
DO $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_class_id FROM public.classrooms WHERE grade_level = '${grade}' AND room_number = '${room}' LIMIT 1;
    
    SELECT id INTO v_student_id FROM public.students WHERE username = '${nid}' OR student_id = '${sid}' LIMIT 1;
    
    IF v_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET username = '${nid}',
            student_id = '${sid}',
            password = '${hp}',
            student_name = '${fullname}',
            first_name = '${fname}',
            last_name = '${lname}',
            grade_level = '${grade}',
            room_number = '${room}',
            classroom_id = v_class_id,
            user_type = 'INTERNAL',
            is_active = true,
            is_verified = true
        WHERE id = v_student_id;
    ELSE
        v_student_id := gen_random_uuid();
        INSERT INTO public.students (id, username, student_id, password, student_name, first_name, last_name, grade_level, room_number, classroom_id, user_type, is_active, is_verified)
        VALUES (v_student_id, '${nid}', '${sid}', '${hp}', '${fullname}', '${fname}', '${lname}', '${grade}', '${room}', v_class_id, 'INTERNAL', true, true);
    END IF;

    -- Ensure learning_paths at stage 1
    INSERT INTO public.learning_paths (student_id, current_stage, current_rank, coins, exp, total_exp, free_pull_tickets, study_streak)
    VALUES (v_student_id, 1, 1, 0, 0, 0, 0, 0)
    ON CONFLICT (student_id) DO UPDATE SET current_stage = 1, campaign_completed_at = NULL;
END $$;
`);
  }

  fs.writeFileSync('scripts/import_students_season2.sql', sqlLines.join('\n'), 'utf-8');
  console.log('Successfully generated scripts/import_students_season2.sql');
}

main().catch(console.error);
