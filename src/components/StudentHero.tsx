import React from 'react';
import AvatarDisplay from './AvatarDisplay';
import { Store, LogOut, Sparkles, Info } from 'lucide-react';

export default function StudentHero({ student, progress, stats, rankConfig, setShowShop, setShowCardCenter, logout }: any) {
  const [showRankInfo, setShowRankInfo] = React.useState(false);
  const rankScore = progress?.rank_score || 0;
  
  // Calculate next rank threshold
  const currentRank = progress?.current_rank || 1;
  const thresholds = { 1: 0, 2: 40, 3: 55, 4: 70, 5: 85, 6: 100 };
  const currentThreshold = thresholds[currentRank as keyof typeof thresholds] || 0;
  const nextThreshold = thresholds[(currentRank + 1) as keyof typeof thresholds] || 100;
  const progressPercent = currentRank >= 5 ? 100 : Math.max(0, Math.min(100, ((rankScore - currentThreshold) / (nextThreshold - currentThreshold)) * 100));
  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-6 mb-6 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full mix-blend-screen filter blur-[80px] pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between relative z-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <AvatarDisplay seed={progress?.avatar_seed || student.id} style={progress?.avatar_style || 'adventurer'} size="lg" className="w-20 h-20 shadow-xl shadow-emerald-500/20" />
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-black text-white mb-2">{student.student_name}</h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 rounded-full text-xs font-black shadow-md flex items-center gap-1">
                {progress?.current_rank === 1 ? '🥉' : progress?.current_rank === 2 ? '🥈' : progress?.current_rank === 3 ? '🥇' : progress?.current_rank === 4 ? '💎' : progress?.current_rank === 5 ? '👑' : '🛡️'}
                {rankConfig.skillTitle}
              </span>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold">Lvl {stats.level}</span>
            </div>
            
            {/* Rank Score Progress Bar */}
            <div data-demo-guide="rank-score" className="mt-3 w-full max-w-xs group cursor-pointer" onClick={() => setShowRankInfo(true)}>
              <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1 font-semibold px-1">
                <span>Rank Score: {rankScore.toFixed(1)}</span>
                <span className="flex items-center gap-1 hover:text-emerald-400 transition-colors">
                  <Info className="w-3 h-3" /> วิธีคำนวณ
                </span>
                <span>Next Rank: {nextThreshold}</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Rank Info Modal */}
        {showRankInfo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowRankInfo(false)}></div>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full relative z-10 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-400" />
                การคำนวณ Rank Score (100 คะแนน)
              </h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex justify-between border-b border-slate-800 pb-2">
                  <span>🗺️ <strong>การผ่านด่าน (35%)</strong></span>
                  <span className="text-emerald-400 font-mono">สูงสุด 35 pt</span>
                </li>
                <li className="flex justify-between border-b border-slate-800 pb-2">
                  <span>🎯 <strong>ความแม่นยำ (30%)</strong> <br/><span className="text-xs text-slate-500">เฉลี่ยจาก 10 ด่านล่าสุด</span></span>
                  <span className="text-emerald-400 font-mono">สูงสุด 30 pt</span>
                </li>
                <li className="flex justify-between border-b border-slate-800 pb-2">
                  <span>⭐ <strong>ดาวสะสม (20%)</strong> <br/><span className="text-xs text-slate-500">ดาวรวมทั้งหมด / 300</span></span>
                  <span className="text-emerald-400 font-mono">สูงสุด 20 pt</span>
                </li>
                <li className="flex justify-between border-b border-slate-800 pb-2">
                  <span>👹 <strong>ด่านบอส (10%)</strong> <br/><span className="text-xs text-slate-500">เอาชนะบอสล่าสุด</span></span>
                  <span className="text-emerald-400 font-mono">สูงสุด 10 pt</span>
                </li>
                <li className="flex justify-between">
                  <span>🔥 <strong>ความสม่ำเสมอ (5%)</strong> <br/><span className="text-xs text-slate-500">Streak (ต่อเนื่อง) วันละ 10 pt</span></span>
                  <span className="text-emerald-400 font-mono">สูงสุด 5 pt</span>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-slate-800/50 rounded-lg text-xs text-slate-400 border border-slate-700/50">
                ระบบจะอัปเดต Rank ของคุณทันทีเมื่อเล่นจบแต่ละด่าน หรือทำคะแนนได้ถึงเกณฑ์ใหม่
              </div>
              <button 
                onClick={() => setShowRankInfo(false)}
                className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-bold"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        )}
        
        <div className="flex flex-row md:flex-col items-center md:items-end gap-3 w-full md:w-auto">
          <div className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-950/50 px-5 py-3 rounded-2xl border border-slate-800 shadow-inner">
            <span className="text-xl">🪙</span>
            <span className="text-white font-black text-xl">{progress?.coins || 0}</span>
          </div>
          <div data-demo-guide="card-system" className="flex gap-2">
            <button onClick={() => setShowCardCenter(true)} className="flex-1 md:flex-none px-4 py-2 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all">
              <Sparkles className="w-4 h-4" /> การ์ด
            </button>
            <button onClick={() => setShowShop(true)} className="flex-1 md:flex-none px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all"><Store className="w-4 h-4" /> ร้านค้า</button>
            <button onClick={logout} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center justify-center transition-all"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
