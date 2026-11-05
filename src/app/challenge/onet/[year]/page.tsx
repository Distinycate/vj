'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  HelpCircle,
  RotateCcw,
  Send,
  Sparkles,
  Star,
  Trophy,
  XCircle,
  FileText,
  Check,
  Eye,
  Lock,
} from 'lucide-react';
import { getOnetYearConfig, OnetQuestion, NATIONAL_BENCHMARKS } from '@/data/onet/onetData';

interface PageProps {
  params: Promise<{ year: string }>;
}

export default function OnetExamRoomPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const yearNum = Number(resolvedParams.year);
  const config = getOnetYearConfig(yearNum);

  // States
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'both' | 'pdf' | 'sheet'>('both');
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [examResult, setExamResult] = useState<any | null>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'wrong'>('all');
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [studentClassroom, setStudentClassroom] = useState<string>('');

  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Check access permission on mount
  useEffect(() => {
    async function checkAccess() {
      try {
        const res = await fetch('/api/student/onet');
        const data = await res.json();
        if (res.ok && data.success) {
          setStudentClassroom(data.studentClassroom || '');
          const access = data.yearAccess?.[String(yearNum)];
          if (access && access.isAllowed === false) {
            setIsAllowed(false);
          } else {
            setIsAllowed(true);
          }
        } else {
          setIsAllowed(true);
        }
      } catch {
        setIsAllowed(true);
      }
    }
    checkAccess();
  }, [yearNum]);

  // Timer
  useEffect(() => {
    if (examResult) return;
    const interval = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [examResult]);

  // Load draft answers from localStorage
  useEffect(() => {
    try {
      const draft = localStorage.getItem(`vj_onet_draft_${yearNum}`);
      if (draft) {
        setAnswers(JSON.parse(draft));
      }
    } catch (e) {
      console.warn('Failed to load draft:', e);
    }
  }, [yearNum]);

  // Save draft answers to localStorage
  const updateAnswer = (questionNumber: number, value: any) => {
    const updated = { ...answers, [String(questionNumber)]: value };
    setAnswers(updated);
    try {
      localStorage.setItem(`vj_onet_draft_${yearNum}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save draft:', e);
    }
  };

  const updateOrderingAnswer = (questionNumber: number, stepIndex: number, letter: string) => {
    const current = Array.isArray(answers[String(questionNumber)])
      ? [...answers[String(questionNumber)]]
      : ['', '', '', '', '', ''];
    current[stepIndex] = letter;
    updateAnswer(questionNumber, current);
  };

  if (!config) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-black mb-2">ไม่พบชุดข้อสอบปี {resolvedParams.year}</h1>
        <p className="text-slate-400 text-sm mb-6">ชุดข้อสอบนี้ยังไม่เปิดให้เข้าใช้งาน หรือกำลังเตรียมข้อมูล</p>
        <Link href="/challenge/onet" className="px-5 py-2.5 bg-indigo-600 rounded-xl font-bold text-xs">
          กลับหน้ารวม O-NET
        </Link>
      </div>
    );
  }

  // Answered count calculation
  const totalQuestions = config.questions.length;
  let answeredCount = 0;
  config.questions.forEach((q) => {
    const a = answers[String(q.number)];
    if (q.type === 'single' && a) answeredCount++;
    else if (q.type === 'ordering' && Array.isArray(a) && a.filter(Boolean).length === 6) answeredCount++;
  });

  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  // Format stopwatch
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const scrollToQuestion = (qNum: number) => {
    const el = questionRefs.current[qNum];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/student/onet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: yearNum,
          answers,
          durationSeconds: secondsElapsed,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setExamResult(data);
        // Save result record locally
        try {
          const past = JSON.parse(localStorage.getItem('vj_onet_records') || '{}');
          past[String(yearNum)] = {
            score100: data.score100,
            correctCount: data.correctCount,
            totalQuestions: data.totalQuestions,
            stars: data.stars,
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem('vj_onet_records', JSON.stringify(past));
          // Clear draft
          localStorage.removeItem(`vj_onet_draft_${yearNum}`);
        } catch (e) {
          console.warn('Failed to update local onet record:', e);
        }
      } else {
        alert(data.error || 'ส่งคำตอบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      }
    } catch (e) {
      console.error('Submit error:', e);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAllowed === false) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-3xl mx-auto border border-amber-500/30">
            🔒
          </div>
          <h2 className="text-xl font-black text-white">ชุดข้อสอบปี {yearNum} ยังไม่เปิดให้เข้าทำ</h2>
          <p className="text-sm text-slate-300">
            คุณครูยังไม่ได้เปิดชุดข้อสอบปีนี้สำหรับห้องเรียนของน้อง {studentClassroom && <strong className="text-cyan-400">(ห้อง {studentClassroom})</strong>}
          </p>
          <p className="text-xs text-slate-500">
            กรุณารอคุณครูประจำวิชาเปิดระบบห้องสอบเมื่อถึงคาบเรียน หรือเลือกลุยข้อสอบปีอื่นที่คุณครูเปิดไว้แล้ว
          </p>
          <div className="pt-2">
            <Link
              href="/challenge/onet"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" /> กลับสู่หน้าชาเลนจ์ O-NET
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* ── Top Header Bar ─────────────────────────────────────────── */}
      <header className="h-14 sm:h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 sticky top-0">
        <div className="flex items-center gap-3">
          <Link
            href="/challenge/onet"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="กลับไปเลือกปี"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                ปี {yearNum}
              </span>
              <h1 className="text-xs sm:text-sm font-black text-white hidden sm:inline">
                {config.title}
              </h1>
            </div>
            <p className="text-[10px] text-slate-400">
              โจทย์ข้อสอบจริง {totalQuestions} ข้อ • ไม่จำกัดเวลาทำ
            </p>
          </div>
        </div>

        {/* Center Progress & Timer */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-300 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span>{formatTime(secondsElapsed)}</span>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-bold">ตอบแล้ว:</span>
            <span className="font-black text-cyan-400 font-mono">
              {answeredCount} / {totalQuestions}
            </span>
            <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Action */}
        <div className="flex items-center gap-2">
          {/* Mobile view toggler */}
          <div className="flex lg:hidden bg-slate-800 p-0.5 rounded-xl text-xs">
            <button
              onClick={() => setActiveTab('pdf')}
              className={`px-2.5 py-1 rounded-lg font-bold ${
                activeTab === 'pdf' ? 'bg-indigo-600 text-white' : 'text-slate-400'
              }`}
            >
              PDF
            </button>
            <button
              onClick={() => setActiveTab('sheet')}
              className={`px-2.5 py-1 rounded-lg font-bold ${
                activeTab === 'sheet' ? 'bg-indigo-600 text-white' : 'text-slate-400'
              }`}
            >
              คำตอบ ({answeredCount})
            </button>
          </div>

          <button
            onClick={() => {
              if (answeredCount < totalQuestions) {
                setShowConfirmModal(true);
              } else {
                handleSubmit();
              }
            }}
            disabled={isSubmitting}
            className={`px-4 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition-transform active:scale-95 ${
              answeredCount === totalQuestions
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 animate-bounce'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'กำลังตรวจ...' : 'ส่งคำตอบ'}</span>
          </button>
        </div>
      </header>

      {/* ── Main Split-Screen Workspace ───────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: PDF Viewer */}
        <div
          className={`flex-1 flex flex-col bg-slate-900 border-r border-slate-800 transition-all ${
            activeTab === 'sheet' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* PDF Sub-header */}
          <div className="h-9 bg-slate-950/80 px-4 flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-slate-300">ตัวข้อสอบฉบับคมชัด (Clean B&W)</span>
            </div>
            <a
              href={config.pdfCleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold"
            >
              <ExternalLink className="w-3 h-3" /> เปิดแท็บใหม่
            </a>
          </div>

          {/* Embedded Native PDF Viewer */}
          <div className="flex-1 w-full h-full bg-slate-950 relative">
            <iframe
              src={`${config.pdfCleanUrl}#toolbar=0&navpanes=0`}
              title="O-NET Exam PDF"
              className="w-full h-full border-0"
            />
          </div>
        </div>

        {/* RIGHT PANEL: Digital OMR Answer Sheet */}
        <div
          className={`w-full lg:w-[480px] xl:w-[520px] flex flex-col bg-slate-950 shrink-0 border-l border-slate-800/80 transition-all ${
            activeTab === 'pdf' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Quick Jump Bar */}
          <div className="p-3 bg-slate-900/60 border-b border-slate-800/80 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                กระโดดไปข้อสอบ:
              </span>
              <span className="text-[11px] text-emerald-400 font-bold">
                ตอบแล้ว {answeredCount}/{totalQuestions}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-slate-950/60 rounded-xl border border-slate-800">
              {config.questions.map((q) => {
                const ans = answers[String(q.number)];
                const isAnswered =
                  q.type === 'single'
                    ? Boolean(ans)
                    : Array.isArray(ans) && ans.filter(Boolean).length === 6;

                return (
                  <button
                    key={q.number}
                    onClick={() => scrollToQuestion(q.number)}
                    className={`w-7 h-7 rounded-lg text-[11px] font-bold font-mono transition-all flex items-center justify-center ${
                      isAnswered
                        ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                        : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {q.number}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Questions Scrollable List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            <div className="text-xs text-slate-400 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                อ่านโจทย์จาก PDF ฝั่งซ้าย แล้วแตะเลือกคำตอบฝั่งนี้ ระบบจะบันทึกคำตอบอัตโนมัติ ไม่ต้องกลัวคำตอบหาย
              </span>
            </div>

            {config.questions.map((q) => {
              const currentAns = answers[String(q.number)];

              return (
                <div
                  key={q.number}
                  ref={(el) => {
                    questionRefs.current[q.number] = el;
                  }}
                  className={`p-4 rounded-2xl border transition-all ${
                    currentAns
                      ? 'bg-slate-900/90 border-slate-700/80 shadow-md'
                      : 'bg-slate-900/40 border-slate-800/80'
                  }`}
                >
                  {/* Question header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-mono font-black text-xs flex items-center justify-center">
                        {q.number}
                      </span>
                      <span className="text-xs font-bold text-white">
                        ข้อที่ {q.number}
                      </span>
                    </div>

                    {q.type === 'ordering' && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        เรียงลำดับขั้นตอน (A - F)
                      </span>
                    )}
                  </div>

                  {/* Standard 4-choice questions */}
                  {q.type === 'single' && (
                    <div className="grid grid-cols-4 gap-2">
                      {(['A', 'B', 'C', 'D'] as const).map((choice, cIdx) => {
                        const isSelected = currentAns === choice;
                        return (
                          <button
                            key={choice}
                            onClick={() => updateAnswer(q.number, choice)}
                            className={`py-2.5 rounded-xl font-black text-xs sm:text-sm flex flex-col items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-gradient-to-br from-cyan-400 to-indigo-600 text-slate-950 font-black shadow-lg shadow-cyan-500/20 scale-[1.02] ring-2 ring-cyan-300'
                                : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60'
                            }`}
                          >
                            <span className="text-sm font-black">{choice}</span>
                            <span className={`text-[9px] ${isSelected ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                              ({cIdx + 1})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Ordering question (Item 10) */}
                  {q.type === 'ordering' && (
                    <div className="space-y-2 mt-2">
                      <p className="text-[11px] text-slate-400">
                        เลือกขั้นตอน A - F ให้ตรงกับภาพลำดับที่ (1) ถึง (6) ในโจทย์:
                      </p>
                      {[0, 1, 2, 3, 4, 5].map((idx) => {
                        const currentLetter = Array.isArray(currentAns) ? currentAns[idx] : '';
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
                          >
                            <span className="w-16 text-[11px] font-bold text-cyan-400">
                              ภาพ ({idx + 1})
                            </span>
                            <div className="flex-1 flex gap-1">
                              {['A', 'B', 'C', 'D', 'E', 'F'].map((letter) => {
                                const isPicked = currentLetter === letter;
                                return (
                                  <button
                                    key={letter}
                                    onClick={() => updateOrderingAnswer(q.number, idx, letter)}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                      isPicked
                                        ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                                    }`}
                                  >
                                    {letter}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Bottom Submit Banner */}
            <div className="pt-4 pb-12">
              <button
                onClick={() => {
                  if (answeredCount < totalQuestions) {
                    setShowConfirmModal(true);
                  } else {
                    handleSubmit();
                  }
                }}
                disabled={isSubmitting}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:opacity-95 text-slate-950 font-black rounded-2xl shadow-xl shadow-indigo-950/30 text-sm flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'กำลังตรวจคะแนน...'
                    : `ส่งกระดาษคำตอบ (${answeredCount}/${totalQuestions} ข้อ)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Unanswered Confirmation Modal ──────────────────────────── */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto text-2xl">
              ⚠️
            </div>
            <h3 className="text-lg font-black text-white">ยังมีข้อที่ยังไม่ได้ตอบ!</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              คุณตอบไปแล้ว <strong className="text-cyan-400">{answeredCount}</strong> จากทั้งหมด{' '}
              <strong className="text-white">{totalQuestions} ข้อ</strong> (เหลืออีก{' '}
              <span className="text-amber-400 font-bold">{totalQuestions - answeredCount} ข้อ</span>)
              <br />
              คุณต้องการส่งตรวจเลยหรือไม่?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs"
              >
                กลับไปทำต่อ
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs"
              >
                ยืนยันส่งตรวจ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Exam Result Modal ───────────────────────────────────────── */}
      {examResult && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-2xl w-full bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-auto animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-3xl shadow-inner">
                {examResult.isPassed ? '🏆' : '📚'}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {examResult.isPassed ? 'ยอดเยี่ยมมาก! ผ่านเกณฑ์แล้ว' : 'พยายามได้ดีมาก! มาฝึกฝนกันต่อ'}
              </h2>
              <p className="text-xs text-slate-400">
                ผลการทดสอบ O-NET ภาษาอังกฤษ ม.3 ปี {yearNum}
              </p>
            </div>

            {/* Score & Stars Display */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">คะแนนรวม</span>
                <strong className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 font-mono">
                  {examResult.score100}
                </strong>
                <span className="text-[10px] text-slate-500 block">/ 100 คะแนน</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">ตอบถูก</span>
                <strong className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                  {examResult.correctCount}
                </strong>
                <span className="text-[10px] text-slate-500 block">/ {examResult.totalQuestions} ข้อ</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">ระดับดาว</span>
                <div className="flex justify-center text-amber-400 mt-1">
                  {[1, 2, 3].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= examResult.stars ? 'fill-amber-400 text-amber-400' : 'text-slate-800'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">
                  {examResult.percentage}%
                </span>
              </div>
            </div>

            {/* National Benchmark Comparison Banner */}
            {(() => {
              const nationalData = NATIONAL_BENCHMARKS[yearNum] || { nationalMean: 30.93 };
              const diff = Number((examResult.score100 - nationalData.nationalMean).toFixed(2));
              const isAbove = diff >= 0;
              return (
                <div
                  className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                    isAbove
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{isAbove ? '🎉' : '📈'}</span>
                    <div>
                      <div className="font-black text-sm">
                        {isAbove
                          ? `คะแนนของคุณสูงกว่าค่าเฉลี่ยระดับประเทศ +${diff} คะแนน!`
                          : `คะแนนของคุณต่ำกว่าค่าเฉลี่ยระดับประเทศ ${Math.abs(diff)} คะแนน`}
                      </div>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        คะแนนของคุณ: <strong className="text-white">{examResult.score100}</strong> / 100 • ค่าเฉลี่ยระดับประเทศ (สทศ.): <strong className="text-white">{nationalData.nationalMean}</strong> / 100
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 shrink-0">
                    {isAbove ? '🟢 เหนือเกณฑ์ประเทศ' : '🟡 ฝึกฝนอีกนิด'}
                  </span>
                </div>
              );
            })()}

            {/* Rewards Won */}
            <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 rounded-2xl border border-amber-500/20 flex items-center justify-around text-xs">
              <div className="flex items-center gap-1.5 font-black text-amber-400">
                <span>🪙</span> +{examResult.rewards.coins} Coins
              </div>
              <div className="flex items-center gap-1.5 font-black text-cyan-400">
                <span>⚡</span> +{examResult.rewards.exp} EXP
              </div>
              {examResult.rewards.tickets > 0 && (
                <div className="flex items-center gap-1.5 font-black text-purple-400">
                  <span>🎟️</span> +{examResult.rewards.tickets} ตั๋วสุ่ม
                </div>
              )}
            </div>

            {/* Review Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-400" /> ตรวจทานเฉลยคำตอบ
                </h4>
                <div className="flex gap-1 text-[11px] bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setReviewFilter('all')}
                    className={`px-2.5 py-0.5 rounded-md font-bold ${
                      reviewFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    ทั้งหมด ({examResult.results.length})
                  </button>
                  <button
                    onClick={() => setReviewFilter('wrong')}
                    className={`px-2.5 py-0.5 rounded-md font-bold ${
                      reviewFilter === 'wrong' ? 'bg-rose-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    เฉพาะที่ผิด ({examResult.totalQuestions - examResult.correctCount})
                  </button>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 p-2 bg-slate-950/70 rounded-2xl border border-slate-800">
                {examResult.results
                  .filter((r: any) => (reviewFilter === 'wrong' ? !r.isCorrect : true))
                  .map((r: any) => (
                    <div
                      key={r.questionNumber}
                      className={`p-2.5 rounded-xl border flex items-start justify-between text-xs ${
                        r.isCorrect
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-rose-950/20 border-rose-500/30'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black font-mono">ข้อ {r.questionNumber}:</span>
                          {r.isCorrect ? (
                            <span className="text-emerald-400 font-bold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> ถูกต้อง
                            </span>
                          ) : (
                            <span className="text-rose-400 font-bold inline-flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> ผิด
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 mt-1">
                          คุณตอบ:{' '}
                          <span className="font-bold text-white">
                            {Array.isArray(r.studentAnswer)
                              ? r.studentAnswer.join(' - ') || 'ไม่ได้ตอบ'
                              : r.studentAnswer || 'ไม่ได้ตอบ'}
                          </span>{' '}
                          | เฉลยที่ถูก:{' '}
                          <span className="font-black text-emerald-400">
                            {Array.isArray(r.correctAnswer)
                              ? r.correctAnswer.join(' - ')
                              : r.correctAnswer}
                          </span>
                        </div>

                        {r.explanation && (
                          <p className="text-[10px] text-slate-400 mt-1 italic">
                            💡 {r.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setExamResult(null);
                  setAnswers({});
                  setSecondsElapsed(0);
                }}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> ทำใหม่อีกรอบ
              </button>
              <Link
                href="/challenge/onet"
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg"
              >
                <Trophy className="w-3.5 h-3.5" /> หน้ารวม O-NET
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

