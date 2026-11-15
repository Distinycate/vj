'use client';

import { useState, use, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Trophy,
  Star,
  Send,
  RotateCcw,
  Lightbulb,
  Eye,
} from 'lucide-react';
import { getWorksheetUnit } from '@/data/worksheets/index';
import WordBankChips from '@/components/worksheets/WordBankChips';
import WorksheetQuestionCard, {
  type QuestionReviewResult,
} from '@/components/worksheets/WorksheetQuestionCard';
import { puzzleAudio } from '@/lib/puzzle/puzzleAudio';

interface PageProps {
  params: Promise<{ unitId: string }>;
}

export default function WorksheetRoomPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const unitId = resolvedParams.unitId;

  const unit = useMemo(() => getWorksheetUnit(unitId), [unitId]);

  // States
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [focusedQuestionId, setFocusedQuestionId] = useState<string>('');
  const [showAllHints, setShowAllHints] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Set initial focus
  useEffect(() => {
    if (unit && unit.questions.length > 0 && !focusedQuestionId) {
      setFocusedQuestionId(unit.questions[0].id);
    }
  }, [unit, focusedQuestionId]);

  const reviewByQuestionId = useMemo(() => {
    const map: Record<string, QuestionReviewResult> = {};
    if (submitResult?.results) {
      for (const r of submitResult.results) {
        map[r.questionId] = r;
      }
    }
    return map;
  }, [submitResult]);

  if (!unit) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-xl font-black mb-2">ไม่พบแบบฝึกหัดชุดนี้ ({unitId})</h1>
        <Link
          href="/challenge/worksheets"
          className="px-5 py-2.5 bg-indigo-600 rounded-xl font-bold text-xs"
        >
          กลับหน้ารวมแบบฝึกหัด
        </Link>
      </div>
    );
  }

  // Calculate used words
  const usedWords = new Set<string>(
    Object.values(answers)
      .filter(Boolean)
      .map((w) => w.toLowerCase())
  );

  // Handle word selection from the Word Bank
  const handleWordSelect = (word: string) => {
    if (!focusedQuestionId || submitResult) return;

    // Fill the word
    const nextAnswers = { ...answers, [focusedQuestionId]: word };
    setAnswers(nextAnswers);
    puzzleAudio.playSelect();

    // Automatically advance to the next unfilled question
    const currIdx = unit.questions.findIndex((q) => q.id === focusedQuestionId);
    for (let i = 1; i <= unit.questions.length; i++) {
      const nextIdx = (currIdx + i) % unit.questions.length;
      const nextQ = unit.questions[nextIdx];
      if (!nextAnswers[nextQ.id]) {
        setFocusedQuestionId(nextQ.id);
        break;
      }
    }
  };

  const handleClear = (qId: string) => {
    if (submitResult) return;
    const nextAnswers = { ...answers };
    delete nextAnswers[qId];
    setAnswers(nextAnswers);
    setFocusedQuestionId(qId);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/worksheets/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId: unit.unitId,
          answers,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitResult(data);
        setIsModalOpen(true);
        if (data.stars >= 2) {
          puzzleAudio.playStageClear();
        } else {
          puzzleAudio.playWordSuccess();
        }
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการส่งคำตอบ');
      }
    } catch (e) {
      console.error('Worksheet submit failed:', e);
      alert('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredCount = Object.values(answers).filter(Boolean).length;
  const totalCount = unit.questions.length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between pb-36">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <Link
            href="/challenge/worksheets"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            บทเรียนทั้งหมด
          </Link>

          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
              {unit.unitId}
            </span>
            <div className="text-sm font-extrabold text-white truncate max-w-[200px]">
              {unit.title}
            </div>
          </div>

          <div className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
            {answeredCount} / {totalCount} ข้อ
          </div>
        </div>
      </div>

      {/* Main Questions List */}
      <div className="max-w-2xl mx-auto w-full px-4 pt-4 flex-1 space-y-4">
        {/* Instructions & Global Hint Toggle Card */}
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            💡 <span className="font-bold text-white">คำสั่ง:</span> {unit.instructions}
          </div>
          <button
            type="button"
            onClick={() => setShowAllHints((prev) => !prev)}
            className={`self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
              showAllHints
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>{showAllHints ? 'ซ่อนคำใบ้ทั้งหมด' : 'เปิดคำใบ้ทั้งหมด'}</span>
          </button>
        </div>

        {/* Questions Cards */}
        {unit.questions.map((q, idx) => (
          <WorksheetQuestionCard
            key={q.id}
            question={q}
            index={idx}
            value={answers[q.id] || ''}
            isActive={focusedQuestionId === q.id}
            showAllHints={showAllHints}
            reviewResult={reviewByQuestionId[q.id]}
            onFocus={() => setFocusedQuestionId(q.id)}
            onClear={() => handleClear(q.id)}
            onSelectChoice={(choice) => {
              if (submitResult) return;
              setAnswers({ ...answers, [q.id]: choice });
              puzzleAudio.playSelect();
            }}
          />
        ))}
      </div>

      {/* Sticky Bottom Dock: Word Bank & Submit Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 p-3 sm:p-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-2.5">
          {/* Word Bank Chips (if applicable) */}
          {unit.wordBank && unit.wordBank.length > 0 && !submitResult && (
            <WordBankChips
              words={unit.wordBank}
              usedWords={usedWords}
              onSelectWord={handleWordSelect}
            />
          )}

          {/* Submit or Review Action Bar */}
          {submitResult ? (
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-bold text-emerald-300">
                ตรวจแล้ว: ได้ {submitResult.score}/{submitResult.maxScore} คะแนน ({submitResult.accuracy}%)
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>สรุปผลคะแนน</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitResult(null);
                    setIsModalOpen(false);
                    setAnswers({});
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ทำใหม่อีกครั้ง</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-slate-400 font-bold">
                ความคืบหน้า: {answeredCount} จาก {totalCount} ข้อ ({Math.round((answeredCount / totalCount) * 100)}%)
              </div>

              <button
                type="button"
                disabled={isSubmitting || answeredCount === 0}
                onClick={handleSubmit}
                className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-all cursor-pointer ${
                  answeredCount === totalCount
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/30 active:scale-95'
                    : answeredCount > 0
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <span>กำลังตรวจคำตอบ...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>ส่งแบบฝึกหัด</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results Modal */}
      {submitResult && isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-md w-full rounded-3xl bg-slate-900 border-2 border-emerald-500/40 p-6 text-center shadow-2xl my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-8 h-8 text-emerald-300" />
            </div>

            <h2 className="text-2xl font-black text-white">ส่งแบบฝึกหัดเรียบร้อย!</h2>
            <p className="text-xs text-slate-300 mt-1">{unit.title}</p>

            {/* Stars */}
            <div className="flex items-center justify-center gap-2 my-4">
              {[1, 2, 3].map((starIdx) => (
                <Star
                  key={starIdx}
                  className={`w-8 h-8 ${
                    starIdx <= submitResult.stars
                      ? 'fill-amber-400 text-amber-400 animate-bounce'
                      : 'fill-slate-800 text-slate-800'
                  }`}
                  style={{ animationDelay: `${starIdx * 150}ms` }}
                />
              ))}
            </div>

            {/* Score Summary */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold block">คะแนนที่ได้</span>
                <span className="text-xl font-black text-emerald-400">
                  {submitResult.score} / {submitResult.maxScore}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold block">ความแม่นยำ</span>
                <span className="text-xl font-black text-amber-400">
                  {submitResult.accuracy}%
                </span>
              </div>
            </div>

            {/* Coins / EXP Rewards */}
            <div className="flex items-center justify-center gap-4 mb-5 text-xs font-black text-amber-300">
              <span>🪙 +{submitResult.earnedCoins} Coins</span>
              <span>⚡ +{submitResult.earnedExp} EXP</span>
            </div>

            {/* Review of Results */}
            <div className="text-left max-h-56 overflow-y-auto space-y-2 mb-5 p-2 rounded-2xl bg-slate-950/60 border border-slate-800">
              {submitResult.results.map((r: any, idx: number) => (
                <div key={idx} className="text-xs p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300">ข้อที่ {idx + 1}</span>
                    {r.isCorrect ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ถูกต้อง ({r.expected})
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> ตอบ: {r.submitted} (เฉลย: {r.expected})
                      </span>
                    )}
                  </div>
                  {r.thaiMeaning && (
                    <div className="text-[11px] text-amber-300/90 mt-1">💡 {r.thaiMeaning}</div>
                  )}
                  {r.explanationTh && (
                    <div className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      📌 {r.explanationTh}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full py-3 rounded-2xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>ดูเฉลยละเอียดในหน้าใบงาน</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSubmitResult(null);
                  setIsModalOpen(false);
                  setAnswers({});
                }}
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ทำใหม่อีกครั้ง</span>
              </button>

              <Link
                href="/challenge/worksheets"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm block shadow-lg transition-all"
              >
                กลับหน้ารวมแบบฝึกหัด
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
