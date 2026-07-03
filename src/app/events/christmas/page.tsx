'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase/client';
import { getStudentSession, StudentSession } from '@/utils/studentSession';
import { useRouter } from 'next/navigation';

export default function ChristmasEventLanding() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [stats, setStats] = useState({ totalWords: 60, learnedCount: 0, masteredCount: 0, badgesCount: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const session = getStudentSession();
    if (!session) {
      window.location.href = '/?error=กรุณาเข้าสู่ระบบนักเรียน';
      return;
    }
    setStudent(session);

    async function loadData() {
      // Fetch Event Data
      const { data: event } = await supabase.from('events').select('id, title, description, status').eq('slug', 'christmas-word-hunt').single();
      if (!event || event.status !== 'active') {
        setErrorMsg('กิจกรรมนี้ยังไม่เปิดให้เข้าร่วม');
        setLoading(false);
        return;
      }
      setEventData(event);

      // Fetch Total Words
      const { count: totalWords } = await supabase.from('event_vocabulary')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('is_active', true);

      // Fetch Mastery
      const { data: mastery } = await supabase.from('event_vocab_mastery')
        .select('mastery_level')
        .eq('event_id', event.id)
        .eq('user_id', session!.id);
        
      const masteredCount = mastery?.filter(m => m.mastery_level >= 5).length || 0;
      const learnedCount = mastery?.length || 0;

      // Fetch Badges
      const { data: rewards } = await supabase.from('event_rewards')
        .select('reward_name')
        .eq('event_id', event.id)
        .eq('user_id', session!.id)
        .eq('reward_type', 'badge');

      setStats({
        totalWords: totalWords || 60,
        learnedCount,
        masteredCount,
        badgesCount: rewards?.length || 0
      });

      setLoading(false);
    }
    
    loadData();
  }, []);

  if (errorMsg) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">{errorMsg}</div>;
  if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">กำลังโหลด...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-slate-900 to-slate-950 text-slate-100 font-sans pb-20 relative overflow-hidden">
      {/* Snowflakes CSS Animation Background */}
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] animate-pulse"></div>
      
      {/* Header */}
      <header className="bg-slate-900/80 border-b border-slate-800 p-4 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎄</span>
            <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300">
              {eventData.title}
            </h1>
          </div>
          <Link href="/events" className="text-slate-400 hover:text-white transition-colors text-sm font-bold bg-slate-800 px-4 py-2 rounded-full">
             ออก
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8 mt-6 relative z-10">
        
        {/* Banner Section */}
        <div className="bg-gradient-to-br from-emerald-800 to-slate-900 rounded-3xl p-8 mb-8 border border-emerald-700/50 shadow-2xl relative overflow-hidden">
           <div className="absolute top-[-50px] right-[-50px] text-[150px] opacity-10">🎅</div>
           <h2 className="text-3xl md:text-5xl font-black text-white mb-4 drop-shadow-md">
             ยินดีต้อนรับสู่ <span className="text-yellow-400">หมู่บ้านคริสต์มาส!</span>
           </h2>
           <p className="text-emerald-100 text-lg md:text-xl max-w-2xl leading-relaxed">
             {eventData.description} ล่าคำศัพท์ สะสมคะแนน เพื่อปลดล็อกตราสัญลักษณ์และของขวัญแจ็คพอต!
           </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 text-center">
            <p className="text-slate-400 text-sm font-bold mb-1">คำศัพท์ทั้งหมด</p>
            <p className="text-3xl font-black text-white">{stats.totalWords}</p>
          </div>
          <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 text-center">
            <p className="text-slate-400 text-sm font-bold mb-1">เรียนแล้ว</p>
            <p className="text-3xl font-black text-blue-400">{stats.learnedCount}</p>
          </div>
          <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 text-center">
            <p className="text-slate-400 text-sm font-bold mb-1">เชี่ยวชาญ (Master)</p>
            <p className="text-3xl font-black text-yellow-400">{stats.masteredCount}</p>
          </div>
          <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 text-center">
            <p className="text-slate-400 text-sm font-bold mb-1">Badges</p>
            <p className="text-3xl font-black text-purple-400">{stats.badgesCount}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4">
          <Link href="/events/christmas/study-camp" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white p-6 rounded-2xl shadow-lg border border-blue-500/30 group transition-transform hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <span className="text-4xl group-hover:scale-110 transition-transform">⛺</span>
              <div>
                <h3 className="text-xl font-bold mb-1">Study Camp (เข้าค่ายติว)</h3>
                <p className="text-blue-100 text-sm">แวะมาท่องจำคำศัพท์และฟังเสียงก่อนลงสนามจริง (แนะนำสำหรับมือใหม่)</p>
              </div>
            </div>
          </Link>

          <Link href="/events/christmas/play" className="bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white p-6 rounded-2xl shadow-lg border border-emerald-400/30 group transition-transform hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <span className="text-4xl group-hover:scale-110 transition-transform">⚔️</span>
              <div>
                <h3 className="text-xl font-bold mb-1">Start Mission (เริ่มภารกิจ)</h3>
                <p className="text-emerald-100 text-sm">ทดสอบความจำ สะกดคำ ฟังเสียง ล่าคะแนนและตั๋วสุ่มกาชา!</p>
              </div>
            </div>
          </Link>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/events/christmas/review" className="bg-slate-800 hover:bg-slate-700 text-white p-5 rounded-2xl border border-slate-700 flex items-center gap-3 transition-colors">
              <span className="text-2xl">💊</span>
              <div>
                <h3 className="font-bold">Review (ซ่อมเสริม)</h3>
                <p className="text-slate-400 text-xs">ฝึกซ้ำคำที่ผิดบ่อยๆ</p>
              </div>
            </Link>
            
            <Link href="/events/christmas/leaderboard" className="bg-slate-800 hover:bg-slate-700 text-white p-5 rounded-2xl border border-slate-700 flex items-center gap-3 transition-colors">
              <span className="text-2xl">🏆</span>
              <div>
                <h3 className="font-bold">Leaderboard</h3>
                <p className="text-slate-400 text-xs">ทำเนียบวีรบุรุษนักล่าคำศัพท์</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
