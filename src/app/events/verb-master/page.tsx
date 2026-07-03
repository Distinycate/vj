'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { getStudentSession } from '@/utils/studentSession';
import { getStudentEventProgress } from '@/services/verbEventService';

export default function VerbMasterLandingPage() {
  const [stats, setStats] = useState({ totalVerbs: 0, practicedVerbs: 0, masteredVerbs: 0, accuracy: 0 });
  const [eventStatus, setEventStatus] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      const session = getStudentSession();
      if (!session) {
        setMessage('กรุณาเข้าสู่ระบบนักเรียนจากหน้าหลัก');
        return;
      }
      const { data: event, error } = await supabase.from('events').select('id,status').eq('slug', 'verb-master').maybeSingle();
      if (error || !event) {
        setMessage('ยังไม่ได้ติดตั้งหรือสร้างกิจกรรม Verb Master');
        return;
      }
      setEventStatus(event.status);
      const [{ count }, progress] = await Promise.all([
        supabase.from('event_verbs').select('*', { count: 'exact', head: true }).eq('event_id', event.id).eq('is_active', true),
        getStudentEventProgress(event.id, session.id),
      ]);
      setStats({ totalVerbs: count || 0, ...progress });
    }
    load().catch(() => setMessage('ไม่สามารถโหลดผลกิจกรรมได้'));
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans flex flex-col items-center">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <header className="mb-8 text-center mt-8">
          <span className="text-purple-400 font-bold tracking-widest text-sm uppercase mb-2 block">Castle of Time</span>
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-4 drop-shadow-sm">
            Verb Master Challenge
          </h1>
          <p className="text-slate-300 text-lg">ทดสอบความจำกริยา 3 ช่องด้วยการพิมพ์ให้ถูกต้องและเร็วที่สุด!</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center shadow-lg">
            <div className="text-slate-400 text-sm mb-1">คำทั้งหมด</div>
            <div className="text-2xl font-bold text-white">{stats.totalVerbs}</div>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center shadow-lg">
            <div className="text-slate-400 text-sm mb-1">ฝึกแล้ว</div>
            <div className="text-2xl font-bold text-blue-400">{stats.practicedVerbs}</div>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center shadow-lg">
            <div className="text-slate-400 text-sm mb-1">Mastered</div>
            <div className="text-2xl font-bold text-purple-400">{stats.masteredVerbs}</div>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center shadow-lg">
            <div className="text-slate-400 text-sm mb-1">Accuracy</div>
            <div className="text-2xl font-bold text-emerald-400">{stats.accuracy}%</div>
          </div>
        </div>

        {/* Main Actions */}
        <div className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700 shadow-2xl backdrop-blur-sm flex flex-col items-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center border-4 border-slate-600 shadow-inner mb-6">
            <span className="text-slate-400 text-sm font-bold">No Badge</span>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">พร้อมหรือยัง?</h2>
          <p className="text-slate-400 text-center mb-8 max-w-md">
            ในโหมดนี้จะไม่มีช้อยส์ให้เลือก คุณต้องพิมพ์คำตอบด้วยตัวเอง การสะกดผิดเล็กน้อยจะไม่โดนหักหัวใจในครั้งแรก!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            {eventStatus === 'active' && stats.totalVerbs > 0 ? (
              <Link href="/events/verb-master/play" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 px-8 rounded-full shadow-lg shadow-purple-500/25 transition-transform hover:scale-105 text-center text-lg w-full sm:w-auto">
                Start Challenge
              </Link>
            ) : (
              <div className="bg-slate-700 text-slate-300 font-bold py-4 px-8 rounded-full text-center">
                {message || (eventStatus === 'active' ? 'ยังไม่มีชุดคำกริยา' : 'กิจกรรมยังไม่เปิด')}
              </div>
            )}
            <Link 
              href="/events/verb-master/review"
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 px-8 rounded-full shadow-lg transition-transform hover:scale-105 text-center text-lg w-full sm:w-auto border border-slate-600"
            >
              Review Weak Verbs
            </Link>
          </div>
        </div>

        {/* Footer Nav */}
        <div className="flex justify-between items-center px-4">
          <Link href="/events" className="text-slate-400 hover:text-white transition-colors">
            ← กลับหน้า Event Center
          </Link>
          <Link href="/events/verb-master/leaderboard" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">
            ดู Leaderboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
