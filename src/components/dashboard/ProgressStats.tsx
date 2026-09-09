import { Target, BrainCircuit, Zap, Bookmark } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface ProgressStatsProps {
  realAccuracy: number | null;
  level: number;
  xp: number;
  reviewWordsCount: number;
}

export default function ProgressStats({ realAccuracy, level, xp, reviewWordsCount }: ProgressStatsProps) {
  return (
    <div data-demo-guide="coin-exp" className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="p-4 flex flex-col items-center justify-center text-center hover:scale-105 transition-transform">
        <Target className="w-6 h-6 text-emerald-400 mb-2" />
        <span className="text-xs text-slate-400 font-bold mb-1">ความแม่นยำ</span>
        <span className="text-xl font-black text-white">{realAccuracy === null ? '-' : `${realAccuracy}%`}</span>
      </Card>
      <Card className="p-4 flex flex-col items-center justify-center text-center hover:scale-105 transition-transform">
        <BrainCircuit className="w-6 h-6 text-indigo-400 mb-2" />
        <span className="text-xs text-slate-400 font-bold mb-1">ระดับทักษะ</span>
        <span className="text-xl font-black text-white">Lvl {level}</span>
      </Card>
      <Card className="p-4 flex flex-col items-center justify-center text-center hover:scale-105 transition-transform">
        <Zap className="w-6 h-6 text-amber-400 mb-2" />
        <span className="text-xs text-slate-400 font-bold mb-1">EXP สะสม</span>
        <span className="text-xl font-black text-white">{xp}</span>
      </Card>
      <Card className="p-4 flex flex-col items-center justify-center text-center hover:scale-105 transition-transform">
        <Bookmark className="w-6 h-6 text-fuchsia-400 mb-2" />
        <span className="text-xs text-slate-400 font-bold mb-1">ต้องทบทวน</span>
        <span className="text-xl font-black text-white">{reviewWordsCount} คำ</span>
      </Card>
    </div>
  );
}
