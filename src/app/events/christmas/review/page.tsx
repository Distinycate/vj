'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase/client';
import { getStudentSession, StudentSession } from '@/utils/studentSession';

export default function ChristmasReview() {
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [weakWords, setWeakWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const session = getStudentSession();
    if (!session) {
      window.location.href = '/?error=กรุณาเข้าสู่ระบบ';
      return;
    }
    setStudent(session);

    async function loadData() {
      const { data: event } = await supabase.from('events').select('id').eq('slug', 'christmas-word-hunt').single();
      if (!event) {
        setErrorMsg('ไม่พบกิจกรรม');
        setLoading(false);
        return;
      }

      const { data: mastery } = await supabase.from('event_vocab_mastery')
        .select('wrong_count, vocabulary_id')
        .eq('event_id', event.id)
        .eq('user_id', session.id)
        .gt('wrong_count', 0)
        .order('wrong_count', { ascending: false });

      if (mastery && mastery.length > 0) {
        const vocabIds = mastery.map(m => m.vocabulary_id);
        const { data: words } = await supabase.from('event_vocabulary')
          .select('*')
          .in('id', vocabIds);
        
        if (words) {
          // Merge with wrong_count
          const merged = words.map(w => ({
            ...w,
            wrong_count: mastery.find(m => m.vocabulary_id === w.id)?.wrong_count || 0
          })).sort((a, b) => b.wrong_count - a.wrong_count);
          setWeakWords(merged);
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleSpeak = (text: string) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  };

  if (errorMsg) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">{errorMsg}</div>;
  if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-blue-950 text-slate-100 p-4 font-sans flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] animate-pulse"></div>

      <header className="max-w-4xl mx-auto w-full flex justify-between items-center bg-slate-800/80 p-4 rounded-2xl border border-slate-700 mb-8 backdrop-blur-md relative z-10">
        <h1 className="text-xl font-bold text-red-400 flex items-center gap-2">💊 Review (ซ่อมคำผิด)</h1>
        <Link href="/events/christmas" className="text-slate-400 hover:text-white transition-colors">
          ✕ กลับหมู่บ้าน
        </Link>
      </header>

      <main className="max-w-4xl mx-auto w-full relative z-10">
        {weakWords.length === 0 ? (
          <div className="bg-slate-800/80 p-12 rounded-3xl border border-emerald-500/50 text-center shadow-xl">
            <span className="text-6xl mb-4 block">🏆</span>
            <h2 className="text-2xl font-bold text-white mb-2">ไม่มีคำศัพท์ที่ต้องซ่อม!</h2>
            <p className="text-emerald-400">เก่งมาก! คุณตอบถูกหมดหรือยังไม่เคยทำผิดเลย</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {weakWords.map(word => (
              <div key={word.id} className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-lg relative group overflow-hidden hover:border-red-500/50 transition-colors">
                <div className="absolute top-0 right-0 bg-red-900/50 text-red-400 px-3 py-1 text-xs font-bold rounded-bl-xl border-b border-l border-red-500/30">
                  ผิดไปแล้ว {word.wrong_count} ครั้ง
                </div>
                
                <h3 className="text-2xl font-black text-white mb-1 flex items-center gap-2">
                  {word.word}
                  <button onClick={() => handleSpeak(word.word)} className="text-indigo-400 hover:text-white transition-colors">
                    🔊
                  </button>
                </h3>
                <p className="text-slate-400 mb-4">/{word.pronunciation}/</p>
                <p className="text-emerald-400 font-bold mb-4">{word.meaning_th}</p>
                
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                  <p className="text-sm text-slate-300 italic">"{word.example_sentence}"</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
