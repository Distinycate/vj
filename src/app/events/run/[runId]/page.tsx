'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Lock, Play, Trophy, Sparkles, Clock, AlertCircle } from 'lucide-react';

export default function EventRunMapPage() {
  const params = useParams();
  const router = useRouter();
  const runId = params.runId as string;

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadRunMap() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`/api/events/runs/${runId}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'โหลดข้อมูลด่านไม่สำเร็จ');
        }
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      } catch (e: any) {
        setError(e.message || 'เกิดข้อผิดพลาดในการโหลดด่าน');
      } finally {
        setLoading(false);
      }
    }
    if (runId) loadRunMap();
  }, [runId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center text-sm">
        กำลังโหลดแผนที่ด่าน...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-800 p-6 rounded-3xl border border-slate-700 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">ไม่สามารถเข้าสู่ Event นี้ได้</h2>
          <p className="text-xs text-slate-400">{error || 'คุณอาจไม่ได้รับมอบหมายในกิจกรรมนี้'}</p>
          <Link
            href="/events"
            className="inline-block px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-colors"
          >
            กลับหน้ารวมกิจกรรม
          </Link>
        </div>
      </div>
    );
  }

  const { run, participant, stages } = data;
  const isEventPassed = participant.isPassed || participant.completedStages >= participant.targetStages;
  const percent = Math.min(100, Math.round((participant.completedStages / participant.targetStages) * 100));

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Link */}
        <Link
          href="/events"
          className="text-xs font-bold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับหน้ารวมกิจกรรม
        </Link>

        {/* Event Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl shadow-inner">
              {run.icon || '⭐'}
            </div>
            <div>
              <span className="text-xs font-bold text-cyan-400 block">{run.titleTh}</span>
              <h1 className="text-2xl font-black text-white">{run.title}</h1>
              <p className="text-xs text-slate-400 mt-0.5">{run.description}</p>
            </div>
          </div>

          <div>
            {isEventPassed ? (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 inline-flex items-center gap-1.5 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-4 h-4" /> ผ่านภารกิจแล้ว
              </span>
            ) : participant.status === 'in_progress' ? (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/40 inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> กำลังทำภารกิจ
              </span>
            ) : (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-800 text-slate-400 inline-flex items-center gap-1.5">
                ⚪ ยังไม่เริ่มเล่น
              </span>
            )}
          </div>
        </div>

        {/* Mission Progress Card */}
        <div className="bg-slate-950/60 p-5 rounded-3xl border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-black text-white">ภารกิจของคุณ:</span>
              <span className="text-xs text-slate-400">
                ผ่านให้ได้อย่างน้อย <strong className="text-cyan-400">{participant.targetStages}</strong> จากทั้งหมด 15 ด่าน (เกณฑ์ 7/10 ข้อต่อด่าน)
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs font-black text-cyan-400">
                {participant.completedStages} / {participant.targetStages} ด่าน ({percent}%)
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isEventPassed ? 'bg-emerald-400' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>

          {isEventPassed && (
            <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3">
              <div className="text-xs text-emerald-300 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                คุณทำภารกิจผ่านครบตามเป้าหมายแล้ว สามารถเปิด Result Card สำหรับส่งงานได้เลย
              </div>
              <Link
                href={`/events/run/${runId}/result`}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-xs shrink-0 inline-flex items-center gap-1.5 transition-colors shadow-md"
              >
                <Trophy className="w-3.5 h-3.5" /> แสดงผลสำหรับส่งงาน
              </Link>
            </div>
          )}
        </div>

        {/* 15 Stages Grid */}
        <div>
          <h2 className="text-base font-black text-white mb-4 flex items-center gap-2">
            เส้นทาง 15 ด่านทดสอบ
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {stages.map((st: any) => {
              const isPassed = st.passed;
              const isUnlocked = st.unlocked;

              return (
                <div
                  key={st.stageNumber}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isPassed
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : isUnlocked
                      ? 'bg-slate-800/60 border-cyan-500/40 hover:border-cyan-400 shadow-lg shadow-cyan-500/5'
                      : 'bg-slate-950/40 border-slate-800/80 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                        isPassed
                          ? 'bg-emerald-500 text-slate-950'
                          : isUnlocked
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {st.stageNumber}
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-white line-clamp-1">{st.title}</h3>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {isPassed ? (
                          <span className="text-emerald-400 font-bold">
                            ผ่านแล้ว (ได้ {st.bestScore}/10)
                          </span>
                        ) : isUnlocked ? (
                          <span className="text-cyan-400">
                            {st.attempts > 0 ? `ลองแล้ว ${st.attempts} ครั้ง (คะแนนดีสุด: ${st.bestScore}/10)` : 'พร้อมเริ่มเล่น'}
                          </span>
                        ) : (
                          <span className="text-slate-500 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> ต้องผ่านด่าน {st.stageNumber - 1} ก่อน
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isUnlocked ? (
                      <Link
                        href={`/events/run/${runId}/stage/${st.stageNumber}`}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black inline-flex items-center gap-1 transition-colors ${
                          isPassed
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
                        }`}
                      >
                        <Play className="w-3 h-3 fill-current" /> {isPassed ? 'ทบทวน' : 'เล่น'}
                      </Link>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-slate-800/60 flex items-center justify-center text-slate-600">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
