'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/utils/supabase/client';
import { playWordAudio } from '@/utils/audio';
import { getWorldForStage } from '@/utils/adaptiveConfig';

export default function StudyCamp() {
  const { setScreen, progress } = useAppStore();
  const [words, setWords] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWords() {
      const stage = progress?.current_stage || 1;
      const isBoss = stage % 10 === 0;

      let wordsQuery = supabase.from('vocabulary').select('*').eq('is_active', true);

      if (isBoss) {
        // Boss stages combine words from stages in the current world range
        const world = getWorldForStage(stage);
        wordsQuery = wordsQuery
          .gte('stage_number', world.stageRange[0])
          .lte('stage_number', world.stageRange[1]);
      } else {
        wordsQuery = wordsQuery.eq('stage_number', stage);
      }

      const { data } = await wordsQuery;

      if (data && data.length > 0) {
        setWords(data);
      }
      setLoading(false);
    }
    fetchWords();
  }, [progress]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
        <div className="text-slate-400">กำลังเตรียมคำศัพท์ค่าย...</div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-amber-500/20 rounded-3xl p-8 max-w-md text-center">
          <AlertTriangle className="w-14 h-14 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-2">ยังไม่มีคำศัพท์ในด่านนี้</h2>
          <p className="text-slate-400 text-sm mb-6">กรุณาแจ้งคุณครูให้เพิ่มคำศัพท์ก่อนเริ่มเรียน</p>
          <button
            onClick={() => setScreen('dashboard')}
            className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold"
          >
            กลับหน้าแผนที่
          </button>
        </div>
      </div>
    );
  }

  const word = words[currentIndex];
  const isFinished = currentIndex >= words.length;

  if (isFinished) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          className="text-center bg-slate-900 border border-slate-800 p-12 rounded-3xl max-w-md w-full shadow-2xl"
        >
          <CheckCircle className="w-24 h-24 text-emerald-400 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(52,211,153,0.2)]" />
          <h2 className="text-4xl font-black mb-4">เรียนรู้เสร็จสิ้น!</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">คุณท่องค่ายศัพท์ประจำด่านนี้ครบทุกคำแล้ว พร้อมสำหรับทำด่านประเมินแบบทดสอบหรือยัง?</p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => setScreen('dashboard')} 
              className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl transition-all font-bold"
            >
              กลับหน้าหลัก
            </button>
            <button 
              onClick={() => setScreen('game')} 
              className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all"
            >
              ลุยด่าน Challenge ➡️
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center select-none relative overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Background glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-emerald-500/5 rounded-full filter blur-[80px] pointer-events-none"></div>

      {/* Header */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-8 relative z-10">
        <div>
          <h1 className="text-2xl font-black text-white">Study Camp (ค่ายฝึกฝน)</h1>
          <p className="text-slate-500 text-sm mt-0.5">คำศัพท์ลำดับที่ {currentIndex + 1} / {words.length}</p>
        </div>
        <button 
          onClick={() => setScreen('dashboard')} 
          className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white rounded-xl flex items-center gap-1.5 transition-all text-xs font-bold"
        >
          <X className="w-4 h-4 text-rose-400" /> ปิดค่าย
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-2xl h-1.5 bg-slate-900 border border-slate-850 rounded-full mb-8 overflow-hidden relative z-10">
        <div 
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
        />
      </div>

      {/* Flashcard */}
      <div className="w-full max-w-2xl relative flex-1 flex flex-col z-10">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-slate-900/50 backdrop-blur-lg border border-slate-800 rounded-3xl p-8 flex-1 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden group"
          >
            {/* Visual word placeholder */}
            <div className="w-40 h-40 bg-slate-950 rounded-2xl mb-8 flex items-center justify-center overflow-hidden border border-slate-850 shadow-inner relative">
              {word.image_url ? (
                <img src={word.image_url} alt={word.word} className="w-full h-full object-cover" />
              ) : (
                <span className="text-7xl font-black text-slate-850 select-none uppercase notranslate" translate="no">{word.word.charAt(0)}</span>
              )}
            </div>

            <div className="text-center w-full break-words">
              <h2 className="text-4xl sm:text-6xl font-extrabold text-emerald-400 mb-2 break-all notranslate" translate="no">{word.word}</h2>
              <p className="text-base sm:text-xl text-slate-400 font-mono mb-6 notranslate" translate="no">{word.phonetic}</p>
              
              <div className="inline-block px-4 py-1 bg-slate-950 border border-slate-850 rounded-full text-xs sm:text-sm text-slate-300 mb-4 uppercase tracking-widest">
                {word.part_of_speech || 'noun'}
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold mb-4 break-words">{word.meaning}</h3>
              <p className="text-base sm:text-lg text-slate-400 italic mb-8 break-words notranslate" translate="no">"{word.example_sentence || word.example || ''}"</p>
            </div>

            <button 
              onClick={() => playWordAudio(word.word)}
              className="w-16 h-16 bg-slate-950 hover:bg-slate-800 border border-slate-850 text-emerald-400 hover:text-emerald-300 rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-lg"
            >
              <Volume2 className="w-7 h-7" />
            </button>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-6 w-full gap-4">
          <button 
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="flex-1 py-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-30 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> ก่อนหน้า
          </button>
          <button 
            onClick={() => setCurrentIndex(currentIndex + 1)}
            className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl flex items-center justify-center gap-2 font-black text-sm transition-all shadow-lg shadow-emerald-500/10"
          >
            ถัดไป <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
