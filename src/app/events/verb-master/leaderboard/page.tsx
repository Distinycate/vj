'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';

type Leader = { user_id: string; score: number; accuracy: number; students: { student_name?: string } | null };

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  useEffect(() => {
    supabase.from('event_attempts')
      .select('user_id,score,accuracy,students(student_name)')
      .eq('status', 'completed').order('score', { ascending: false }).limit(20)
      .then(({ data }) => setLeaders((data || []) as unknown as Leader[]));
  }, []);
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold text-amber-400 my-8 text-center">Leaderboard</h1>
        <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 space-y-3">
          {leaders.map((leader, index) => (
            <div key={`${leader.user_id}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-900 p-4">
              <span className="font-bold">#{index + 1} {leader.students?.student_name || 'นักเรียน'}</span>
              <span className="text-emerald-400">{leader.score} คะแนน · {leader.accuracy}%</span>
            </div>
          ))}
          {!leaders.length && <p className="text-center text-slate-400 py-8">ยังไม่มีผลการเล่นที่จบสมบูรณ์</p>}
        </div>
        <Link href="/events/verb-master" className="block text-center text-blue-400 mt-8">← กลับหน้ากิจกรรม</Link>
      </div>
    </div>
  );
}
