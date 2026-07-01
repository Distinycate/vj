'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/utils/supabase/client';
import { playWordAudio } from '@/utils/audio';

export default function StudyCamp() {
  const { setScreen, progress } = useAppStore();
  const [words, setWords] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWords() {
      const stage = progress?.current_stage || 1;
      const { data } = await supabase
        .from('vocabulary')
        .select('*')
        .eq('stage', stage);

      if (data && data.length > 0) {
        setWords(data);
      } else {
        // Fallback mock data if DB is empty
        setWords([
          { id: '1', word: 'apple', phonetic: '/ˈæp.əl/', meaning: 'แอปเปิ้ล', example: 'I eat an apple.', part_of_speech: 'noun' },
          { id: '2', word: 'banana', phonetic: '/bəˈnæn.ə/', meaning: 'กล้วย', example: 'Monkeys love bananas.', part_of_speech: 'noun' },
          { id: '3', word: 'cat', phonetic: '/kæt/', meaning: 'แมว', example: 'The cat sleeps on the sofa.', part_of_speech: 'noun' }
        ]);
      }
      setLoading(false);
    }
    fetchWords();
  }, [progress]);


  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white"><div className="animate-pulse">กำลังเตรียมคำศัพท์...</div></div>;
  }

  const word = words[currentIndex];
  const isFinished = currentIndex >= words.length;

  if (isFinished) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center bg-white/5 border border-white/10 p-12 rounded-3xl backdrop-blur-md">
          <CheckCircle className="w-24 h-24 text-emerald-400 mx-auto mb-6" />
          <h2 className="text-4xl font-bold mb-4">เยี่ยมมาก!</h2>
          <p className="text-xl text-slate-400 mb-8">คุณเรียนรู้คำศัพท์ประจำด่านนี้ครบแล้ว พร้อมทำแบบทดสอบหรือยัง?</p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => setScreen('dashboard')} className="px-6 py-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">กลับหน้าหลัก</button>
            <button onClick={() => setScreen('game')} className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl font-bold hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/20">ลุย Challenge</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Study Camp</h1>
          <p className="text-slate-400">คำที่ {currentIndex + 1} / {words.length}</p>
        </div>
        <button 
          onClick={() => setScreen('dashboard')} 
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl flex items-center gap-1.5 transition-all text-sm font-bold"
        >
          <X className="w-4 h-4 text-rose-400" /> กลับหน้าหลัก
        </button>
      </div>

      {/* Flashcard */}
      <div className="w-full max-w-xl relative flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-8 flex-1 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden group"
          >
            {/* Image Placeholder / Visuals */}
            <div className="w-48 h-48 bg-slate-800 rounded-2xl mb-8 flex items-center justify-center overflow-hidden border border-white/5 shadow-inner relative">
              {word.image_url ? (
                <img src={word.image_url} alt={word.word} className="w-full h-full object-cover" />
              ) : (
                <span className="text-8xl font-black text-slate-700 select-none uppercase">{word.word.charAt(0)}</span>
              )}
            </div>

            <div className="text-center">
              <h2 className="text-6xl font-extrabold text-emerald-400 mb-2">{word.word}</h2>
              <p className="text-xl text-slate-400 font-mono mb-6">{word.phonetic}</p>
              
              <div className="inline-block px-4 py-1 bg-white/10 rounded-full text-sm text-slate-300 mb-4 uppercase tracking-widest">
                {word.part_of_speech || 'noun'}
              </div>

              <h3 className="text-3xl font-bold mb-4">{word.meaning}</h3>
              <p className="text-lg text-slate-400 italic mb-8">"{word.example}"</p>
            </div>

            <button 
              onClick={() => playWordAudio(word.word)}
              className="mt-4 bg-white/10 hover:bg-white/20 p-4 rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-105 text-emerald-300"
            >
              <Volume2 className="w-6 h-6" />
            </button>
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        <div className="flex justify-between items-center mt-8 pb-8">
          <button 
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 px-6 py-4 bg-white/5 rounded-xl disabled:opacity-30 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> ย้อนกลับ
          </button>
          
          <button 
            onClick={() => setCurrentIndex(currentIndex + 1)}
            className="flex items-center gap-2 px-8 py-4 bg-emerald-500 rounded-xl hover:bg-emerald-400 font-bold shadow-lg shadow-emerald-500/20 transition-colors"
          >
            ถัดไป <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
