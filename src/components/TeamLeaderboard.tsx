'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Trophy, Users, Star, Activity, Crown } from 'lucide-react';
import { calculateTeamScore } from '@/utils/teamBattleEngine';

export default function TeamLeaderboard({ scope = 'school', classroomId }: { scope?: 'class' | 'school', classroomId?: string }) {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      const cacheKey = `vj_leaderboard_cache_${scope}_${classroomId || 'all'}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          // Check if cache is less than 5 minutes old
          if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
            setTeams(parsed.data);
            setLoading(false);
            return;
          }
        } catch (e) {
          // Ignore cache parse error
        }
      }

      setLoading(true);
      try {
        let query = supabase.from('teams').select('*').eq('team_type', scope).eq('is_active', true);
        if (scope === 'class' && classroomId) {
          query = query.eq('classroom_id', classroomId);
        }
        
        const { data: dbTeams } = await query;
          
        if (dbTeams) {
          const scoredTeams = [];
          for (const team of dbTeams) {
            const scoreData = await calculateTeamScore(team.id);
            scoredTeams.push({
              ...team,
              ...scoreData
            });
          }
          // Sort by final score
          scoredTeams.sort((a, b) => b.finalScore - a.finalScore);
          setTeams(scoredTeams);
          
          // Save to local cache
          localStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            data: scoredTeams
          }));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadLeaderboard();
  }, [scope]);

  if (loading) {
    return <div className="text-center py-10 text-slate-400">กำลังโหลดข้อมูล Team Leaderboard...</div>;
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Crown className="w-8 h-8 text-amber-400" />
        <div>
          <h3 className="text-xl font-black text-white">ตารางคะแนนทีม ({scope === 'school' ? 'ระดับโรงเรียน' : 'ระดับห้องเรียน'})</h3>
          <p className="text-sm text-slate-400">รวมคะแนนจากทุกการมีส่วนร่วมของสมาชิก</p>
        </div>
      </div>

      <div className="space-y-3">
        {teams.map((team, idx) => {
          const isTop3 = idx < 3;
          return (
            <div 
              key={team.id} 
              className={`p-4 rounded-2xl flex items-center justify-between border ${
                isTop3 ? 'bg-slate-800/80 border-amber-500/30' : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 flex items-center justify-center text-xl rounded-xl border border-slate-700 font-black" style={{ backgroundColor: `${team.team_color}20`, color: team.team_color }}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                </div>
                <div>
                  <h4 className="text-lg font-black text-white flex items-center gap-2">
                    <span>{team.team_icon}</span> {team.team_name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    สมาชิก: {team.totalMembers} คน | ช่วยกันเล่น: {team.activeMembersRate}%
                  </p>
                </div>
              </div>

              <div className="text-right">
                <strong className="text-2xl text-white font-black">{team.finalScore}</strong>
                <span className="text-xs text-slate-500 block">คะแนนทีมสุทธิ</span>
              </div>
            </div>
          );
        })}

        {teams.length === 0 && (
          <div className="text-center py-8 text-slate-500">ยังไม่มีทีมในระบบนี้</div>
        )}
      </div>
    </div>
  );
}
