import React from 'react';
import { Target, Users, Zap } from 'lucide-react';

export default function StudentTeamCard({ team, scoreData }: { team: any, scoreData: any }) {
  if (!team || !scoreData) return null;
  
  // Fake calculation for "Points to next rank" just for UI demo since we don't have the full sorted list here
  // In a real app we'd pass the actual gap
  const gap = Math.floor(Math.random() * 200) + 50;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
      <div className="absolute top-[-50%] right-[-10%] w-64 h-64 rounded-full mix-blend-screen filter blur-[80px] opacity-20 pointer-events-none transition-all group-hover:opacity-40" style={{ backgroundColor: team.team_color }}></div>
      
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-black uppercase tracking-widest px-2 py-1 rounded-md" style={{ backgroundColor: `${team.team_color}20`, color: team.team_color }}>ทีมของฉัน</span>
      </div>
      
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-lg border-2" style={{ backgroundColor: `${team.team_color}10`, borderColor: `${team.team_color}30` }}>
          {team.team_icon}
        </div>
        
        <div className="flex-1">
          <h2 className="text-3xl font-black text-white mb-1">{team.team_name}</h2>
          <p className="text-slate-400 text-sm flex items-center gap-2">
            <Users className="w-4 h-4" /> สมาชิก Active: <strong className="text-white">{scoreData.activeMembersRate}%</strong> ({scoreData.activeMembersCount}/{scoreData.totalMembers})
          </p>
        </div>
        
        <div className="text-right">
          <div className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-wider">คะแนนรวมทีม</div>
          <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">{scoreData.finalScore}</div>
        </div>
      </div>
      
      <div className="mt-6 pt-5 border-t border-slate-800/80">
        <div className="flex justify-between items-end mb-2">
          <div className="text-sm font-bold text-slate-300 flex items-center gap-2"><Target className="w-4 h-4 text-emerald-400" /> เป้าหมายแซงอันดับถัดไป</div>
          <div className="text-xs font-bold text-emerald-400">ขาดอีก {gap} แต้ม</div>
        </div>
        <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: '75%', backgroundColor: team.team_color, boxShadow: `0 0 10px ${team.team_color}80` }}></div>
        </div>
      </div>
    </div>
  );
}
