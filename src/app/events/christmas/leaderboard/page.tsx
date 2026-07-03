'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';

type Leader = { user_id: string; score: number; accuracy: number; students: { student_name?: string } | null };

export default function ChristmasLeaderboard() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('events')
      .select('id')
      .eq('slug', 'christmas-word-hunt')
      .single()
      .then(({ data: event }) => {
         if (event) {
           supabase.from('event_vocab_attempts')
             .select('user_id,score,accuracy,students(student_name)')
             .eq('event_id', event.id)
             .eq('status', 'completed')
             .order('score', { ascending: false })
             .limit(50)
             .then(({ data }) => {
               setLeaders((data || []) as unknown as Leader[]);
               setLoading(false);
             });
         } else {
           setLoading(false);
         }
      });
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">กำลังโหลด...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-slate-900 to-slate-950 text-slate-100 font-sans p-6 relative overflow-hidden">
      {/* Snowflakes CSS Animation Background */}
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] animate-pulse"></div>

      <div className="max-w-3xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-8 bg-slate-800/80 p-4 rounded-2xl border border-slate-700 backdrop-blur-md">
           <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 flex items-center gap-2">
             🏆 ทำเนียบวีรบุรุษนักล่าคำศัพท์
           </h1>
           <Link href="/events/christmas" className="text-slate-400 hover:text-white transition-colors">
             ✕ ออก
           </Link>
        </div>

        <div className="bg-slate-800/90 rounded-3xl p-6 border border-amber-900/50 shadow-[0_0_30px_rgba(251,191,36,0.1)] space-y-3 backdrop-blur-xl">
          {leaders.map((leader, index) => (
            <div key={`${leader.user_id}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-900/80 p-4 border border-slate-700 hover:border-slate-500 transition-colors">
              <div className="flex items-center gap-4">
                <span className={`w-10 h-10 flex items-center justify-center rounded-full font-black text-lg ${
                  index === 0 ? 'bg-gradient-to-br from-yellow-300 to-amber-600 text-white shadow-lg' :
                  index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white' :
                  index === 2 ? 'bg-gradient-to-br from-amber-700 to-orange-800 text-white' :
                  'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {index + 1}
                </span>
                <span className={`font-bold ${index < 3 ? 'text-white' : 'text-slate-300'}`}>
                  {leader.students?.student_name || 'นักเรียนลึกลับ'}
                </span>
              </div>
              
              <div className="text-right">
                <div className="text-emerald-400 font-bold text-lg">{leader.score} pts</div>
                <div className="text-slate-400 text-sm">แม่นยำ {leader.accuracy}%</div>
              </div>
            </div>
          ))}
          {!leaders.length && (
            <div className="text-center text-slate-400 py-12">
              <span className="text-4xl block mb-4 opacity-50">❄️</span>
              <p>ยังไม่มีผู้กล้าที่ทำภารกิจสำเร็จ... คุณจะเป็นคนแรกไหม?</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
