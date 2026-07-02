const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('Fetching all students...');
  const { data: students, error: studentErr } = await supabase.from('students').select('*');
  if (studentErr) {
    console.error('Error fetching students:', studentErr);
    return;
  }

  const { data: classrooms, error: classErr } = await supabase.from('classrooms').select('*');
  if (classErr) return;

  // Ensure target classrooms exist
  const targetClasses = {};
  for (const g of ['1', '2', '3']) {
    const name = `ม.${g}`;
    let room = classrooms.find(c => c.class_name === name);
    if (!room) {
      console.log(`Creating ${name}...`);
      const { data: newRoom } = await supabase.from('classrooms').insert({ class_name: name }).select().single();
      room = newRoom;
    }
    targetClasses[g] = room.id;
  }

  let fixedCount = 0;
  for (const student of students) {
    // The student_id looks like "ม.2/1-12" or "3/1-15" or "TestClass-178-01"
    const sId = student.student_id || '';
    
    let targetGrade = null;
    if (sId.includes('ม.1') || sId.includes('1/') || sId.includes('M.1')) targetGrade = '1';
    else if (sId.includes('ม.2') || sId.includes('2/') || sId.includes('M.2')) targetGrade = '2';
    else if (sId.includes('ม.3') || sId.includes('3/') || sId.includes('M.3')) targetGrade = '3';
    // default fallback to 1 if we really can't tell, or leave as is.

    if (targetGrade) {
      const targetRoomId = targetClasses[targetGrade];
      if (student.classroom_id !== targetRoomId) {
        await supabase.from('students').update({ classroom_id: targetRoomId }).eq('id', student.id);
        fixedCount++;
        console.log(`Moved student ${student.student_name} (${sId}) to ม.${targetGrade}`);
      }
    }
  }

  console.log(`Migration fixed! Re-assigned ${fixedCount} students to their correct grades based on student_id.`);
  
  // Cleanup old empty classrooms
  const { data: freshStudents } = await supabase.from('students').select('classroom_id');
  const usedRoomIds = new Set(freshStudents.map(s => s.classroom_id));
  
  for (const c of classrooms) {
    if (!usedRoomIds.has(c.id) && !['ม.1', 'ม.2', 'ม.3'].includes(c.class_name)) {
      console.log(`Deleting empty unused room: ${c.class_name}`);
      await supabase.from('classrooms').delete().eq('id', c.id);
    }
  }
}

migrate();
