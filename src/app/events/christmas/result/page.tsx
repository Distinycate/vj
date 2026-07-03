'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase/client';
import { getStudentSession, StudentSession } from '@/utils/studentSession';
import { calculateGrade } from '@/utils/eventScoring';

export default function ChristmasResultPage() {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [newBadges, setNewBadges] = useState<any[]>([]);
  const [grade, setGrade] = useState<string>('F');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const session = getStudentSession();
    if (!session) {
      window.location.href = '/?error=กรุณาเข้าสู่ระบบนักเรียน';
      return;
    }
    setStudent(session);

    // Parse attemptId from URL query
    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get('attemptId');
    if (!id) {
      window.location.href = '/events/christmas';
      return;
    }
    setAttemptId(id);

    async function loadData() {
      // Fetch attempt
      const { data: attemptData } = await supabase.from('event_vocab_attempts')
        .select('*')
        .eq('id', id)
        .eq('user_id', session!.id)
        .single();

      if (!attemptData || attemptData.status !== 'completed') {
        window.location.href = '/events/christmas';
        return;
      }

      setAttempt(attemptData);
      setGrade(calculateGrade(Number(attemptData.score || 0), attemptData.correct_count, attemptData.total_questions));
      
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      const { data: badgesData } = await supabase.from('event_rewards')
        .select('reward_name')
        .eq('event_id', attemptData.event_id)
        .eq('user_id', session!.id)
        .eq('reward_type', 'badge')
        .gte('earned_at', oneMinuteAgo);

      setNewBadges(badgesData || []);
      setLoading(false);
    }

    loadData();
  }, []);

  if (errorMsg) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">{errorMsg}</div>;
  if (loading || !attempt) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">กำลังโหลดผลลัพธ์...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-blue-950 text-slate-100 p-6 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Snowflakes CSS Animation Background */}
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] animate-pulse"></div>
      
      <div className="bg-slate-800/90 p-8 md:p-12 rounded-3xl border border-slate-700 shadow-2xl text-center max-w-lg w-full relative z-10 backdrop-blur-lg">
        <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 text-7xl drop-shadow-lg">
          🎅
        </div>
        
        <h1 className="text-4xl font-black text-white mt-6 mb-2">
          {attempt.wrong_count >= 3 ? 'พยายามได้ดี!' : 'สุดยอดเลย!'}
        </h1>
        <p className="text-emerald-400 font-bold text-2xl mb-8">Score: {attempt.score}</p>
        
        <div className="mb-8">
           <p className="text-slate-400 mb-1 font-bold">RANK</p>
           <div className={`text-7xl font-black italic tracking-wider ${
              grade === 'SSS' ? 'text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]' :
              grade === 'S' ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' :
              grade === 'A' ? 'text-emerald-400' :
              grade === 'B' ? 'text-blue-400' :
              grade === 'C' ? 'text-purple-400' :
              'text-red-500'
           }`}>
             {grade}
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
           <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
             <p className="text-slate-400 text-sm">ความแม่นยำ</p>
             <p className="text-blue-400 font-bold text-xl">{attempt.accuracy}%</p>
           </div>
           <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
             <p className="text-slate-400 text-sm">ตอบถูก</p>
             <p className="text-emerald-400 font-bold text-xl">{attempt.correct_count} / {attempt.total_questions}</p>
           </div>
           <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
             <p className="text-slate-400 text-sm">เหรียญทอง</p>
             <p className="text-yellow-400 font-bold text-xl">+{attempt.coins_earned}</p>
           </div>
           <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
             <p className="text-slate-400 text-sm">ค่าประสบการณ์</p>
             <p className="text-purple-400 font-bold text-xl">+{attempt.exp_earned} EXP</p>
           </div>
        </div>

        {newBadges && newBadges.length > 0 && (
          <div className="mb-8 p-4 bg-gradient-to-r from-purple-500/20 to-pink-600/20 border border-purple-500/50 rounded-2xl animate-pulse">
            <p className="text-purple-400 font-bold text-lg mb-2">🏆 ปลดล็อก Badge ใหม่!</p>
            <div className="flex flex-wrap justify-center gap-2">
              {newBadges.map((b: any, i: number) => (
                <span key={i} className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                  {b.reward_name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <Link 
            href="/events/christmas/play"
            className="inline-block bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-bold py-4 px-8 rounded-full shadow-lg transition-transform hover:scale-105"
          >
            ⚔️ ลุยภารกิจอีกครั้ง
          </Link>
          <div className="grid grid-cols-2 gap-4">
            <Link 
              href="/events/christmas/review"
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-colors"
            >
              💊 ซ่อมคำที่ผิด
            </Link>
            <Link 
              href="/events/christmas"
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-colors"
            >
              🏠 กลับหมู่บ้าน
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
