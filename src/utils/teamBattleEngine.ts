import { supabase } from './supabase/client';

export type TeamScoreEvent = 'stage_completed' | 'boss_completed' | 'accuracy_bonus' | 'perfect_bonus' | 'review_completed' | 'wrong_word_mastered' | 'streak_bonus' | 'participation_bonus';

export async function autoAssignTeamForStudent(userId: string) {
  try {
    // 1. Get Student Info
    const { data: student } = await supabase.from('students').select('*, classrooms(*)').eq('id', userId).single();
    if (!student || !student.classroom_id) return;
    const gradeLevel = student.classrooms?.class_name?.substring(0, 3) || 'ม.1';

    // 2. Check if already assigned
    const { data: existingMemberships } = await supabase.from('team_members').select('*, teams(team_type)').eq('user_id', userId);
    const hasClassTeam = existingMemberships?.some(m => m.teams?.team_type === 'class');
    const hasSchoolTeam = existingMemberships?.some(m => m.teams?.team_type === 'school');

    if (hasClassTeam && hasSchoolTeam) return; // Already fully assigned

    // --- ASSIGN CLASS TEAM ---
    if (!hasClassTeam) {
      let { data: classTeams } = await supabase.from('teams').select('*').eq('team_type', 'class').eq('classroom_id', student.classroom_id);
      
      if (!classTeams || classTeams.length === 0) {
        // Create 4 initial class teams
        const newTeams = [
          { team_name: 'Lion', team_icon: '🦁', team_color: '#fbbf24', team_type: 'class', classroom_id: student.classroom_id, grade_level: gradeLevel },
          { team_name: 'Eagle', team_icon: '🦅', team_color: '#38bdf8', team_type: 'class', classroom_id: student.classroom_id, grade_level: gradeLevel },
          { team_name: 'Dragon', team_icon: '🐉', team_color: '#ef4444', team_type: 'class', classroom_id: student.classroom_id, grade_level: gradeLevel },
          { team_name: 'Tiger', team_icon: '🐯', team_color: '#f97316', team_type: 'class', classroom_id: student.classroom_id, grade_level: gradeLevel },
        ];
        const { data: created } = await supabase.from('teams').insert(newTeams).select();
        classTeams = created || [];
      }

      if (classTeams && classTeams.length > 0) {
        // Find team with least members
        const { data: membersCount } = await supabase.from('team_members').select('team_id');
        const counts = classTeams.map(t => ({
          id: t.id,
          count: membersCount?.filter(m => m.team_id === t.id).length || 0
        }));
        
        const minCount = Math.min(...counts.map(c => c.count));
        const lowestTeams = counts.filter(c => c.count === minCount);
        const randomTeam = lowestTeams[Math.floor(Math.random() * lowestTeams.length)];
        
        await supabase.from('team_members').insert([{ team_id: randomTeam.id, user_id: userId }]);
      }
    }

    // --- ASSIGN SCHOOL TEAM ---
    if (!hasSchoolTeam) {
      const { data: schoolTeams } = await supabase.from('teams').select('*').eq('team_type', 'school');
      if (schoolTeams && schoolTeams.length > 0) {
        // Find team with least members
        const { data: membersCount } = await supabase.from('team_members').select('team_id');
        const counts = schoolTeams.map(t => ({
          id: t.id,
          count: membersCount?.filter(m => m.team_id === t.id).length || 0
        }));
        
        const minCount = Math.min(...counts.map(c => c.count));
        const lowestTeams = counts.filter(c => c.count === minCount);
        const randomTeam = lowestTeams[Math.floor(Math.random() * lowestTeams.length)];
        
        await supabase.from('team_members').insert([{ team_id: randomTeam.id, user_id: userId }]);
      }
    }
  } catch (err) {
    console.error("Error in autoAssignTeamForStudent:", err);
  }
}

export async function createTeamScoreEvent(params: {
  userId: string;
  eventType: TeamScoreEvent;
  points: number;
  metadata?: any;
}) {
  try {
    // Get active season
    const { data: season } = await supabase.from('team_battle_seasons').select('id').eq('is_active', true).eq('scope', 'school').maybeSingle();
    
    // Get user's teams
    const { data: memberships } = await supabase.from('team_members').select('team_id').eq('user_id', params.userId).eq('is_active', true);
    
    if (!memberships || memberships.length === 0) return;

    const events = memberships.map(m => ({
      team_id: m.team_id,
      user_id: params.userId,
      season_id: season ? season.id : null,
      event_type: params.eventType,
      points: params.points,
      metadata: params.metadata || {}
    }));

    await supabase.from('team_score_events').insert(events);
  } catch (err) {
    console.error("Error creating team score event:", err);
  }
}

export async function calculateTeamScore(teamId: string) {
  try {
    const { data: events } = await supabase.from('team_score_events').select('*').eq('team_id', teamId);
    if (!events) return { totalScore: 0, finalScore: 0, activeMembersRate: 0 };

    const { data: members } = await supabase.from('team_members').select('user_id').eq('team_id', teamId);
    const totalMembers = members?.length || 1;

    let totalScore = 0;
    const activeUsers = new Set<string>();

    events.forEach(e => {
      totalScore += Number(e.points) || 0;
      activeUsers.add(e.user_id);
    });

    const activeMembersCount = activeUsers.size;
    const activeMembersRate = activeMembersCount / totalMembers;

    // Collaboration Bonus
    let bonusMultiplier = 1;
    if (activeMembersRate >= 0.9) bonusMultiplier = 1.5;
    else if (activeMembersRate >= 0.7) bonusMultiplier = 1.25;
    else if (activeMembersRate >= 0.5) bonusMultiplier = 1.1;

    const averageMemberScore = totalScore / totalMembers;

    // Fair Play Rule
    // finalTeamScore = (averageMemberScore * 0.6) + (totalTeamScore * 0.4) + activeParticipationBonus
    const participationBonus = activeMembersRate >= 0.7 ? 100 : 0;
    const finalScore = Math.round(((averageMemberScore * 0.6) + (totalScore * 0.4)) * bonusMultiplier) + participationBonus;

    return {
      totalScore,
      finalScore,
      activeMembersRate: Math.round(activeMembersRate * 100),
      activeMembersCount,
      totalMembers,
      eventsCount: events.length
    };
  } catch (err) {
    console.error("Error calculating team score:", err);
    return { totalScore: 0, finalScore: 0, activeMembersRate: 0 };
  }
}
