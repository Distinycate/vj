import React from 'react';
import AvatarDisplay from './AvatarDisplay';
import { User, Store, LogOut, Shield } from 'lucide-react';

export default function StudentHero({ student, progress, stats, rankConfig, setShowShop, logout }: any) {
  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-6 mb-6 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full mix-blend-screen filter blur-[80px] pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between relative z-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <AvatarDisplay seed={progress?.avatar_seed || student.id} style={progress?.avatar_style || 'adventurer'} size="lg" className="w-20 h-20 shadow-xl shadow-emerald-500/20" />
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-black text-white mb-2">{student.student_name}</h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 rounded-full text-xs font-black shadow-md">{rankConfig.skillTitle}</span>
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full text-xs font-bold">Rank {progress?.current_rank || 1}</span>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold">Lvl {stats.level}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-row md:flex-col items-center md:items-end gap-3 w-full md:w-auto">
          <div className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-950/50 px-5 py-3 rounded-2xl border border-slate-800 shadow-inner">
            <span className="text-xl">🪙</span>
            <span className="text-white font-black text-xl">{progress?.coins || 0}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowShop(true)} className="flex-1 md:flex-none px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all"><Store className="w-4 h-4" /> ร้านค้า</button>
            <button onClick={logout} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center justify-center transition-all"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
