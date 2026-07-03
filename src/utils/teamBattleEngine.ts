import { supabase } from './supabase/client';

export type TeamScoreEvent = 'stage_completed' | 'boss_completed' | 'accuracy_bonus' | 'perfect_bonus' | 'review_completed' | 'wrong_word_mastered' | 'streak_bonus' | 'participation_bonus';

export async function autoAssignTeamForStudent(userId: string) {
  const { data, error } = await supabase.rpc('ensure_student_team_memberships', {
    p_student_id: userId,
  });
  if (error) throw new Error(`TEAM_ASSIGNMENT_FAILED: ${error.message}`);
  return data;
}

export async function createTeamScoreEvent(params: {
  userId: string;
  eventType: TeamScoreEvent;
  points: number;
  metadata?: any;
}) {
  const { data, error } = await supabase.rpc('record_team_score_event', {
    p_student_id: params.userId,
    p_event_type: params.eventType,
    p_points: params.points,
    p_metadata: params.metadata || {},
  });
  if (error) throw new Error(`TEAM_SCORE_FAILED: ${error.message}`);
  return data;
}

export async function calculateTeamScore(teamId: string, seasonId?: string | null) {
  try {
    let resolvedSeasonId = seasonId;
    if (resolvedSeasonId === undefined) {
      const { data: season, error: seasonError } = await supabase
        .from('team_battle_seasons')
        .select('id')
        .eq('is_active', true)
        .eq('scope', 'school')
        .order('start_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (seasonError) throw seasonError;
      resolvedSeasonId = season?.id || null;
    }
    let query = supabase.from('team_score_events').select('*').eq('team_id', teamId);
    if (resolvedSeasonId) query = query.eq('season_id', resolvedSeasonId);
    
    const { data: events, error: eventsError } = await query;
    if (eventsError) throw eventsError;
    if (!events) return { totalScore: 0, finalScore: 0, activeMembersRate: 0 };

    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .eq('is_active', true);
    if (membersError) throw membersError;
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
    throw err;
  }
}
