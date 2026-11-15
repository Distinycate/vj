'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  HelpCircle,
  LayoutGrid,
  Lightbulb,
  Maximize2,
  Minimize2,
  Mic,
  RotateCcw,
  Scissors,
  Search,
  Sparkles,
  Trophy,
  Volume2,
  AlertTriangle,
} from 'lucide-react';
import {
  GRAMMAR_TEACHING_UNITS,
  GRAMMAR_GRADE_TABS,
  TEACHING_CATEGORY_TABS,
  type GrammarGradeCategory,
  type TeachingTopicCategory,
  type ConceptSlide,
  type GrammarTeachingUnit,
  type TeachingQuestionSlide,
} from '@/data/grammar/grammarPresentationData';
import { speakWithWebSpeech } from '@/utils/audio';
import {
  PEN_COLORS,
  PrintAndLineSummaryModal,
  RandomStudentWheelModal,
  SlideAnnotationCanvas,
  TeacherLiveToolsBar,
  type AnnotationTool,
} from './TeachingClassroomTools';

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

  const [selectedGrade, setSelectedGrade] = useState<'ALL' | GrammarGradeCategory>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | TeachingTopicCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showTopicHub, setShowTopicHub] = useState<boolean>(false);

  const [unitNumber, setUnitNumber] = useState<number>(initialUnitNumber);
  const [stage, setStage] = useState<TeachingStage>('concept');
  const [slideIndex, setSlideIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const filteredUnits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return GRAMMAR_TEACHING_UNITS.filter((unit) => {
      if (selectedGrade !== 'ALL' && unit.gradeLevel !== selectedGrade) return false;
      if (selectedCategory !== 'ALL' && unit.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        unit.title.toLowerCase().includes(q) ||
        unit.subtitle.toLowerCase().includes(q) ||
        unit.goldenTrick.toLowerCase().includes(q) ||
        (unit.categoryLabel ?? '').toLowerCase().includes(q) ||
        (unit.recommendedWorksheets ?? []).some((ws) => ws.toLowerCase().includes(q))
      );
    });
  }, [selectedGrade, selectedCategory, searchQuery]);

  // Teacher classroom controls
  const [showTeacherScript, setShowTeacherScript] = useState<boolean>(true);
  const [showTranslation, setShowTranslation] = useState<boolean>(false);
  const [showClue, setShowClue] = useState<boolean>(false);
  const [showEliminated, setShowEliminated] = useState<boolean>(false);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);

  // Live classroom annotation, wheel & summary tools
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>('none');
  const [penColor, setPenColor] = useState<string>(PEN_COLORS[0].hex);
  const [clearCanvasSignal, setClearCanvasSignal] = useState<number>(0);
  const [showWheelModal, setShowWheelModal] = useState<boolean>(false);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);

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
    setClearCanvasSignal((s) => s + 1);
  }, []);

  const selectUnit = useCallback(
    (num: number, nextStage: TeachingStage = 'concept', nextSlideIndex = 0) => {
      setUnitNumber(num);
      setStage(nextStage);
      setSlideIndex(nextSlideIndex);
      setShowTopicHub(false);
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
      {/* Compact Presentation Toolbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Back, Topic Hub, Unit Selector */}
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                ← กลับ
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowTopicHub((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${showTopicHub
                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {showTopicHub ? 'ปิดสารบัญ' : `สารบัญ (${GRAMMAR_TEACHING_UNITS.length})`}
            </button>

            <select
              aria-label="เลือกบทเรียน"
              value={unitNumber}
              onChange={(e) => selectUnit(Number(e.target.value))}
              className="w-full sm:w-auto bg-slate-950 border border-slate-700 text-slate-100 text-xs sm:text-sm font-semibold rounded-lg px-3 py-1.5 max-w-full sm:max-w-[340px] focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {(filteredUnits.length > 0 ? filteredUnits : GRAMMAR_TEACHING_UNITS).map((u) => (
                <option key={u.id} value={u.unitNumber}>
                  [{u.gradeLevel || 'ALL'}] {u.title}
                </option>
              ))}
            </select>
          </div>

          {/* Center: 3-Stage Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setShowTopicHub(false);
                selectStage('concept');
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition ${!showTopicHub && stage === 'concept'
                  ? 'bg-sky-400 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800'
                }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              บรรยาย ({currentUnit.conceptSlides.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setShowTopicHub(false);
                selectStage('practice');
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition ${!showTopicHub && stage === 'practice'
                  ? 'bg-emerald-400 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800'
                }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              ฝึกทำ ({currentUnit.practiceQuestions.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setShowTopicHub(false);
                selectStage('onet');
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition ${!showTopicHub && stage === 'onet'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800'
                }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              O-NET ({currentUnit.realOnetQuestions.length})
            </button>
          </div>

          {/* Right: Compact Utility Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <a
              href="/challenge/grammar"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="เปิดหน้าคัมภีร์สูตรลัดสำหรับนักเรียน"
            >
              หน้านักเรียน
            </a>
            <a
              href="/admin/worksheets"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="เปิดระบบสั่งการบ้านใบงานคำศัพท์"
            >
              สั่งใบงาน
            </a>
            <button
              type="button"
              onClick={() => setShowTeacherScript((v) => !v)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${showTeacherScript
                  ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              title="เปิด/ซ่อนบทพูดแนะนำสำหรับครู"
            >
              {showTeacherScript ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              บทพูด
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title={isFullscreen ? 'ย่อจอ' : 'เต็มจอ'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Grade, Category & Search Filters (Shown only when browsing Topic Hub) */}
        {showTopicHub && (
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {GRAMMAR_GRADE_TABS.map((tab) => {
                  const isSelected = selectedGrade === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setSelectedGrade(tab.key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${isSelected
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative min-w-[210px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาเรื่องที่ต้องการสอน..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {TEACHING_CATEGORY_TABS.map((cat) => {
                const isSelected = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${isSelected
                        ? 'bg-sky-400 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                  >
                    {cat.icon} {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Compact Live Classroom Tools Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <TeacherLiveToolsBar
              tool={annotationTool}
              penColor={penColor}
              onChangeTool={setAnnotationTool}
              onChangeColor={setPenColor}
              onClear={() => setClearCanvasSignal((s) => s + 1)}
              onOpenWheel={() => setShowWheelModal(true)}
              onOpenSummary={() => setShowSummaryModal(true)}
            />
          </div>
          {annotationTool !== 'none' && (
            <span className="text-[11px] font-bold text-amber-300">
              {annotationTool === 'pen'
                ? '✏️ โหมดปากกาเปิดอยู่ — กด "ปากกา" อีกครั้งเพื่อคลิกปุ่มปกติ'
                : '🧹 โหมดยางลบเปิดอยู่'}
            </span>
          )}
        </div>
      </header>

      {/* Quiet Golden Trick Strip */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30 font-bold shrink-0">
            TRICK
          </span>
          <span className="text-slate-200 font-medium">{currentUnit.goldenTrick}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {currentUnit.durationMinutes && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              <Clock className="w-3 h-3" />~{currentUnit.durationMinutes} นาที
            </span>
          )}
          {currentUnit.recommendedWorksheets &&
            currentUnit.recommendedWorksheets.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-emerald-300 font-bold">
                  🔗 ใบงานคู่ขนาน:
                </span>
                {currentUnit.recommendedWorksheets.map((wsId) => (
                  <a
                    key={wsId}
                    href={`/challenge/worksheets/${wsId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono font-bold transition"
                  >
                    {wsId}
                  </a>
                ))}
              </div>
            )}
          <span className="text-xs text-sky-300 font-semibold">
            {currentUnit.onetPartFocus}
          </span>
        </div>
      </div>

      {/* Main Slide Canvas OR Non-Linear Topic Hub */}
      <main className="relative flex-1 p-5 md:p-8 overflow-y-auto">
        {!showTopicHub && (
          <SlideAnnotationCanvas
            tool={annotationTool}
            penColor={penColor}
            clearSignal={clearCanvasSignal}
          />
        )}
        {showTopicHub ? (
          <div className="max-w-6xl mx-auto space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
              <div>
                <h2 className="text-xl md:text-2xl font-extrabold text-white">
                  🗂️ สารบัญคลังเนื้อหาการสอน {GRAMMAR_TEACHING_UNITS.length} เรื่อง (เลือกสอนเรื่องไหนก่อนก็ได้)
                </h2>
                <p className="text-xs md:text-sm text-slate-300 mt-0.5">
                  ทุกเรื่องออกแบบให้จบในตัวเอง (Self-Contained) ครูสามารถคลิกข้ามไปสอนสไลด์ทริค แบบฝึกหัด หรือข้อสอบ O-NET ของเรื่องใดก็ได้ทันทีโดยไม่ต้องเรียงลำดับ
                </p>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-extrabold">
                แสดง {filteredUnits.length} / {GRAMMAR_TEACHING_UNITS.length} เรื่อง
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredUnits.map((u) => {
                const isCurrent = u.unitNumber === unitNumber;
                return (
                  <div
                    key={u.id}
                    className={`rounded-2xl border p-4 md:p-5 space-y-3 transition ${isCurrent
                        ? 'bg-slate-900 border-amber-400 ring-2 ring-amber-400/30'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-xs font-black">
                          เรื่องที่ {u.unitNumber}
                        </span>
                        {u.gradeLevel && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                            {u.gradeLevel}
                          </span>
                        )}
                        {u.categoryLabel && (
                          <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold">
                            {u.categoryLabel}
                          </span>
                        )}
                      </div>
                      {u.durationMinutes && (
                        <span className="text-xs text-slate-400 font-semibold">
                          ⏱️ ~{u.durationMinutes} นาที
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base md:text-lg font-extrabold text-white">
                        {u.title}
                      </h3>
                      <p className="text-xs md:text-sm text-slate-300 mt-0.5">
                        {u.subtitle}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-amber-200">
                      <span className="font-extrabold text-amber-400 mr-1.5">⚡ สูตรลัด:</span>
                      {u.goldenTrick}
                    </div>

                    {/* Direct 1-Click Jump Buttons */}
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-bold text-slate-400">
                        คลิกเลือกจุดที่ต้องการเริ่มสอนทันที:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {u.conceptSlides.map((cs, cIdx) => (
                          <button
                            key={cIdx}
                            type="button"
                            onClick={() => selectUnit(u.unitNumber, 'concept', cIdx)}
                            className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/30 text-xs font-bold transition cursor-pointer"
                          >
                            📘 สไลด์ทริค {cIdx + 1}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => selectUnit(u.unitNumber, 'practice', 0)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 text-xs font-bold transition cursor-pointer"
                        >
                          ✍️ แบบฝึกหัด ({u.practiceQuestions.length} ข้อ)
                        </button>
                        <button
                          type="button"
                          onClick={() => selectUnit(u.unitNumber, 'onet', 0)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/30 text-xs font-bold transition cursor-pointer"
                        >
                          🏆 ข้อสอบ O-NET ({u.realOnetQuestions.length} ข้อ)
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
        <div className="max-w-7xl mx-auto w-full space-y-6">
          {/* Quick Sub-Slide / Question Jump Bar */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-xl p-2">
            <span className="text-xs font-bold text-slate-400 px-2">
              ข้ามไปข้อ/สไลด์ย่อยทันที:
            </span>
            {stage === 'concept' &&
              currentUnit.conceptSlides.map((slide, sIdx) => (
                <button
                  key={sIdx}
                  type="button"
                  onClick={() => {
                    setSlideIndex(sIdx);
                    resetQuestionReveals();
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    slideIndex === sIdx
                      ? 'bg-sky-400 text-slate-950 shadow'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  สไลด์ {sIdx + 1}: {slide.slideTitle.replace(/^\d+\.\d+\s*/, '').slice(0, 28)}
                </button>
              ))}
            {(stage === 'practice' || stage === 'onet') &&
              Array.from({ length: slidesCount }).map((_, qIdx) => (
                <button
                  key={qIdx}
                  type="button"
                  onClick={() => {
                    setSlideIndex(qIdx);
                    resetQuestionReveals();
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    slideIndex === qIdx
                      ? stage === 'onet'
                        ? 'bg-amber-400 text-slate-950 shadow'
                        : 'bg-emerald-400 text-slate-950 shadow'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  ข้อที่ {qIdx + 1}
                </button>
              ))}
          </div>

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
                          <th className="py-3 px-4">ตัวอย่างประโยค (กด 🔊 เพื่อฟังเสียง)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-sm md:text-base">
                        {currentConcept.signalTable.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="py-3 px-4 font-bold text-sky-300 align-top">{row.signal}</td>
                            <td className="py-3 px-4 text-slate-200 align-top">{row.ruleOrMeaning}</td>
                            <td className="py-3 px-4 align-top">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="font-semibold text-white">{row.example}</div>
                                  <div className="text-xs md:text-sm text-slate-400 mt-0.5">{row.exampleTranslation}</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => speakWithWebSpeech(row.example)}
                                  className="p-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 shrink-0 transition cursor-pointer"
                                  title="ฟังเสียงประโยคตัวอย่าง"
                                >
                                  <Volume2 className="w-4 h-4" />
                                </button>
                              </div>
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
                      className={`px-3 py-1 rounded-full text-xs font-extrabold ${stage === 'onet'
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
                      onClick={() =>
                        speakWithWebSpeech(currentQuestion.prompt.replace(/_+/g, ' blank '))
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/40 transition cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      ฟังเสียงโจทย์
                    </button>
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
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition ${showClue
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
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition ${showEliminated
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
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition ${showAnswer
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
        )}
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
              className={`h-2.5 rounded-full transition-all ${idx === slideIndex
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

      <RandomStudentWheelModal
        open={showWheelModal}
        onClose={() => setShowWheelModal(false)}
      />

      <PrintAndLineSummaryModal
        open={showSummaryModal}
        unit={currentUnit}
        onClose={() => setShowSummaryModal(false)}
      />
    </div>
  );
}

