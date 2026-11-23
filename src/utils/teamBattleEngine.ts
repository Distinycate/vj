export type StudentTeam = {
  id: string;
  team_name: string;
  team_icon: string;
  team_color: string;
  classroom_id: string | null;
  team_type: 'class' | 'school';
};

export async function loadMyTeams(): Promise<StudentTeam[]> {
  const response = await fetch('/api/team-battle/mine', { method: 'POST', cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'โหลดทีมของนักเรียนไม่สำเร็จ');
  return result.teams;
}

export type TeamStanding = {
  id: string;
  team_name: string;
  team_icon: string;
  team_color: string;
  rank: number;
  totalMembers: number;
  activeMembersCount: number;
  activeMembersRate: number;
  eventsCount: number;
  totalScore: number;
  finalScore: number;
};

export type TeamLeaderboardResult = {
  season: { id: string; name: string; active: boolean } | null;
  teams: TeamStanding[];
};

export async function loadTeamLeaderboard(
  scope: 'school' | 'classroom', classroomId?: string | null, signal?: AbortSignal,
): Promise<TeamLeaderboardResult> {
  const query = new URLSearchParams({ scope });
  if (scope === 'classroom' && classroomId) query.set('classroomId', classroomId);
  const response = await fetch(`/api/team-battle/leaderboard?${query}`, { cache: 'no-store', signal });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'โหลดตารางคะแนนไม่สำเร็จ');
  return result;
}
