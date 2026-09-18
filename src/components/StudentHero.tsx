import React from 'react';
import AvatarDisplay from './AvatarDisplay';
import { Store, LogOut, Sparkles, Info, Trophy, Flame } from 'lucide-react';

export default function StudentHero({ student, progress, stats, rankConfig, setShowShop, setShowCardCenter, logout }: any) {
  const [showRankInfo, setShowRankInfo] = React.useState(false);
  const rankScore = progress?.rank_score || 0;
  const isExternalUser = student?.user_type === 'EXTERNAL';
  
  // Calculate next rank threshold
  const currentRank = progress?.current_rank || 1;
  const thresholds = { 1: 0, 2: 40, 3: 55, 4: 70, 5: 85, 6: 100 };
  const currentThreshold = thresholds[currentRank as keyof typeof thresholds] || 0;
  const nextThreshold = thresholds[(currentRank + 1) as keyof typeof thresholds] || 100;
  const progressPercent = currentRank >= 5 ? 100 : Math.max(0, Math.min(100, ((rankScore - currentThreshold) / (nextThreshold - currentThreshold)) * 100));

  const rankBadgeStyles: Record<number, { bg: string; border: string; text: string; glow: string; icon: string }> = {
    1: { bg: 'from-amber-700 to-amber-900', border: 'border-amber-600/40', text: 'text-amber-200', glow: 'shadow-amber-700/20', icon: '🥉' },
    2: { bg: 'from-slate-400 to-slate-600', border: 'border-slate-300/40', text: 'text-slate-100', glow: 'shadow-slate-400/20', icon: '🥈' },
    3: { bg: 'from-amber-400 to-yellow-500', border: 'border-yellow-300/50', text: 'text-slate-950 font-black', glow: 'shadow-yellow-400/30', icon: '🥇' },
    4: { bg: 'from-cyan-400 to-blue-500', border: 'border-cyan-300/50', text: 'text-slate-950 font-black', glow: 'shadow-cyan-400/30', icon: '💎' },
    5: { bg: 'from-fuchsia-500 to-pink-500', border: 'border-fuchsia-300/50', text: 'text-white font-black', glow: 'shadow-fuchsia-500/40', icon: '👑' },
  };

  const rankStyle = rankBadgeStyles[currentRank] || rankBadgeStyles[1];

  return (
    <div className="glass-card p-4 sm:p-6 mb-6 shadow-2xl relative overflow-hidden bg-gradient-to-r from-emerald-500/10 via-slate-900/60 to-indigo-500/10 border border-slate-750 backdrop-blur-xl rounded-3xl">
      {/* Ambient background glows */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between relative z-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 min-w-0 w-full">
          
          {/* Avatar with dynamic glow ring */}
          <div className="relative group shrink-0">
            <div className={`absolute -inset-1.5 rounded-full bg-gradient-to-r ${rankStyle.bg} opacity-50 blur-sm group-hover:opacity-75 transition-opacity`} />
            <div className="relative rounded-full p-1 bg-slate-900 border-2 border-slate-700">
              <AvatarDisplay 
                seed={progress?.avatar_seed || student.id} 
                style={progress?.avatar_style || 'adventurer'} 
                size="lg" 
                className="w-20 h-20 rounded-full shadow-xl" 
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center text-sm shadow-md select-none">
              {rankStyle.icon}
            </div>
          </div>

          <div className="text-center sm:text-left min-w-0 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight break-words">
                {student.student_name}
              </h1>
              {progress?.streak_days && progress.streak_days > 1 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold self-center sm:self-auto">
                  <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                  {progress.streak_days} วันติด!
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className={`px-3 py-1 bg-gradient-to-r ${rankStyle.bg} ${rankStyle.text} rounded-full text-xs font-black shadow-md flex items-center gap-1.5 border ${rankStyle.border}`}>
                <span>{rankStyle.icon}</span>
                <span>{rankConfig.skillTitle}</span>
              </span>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-black shadow-sm flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                Lvl {stats.level}
              </span>
              {isExternalUser && (
                <span className="px-3 py-1 bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-full text-xs font-black">
                  🌐 Guest Network
                </span>
              )}
            </div>
            
            {/* Rank Score Progress Bar */}
            <div 
              data-demo-guide="rank-score" 
              className="mt-3.5 w-full max-w-sm mx-auto sm:mx-0 group cursor-pointer bg-slate-950/50 p-2 rounded-2xl border border-slate-800/80 hover:border-emerald-500/40 transition-all"
              onClick={() => setShowRankInfo(true)}
            >
              <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-1 text-[11px] text-slate-400 mb-1.5 font-semibold px-1">
                <span className="text-slate-300">
                  คะแนน Rank: <strong className="text-emerald-400 font-mono">{rankScore.toFixed(1)}</strong>
                </span>
                <span className="flex items-center gap-1 text-[10px] text-slate-400 group-hover:text-emerald-300 transition-colors">
                  <Info className="w-3 h-3 text-emerald-400" /> รายละเอียด
                </span>
                <span className="text-[10px] text-slate-500">
                  เป้าหมาย: <span className="font-mono text-slate-400">{nextThreshold}</span>
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rank Info Modal */}
        {showRankInfo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={() => setShowRankInfo(false)}></div>
            <div className="glass-card p-6 max-w-md w-full relative z-10 shadow-2xl rounded-3xl border border-slate-700 bg-slate-900/90">
              <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-400" />
                การคำนวณ Rank Score (100 คะแนน)
              </h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex justify-between border-b border-slate-800 pb-2">
                  <span>🗺️ <strong>การผ่านด่าน (35%)</strong></span>
                  <span className="text-emerald-400 font-mono font-bold">สูงสุด 35 pt</span>
                </li>
                <li className="flex justify-between border-b border-slate-800 pb-2">
                  <span>🎯 <strong>ความแม่นยำ (30%)</strong> <br/><span className="text-xs text-slate-500">เฉลี่ยจาก 10 ด่านล่าสุด</span></span>
                  <span className="text-emerald-400 font-mono font-bold">สูงสุด 30 pt</span>
                </li>
                <li className="flex justify-between border-b border-slate-800 pb-2">
                  <span>⭐ <strong>ดาวสะสม (20%)</strong> <br/><span className="text-xs text-slate-500">ดาวรวมทั้งหมด / 300</span></span>
                  <span className="text-emerald-400 font-mono font-bold">สูงสุด 20 pt</span>
                </li>
                <li className="flex justify-between border-b border-slate-800 pb-2">
                  <span>👹 <strong>ด่านบอส (10%)</strong> <br/><span className="text-xs text-slate-500">เอาชนะบอสล่าสุด</span></span>
                  <span className="text-emerald-400 font-mono font-bold">สูงสุด 10 pt</span>
                </li>
                <li className="flex justify-between">
                  <span>🔥 <strong>ความสม่ำเสมอ (5%)</strong> <br/><span className="text-xs text-slate-500">Streak (ต่อเนื่อง) วันละ 10 pt</span></span>
                  <span className="text-emerald-400 font-mono font-bold">สูงสุด 5 pt</span>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-slate-950/60 rounded-xl text-xs text-slate-400 border border-slate-800">
                💡 ระบบจะประเมินและปรับระดับ Rank อัตโนมัติทุกครั้งที่เล่นจบด่าน
              </div>
              <button 
                onClick={() => setShowRankInfo(false)}
                className="mt-4 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        )}
        
        {/* Right action container */}
        <div className="flex flex-col min-[420px]:flex-row md:flex-col items-stretch md:items-end gap-3 w-full md:w-auto">
          {/* Coin capsule */}
          <div className="flex items-center justify-center gap-2.5 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-500/30 px-5 py-2.5 rounded-2xl shadow-lg shadow-amber-500/5">
            <span className="text-2xl select-none animate-bounce">🪙</span>
            <div>
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">เหรียญทอง</div>
              <div className="text-white font-black text-xl font-mono leading-none">
                {(progress?.coins || 0).toLocaleString()}
              </div>
            </div>
          </div>

          <div data-demo-guide="card-system" className={`${isExternalUser ? 'grid grid-cols-1' : 'grid grid-cols-[1fr_1fr_auto]'} md:flex gap-2 w-full md:w-auto`}>
            {!isExternalUser && (
              <>
                <button 
                  onClick={() => setShowCardCenter(true)} 
                  className="min-h-11 flex-1 md:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600/20 to-purple-600/20 hover:from-fuchsia-600/30 hover:to-purple-600/30 text-fuchsia-300 border border-fuchsia-500/30 flex items-center justify-center gap-2 font-bold text-sm shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-fuchsia-400" /> การ์ด
                </button>
                <button 
                  onClick={() => setShowShop(true)} 
                  className="min-h-11 flex-1 md:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600/20 to-indigo-600/20 hover:from-purple-600/30 hover:to-indigo-600/30 text-purple-300 border border-purple-500/30 flex items-center justify-center gap-2 font-bold text-sm shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Store className="w-4 h-4 text-purple-400" /> ร้านค้า
                </button>
              </>
            )}
            <button 
              onClick={logout} 
              title="ออกจากระบบ"
              className="min-h-11 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
