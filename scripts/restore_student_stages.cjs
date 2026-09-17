const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function fetchAllRows(tableName, selectQuery, filterFn) {
  let allData = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabaseAdmin
      .from(tableName)
      .select(selectQuery)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (filterFn) {
      query = filterFn(query);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      allData = allData.concat(data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }

  return allData;
}

async function restoreStudentStages() {
  console.log('--- STARTING COMPREHENSIVE STUDENT STAGE RESTORATION ---');

  const [
    students,
    sspList,
    srList,
    attemptsList,
    stagesList
  ] = await Promise.all([
    fetchAllRows('students', 'id, student_name, username, learning_paths(current_stage, current_rank, initial_rank)'),
    fetchAllRows('student_stage_progress', 'student_id, stage_number, completed', q => q.eq('completed', true)),
    fetchAllRows('stage_results', 'user_id, stage_number, passed', q => q.eq('passed', true)),
    fetchAllRows('attempts', 'student_id, stage_id, is_passed', q => q.eq('is_passed', true)),
    fetchAllRows('stages', 'id, stage_number')
  ]);

  console.log(`Loaded: ${students.length} students, ${sspList.length} stage progress rows, ${srList.length} stage results, ${attemptsList.length} attempts`);

  const stageMap = new Map((stagesList || []).map(s => [s.id, s.stage_number]));

  // Max passed from student_stage_progress
  const sspMaxMap = new Map();
  for (const row of sspList || []) {
    const cur = sspMaxMap.get(row.student_id) || 0;
    if (row.stage_number > cur) sspMaxMap.set(row.student_id, row.stage_number);
  }

  // Max passed from stage_results
  const srMaxMap = new Map();
  for (const row of srList || []) {
    const cur = srMaxMap.get(row.user_id) || 0;
    if (row.stage_number > cur) srMaxMap.set(row.user_id, row.stage_number);
  }

  // Max passed from attempts
  const attMaxMap = new Map();
  for (const row of attemptsList || []) {
    const stageNum = stageMap.get(row.stage_id) || 0;
    const cur = attMaxMap.get(row.student_id) || 0;
    if (stageNum > cur) attMaxMap.set(row.student_id, stageNum);
  }

  let restoredCount = 0;
  const restorationLog = [];

  for (const s of students || []) {
    const lp = Array.isArray(s.learning_paths) ? s.learning_paths[0] : s.learning_paths;
    const currentStage = lp?.current_stage || 1;

    const sspMax = sspMaxMap.get(s.id) || 0;
    const srMax = srMaxMap.get(s.id) || 0;
    const attMax = attMaxMap.get(s.id) || 0;
    const maxPassed = Math.max(sspMax, srMax, attMax);

    if (maxPassed > 0) {
      const targetStage = Math.min(100, maxPassed + 1);

      if (currentStage < targetStage) {
        // Restore to targetStage
        const { error: updateErr } = await supabaseAdmin
          .from('learning_paths')
          .update({
            current_stage: targetStage,
            last_active_date: new Date().toISOString()
          })
          .eq('student_id', s.id);

        if (updateErr) {
          console.error(`Failed to restore student ${s.student_name}:`, updateErr);
        } else {
          restoredCount++;
          restorationLog.push({
            studentId: s.id,
            username: s.username,
            name: s.student_name,
            oldStage: currentStage,
            restoredStage: targetStage,
            evidence: { sspMax, srMax, attMax }
          });
        }
      }
    }
  }

  console.log(`\n✅ RESTORATION COMPLETED: ${restoredCount} students restored.`);
  console.table(restorationLog.map(r => ({
    username: r.username,
    name: r.name,
    'Old Stage': r.oldStage,
    'Restored Stage': r.restoredStage,
    'Max Completed Stage': Math.max(r.evidence.sspMax, r.evidence.srMax, r.evidence.attMax)
  })));

  return restorationLog;
}

restoreStudentStages().catch(console.error);
