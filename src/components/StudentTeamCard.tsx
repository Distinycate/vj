import React from 'react';
import { Activity, Users } from 'lucide-react';

export default function StudentTeamCard({ team, scoreData }: { team: any, scoreData: any }) {
  if (!team || !scoreData) return null;
  
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
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900/70 rounded-xl p-3">
            <div className="text-xs text-slate-500">คะแนนกิจกรรมจริง</div>
            <div className="text-lg font-black text-white mt-1">{scoreData.totalScore || 0}</div>
          </div>
          <div className="bg-slate-900/70 rounded-xl p-3">
            <div className="text-xs text-slate-500 flex items-center gap-1"><Activity className="w-3 h-3" /> เหตุการณ์สะสม</div>
            <div className="text-lg font-black text-white mt-1">{scoreData.eventsCount || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
