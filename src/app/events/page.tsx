'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase/client';
import { getStudentSession, StudentSession } from '@/utils/studentSession';
import { Sparkles, Trophy, CheckCircle2, Clock, Play, ArrowRight, BookOpen } from 'lucide-react';

export default function EventsPage() {
  const [assignedRuns, setAssignedRuns] = useState<any[]>([]);
  const [legacyEvents, setLegacyEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<StudentSession | null>(null);

  useEffect(() => {
    const s = getStudentSession();
    setSession(s);

    async function loadData() {
      try {
        // 1. Load assigned runs for student
        const runsRes = await fetch('/api/events/runs').then(r => r.ok ? r.json() : { runs: [] }).catch(() => ({ runs: [] }));
        if (runsRes.runs) {
          setAssignedRuns(runsRes.runs);
        }

        // 2. Load general legacy events (school-wide events only)
        const { data } = await supabase
          .from('events')
          .select('*')
          .neq('event_type', 'remedial_fixed')
          .order('created_at', { ascending: false });
        if (data) {
          setLegacyEvents(data);
        }
      } catch (e) {
        console.warn('Failed to load events:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center text-sm">
        กำลังโหลดข้อมูลกิจกรรม...
      </div>
    );
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
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="text-center mt-6">
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 inline-block mb-3">
            Remedial & Special Events
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 mb-2">
            Event Center & กิจกรรมซ่อมเสริม
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            ทำภารกิจผ่านด่านเพื่อสะสมผลงาน ปลดล็อกความสำเร็จ และแก้ผลการเรียน
          </p>
        </header>

        {/* ── Section 1: Assigned Remedial Runs (ภารกิจของฉัน) ────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" /> ภารกิจซ่อมเสริมที่ได้รับมอบหมาย
            </h2>
            <span className="text-xs text-slate-500">
              {assignedRuns.length} กิจกรรม
            </span>
          </div>

          {assignedRuns.length === 0 ? (
            <div className="text-center py-10 bg-slate-950/40 rounded-3xl border border-slate-800">
              <CheckCircle2 className="w-10 h-10 text-emerald-400/50 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-white">ไม่มีภารกิจซ่อมเสริมค้าง</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                คุณไม่มีกิจกรรมซ่อมเสริมหรือแก้ 0 ที่ครูมอบหมายในขณะนี้ ยินดีด้วยครับ!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedRuns.map(run => {
                const isPassed = run.status === 'passed';
                const isInProgress = run.status === 'in_progress';
                const percent = Math.min(100, Math.round(((run.completedStages || 0) / run.targetStages) * 100));

                return (
                  <div
                    key={run.runId}
                    className={`glass-card p-5 rounded-3xl border transition-all hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between ${
                      isPassed
                        ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 to-slate-900'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-2xl shadow-inner">
                          {run.icon || '⭐'}
                        </div>

                        <div>
                          {isPassed && (
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> ผ่านแล้ว
                            </span>
                          )}
                          {isInProgress && (
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/40 inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> กำลังทำ
                            </span>
                          )}
                          {!isPassed && !isInProgress && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 inline-flex items-center gap-1">
                              ⚪ ยังไม่เริ่ม
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="text-base font-black text-white mt-3 line-clamp-1">{run.title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{run.titleTh}</p>

                      {/* Mission Target Display */}
                      <div className="mt-4 p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-slate-400 font-bold">ภารกิจของคุณ:</span>
                          <span className="font-black text-cyan-400">
                            ผ่าน {run.completedStages || 0} / {run.targetStages} ด่าน
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              isPassed ? 'bg-emerald-400' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-mono">
                        เล่นไปแล้ว {run.totalAttempts || 0} ครั้ง
                      </span>

                      {isPassed ? (
                        <Link
                          href={`/events/run/${run.runId}/result`}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-xs inline-flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-500/20"
                        >
                          <Trophy className="w-3.5 h-3.5" /> ดูผลงาน / ส่งงาน
                        </Link>
                      ) : (
                        <Link
                          href={`/events/run/${run.runId}`}
                          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-xl font-black text-xs inline-flex items-center gap-1.5 transition-colors shadow-lg shadow-cyan-500/20"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> เข้าสู่ด่านภารกิจ
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Section 2: General School Events ──────────────────────────────── */}
        <section className="space-y-4 pt-6 border-t border-slate-800/80">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" /> กิจกรรมทั่วไป (Event Center)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {legacyEvents.map(event => (
              <div key={event.slug} className="bg-slate-900/60 rounded-2xl overflow-hidden border border-slate-800 shadow-xl transition-transform hover:-translate-y-1">
                <div className="h-28 bg-gradient-to-r from-indigo-950 to-purple-950 flex items-center justify-between p-5 relative border-b border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-indigo-300 block">{event.theme || 'Special Event'}</span>
                    <h3 className="text-lg font-black text-white drop-shadow-md">{event.title}</h3>
                  </div>
                  <div className="text-3xl">{event.icon || '🎁'}</div>
                </div>
                <div className="p-5">
                  <p className="text-slate-400 text-xs mb-4 line-clamp-2">{event.description}</p>
                  
                  <div className="flex justify-end">
                    <Link 
                      href={`/events/${event.slug === 'christmas-word-hunt' ? 'christmas' : event.slug}`}
                      className={`px-5 py-2 rounded-xl text-xs font-black transition-colors ${
                        event.status === 'upcoming' 
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed pointer-events-none'
                          : event.status === 'ended'
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed pointer-events-none'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                      }`}
                    >
                      {event.status === 'upcoming' ? 'เร็วๆ นี้' : event.status === 'ended' ? 'จบกิจกรรมแล้ว' : 'เข้าร่วมกิจกรรม'}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Navigation back */}
        <div className="pt-6 text-center">
          <Link href="/" className="text-xs text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1 font-bold">
            ← กลับหน้าหลัก Dashboard Vocab Journey
          </Link>
        </div>
      </div>
    </div>
  );
}
