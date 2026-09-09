import { CheckSquare, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Quest {
  id: string;
  title: string;
  target_value: number;
  reward_coins: number;
  reward_tickets: number;
  progress: number;
  claimed: boolean;
}

interface QuestListProps {
  dailyQuests: Quest[];
  claimingQuests: Set<string>;
  onClaimQuest: (questId: string) => void;
}

export default function QuestList({ dailyQuests, claimingQuests, onClaimQuest }: QuestListProps) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <CheckSquare className="w-6 h-6 text-emerald-400" />
        <h3 className="text-xl font-black text-white">ภารกิจรายวัน (Daily Quests)</h3>
      </div>
      
      <div className="space-y-4">
        {dailyQuests.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>กำลังโหลดภารกิจ หรือไม่มีภารกิจในวันนี้</p>
          </div>
        ) : (
          dailyQuests.map(q => {
            const percent = Math.min(100, Math.round((q.progress / q.target_value) * 100));
            const isDone = q.progress >= q.target_value;
            
            return (
              <div key={q.id} className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row gap-5 items-center justify-between">
                <div className="w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-bold">{q.title}</span>
                    {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div className="text-xs text-slate-400 mb-3">รางวัล: {q.reward_coins > 0 && `🪙 ${q.reward_coins} เหรียญ`} {q.reward_tickets > 0 && `🎫 ${q.reward_tickets} ตั๋ว`}</div>
                  <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="text-right text-[10px] text-slate-500 mt-1">{q.progress} / {q.target_value}</div>
                </div>
                
                <Button 
                  onClick={() => onClaimQuest(q.id)}
                  disabled={!isDone || q.claimed || claimingQuests.has(q.id)}
                  variant={isDone && !q.claimed ? 'default' : 'secondary'}
                  className={`min-w-28 shrink-0 ${q.claimed || !isDone ? 'bg-slate-800 text-slate-500 shadow-none hover:bg-slate-800' : ''}`}
                >
                  {q.claimed ? 'รับแล้ว' : isDone ? 'รับรางวัล' : 'ยังไม่สำเร็จ'}
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
