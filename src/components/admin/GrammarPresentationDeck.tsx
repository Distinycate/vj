'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
  Lightbulb,
  Maximize2,
  Minimize2,
  Mic,
  RotateCcw,
  Scissors,
  Sparkles,
  Trophy,
  AlertTriangle,
} from 'lucide-react';
import {
  GRAMMAR_TEACHING_UNITS,
  type ConceptSlide,
  type GrammarTeachingUnit,
  type TeachingQuestionSlide,
} from '@/data/grammar/grammarPresentationData';

type TeachingStage = 'concept' | 'practice' | 'onet';

interface GrammarPresentationDeckProps {
  initialUnitNumber?: number;
  onExit?: () => void;
}

const CHOICE_LABELS = ['A', 'B', 'C', 'D'] as const;

export default function GrammarPresentationDeck({
  initialUnitNumber = 1,
  onExit,
}: GrammarPresentationDeckProps) {
  const deckRef = useRef<HTMLDivElement | null>(null);

  const [unitNumber, setUnitNumber] = useState<number>(initialUnitNumber);
  const [stage, setStage] = useState<TeachingStage>('concept');
  const [slideIndex, setSlideIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Teacher classroom controls
  const [showTeacherScript, setShowTeacherScript] = useState<boolean>(true);
  const [showTranslation, setShowTranslation] = useState<boolean>(false);
  const [showClue, setShowClue] = useState<boolean>(false);
  const [showEliminated, setShowEliminated] = useState<boolean>(false);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);

  const currentUnit: GrammarTeachingUnit = useMemo(() => {
    return (
      GRAMMAR_TEACHING_UNITS.find((u) => u.unitNumber === unitNumber) ??
      GRAMMAR_TEACHING_UNITS[0]
    );
  }, [unitNumber]);

  const slidesCount = useMemo(() => {
    if (stage === 'concept') return currentUnit.conceptSlides.length;
    if (stage === 'practice') return currentUnit.practiceQuestions.length;
    return currentUnit.realOnetQuestions.length;
  }, [currentUnit, stage]);

  const resetQuestionReveals = useCallback(() => {
    setShowTranslation(false);
    setShowClue(false);
    setShowEliminated(false);
    setShowAnswer(false);
    setSelectedChoice(null);
  }, []);

  const selectUnit = useCallback(
    (num: number) => {
      setUnitNumber(num);
      setStage('concept');
      setSlideIndex(0);
      resetQuestionReveals();
    },
    [resetQuestionReveals],
  );

  const selectStage = useCallback(
    (nextStage: TeachingStage) => {
      setStage(nextStage);
      setSlideIndex(0);
      resetQuestionReveals();
    },
    [resetQuestionReveals],
  );

  const goNext = useCallback(() => {
    if (slideIndex < slidesCount - 1) {
      setSlideIndex((prev) => prev + 1);
      resetQuestionReveals();
      return;
    }
    if (stage === 'concept') {
      selectStage('practice');
    } else if (stage === 'practice') {
      selectStage('onet');
    } else if (unitNumber < GRAMMAR_TEACHING_UNITS.length) {
      selectUnit(unitNumber + 1);
    }
  }, [slideIndex, slidesCount, stage, unitNumber, resetQuestionReveals, selectStage, selectUnit]);

  const goPrev = useCallback(() => {
    if (slideIndex > 0) {
      setSlideIndex((prev) => prev - 1);
      resetQuestionReveals();
      return;
    }
    if (stage === 'onet') {
      setStage('practice');
      setSlideIndex(currentUnit.practiceQuestions.length - 1);
      resetQuestionReveals();
    } else if (stage === 'practice') {
      setStage('concept');
      setSlideIndex(currentUnit.conceptSlides.length - 1);
      resetQuestionReveals();
    } else if (unitNumber > 1) {
      const prevUnit =
        GRAMMAR_TEACHING_UNITS.find((u) => u.unitNumber === unitNumber - 1) ??
        GRAMMAR_TEACHING_UNITS[0];
      setUnitNumber(prevUnit.unitNumber);
      setStage('onet');
      setSlideIndex(prevUnit.realOnetQuestions.length - 1);
      resetQuestionReveals();
    }
  }, [slideIndex, stage, unitNumber, currentUnit, resetQuestionReveals]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && deckRef.current) {
        await deckRef.current.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen denial on unsupported browsers
    }
  };

  const currentConcept: ConceptSlide | null =
    stage === 'concept' ? currentUnit.conceptSlides[slideIndex] ?? null : null;

  const currentQuestion: TeachingQuestionSlide | null =
    stage === 'practice'
      ? currentUnit.practiceQuestions[slideIndex] ?? null
      : stage === 'onet'
        ? currentUnit.realOnetQuestions[slideIndex] ?? null
        : null;

  return (
    <div
      ref={deckRef}
      className="flex flex-col min-h-[calc(100vh-2rem)] bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden"
    >
      {/* Top Presentation Toolbar */}
      <header className="bg-slate-900/95 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
            โหมดครูผู้สอน (Presentation)
          </span>

          <select
            aria-label="เลือกบทเรียน"
            value={unitNumber}
            onChange={(e) => selectUnit(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-slate-100 text-sm font-semibold rounded-lg px-3 py-1.5 max-w-[340px] focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {GRAMMAR_TEACHING_UNITS.map((u) => (
              <option key={u.id} value={u.unitNumber}>
                {u.title}
              </option>
            ))}
          </select>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => selectStage('concept')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              stage === 'concept'
                ? 'bg-sky-500 text-slate-950 shadow'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            1. บรรยาย & ทริค ({currentUnit.conceptSlides.length})
          </button>
          <button
            type="button"
            onClick={() => selectStage('practice')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              stage === 'practice'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            2. แบบฝึกหัด ({currentUnit.practiceQuestions.length})
          </button>
          <button
            type="button"
            onClick={() => selectStage('onet')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              stage === 'onet'
                ? 'bg-amber-400 text-slate-950 shadow'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            3. ข้อสอบจริง O-NET ({currentUnit.realOnetQuestions.length})
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTeacherScript((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              showTeacherScript
                ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="เปิด/ซ่อนบทพูดแนะนำสำหรับครู"
          >
            {showTeacherScript ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            บทพูดครู
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {isFullscreen ? 'ย่อจอ' : 'เต็มจอ'}
          </button>

          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 transition"
            >
              กลับหน้าจัดการ
            </button>
          )}
        </div>
      </header>

      {/* Unit Golden Trick Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-b border-slate-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs md:text-sm">
          <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-extrabold shrink-0">
            GOLDEN TRICK
          </span>
          <span className="text-amber-100 font-medium">{currentUnit.goldenTrick}</span>
        </div>
        <span className="text-xs text-sky-300 font-semibold">{currentUnit.onetPartFocus}</span>
      </div>

      {/* Main Slide Canvas */}
      <main className="flex-1 p-5 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* STAGE 1: CONCEPT & TRICK SLIDES */}
          {stage === 'concept' && currentConcept && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  {currentConcept.slideTitle}
                </h2>
                <span className="px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-200 text-xs font-bold shrink-0">
                  สไลด์ {slideIndex + 1} / {slidesCount}
                </span>
              </div>

              {/* Key Formula Highlight */}
              <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-sky-500/15 to-indigo-500/15 border border-sky-400/30">
                <div className="text-xs uppercase tracking-wider text-sky-300 font-bold mb-1">
                  สูตรจำไว (Key Formula)
                </div>
                <div className="text-lg md:text-xl font-bold text-white">
                  {currentConcept.keyFormula}
                </div>
              </div>

              {/* Bullet Points */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="text-sm font-bold text-slate-300">ประเด็นสำคัญที่ต้องเน้นหน้าห้อง:</div>
                <ul className="space-y-2.5">
                  {currentConcept.bulletPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-base md:text-lg text-slate-100 leading-relaxed">
                      <span className="mt-1 w-6 h-6 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Signal Table */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 bg-slate-800/70 border-b border-slate-700 text-sm font-bold text-amber-300">
                  ตารางจับจุดสังเกต (Signal Words & Examples)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs uppercase text-slate-400">
                        <th className="py-3 px-4">คำสังเกต (Signal)</th>
                        <th className="py-3 px-4">กติกา / ความหมาย</th>
                        <th className="py-3 px-4">ตัวอย่างประโยค</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-sm md:text-base">
                      {currentConcept.signalTable.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-bold text-sky-300 align-top">{row.signal}</td>
                          <td className="py-3 px-4 text-slate-200 align-top">{row.ruleOrMeaning}</td>
                          <td className="py-3 px-4 align-top">
                            <div className="font-semibold text-white">{row.example}</div>
                            <div className="text-xs md:text-sm text-slate-400 mt-0.5">{row.exampleTranslation}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Common O-NET Trap */}
              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-5 space-y-2">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  กับดักที่เด็กมักพลาดในข้อสอบ O-NET
                </div>
                <p className="text-slate-100 text-base">
                  <span className="font-semibold text-rose-200">จุดหลอก:</span> {currentConcept.commonTrap.trap}
                </p>
                <p className="text-emerald-200 text-base">
                  <span className="font-semibold text-emerald-300">วิธีแก้:</span> {currentConcept.commonTrap.howToFix}
                </p>
              </div>

              {/* Teacher Script */}
              {showTeacherScript && (
                <div className="rounded-2xl bg-indigo-500/10 border border-indigo-400/30 p-4 flex items-start gap-3">
                  <Mic className="w-5 h-5 text-indigo-300 shrink-0 mt-0.5" />
                  <div className="text-sm md:text-base text-indigo-100">
                    <span className="font-bold text-indigo-300 mr-2">สคริปต์แนะนำครู:</span>
                    {currentConcept.teacherScript}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STAGE 2 & 3: PRACTICE & REAL O-NET QUESTION SLIDES */}
          {(stage === 'practice' || stage === 'onet') && currentQuestion && (
            <div className="space-y-6">
              {/* Header badge row */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                      stage === 'onet'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-emerald-500 text-slate-950'
                    }`}
                  >
                    {stage === 'onet' ? 'แนวข้อสอบจริง O-NET' : 'แบบฝึกหัดซ้อมมือ'} ข้อที่{' '}
                    {currentQuestion.questionNumber} / {slidesCount}
                  </span>
                  {currentQuestion.sourceTag && (
                    <span className="text-xs text-slate-400 font-medium">
                      {currentQuestion.sourceTag}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTranslation((v) => !v)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  >
                    {showTranslation ? 'ซ่อนคำแปลโจทย์' : 'แปลโจทย์เป็นไทย'}
                  </button>
                  <button
                    type="button"
                    onClick={resetQuestionReveals}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    รีเซ็ตข้อนี้
                  </button>
                </div>
              </div>

              {/* Prompt Card */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 md:p-7 space-y-3 shadow-lg">
                <p className="text-xl md:text-2xl font-semibold text-white whitespace-pre-line leading-relaxed">
                  {currentQuestion.prompt}
                </p>
                {showTranslation && (
                  <p className="text-base md:text-lg text-sky-200 border-t border-slate-800 pt-3 whitespace-pre-line">
                    คำแปล: {currentQuestion.promptTranslation}
                  </p>
                )}
              </div>

              {/* Interactive Teacher Action Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowClue((v) => !v)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition ${
                    showClue
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/40'
                  }`}
                >
                  <Lightbulb className="w-4 h-4" />
                  {showClue ? 'ซ่อนคำใบ้' : 'ชี้คำใบ้ (Show Clue)'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowEliminated((v) => !v)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition ${
                    showEliminated
                      ? 'bg-rose-500 text-white border-rose-400'
                      : 'bg-slate-900 hover:bg-slate-800 text-rose-300 border-rose-500/40'
                  }`}
                >
                  <Scissors className="w-4 h-4" />
                  {showEliminated ? 'ยกเลิกตัดช้อยส์' : 'ตัดช้อยส์หลอก 2 ข้อ'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowAnswer((v) => !v)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition ${
                    showAnswer
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {showAnswer ? 'ซ่อนเฉลย' : 'เปิดเฉลย + คำอธิบายละเอียด'}
                </button>
              </div>

              {/* Clue Banner */}
              {showClue && (
                <div className="rounded-xl bg-amber-500/15 border border-amber-400/40 px-5 py-3.5 text-amber-100 text-base">
                  <span className="font-extrabold text-amber-300 mr-2">🔍 จุดสังเกต (Clue):</span>
                  {currentQuestion.clueText}
                </div>
              )}

              {/* Elimination Reason Banner */}
              {showEliminated && (
                <div className="rounded-xl bg-rose-500/15 border border-rose-400/40 px-5 py-3.5 text-rose-100 text-base">
                  <span className="font-extrabold text-rose-300 mr-2">✂️ เหตุผลที่ตัดช้อยส์:</span>
                  {currentQuestion.eliminationReason}
                </div>
              )}

              {/* 4 Choices Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {currentQuestion.choices.map((choice, idx) => {
                  const isCorrect = idx === currentQuestion.correctIndex;
                  const isEliminated = showEliminated && currentQuestion.eliminatedIndices.includes(idx);
                  const isSelected = selectedChoice === idx;

                  let cardClass =
                    'bg-slate-900 border-slate-700 hover:border-sky-400/70 text-slate-100';
                  if (showAnswer && isCorrect) {
                    cardClass =
                      'bg-emerald-500/20 border-emerald-400 text-emerald-100 ring-2 ring-emerald-400/50';
                  } else if (showAnswer && isSelected && !isCorrect) {
                    cardClass = 'bg-rose-500/20 border-rose-400 text-rose-200';
                  } else if (isEliminated) {
                    cardClass = 'bg-slate-900/40 border-slate-800 text-slate-500 line-through opacity-55';
                  } else if (isSelected) {
                    cardClass = 'bg-sky-500/20 border-sky-400 text-white ring-2 ring-sky-400/40';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedChoice(idx)}
                      className={`text-left p-4 md:p-5 rounded-2xl border transition flex items-start gap-3.5 ${cardClass}`}
                    >
                      <span className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-extrabold text-sm shrink-0">
                        {CHOICE_LABELS[idx]}
                      </span>
                      <div className="space-y-1.5 flex-1">
                        <div className="text-lg md:text-xl font-semibold">{choice}</div>
                        {showAnswer && (
                          <div className="text-sm text-slate-200/90 leading-snug pt-1 border-t border-slate-700/60">
                            {currentQuestion.choiceBreakdowns[idx]}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Full Answer Explanation */}
              {showAnswer && (
                <div className="rounded-2xl bg-emerald-500/15 border border-emerald-400/40 p-5 space-y-2">
                  <div className="text-sm font-extrabold text-emerald-300">
                    ✅ สรุปเฉลยข้อ {CHOICE_LABELS[currentQuestion.correctIndex]}
                  </div>
                  <p className="text-base md:text-lg text-white leading-relaxed">
                    {currentQuestion.explanation}
                  </p>
                </div>
              )}

              {/* Teacher Script */}
              {showTeacherScript && (
                <div className="rounded-2xl bg-indigo-500/10 border border-indigo-400/30 p-4 flex items-start gap-3">
                  <Mic className="w-5 h-5 text-indigo-300 shrink-0 mt-0.5" />
                  <div className="text-sm md:text-base text-indigo-100">
                    <span className="font-bold text-indigo-300 mr-2">สคริปต์แนะนำครู:</span>
                    {currentQuestion.teacherScript}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Slide Navigation */}
      <footer className="bg-slate-900 border-t border-slate-800 px-5 py-3 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={goPrev}
          disabled={unitNumber === 1 && stage === 'concept' && slideIndex === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold text-slate-100 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          สไลด์ก่อนหน้า (←)
        </button>

        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {Array.from({ length: slidesCount }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSlideIndex(idx);
                resetQuestionReveals();
              }}
              className={`h-2.5 rounded-full transition-all ${
                idx === slideIndex
                  ? 'w-8 bg-amber-400'
                  : 'w-2.5 bg-slate-700 hover:bg-slate-500'
              }`}
              aria-label={`ไปยังสไลด์ ${idx + 1}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={
            unitNumber === GRAMMAR_TEACHING_UNITS.length &&
            stage === 'onet' &&
            slideIndex === slidesCount - 1
          }
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-extrabold text-slate-950 transition"
        >
          สไลด์ถัดไป (→)
          <ChevronRight className="w-4 h-4" />
        </button>
      </footer>
    </div>
  );
}

