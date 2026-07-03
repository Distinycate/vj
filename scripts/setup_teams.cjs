const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTeams() {
  console.log('Fetching students...');
  const { data: students, error: studentErr } = await supabase.from('students').select('id');
  if (studentErr) {
    console.error('Error fetching students:', studentErr);
    return;
  }
  
  if (!students || students.length === 0) {
    console.log('No students found.');
    return;
  }

  console.log(`Found ${students.length} students.`);

  let { data: teams, error: teamErr } = await supabase.from('teams').select('id, team_name').eq('team_type', 'school');
  if (teamErr) {
    console.error('Error fetching teams:', teamErr);
    return;
  }

  if (!teams || teams.length === 0) {
    console.log('No school teams found. Seeding default school teams...');
    const defaultTeams = [
      { team_name: 'Phoenix', team_icon: '🔥', team_color: '#ef4444', team_type: 'school' },
      { team_name: 'Ocean', team_icon: '🌊', team_color: '#3b82f6', team_type: 'school' },
      { team_name: 'Thunder', team_icon: '⚡', team_color: '#eab308', team_type: 'school' },
      { team_name: 'Forest', team_icon: '🌿', team_color: '#22c55e', team_type: 'school' },
      { team_name: 'Guardian', team_icon: '🛡️', team_color: '#8b5cf6', team_type: 'school' },
      { team_name: 'Rocket', team_icon: '🚀', team_color: '#f97316', team_type: 'school' }
    ];
    const { error: insertDefaultErr } = await supabase.from('teams').insert(defaultTeams);
    if (insertDefaultErr) {
      console.error('Error inserting default teams:', insertDefaultErr);
    }
    
    // Fetch again
    const { data: newTeams } = await supabase.from('teams').select('id, team_name').eq('team_type', 'school');
    teams = newTeams;
    
    if (!teams || teams.length === 0) {
      console.log('Failed to create default teams.');
      return;
    }
  }
  
  console.log(`Found ${teams.length} school teams.`);

  // Clear existing team members
  console.log('Clearing old team assignments...');
  const { error: delErr } = await supabase.from('team_members').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
  if (delErr) {
    console.error('Error deleting old members:', delErr);
    // Proceeding anyway, maybe there's a constraint, but we can do upsert.
  }

  // Shuffle students
  const shuffledStudents = [...students].sort(() => Math.random() - 0.5);

  const teamAssignments = [];
  shuffledStudents.forEach((student, index) => {
    const team = teams[index % teams.length];
    teamAssignments.push({
      team_id: team.id,
      user_id: student.id,
      assignment_type: 'auto',
      is_active: true
    });
  });

  console.log('Inserting new team assignments...');
  // Insert in batches of 100 to avoid limits
  for (let i = 0; i < teamAssignments.length; i += 100) {
    const batch = teamAssignments.slice(i, i + 100);
    const { error: insertErr } = await supabase.from('team_members').upsert(batch, { onConflict: 'team_id,user_id' });
    if (insertErr) {
      console.error('Error inserting team members:', insertErr);
    }
  }

  console.log('Closing old seasons...');
  await supabase.from('team_battle_seasons').update({ is_active: false }).eq('is_active', true);

  console.log('Creating new monthly season...');
  // End date is end of current month
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const monthNamesThai = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  
  const seasonName = `กิจกรรมประจำเดือน ${monthNamesThai[now.getMonth()]} ${now.getFullYear() + 543}`;

  const { error: seasonErr } = await supabase.from('team_battle_seasons').insert({
    season_name: seasonName,
    scope: 'school',
    start_at: now.toISOString(),
    end_at: endOfMonth.toISOString(),
    is_active: true
  });

  if (seasonErr) {
    console.error('Error creating season:', seasonErr);
  } else {
    console.log(`Created new season: ${seasonName}, ending at ${endOfMonth.toISOString()}`);
  }

  console.log('Done!');
}

setupTeams();
