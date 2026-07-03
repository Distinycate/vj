'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase/client';
import { getStudentSession, StudentSession } from '@/utils/studentSession';

export default function ChristmasStudyCamp() {
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const session = getStudentSession();
    if (!session) {
      window.location.href = '/?error=กรุณาเข้าสู่ระบบ';
      return;
    }
    setStudent(session);

    async function loadWords() {
      const { data: event } = await supabase.from('events').select('id').eq('slug', 'christmas-word-hunt').single();
      if (event) {
        const { data } = await supabase.from('event_vocabulary')
          .select('*')
          .eq('event_id', event.id)
          .eq('is_active', true)
          .order('order_no', { ascending: true });
        
        if (data) setWords(data);
      }
      setLoading(false);
    }
    loadWords();
  }, []);

  const handleSpeak = (text: string) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  };

  if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">กำลังโหลดค่ายติว...</div>;
  if (!words.length) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">ไม่พบคำศัพท์</div>;

  const currentWord = words[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-slate-900 to-slate-950 text-slate-100 font-sans p-4 flex flex-col items-center">
      <header className="w-full max-w-2xl flex justify-between items-center bg-slate-800/80 p-4 rounded-2xl border border-slate-700 mb-8 backdrop-blur-md">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">⛺ Study Camp</h1>
        <Link href="/events/christmas" className="text-slate-400 hover:text-white transition-colors">
          ✕ ออก
        </Link>
      </header>

      <main className="w-full max-w-2xl flex-1 flex flex-col items-center justify-center relative">
        <div className="text-slate-400 mb-4 font-bold">
          คำที่ {currentIndex + 1} / {words.length}
        </div>

        <div className="bg-slate-800 border border-slate-700 p-8 md:p-12 rounded-3xl shadow-2xl w-full text-center relative overflow-hidden">
          <button 
            onClick={() => handleSpeak(currentWord.word)}
            className="absolute top-6 right-6 w-12 h-12 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-full flex items-center justify-center transition-colors text-2xl"
          >
            🔊
          </button>
          
          <p className="text-sm text-blue-400 font-bold uppercase tracking-widest mb-2">{currentWord.category} • {currentWord.part_of_speech}</p>
          <h2 className="text-5xl md:text-6xl font-black text-white mb-2">{currentWord.word}</h2>
          <p className="text-xl text-slate-400 mb-8">/{currentWord.pronunciation}/</p>
          
          <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700 mb-8">
             <p className="text-2xl font-bold text-emerald-400 mb-2">{currentWord.meaning_th}</p>
          </div>

          <div className="text-left bg-blue-900/20 p-4 rounded-xl border border-blue-500/20">
             <p className="text-slate-300 font-medium italic mb-1">"{currentWord.example_sentence}"</p>
             <p className="text-slate-400 text-sm">{currentWord.example_meaning_th}</p>
          </div>
        </div>

        <div className="flex gap-4 mt-8 w-full">
          <button 
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-full transition-colors"
          >
            ⬅️ ก่อนหน้า
          </button>
          <button 
            onClick={() => setCurrentIndex(Math.max(0, Math.min(words.length - 1, currentIndex + 1)))}
            disabled={currentIndex === words.length - 1}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-full transition-colors shadow-lg"
          >
            ถัดไป ➡️
          </button>
        </div>

        {currentIndex === words.length - 1 && (
          <Link href="/events/christmas/play" className="mt-8 bg-gradient-to-r from-emerald-600 to-green-500 text-white font-bold py-4 px-12 rounded-full shadow-lg hover:scale-105 transition-transform text-xl">
            ⚔️ ลุยภารกิจจริงเลย!
          </Link>
        )}
      </main>
    </div>
  );
}
