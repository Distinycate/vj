const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runBackfill(dryRun = true) {
  console.log(`=== STARTING TEAM SCORE BACKFILL (dryRun = ${dryRun}) ===\n`);

  // 1. Get active September season
  const { data: season, error: seasonErr } = await supabase
    .from('team_battle_seasons')
    .select('*')
    .eq('is_active', true)
    .single();

  if (seasonErr || !season) {
    console.error('No active season found:', seasonErr);
    process.exit(1);
  }
  console.log(`Active Season: "${season.season_name}" (${season.id}) [${season.start_at} -> ${season.end_at}]`);

  // 2. Fetch all completed stage attempts during this season
  let allAttempts = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('stage_attempts')
      .select('id, student_id, stage_number, accuracy, score, completed_at, started_at, status')
      .eq('status', 'COMPLETED')
      .gte('completed_at', season.start_at)
      .lte('completed_at', season.end_at)
      .order('completed_at', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching stage attempts:', error);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    allAttempts.push(...data);
    if (data.length < pageSize) break;
    page++;
  }
  console.log(`Found ${allAttempts.length} total completed attempts in season range.`);

  // 3. Filter for passed attempts: accuracy >= 60 and score > 0
  const passedAttempts = allAttempts.filter(
    a => (a.accuracy || 0) >= 60 && (a.score || 0) > 0
  );
  console.log(`Found ${passedAttempts.length} passed attempts (accuracy >= 60, score > 0).`);

  // 4. Fetch internal students
  const studentIds = [...new Set(passedAttempts.map(a => a.student_id))];
  const { data: students, error: studentErr } = await supabase
    .from('students')
    .select('id, username, user_type, classroom_id')
    .in('id', studentIds);

  if (studentErr) {
    console.error('Error fetching students:', studentErr);
    process.exit(1);
  }

  const internalStudentMap = new Map();
  students?.forEach(s => {
    if ((s.user_type || 'INTERNAL') === 'INTERNAL' && s.classroom_id) {
      internalStudentMap.set(s.id, s);
    }
  });
  console.log(`Found ${internalStudentMap.size} internal students with classroom.`);

  // Filter passed attempts to internal students
  const eligibleAttempts = passedAttempts.filter(a => internalStudentMap.has(a.student_id));
  console.log(`Eligible passed attempts from internal students: ${eligibleAttempts.length}.`);

  // 5. Fetch existing team score events during this season to check what is already credited
  let allEvents = [];
  page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('team_score_events')
      .select('id, user_id, event_type, points, metadata, created_at')
      .eq('season_id', season.id)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching team score events:', error);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    allEvents.push(...data);
    if (data.length < pageSize) break;
    page++;
  }
  console.log(`Existing team score events in season: ${allEvents.length}`);

  // Find set of attemptIds already credited
  const creditedAttemptIds = new Set();
  allEvents.forEach(e => {
    if (e.metadata?.attemptId) {
      creditedAttemptIds.add(e.metadata.attemptId);
    }
  });
  console.log(`Already credited attempts with attemptId: ${creditedAttemptIds.size}`);

  // Also, for legacy events before attemptId was added (up to Sep 16 07:28 UTC):
  // Find the timestamp of the last legacy event:
  const sortedEvents = allEvents.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const lastLegacyEventTime = sortedEvents.length > 0 ? new Date(sortedEvents[0].created_at) : new Date(season.start_at);
  console.log(`Last recorded event timestamp: ${lastLegacyEventTime.toISOString()}`);

  // Filter attempts that have NOT been credited:
  // An attempt is uncredited if:
  // 1. It is not in creditedAttemptIds, AND
  // 2. Its completed_at is AFTER lastLegacyEventTime (or within 5 seconds of it)
  const uncreditedAttempts = eligibleAttempts.filter(a => {
    if (creditedAttemptIds.has(a.id)) return false;
    const completedDate = new Date(a.completed_at || a.started_at);
    // If completed after the last event timestamp, it is definitely uncredited
    return completedDate > lastLegacyEventTime;
  });

  console.log(`\n>>> UNCREDITED ATTEMPTS TO BACKFILL: ${uncreditedAttempts.length} <<<\n`);

  if (uncreditedAttempts.length === 0) {
    console.log('No attempts need backfilling. All scores are up to date!');
    return;
  }

  // 6. Ensure team memberships for all involved students
  const uncreditedStudentIds = [...new Set(uncreditedAttempts.map(a => a.student_id))];
  console.log(`Ensuring team memberships for ${uncreditedStudentIds.length} students...`);
  for (const studentId of uncreditedStudentIds) {
    if (!dryRun) {
      await supabase.rpc('ensure_student_team_memberships', { p_student_id: studentId });
    }
  }

  // Fetch active team memberships for all involved students
  const { data: teamMembers, error: tmErr } = await supabase
    .from('team_members')
    .select('team_id, user_id, is_active, teams!inner(id, team_name, team_type, is_active)')
    .in('user_id', uncreditedStudentIds)
    .eq('is_active', true)
    .eq('teams.is_active', true);

  if (tmErr) {
    console.error('Error fetching team memberships:', tmErr);
    process.exit(1);
  }

  const studentTeamsMap = new Map();
  teamMembers?.forEach(tm => {
    if (!studentTeamsMap.has(tm.user_id)) {
      studentTeamsMap.set(tm.user_id, []);
    }
    studentTeamsMap.get(tm.user_id).push(tm.team_id);
  });

  // 7. Prepare events to insert
  const eventsToInsert = [];
  let totalScoreToAdd = 0;

  for (const att of uncreditedAttempts) {
    const studentTeams = studentTeamsMap.get(att.student_id) || [];
    if (studentTeams.length === 0) {
      console.warn(`Student ${att.student_id} has no active teams found.`);
      continue;
    }

    const isBoss = att.stage_number % 10 === 0;
    const baseEventType = isBoss ? 'boss_completed' : 'stage_completed';
    const basePoints = isBoss ? 30 : 10;
    const accuracy = att.accuracy || 0;
    const timestamp = att.completed_at || att.started_at;

    for (const teamId of studentTeams) {
      eventsToInsert.push({
        team_id: teamId,
        user_id: att.student_id,
        season_id: season.id,
        event_type: baseEventType,
        points: basePoints,
        metadata: { stageNumber: att.stage_number, accuracy, attemptId: att.id, backfilled: true },
        created_at: timestamp,
      });
      totalScoreToAdd += basePoints;
    }

    // Accuracy bonus
    let bonusEventType = null;
    let bonusPoints = 0;
    if (accuracy >= 100) {
      bonusEventType = 'perfect_bonus';
      bonusPoints = 25;
    } else if (accuracy >= 90) {
      bonusEventType = 'accuracy_bonus';
      bonusPoints = 15;
    } else if (accuracy >= 80) {
      bonusEventType = 'accuracy_bonus';
      bonusPoints = 10;
    } else if (accuracy >= 70) {
      bonusEventType = 'accuracy_bonus';
      bonusPoints = 5;
    }

    if (bonusEventType && bonusPoints > 0) {
      for (const teamId of studentTeams) {
        eventsToInsert.push({
          team_id: teamId,
          user_id: att.student_id,
          season_id: season.id,
          event_type: bonusEventType,
          points: bonusPoints,
          metadata: { stageNumber: att.stage_number, accuracy, attemptId: att.id, backfilled: true },
          created_at: timestamp,
        });
        totalScoreToAdd += bonusPoints;
      }
    }
  }

  console.log(`Generated ${eventsToInsert.length} score event rows across ${uncreditedAttempts.length} attempts.`);
  console.log(`Total points to be credited: ${totalScoreToAdd}`);

  if (dryRun) {
    console.log('\n[DRY RUN COMPLETE] No changes were written to the database.');
    console.log('Run with dryRun = false to commit the backfill.');
    return;
  }

  // 8. Insert in batches of 100
  console.log(`\nInserting ${eventsToInsert.length} events in batches...`);
  const batchSize = 100;
  for (let i = 0; i < eventsToInsert.length; i += batchSize) {
    const batch = eventsToInsert.slice(i, i + batchSize);
    const { error: insertErr } = await supabase.from('team_score_events').insert(batch);
    if (insertErr) {
      console.error(`Error inserting batch at ${i}:`, insertErr);
      process.exit(1);
    }
    process.stdout.write(`Inserted ${Math.min(i + batchSize, eventsToInsert.length)} / ${eventsToInsert.length}\r`);
  }

  console.log(`\n\n=== BACKFILL SUCCESSFULLY COMPLETED ===`);
}

// Check CLI arguments
const isLive = process.argv.includes('--live');
runBackfill(!isLive);
