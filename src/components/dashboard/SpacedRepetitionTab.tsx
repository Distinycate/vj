'use client';
import { motion } from 'framer-motion';
import { Bookmark, Volume2, CheckCircle2 } from 'lucide-react';

interface SpacedRepetitionTabProps {
  classroomStats: {
    totalCoins: number;
    averageStage: number;
    highestLevel: number;
  };
  reviewWords: any[];
  playWordAudio: (word: string) => void;
}

export default function SpacedRepetitionTab({
  classroomStats,
  reviewWords,
  playWordAudio,
}: SpacedRepetitionTabProps) {
  return (
    <motion.div 
      key="review" 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 text-left"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-indigo-500/10 border border-indigo-500/15 p-5 rounded-2xl">
          <span className="text-xs text-indigo-300 font-bold">เหรียญรวมทั้งห้อง</span>
          <strong className="text-2xl text-white block mt-1">🪙 {classroomStats.totalCoins}</strong>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/15 p-5 rounded-2xl">
          <span className="text-xs text-emerald-300 font-bold">ด่านเฉลี่ยของห้อง</span>
          <strong className="text-2xl text-white block mt-1">ด่าน {classroomStats.averageStage}</strong>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/15 p-5 rounded-2xl">
          <span className="text-xs text-amber-300 font-bold">เลเวลสูงสุด</span>
          <strong className="text-2xl text-white block mt-1">Lvl {classroomStats.highestLevel}</strong>
        </div>
      </div>

      <div data-demo-guide="review-stage" className="glass-card p-6 sm:p-8 rounded-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Bookmark className="w-8 h-8 text-emerald-400" />
          <div>
            <h3 className="text-2xl font-black text-white">ระบบทบทวนศัพท์อัจฉริยะ (Spaced Repetition)</h3>
            <p className="text-slate-400 text-sm mt-0.5">คัดกรองคำศัพท์ที่มีประวัติตอบผิด เพื่อให้ทบทวนซ้ำตามเวลาทิ้งช่วงสมอง</p>
          </div>
        </div>

        <div className="space-y-3">
          {reviewWords.map((word) => (
            <div key={word.id} className="bg-slate-950 border border-slate-900 p-4 sm:p-5 rounded-2xl flex justify-between items-center transition-colors hover:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xl font-bold text-white uppercase notranslate" translate="no">{word.word}</h4>
                  {word.wrong_count && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      ตอบผิด {word.wrong_count} ครั้ง
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{word.phonetic}</p>
                <p className="text-slate-200 mt-2 font-semibold">แปลความหมาย: <strong className="text-emerald-400">{word.meaning}</strong></p>
                <p className="text-xs text-slate-500 italic mt-1 font-mono">"{word.example_sentence || word.example || ''}"</p>
              </div>
              
              <button 
                onClick={() => playWordAudio(word.word)}
                className="w-11 h-11 bg-slate-900 border border-slate-800 text-emerald-400 hover:text-emerald-300 rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-md shrink-0 cursor-pointer"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
          ))}

          {reviewWords.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-900">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-slate-300 font-black">คุณทำยอดเยี่ยมมาก! ไม่มีคำศัพท์สะสมเนื่องทบทวน</p>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">คำศัพท์ที่ตอบผิดจะค่อยๆ บันทึกและปรากฏตรงนี้เมื่อสมองเริ่มพร้อมทบทวนซ้ำ</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
