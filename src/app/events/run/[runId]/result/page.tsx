'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Trophy,
  CheckCircle2,
  Calendar,
  User,
  GraduationCap,
  Layers,
  ArrowLeft,
  Maximize2,
  Minimize2,
  Printer,
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function EventRunResultPage() {
  const params = useParams();
  const router = useRouter();
  const runId = params.runId as string;

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fullscreenMode, setFullscreenMode] = useState(false);

  useEffect(() => {
    async function loadResult() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`/api/events/runs/${runId}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'โหลดข้อมูลผลลัพธ์ไม่สำเร็จ');
        }
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      } catch (e: any) {
        setError(e.message || 'เกิดข้อผิดพลาดในการโหลดผลลัพธ์');
      } finally {
        setLoading(false);
      }
    }
    if (runId) loadResult();
  }, [runId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center text-sm font-medium">
        กำลังโหลดผลการผ่านกิจกรรม...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-800 p-6 rounded-3xl border border-slate-700 text-center space-y-4 shadow-xl">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">ไม่สามารถเปิดหน้าผลลัพธ์ได้</h2>
          <p className="text-xs text-slate-400">{error || 'ไม่พบข้อมูลกิจกรรม'}</p>
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

  const { run, student, participant } = data;
  const isPassed = participant.isPassed || participant.completedStages >= participant.targetStages;

  // Format completed date
  const completedDateObj = participant.completedAt ? new Date(participant.completedAt) : new Date();
  const formattedDate = completedDateObj.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = completedDateObj.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Short verification reference code
  const verifyCode = `VJ-EVT-${runId.slice(0, 8).toUpperCase()}-${(student?.studentId || 'STD').slice(0, 4)}`;

  // ─────────────────────────────────────────────────────────────────────────────
  // FULLSCREEN / CLEAN SUBMISSION CARD MODE (สำหรับ Screenshot ส่ง Smart Portfolio)
  // ─────────────────────────────────────────────────────────────────────────────
  if (fullscreenMode) {
    return (
      <div className="min-h-screen bg-slate-950 p-4 sm:p-8 flex flex-col items-center justify-center font-sans print:p-0 print:bg-white">
        {/* Floating Action Controls */}
        <div className="w-full max-w-2xl mb-4 flex items-center justify-between print:hidden">
          <button
            onClick={() => setFullscreenMode(false)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700 shadow-md"
          >
            <Minimize2 className="w-3.5 h-3.5" /> ปิดโหมดแสดงผลส่งงาน
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
            >
              <Printer className="w-3.5 h-3.5" /> สั่งพิมพ์ / บันทึก PDF
            </button>
          </div>
        </div>

        {/* Clean Printable Result Card for Smart Portfolio */}
        <div className="w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/50 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-slate-100 print:border-emerald-700 print:text-black print:bg-white print:shadow-none">
          {/* Subtle Background Glow Decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none print:hidden" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none print:hidden" />

          {/* Card Header */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-5 mb-6 print:border-slate-300">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg print:border print:border-emerald-600">
                VJ
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2 print:text-black">
                  Vocab Journey
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold print:border-emerald-600 print:text-emerald-700">
                    Official Remedial Pass
                  </span>
                </h1>
                <p className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
                  ใบยืนยันผลการเข้าร่วมกิจกรรมซ่อมเสริม / ปรับคะแนนผลการเรียน
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block font-mono print:text-slate-500">REF CODE</span>
              <span className="text-xs font-mono font-bold text-slate-300 print:text-black">{verifyCode}</span>
            </div>
          </div>

          {/* Status Banner */}
          <div className="mb-6 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between print:bg-emerald-50 print:border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="text-sm font-black text-emerald-400 print:text-emerald-700">
                  ✅ ผ่านกิจกรรมซ่อมเสริมแล้ว
                </div>
                <div className="text-xs text-slate-400 print:text-slate-600">
                  ผ่านเกณฑ์ประเมินตามที่ครูผู้สอนกำหนดครบถ้วน
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs tracking-wider uppercase shadow-md">
                PASSED
              </span>
            </div>
          </div>

          {/* Core Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl print:bg-slate-50 print:border-slate-200">
              <span className="text-[11px] text-slate-400 print:text-slate-500 block mb-0.5">ชื่อ-นามสกุล นักเรียน</span>
              <span className="text-sm font-bold text-white print:text-black">{student?.name || 'นักเรียน'}</span>
            </div>

            <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl print:bg-slate-50 print:border-slate-200">
              <span className="text-[11px] text-slate-400 print:text-slate-500 block mb-0.5">ระดับชั้น / ห้องเรียน</span>
              <span className="text-sm font-bold text-white print:text-black">
                {student?.className || run.className || 'ไม่ระบุห้อง'} {student?.studentId ? `(เลขประจำตัว: ${student.studentId})` : ''}
              </span>
            </div>

            <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl print:bg-slate-50 print:border-slate-200">
              <span className="text-[11px] text-slate-400 print:text-slate-500 block mb-0.5">ชื่อกิจกรรม (Event)</span>
              <span className="text-sm font-bold text-white print:text-black">
                {run.title} ({run.titleTh})
              </span>
            </div>

            <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl print:bg-slate-50 print:border-slate-200">
              <span className="text-[11px] text-slate-400 print:text-slate-500 block mb-0.5">ผลการผ่านด่านทดสอบ</span>
              <span className="text-sm font-black text-emerald-400 print:text-emerald-700">
                ผ่าน {participant.completedStages} / {participant.targetStages} ด่าน (เกณฑ์ 7/10 ข้อ)
              </span>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-2 print:border-slate-300 print:text-slate-600">
            <div>
              สำเร็จเมื่อ: <strong className="text-slate-200 print:text-black">{formattedDate} เวลา {formattedTime} น.</strong>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 print:text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 print:text-emerald-600" />
              รับรองผลโดยระบบ Vocab Journey Learning System
            </div>
          </div>

          {/* Capture Guide Tip for Student */}
          <div className="mt-5 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-[11px] text-slate-300 text-center print:hidden">
            📸 <strong>คำแนะนำสำหรับนักเรียน:</strong> บันทึกภาพหน้าจอนี้ (Screenshot) เพื่อนำไปแนบส่งในระบบ Smart Portfolio หรือส่งให้ครูผู้สอน
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STANDARD RESULT VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back Link */}
        <Link
          href={`/events/run/${runId}`}
          className="text-xs font-bold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับสู่แผนที่ด่าน
        </Link>

        {/* Hero Celebration Card */}
        <div className="bg-gradient-to-b from-slate-900 via-indigo-950/40 to-slate-950 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl text-center space-y-4 relative overflow-hidden">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-xl shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center text-emerald-400">
              <Trophy className="w-10 h-10" />
            </div>
          </div>

          <div>
            <span className="text-xs font-black text-cyan-400 uppercase tracking-widest block mb-1">
              VOCAB JOURNEY REMEDIAL
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              {isPassed ? '✅ ผ่านกิจกรรมซ่อมเสริมแล้ว' : 'กำลังดำเนินการกิจกรรม'}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {isPassed
                ? 'ยินดีด้วย! คุณทำภารกิจผ่านครบตามเป้าหมายที่กำหนดไว้เรียบร้อยแล้ว'
                : 'คุณยังทำภารกิจไม่ครบเป้าหมาย กรุณาเล่นด่านที่เหลือให้ผ่าน'}
            </p>
          </div>

          {/* Student Info Box */}
          <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 text-left space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" /> ชื่อนักเรียน:
              </span>
              <strong className="text-white font-bold">{student?.name || 'นักเรียน'}</strong>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" /> ระดับชั้น / ห้อง:
              </span>
              <strong className="text-white font-bold">
                {student?.className || run.className || 'ไม่ระบุ'} {student?.studentId ? `(${student.studentId})` : ''}
              </strong>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> กิจกรรม (Event):
              </span>
              <strong className="text-white font-bold">{run.title} ({run.titleTh})</strong>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" /> ผลการผ่านด่าน:
              </span>
              <strong className="text-emerald-400 font-black">
                ผ่าน {participant.completedStages} / {participant.targetStages} ด่าน
              </strong>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> สถานะ:
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase ${
                isPassed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {isPassed ? 'PASSED' : 'IN PROGRESS'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> สำเร็จเมื่อ:
              </span>
              <span className="text-slate-300 font-mono">
                {formattedDate} {formattedTime}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => setFullscreenMode(true)}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs inline-flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" /> แสดงผลสำหรับส่งงาน (Screenshot Card)
            </button>

            <Link
              href={`/events/run/${runId}`}
              className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              กลับสู่แผนที่ด่าน
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
