'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { getStudentSession } from '@/utils/studentSession';

type WeakVerb = { wrong_count: number; event_verbs: { base_form?: string; past_simple?: string; past_participle?: string; meaning_th?: string } | null };

export default function ReviewPage() {
  const [words, setWords] = useState<WeakVerb[]>([]);
  const [needsLogin, setNeedsLogin] = useState(false);
  useEffect(() => {
    const session = getStudentSession();
    if (!session) return setNeedsLogin(true);
    supabase.from('event_verb_mastery')
      .select('wrong_count,event_verbs(base_form,past_simple,past_participle,meaning_th)')
      .eq('user_id', session.id).gt('wrong_count', 0).order('wrong_count', { ascending: false })
      .then(({ data }) => setWords((data || []) as unknown as WeakVerb[]));
  }, []);
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold text-rose-400 my-8 text-center">Review Weak Verbs</h1>
        <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 grid gap-3">
          {words.map((row, index) => (
            <div key={index} className="rounded-xl bg-slate-900 p-4">
              <div className="font-black text-xl">{row.event_verbs?.base_form} → {row.event_verbs?.past_simple} → {row.event_verbs?.past_participle}</div>
              <div className="text-slate-400">{row.event_verbs?.meaning_th} · ผิด {row.wrong_count} ครั้ง</div>
            </div>
          ))}
          {!words.length && <p className="text-center text-slate-400 py-8">{needsLogin ? 'กรุณาเข้าสู่ระบบนักเรียนก่อน' : 'ยังไม่มีคำที่ต้องทบทวน'}</p>}
        </div>
        <Link href="/events/verb-master" className="block text-center text-blue-400 mt-8">← กลับหน้ากิจกรรม</Link>
      </div>
    </div>
  );
}
