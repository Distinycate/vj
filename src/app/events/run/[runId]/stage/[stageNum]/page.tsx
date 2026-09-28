'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle, Trophy, RefreshCw, ChevronLeft, ChevronRight, AlertCircle, Play } from 'lucide-react';

export default function RemedialStagePlayerPage() {
  const params = useParams();
  const router = useRouter();
  const runId = params.runId as string;
  const stageNum = parseInt(params.stageNum as string, 10);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stageData, setStageData] = useState<any | null>(null);

  // Answers array of 10 items (indexes 0..3 or null)
  const [answers, setAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [currentQIndex, setCurrentQIndex] = useState(0);

  // Submit & Result State
  const [submitting, setSubmitting] = useState(false);
  const [resultData, setResultData] = useState<any | null>(null);

  useEffect(() => {
    async function loadQuestions() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`/api/events/runs/${runId}/stage/${stageNum}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'โหลดข้อสอบไม่สำเร็จ');
        }
        const json = await res.json();
        if (json.success) {
          setStageData(json);
          setAnswers(Array(json.questions?.length || 10).fill(null));
          setCurrentQIndex(0);
          setResultData(null);
        }
      } catch (e: any) {
        setError(e.message || 'เกิดข้อผิดพลาดในการโหลดข้อสอบ');
      } finally {
        setLoading(false);
      }
    }
    if (runId && stageNum) {
      loadQuestions();
    }
  }, [runId, stageNum]);

  // Handle select choice for current question
  const handleSelectChoice = (choiceIndex: number) => {
    const updated = [...answers];
    updated[currentQIndex] = choiceIndex;
    setAnswers(updated);
  };

  // Submit answers
  const handleSubmit = async () => {
    // Check if answered all
    const unansweredCount = answers.filter(a => a === null).length;
    if (unansweredCount > 0) {
      const confirmSubmit = confirm(`คุณยังไม่ได้ตอบอีก ${unansweredCount} ข้อ ต้องการส่งคำตอบเลยหรือไม่?`);
      if (!confirmSubmit) return;
    }

    setSubmitting(true);
    try {
      // Replace null with 0
      const payloadAnswers = answers.map(a => a === null ? 0 : a);
      const res = await fetch(`/api/events/runs/${runId}/stage/${stageNum}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payloadAnswers }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ส่งผลการเล่นไม่สำเร็จ');
      }

      setResultData(json);
    } catch (e: any) {
      alert(`เกิดข้อผิดพลาด: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers(Array(stageData?.questions?.length || 10).fill(null));
    setCurrentQIndex(0);
    setResultData(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center text-sm">
        กำลังโหลดชุดข้อสอบด่านที่ {stageNum}...
      </div>
    );
  }

  if (error || !stageData) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-800 p-6 rounded-3xl border border-slate-700 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">เข้าสู่ด่านไม่สำเร็จ</h2>
          <p className="text-xs text-slate-400">{error || 'ไม่พบข้อมูลด่านนี้'}</p>
          <Link
            href={`/events/run/${runId}`}
            className="inline-block px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-colors"
          >
            กลับหน้าแผนที่ด่าน
          </Link>
        </div>
      </div>
    );
  }

  const questions = stageData.questions || [];
  const currentQ = questions[currentQIndex];

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW: RESULT MODAL / SCREEN (AFTER SUBMISSION)
  // ──────────────────────────────────────────────────────────────────────────
  if (resultData) {
    const isPassed = resultData.passed;
    const isEventFinished = resultData.isEventCompleted;

    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 font-sans flex items-center justify-center">
        <div className="max-w-xl w-full bg-slate-950 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6 text-center">
          {/* Badge Icon */}
          <div className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-4xl shadow-xl">
            {isPassed ? (
              <div className="w-full h-full rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400">
                🎉
              </div>
            ) : (
              <div className="w-full h-full rounded-3xl bg-rose-500/20 border-2 border-rose-500/40 flex items-center justify-center text-rose-400">
                ❌
              </div>
            )}
          </div>

          {/* Heading */}
          <div>
            <h2 className="text-2xl font-black text-white">
              {isPassed ? 'ผ่านด่านแล้ว!' : 'ยังไม่ผ่าน กรุณาลองอีกครั้ง'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              ด่านที่ {stageNum}: {stageData.title}
            </p>
          </div>

          {/* Score Box */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-around">
            <div>
              <span className="text-xs text-slate-400 block">คะแนนที่ได้</span>
              <strong className={`text-3xl font-black ${isPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
                {resultData.score} / 10
              </strong>
            </div>

            <div className="w-px h-10 bg-slate-800" />

            <div>
              <span className="text-xs text-slate-400 block">เกณฑ์ผ่าน</span>
              <strong className="text-3xl font-black text-white">
                {resultData.targetPassScore} / 10
              </strong>
            </div>
          </div>

          {/* Event Completion Alert */}
          {isEventFinished && (
            <div className="p-4 bg-gradient-to-r from-emerald-950/60 to-cyan-950/60 border border-emerald-500/40 rounded-2xl text-left flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-400 shrink-0" />
              <div>
                <h4 className="text-sm font-black text-white">ยินดีด้วย! คุณผ่านครบตามเป้าหมายแล้ว</h4>
                <p className="text-xs text-emerald-300/90 mt-0.5">
                  คุณทำผ่านครบ {resultData.completedStages} / {resultData.targetStages} ด่าน สามารถเปิด Result Card สำหรับส่งงานได้เลย
                </p>
              </div>
            </div>
          )}

          {/* Review Details (List of wrong questions) */}
          <div className="text-left space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase">สรุปผลแต่ละข้อ:</h3>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {resultData.reviewDetails?.map((r: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                    r.isCorrect
                      ? 'bg-emerald-950/20 border-emerald-500/20 text-slate-300'
                      : 'bg-rose-950/20 border-rose-500/20 text-slate-300'
                  }`}
                >
                  {r.isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-bold text-white">ข้อ {idx + 1}: {r.prompt}</div>
                    {!r.isCorrect && (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        คำตอบของคุณ: <span className="text-rose-400 line-through">{r.selectedChoice}</span> → เฉลย: <strong className="text-emerald-400">{r.correctChoice}</strong>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-3">
            {isEventFinished && (
              <Link
                href={`/events/run/${runId}/result`}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all"
              >
                <Trophy className="w-4 h-4" /> แสดงผลสำหรับส่งงาน
              </Link>
            )}

            {isPassed && stageNum < 15 && (
              <Link
                href={`/events/run/${runId}/stage/${stageNum + 1}`}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all"
              >
                เล่นด่านถัดไป (ด่าน {stageNum + 1}) <ChevronRight className="w-4 h-4" />
              </Link>
            )}

            {!isPassed && (
              <button
                onClick={handleRetry}
                className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/20 transition-all"
              >
                <RefreshCw className="w-4 h-4" /> ลองใหม่อีกครั้ง
              </button>
            )}

            <Link
              href={`/events/run/${runId}`}
              className="py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center transition-colors"
            >
              กลับแผนที่ด่าน
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW: PLAYING STAGE QUESTIONS (1 TO 10)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <Link
            href={`/events/run/${runId}`}
            className="text-xs font-bold text-slate-400 hover:text-white inline-flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> กลับหน้าด่าน
          </Link>
          <div className="text-xs font-black text-cyan-400">
            ด่านที่ {stageNum}: {stageData.title}
          </div>
        </div>

        {/* 10 Question Navigation Dots */}
        <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-1 overflow-x-auto">
          {questions.map((_: any, idx: number) => {
            const isAnswered = answers[idx] !== null;
            const isCurrent = idx === currentQIndex;

            return (
              <button
                key={idx}
                onClick={() => setCurrentQIndex(idx)}
                className={`w-8 h-8 rounded-xl font-bold text-xs transition-all flex items-center justify-center shrink-0 ${
                  isCurrent
                    ? 'bg-cyan-500 text-slate-950 scale-110 shadow-lg shadow-cyan-500/30'
                    : isAnswered
                    ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/40'
                    : 'bg-slate-800 text-slate-500 hover:text-white'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Question Card */}
        {currentQ && (
          <div className="bg-slate-950/80 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
              <span className="font-bold uppercase tracking-wider">ข้อที่ {currentQIndex + 1} จาก {questions.length}</span>
              <span>เกณฑ์ผ่าน: 7/10</span>
            </div>

            {/* Optional Image */}
            {currentQ.image && (
              <div className="flex justify-center py-2">
                <img
                  src={currentQ.image}
                  alt={currentQ.prompt}
                  className="max-h-48 rounded-2xl object-contain border border-slate-800"
                />
              </div>
            )}

            {/* Prompt */}
            <div className="text-lg sm:text-xl font-bold text-white text-center py-4">
              {currentQ.prompt}
            </div>

            {/* 4 Choices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {currentQ.choices?.map((choiceText: string, cIdx: number) => {
                const isSelected = answers[currentQIndex] === cIdx;
                const letter = ['A', 'B', 'C', 'D'][cIdx] || `${cIdx + 1}`;

                return (
                  <button
                    key={cIdx}
                    onClick={() => handleSelectChoice(cIdx)}
                    className={`p-4 rounded-2xl text-left border font-medium text-sm transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                        isSelected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="flex-1">{choiceText}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Prev / Next / Submit Controls */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            disabled={currentQIndex === 0}
            onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
          </button>

          <span className="text-xs text-slate-500 font-medium">
            ตอบแล้ว {answers.filter(a => a !== null).length} / {questions.length} ข้อ
          </span>

          {currentQIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1))}
              className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs transition-colors inline-flex items-center gap-1"
            >
              ถัดไป <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> {submitting ? 'กำลังตรวจผล...' : 'ส่งคำตอบ'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
