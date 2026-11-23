'use client';
import { useState, useEffect } from 'react';
import { Crown } from 'lucide-react';
import { loadTeamLeaderboard, type TeamLeaderboardResult } from '@/utils/teamBattleEngine';

export default function TeamLeaderboard({ scope = 'school', classroomId }: { scope?: 'class' | 'school', classroomId?: string }) {
  const queryKey = scope === 'school' ? 'school' : classroomId;
  const [state, setState] = useState<{ key: string; data?: TeamLeaderboardResult; error?: string } | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!queryKey) return;
    const controller = new AbortController();
    loadTeamLeaderboard(scope === 'class' ? 'classroom' : 'school', classroomId, controller.signal)
      .then(data => { if (!controller.signal.aborted) setState({ key: queryKey, data }); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({ key: queryKey, error: error instanceof Error ? error.message : 'โหลดข้อมูลทีมไม่สำเร็จ' });
        }
      });
    return () => controller.abort();
  }, [queryKey, scope, classroomId, reload]);

  const current = state?.key === queryKey ? state : null;
  const { teams, season } = current?.data ?? { teams: [], season: null };

  if (scope === 'class' && !classroomId) {
    return (
      <div className="text-center py-8 text-slate-400 glass-card rounded-3xl border border-slate-800/80">
        <p className="text-sm">กรุณาเลือกห้องเรียนเพื่อดูตารางคะแนนทีมประจำห้อง</p>
      </div>
    );
  }

  if (!current) {
    return <div className="text-center py-10 text-slate-400">กำลังโหลดข้อมูล Team Leaderboard...</div>;
  }

  if (current.error) {
    return <div className="text-center py-8 text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
      <p>{current.error}</p>
      <button type="button" className="mt-3 px-4 py-2 rounded-lg bg-slate-800 text-white"
        onClick={() => { setState(null); setReload(value => value + 1); }}>ลองใหม่</button>
    </div>;
  }

  return (
    <div className="glass-card p-6 rounded-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Crown className="w-8 h-8 text-amber-400" />
        <div>
          <h3 className="text-xl font-black text-white">
            ตารางคะแนนทีม ({scope === 'school' ? 'ระดับโรงเรียน' : 'ระดับห้องเรียน'})
          </h3>
          <p className="text-sm text-slate-400">
            {season ? `${season.active ? 'ฤดูกาล' : 'ผลฤดูกาล'}: ${season.name}` : 'ยังไม่มีฤดูกาลสำหรับกลุ่มนี้'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {teams.map((team, idx) => {
          const isTop3 = idx < 3;
          return (
            <div
              key={team.id}
              className={`p-4 rounded-2xl flex items-center justify-between border relative overflow-hidden transition-all duration-300 hover-lift ${
                isTop3 ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'glass-input border-none shadow-none'
              }`}
            >
              {isTop3 && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/20 to-transparent blur-2xl pointer-events-none" />
              )}
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 flex items-center justify-center text-xl rounded-xl border border-slate-700 font-black relative" style={{ backgroundColor: `${team.team_color}20`, color: team.team_color }}>
                  {idx === 0 && <Crown className="w-6 h-6 absolute -top-4 -right-2 text-amber-400 rotate-12 drop-shadow-md" />}
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
          <div className="text-center py-8 text-slate-500">{season ? 'ยังไม่มีทีมในฤดูกาลนี้' : 'คะแนนจะเริ่มนับเมื่อแอดมินเปิดฤดูกาล'}</div>
        )}
      </div>
    </div>
  );
}
