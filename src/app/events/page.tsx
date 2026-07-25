'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase/client';
import { getStudentSession, StudentSession } from '@/utils/studentSession';

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<StudentSession | null>(null);

  useEffect(() => {
    setSession(getStudentSession());
    async function loadEvents() {
      const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false });
      if (data) {
        setEvents(data);
      }
      setLoading(false);
    }
    loadEvents();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">กำลังโหลดข้อมูลกิจกรรม...</div>;
  }

  if (session?.user_type === 'EXTERNAL') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-6 text-center">
          <div className="text-4xl mb-4">🌐</div>
          <h1 className="text-xl font-black text-white">Guest Network ไม่เปิด Event Center</h1>
          <p className="text-sm text-slate-400 mt-2">
            บัญชีโรงเรียนเครือข่ายใช้สำหรับทดลอง Dashboard, Study Camp, Challenge Game และ Review Words เท่านั้น
          </p>
          <Link href="/" className="mt-5 min-h-11 bg-cyan-500 text-slate-950 rounded-xl font-black flex items-center justify-center">
            กลับ Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 text-center mt-8">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-4">
            Event Center
          </h1>
          <p className="text-slate-400">ศูนย์รวมกิจกรรมพิเศษ ท้าทายความสามารถ และรับรางวัลสุดแรร์</p>
        </header>

        {events.length === 0 ? (
           <div className="text-center py-20 bg-slate-800 rounded-3xl border border-slate-700">
             <p className="text-slate-400">ยังไม่มีกิจกรรมในขณะนี้</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map(event => (
              <div key={event.slug} className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-xl transition-transform hover:-translate-y-1">
                <div className="h-32 bg-gradient-to-r from-indigo-900 to-purple-900 flex items-center justify-center relative">
                  {event.status === 'upcoming' && (
                    <span className="absolute top-3 right-3 bg-slate-900 text-slate-300 text-xs px-2 py-1 rounded-full border border-slate-700">
                      Upcoming
                    </span>
                  )}
                  {event.status === 'ended' && (
                    <span className="absolute top-3 right-3 bg-rose-900/50 text-rose-300 text-xs px-2 py-1 rounded-full border border-rose-700">
                      Ended
                    </span>
                  )}
                  <h2 className="text-2xl font-bold text-white drop-shadow-md">{event.theme || 'Special Event'}</h2>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-blue-300 mb-2">{event.title}</h3>
                  <p className="text-slate-400 text-sm mb-6 h-10 line-clamp-2">{event.description}</p>
                  
                  <div className="flex justify-end">
                    <Link 
                      href={`/events/${event.slug}`}
                      className={`px-6 py-2 rounded-full font-bold transition-colors ${
                        event.status === 'upcoming' 
                          ? 'bg-slate-700 text-slate-400 hover:bg-slate-700 cursor-not-allowed pointer-events-none'
                          : event.status === 'ended'
                          ? 'bg-slate-700 text-slate-400 hover:bg-slate-700 cursor-not-allowed pointer-events-none'
                          : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-purple-500/20'
                      }`}
                    >
                      {event.status === 'upcoming' ? 'เร็วๆ นี้' : event.status === 'ended' ? 'จบกิจกรรมแล้ว' : 'เข้าร่วมกิจกรรม'}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Navigation back */}
        <div className="mt-12 text-center">
           <Link href="/" className="text-blue-400 hover:text-blue-300 underline underline-offset-4 transition-colors">
              กลับหน้าหลัก Vocab Journey
           </Link>
        </div>
      </div>
    </div>
  );
}
