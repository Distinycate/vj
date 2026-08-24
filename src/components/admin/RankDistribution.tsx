'use client';
import { useMemo, useState } from 'react';
import { ADAPTIVE_RANK_CONFIG } from '@/utils/adaptiveConfig';
import { Trophy, ChevronDown, ChevronUp, User } from 'lucide-react';

interface RankDistributionProps {
  students: any[];
  title: string;
  subtitle: string;
}

export default function RankDistribution({ students, title, subtitle }: RankDistributionProps) {
  const [expandedRank, setExpandedRank] = useState<number | null>(null);

  const rankData = useMemo(() => {
    const counts: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    
    students.forEach(s => {
      const lp = Array.isArray(s.learning_paths) ? s.learning_paths[0] : s.learning_paths;
      const rank = lp?.current_rank || 1;
      if (counts[rank]) {
        counts[rank].push(s);
      } else {
        counts[rank] = [s];
      }
    });

    return [5, 4, 3, 2, 1].map(rank => {
      return {
        rank,
        config: ADAPTIVE_RANK_CONFIG[rank],
        studentsInRank: counts[rank] || [],
        count: (counts[rank] || []).length
      };
    });
  }, [students]);

  const maxCount = Math.max(...rankData.map(r => r.count), 1);

  return (
    <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex flex-col">
      <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-400" /> {title}
      </h3>
      <p className="text-xs text-slate-400 mb-6">{subtitle}</p>
      
      <div className="space-y-4">
        {rankData.map((data) => {
          const isExpanded = expandedRank === data.rank;
          const width = (data.count / maxCount) * 100;
          
          let rankColor = 'bg-slate-400';
          let textColor = 'text-slate-400';
          let borderColor = 'border-slate-500/30';
          let icon = '🛡️';
          
          if (data.rank === 1) { rankColor = 'bg-amber-700/50'; textColor = 'text-amber-600'; borderColor = 'border-amber-700/30'; icon = '🥉'; }
          else if (data.rank === 2) { rankColor = 'bg-slate-300/50'; textColor = 'text-slate-300'; borderColor = 'border-slate-300/30'; icon = '🥈'; }
          else if (data.rank === 3) { rankColor = 'bg-yellow-400/50'; textColor = 'text-yellow-400'; borderColor = 'border-yellow-400/30'; icon = '🥇'; }
          else if (data.rank === 4) { rankColor = 'bg-cyan-400/50'; textColor = 'text-cyan-400'; borderColor = 'border-cyan-400/30'; icon = '💎'; }
          else if (data.rank === 5) { rankColor = 'bg-fuchsia-400/50'; textColor = 'text-fuchsia-400'; borderColor = 'border-fuchsia-400/30'; icon = '👑'; }

          return (
            <div key={data.rank} className="flex flex-col">
              <div 
                className={`relative flex items-center justify-between p-3 rounded-xl border ${borderColor} cursor-pointer hover:bg-slate-800/50 transition-colors z-10 bg-slate-950/50`}
                onClick={() => setExpandedRank(isExpanded ? null : data.rank)}
              >
                <div className="absolute top-0 left-0 bottom-0 rounded-l-xl opacity-20 transition-all duration-1000 ease-out" style={{ width: `${Math.max(2, width)}%`, backgroundColor: textColor.replace('text-', '') }}></div>
                
                <div className="relative flex items-center gap-3 z-10">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <h4 className={`text-sm font-black ${textColor}`}>{data.config?.skillTitle || `Rank ${data.rank}`}</h4>
                  </div>
                </div>
                
                <div className="relative flex items-center gap-3 z-10">
                  <div className="text-right flex items-center gap-2">
                    <span className="text-white font-bold">{data.count}</span>
                    <span className="text-xs text-slate-500">คน</span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </div>
              </div>
              
              {isExpanded && (
                <div className="mt-2 pl-4 pr-2 py-2 bg-slate-900/30 rounded-xl border border-slate-800/50 ml-4 max-h-60 overflow-y-auto custom-scrollbar">
                  {data.studentsInRank.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {data.studentsInRank.map(s => (
                        <div key={s.id} className="flex items-center gap-2 bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${rankColor} ${textColor} bg-opacity-20`}>
                            <User className="w-3 h-3" />
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-white truncate" title={s.student_name}>{s.student_name}</div>
                            <div className="text-[10px] text-slate-500 truncate">{s.classrooms?.class_name || 'ไม่ระบุห้อง'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-xs text-slate-500 py-4">ไม่มีนักเรียนในระดับนี้</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
