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
  Home,
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
  BookmarkCheck,
  SlidersHorizontal,
  X,
  ArrowRight,
  PanelRightOpen,
  PanelRightClose,
} from 'lucide-react';
import {
  GRAMMAR_TEACHING_UNITS,
  ONET_WRITING_BOOSTER_UNITS,
  ALL_TEACHING_UNITS,
  GRAMMAR_GRADE_TABS,
  TEACHING_CATEGORY_TABS,
  type GrammarGradeCategory,
  type TeachingTopicCategory,
  type ConceptSlide,
  type GrammarTeachingUnit,
  type TeachingQuestionSlide,
} from '@/data/grammar/grammarPresentationData';
import {
  QUICK_GRAMMAR_CHEAT_SHEETS,
  type QuickGrammarCheatSheet,
} from '@/data/grammar/quickGrammarCheatSheets';
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
type HomeSectionFilter = 'all' | 'booster' | 'past_exams' | 'curriculum';

interface GrammarPresentationDeckProps {
  initialUnitNumber?: number;
  onExit?: () => void;
}

const CHOICE_LABELS = ['A', 'B', 'C', 'D'] as const;

/**
 * Splits a dense keyFormula string (often separated by `|`) into readable visual lines.
 */
function parseFormulaLines(rawFormula: string): string[] {
  const parts = rawFormula
    .split(/\s*\|\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [rawFormula];
}

/**
 * Formats a bullet point that may contain `【Heading】` and `→` into structured parts.
 */
function renderFormattedBullet(text: string) {
  const bracketMatch = text.match(/^【([^】]+)】\s*(.*)$/);
  if (bracketMatch) {
    const [, tag, rest] = bracketMatch;
    return (
      <div className="space-y-1">
        <span className="inline-block px-2.5 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs font-extrabold mr-2">
          {tag}
        </span>
        <span className="text-slate-100">{rest}</span>
      </div>
    );
  }
  return <span>{text}</span>;
}

export default function GrammarPresentationDeck({
  initialUnitNumber,
  onExit,
}: GrammarPresentationDeckProps) {
  const deckRef = useRef<HTMLDivElement | null>(null);

  // Start on the clean Home screen by default unless a specific initialUnitNumber was requested
  const [showTopicHub, setShowTopicHub] = useState<boolean>(
    initialUnitNumber === undefined,
  );
  const [homeSection, setHomeSection] = useState<HomeSectionFilter>('all');
  const [selectedGrade, setSelectedGrade] = useState<'ALL' | GrammarGradeCategory>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | TeachingTopicCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [unitNumber, setUnitNumber] = useState<number>(initialUnitNumber ?? 101);
  const [stage, setStage] = useState<TeachingStage>('concept');
  const [slideIndex, setSlideIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Quick Grammar Cheat Sheet Side-by-Side Drawer State
  const [showCheatSheet, setShowCheatSheet] = useState<boolean>(false);
  const [wideCheatSheet, setWideCheatSheet] = useState<boolean>(false);
  const [activeCheatSheetId, setActiveCheatSheetId] = useState<string>(
    QUICK_GRAMMAR_CHEAT_SHEETS[0].id,
  );
  const [cheatSheetSearch, setCheatSheetSearch] = useState<string>('');

  // Collapsible classroom toolbar so the main header stays ultra-clean
  const [showClassroomTools, setShowClassroomTools] = useState<boolean>(false);

  // Teacher classroom controls
  const [showTeacherScript, setShowTeacherScript] = useState<boolean>(false);
  const [showTranslation, setShowTranslation] = useState<boolean>(false);
  const [showClue, setShowClue] = useState<boolean>(false);
  const [showApproach, setShowApproach] = useState<boolean>(false);
  const [showMustKnow, setShowMustKnow] = useState<boolean>(false);
  const [showVocab, setShowVocab] = useState<boolean>(false);
  const [showEliminated, setShowEliminated] = useState<boolean>(false);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);

  // Live classroom annotation, wheel & summary tools
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>('none');
  const [penColor, setPenColor] = useState<string>(PEN_COLORS[0].hex);
  const [clearCanvasSignal, setClearCanvasSignal] = useState<number>(0);
  const [showWheelModal, setShowWheelModal] = useState<boolean>(false);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);

  // Categorized Unit Groups for the new Clean Home Screen
  const boosterCoreUnits = useMemo(
    () => ONET_WRITING_BOOSTER_UNITS.filter((u) => u.unitNumber >= 101 && u.unitNumber <= 105),
    [],
  );

  // Ordered newest exam year first: 2568 (109) -> 2567 (108) -> 2566 (107) -> 2565 (106)
  const pastExamUnits = useMemo(
    () =>
      ONET_WRITING_BOOSTER_UNITS.filter((u) => u.unitNumber >= 106 && u.unitNumber <= 109).sort(
        (a, b) => b.unitNumber - a.unitNumber,
      ),
    [],
  );

  const filteredCurriculumUnits = useMemo(() => {
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

  const filteredBoosterCore = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return boosterCoreUnits;
    return boosterCoreUnits.filter(
      (u) =>
        u.title.toLowerCase().includes(q) ||
        u.subtitle.toLowerCase().includes(q) ||
        u.goldenTrick.toLowerCase().includes(q),
    );
  }, [boosterCoreUnits, searchQuery]);

  const filteredPastExams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pastExamUnits;
    return pastExamUnits.filter(
      (u) =>
        u.title.toLowerCase().includes(q) ||
        u.subtitle.toLowerCase().includes(q) ||
        u.goldenTrick.toLowerCase().includes(q),
    );
  }, [pastExamUnits, searchQuery]);

  const currentUnit: GrammarTeachingUnit = useMemo(() => {
    return (
      ALL_TEACHING_UNITS.find((u) => u.unitNumber === unitNumber) ??
      ONET_WRITING_BOOSTER_UNITS[0]
    );
  }, [unitNumber]);

  const activePool = useMemo(() => {
    return unitNumber >= 101 ? ONET_WRITING_BOOSTER_UNITS : GRAMMAR_TEACHING_UNITS;
  }, [unitNumber]);

  const slidesCount = useMemo(() => {
    if (stage === 'concept') return currentUnit.conceptSlides.length;
    if (stage === 'practice') return currentUnit.practiceQuestions.length;
    return currentUnit.realOnetQuestions.length;
  }, [currentUnit, stage]);

  // Filtered Cheat Sheets
  const filteredCheatSheets = useMemo(() => {
    const q = cheatSheetSearch.trim().toLowerCase();
    if (!q) return QUICK_GRAMMAR_CHEAT_SHEETS;
    return QUICK_GRAMMAR_CHEAT_SHEETS.filter((sheet) => {
      if (
        sheet.title.toLowerCase().includes(q) ||
        sheet.shortTitle.toLowerCase().includes(q) ||
        sheet.summaryFormula.toLowerCase().includes(q) ||
        sheet.memoryTip.toLowerCase().includes(q)
      ) {
        return true;
      }
      return sheet.sections.some(
        (sec) =>
          sec.heading.toLowerCase().includes(q) ||
          sec.rows.some(
            (r) =>
              r.label.toLowerCase().includes(q) ||
              r.rule.toLowerCase().includes(q) ||
              r.example.toLowerCase().includes(q) ||
              (r.translation ?? '').toLowerCase().includes(q),
          ),
      );
    });
  }, [cheatSheetSearch]);

  const currentCheatSheet: QuickGrammarCheatSheet = useMemo(() => {
    return (
      filteredCheatSheets.find((s) => s.id === activeCheatSheetId) ??
      filteredCheatSheets[0] ??
      QUICK_GRAMMAR_CHEAT_SHEETS[0]
    );
  }, [filteredCheatSheets, activeCheatSheetId]);

  const openCheatSheetTopic = useCallback((sheetId: string) => {
    setActiveCheatSheetId(sheetId);
    setCheatSheetSearch('');
    setShowCheatSheet(true);
  }, []);

  const resetQuestionReveals = useCallback(() => {
    setShowTranslation(false);
    setShowClue(false);
    setShowApproach(false);
    setShowMustKnow(false);
    setShowVocab(false);
    setShowEliminated(false);
    setShowAnswer(false);
    setSelectedChoice(null);
    setClearCanvasSignal((s) => s + 1);
  }, []);

  const revealAllDeepAnalysis = useCallback(() => {
    setShowTranslation(true);
    setShowClue(true);
    setShowApproach(true);
    setShowMustKnow(true);
    setShowVocab(true);
    setShowEliminated(true);
    setShowAnswer(true);
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
    } else {
      const idxInPool = activePool.findIndex((u) => u.unitNumber === unitNumber);
      if (idxInPool >= 0 && idxInPool < activePool.length - 1) {
        selectUnit(activePool[idxInPool + 1].unitNumber);
      }
    }
  }, [slideIndex, slidesCount, stage, unitNumber, activePool, resetQuestionReveals, selectStage, selectUnit]);

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
    } else {
      const idxInPool = activePool.findIndex((u) => u.unitNumber === unitNumber);
      if (idxInPool > 0) {
        const prevUnit = activePool[idxInPool - 1];
        setUnitNumber(prevUnit.unitNumber);
        setStage('onet');
        setSlideIndex(prevUnit.realOnetQuestions.length - 1);
        resetQuestionReveals();
      }
    }
  }, [slideIndex, stage, unitNumber, activePool, currentUnit, resetQuestionReveals]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (!showTopicHub && e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (!showTopicHub && e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'g' || e.key === 'G') {
        setShowCheatSheet((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, showTopicHub]);

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
      className="flex flex-col min-h-[calc(100vh-1.5rem)] bg-slate-950 text-slate-100 rounded-3xl border border-slate-800/90 shadow-2xl overflow-hidden"
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          CLEAN TOP NAVIGATION BAR
          ═══════════════════════════════════════════════════════════════════════ */}
      <header className="bg-slate-900/95 border-b border-slate-800 px-4 md:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Back / Home / Unit Picker */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
              >
                ← แดชบอร์ดครู
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowTopicHub(true)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black border transition cursor-pointer ${
                showTopicHub
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-500/10'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
              }`}
            >
              <Home className="w-4 h-4" />
              หน้าแรกเลือกบทเรียน
            </button>

            {!showTopicHub && (
              <select
                aria-label="เลือกบทเรียน"
                value={unitNumber}
                onChange={(e) => selectUnit(Number(e.target.value))}
                className="bg-slate-950 border border-slate-700 text-slate-100 text-xs sm:text-sm font-bold rounded-xl px-3 py-2 max-w-[260px] sm:max-w-[360px] focus:outline-none focus:border-amber-400"
              >
                <optgroup label="🎯 O-NET Writing Booster (5 หัวใจหลัก)">
                  {boosterCoreUnits.map((u) => (
                    <option key={u.id} value={u.unitNumber}>
                      {u.title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🏆 ข้อสอบจริง O-NET รายปี (2568–2565)">
                  {pastExamUnits.map((u) => (
                    <option key={u.id} value={u.unitNumber}>
                      {u.title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="📚 คลังหลักสูตรไวยากรณ์ ม.1–ม.3 (25 บท)">
                  {GRAMMAR_TEACHING_UNITS.map((u) => (
                    <option key={u.id} value={u.unitNumber}>
                      [{u.gradeLevel}] {u.title}
                    </option>
                  ))}
                </optgroup>
              </select>
            )}
          </div>

          {/* Center: 3-Stage Mode Switcher (Only when inside a lesson) */}
          {!showTopicHub && (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => selectStage('concept')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  stage === 'concept'
                    ? 'bg-sky-400 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                1. เนื้อหา ({currentUnit.conceptSlides.length})
              </button>
              <button
                type="button"
                onClick={() => selectStage('practice')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  stage === 'practice'
                    ? 'bg-emerald-400 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                2. ฝึกทำ ({currentUnit.practiceQuestions.length})
              </button>
              <button
                type="button"
                onClick={() => selectStage('onet')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  stage === 'onet'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                3. ข้อสอบ O-NET ({currentUnit.realOnetQuestions.length})
              </button>
            </div>
          )}

          {/* Right: Quick Grammar Cheat Sheet Button + Classroom Tools Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowCheatSheet((v) => !v)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black border transition cursor-pointer shadow-lg ${
                showCheatSheet
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 border-emerald-300 shadow-emerald-500/20'
                  : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
              }`}
              title="เปิด/ปิด ใบสรุปแกรมม่าข้างกาย (กดปุ่ม G บนคีย์บอร์ดได้)"
            >
              {showCheatSheet ? (
                <PanelRightClose className="w-4 h-4" />
              ) : (
                <PanelRightOpen className="w-4 h-4" />
              )}
              📖 ใบสรุปแกรมม่าข้างกาย
            </button>

            {!showTopicHub && (
              <button
                type="button"
                onClick={() => setShowClassroomTools((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  showClassroomTools || annotationTool !== 'none'
                    ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="ปากกาขีดเขียน วงล้อสุ่มชื่อ พิมพ์ใบสรุป และอัดวิดีโอ"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                เครื่องมือสอน
              </button>
            )}

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
              title={isFullscreen ? 'ย่อจอ' : 'ขยายเต็มจอ'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Optional Collapsible Classroom Tools Bar (Pen, Wheel, Handout, Video Recorder, Script toggle) */}
        {!showTopicHub && (showClassroomTools || annotationTool !== 'none') && (
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <TeacherLiveToolsBar
                tool={annotationTool}
                penColor={penColor}
                onChangeTool={setAnnotationTool}
                onChangeColor={setPenColor}
                onClear={() => setClearCanvasSignal((s) => s + 1)}
                onOpenWheel={() => setShowWheelModal(true)}
                onOpenSummary={() => setShowSummaryModal(true)}
                lessonTitle={currentUnit.title}
              />
              <button
                type="button"
                onClick={() => setShowTeacherScript((v) => !v)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  showTeacherScript
                    ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {showTeacherScript ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                สคริปต์ครู
              </button>
            </div>
            {annotationTool !== 'none' && (
              <span className="text-xs font-bold text-amber-300">
                {annotationTool === 'pen'
                  ? '✏️ โหมดปากกาเปิดอยู่ — กดปุ่ม "ปากกา" ซ้ำเพื่อกลับมาคลิกปกติ'
                  : '🧹 โหมดยางลบเปิดอยู่'}
              </span>
            )}
          </div>
        )}
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════
          MAIN WORKSPACE (SUPPORTS SIDE-BY-SIDE GRAMMAR CHEAT SHEET DRAWER)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* PRIMARY CONTENT AREA */}
        <main className="relative flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          {!showTopicHub && (
            <SlideAnnotationCanvas
              tool={annotationTool}
              penColor={penColor}
              clearSignal={clearCanvasSignal}
            />
          )}

          {/* ───────────────────────────────────────────────────────────────────
              VIEW 1: CLEAN TEACHING HOME SCREEN (หน้าแรกเลือกเนื้อหาที่จะสอน)
              ─────────────────────────────────────────────────────────────────── */}
          {showTopicHub ? (
            <div className="max-w-6xl mx-auto space-y-8">
              {/* Hero Welcome & Quick Search */}
              <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/60 border border-slate-800 p-6 md:p-8 shadow-xl space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-extrabold">
                      <Sparkles className="w-3.5 h-3.5" />
                      ระบบสื่อการสอน O-NET &amp; ไวยากรณ์ ม.ต้น • ภาคเรียนที่ 2/2568 (ปัจจุบัน)
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      เลือกเนื้อหาหรือข้อสอบที่ต้องการสอนวันนี้
                    </h1>
                    <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                      จัดหมวดหมู่พร้อมใช้หน้าห้องเรียน มีครบทั้งเนื้อหาสรุปสูตรลัด โจทย์ซ้อมมือ และข้อสอบจริง O-NET พร้อม{' '}
                      <strong className="text-emerald-300">“ใบสรุปแกรมม่าข้างกาย”</strong> เปิดเทียบดูได้ตลอดเวลาขณะพาเด็กทำโจทย์
                    </p>
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full md:w-80 shrink-0">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ค้นหาบทเรียน เช่น Passive, ปี 2568..."
                      className="w-full bg-slate-950/90 border border-slate-700 rounded-2xl pl-10 pr-9 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Grammar Cheat Sheet Bar right on the Home Page */}
                <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5">
                      ⚡ เปิดด่วน “ใบสรุปแกรมม่าข้างกาย” (คลิกเพื่อเปิดตารางสรุปทวนเร็ว):
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_GRAMMAR_CHEAT_SHEETS.map((sheet) => (
                      <button
                        key={sheet.id}
                        type="button"
                        onClick={() => openCheatSheetTopic(sheet.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          showCheatSheet && activeCheatSheetId === sheet.id
                            ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow'
                            : 'bg-slate-950/80 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-emerald-400/50'
                        }`}
                      >
                        <span>{sheet.icon}</span>
                        <span>{sheet.shortTitle}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Category Tabs */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {[
                    { key: 'all', label: '🌟 แสดงทั้งหมด (แยกหมวดชัดเจน)' },
                    { key: 'booster', label: `🎯 5 หัวใจ O-NET Booster (${boosterCoreUnits.length})` },
                    { key: 'past_exams', label: `🏆 ข้อสอบจริง O-NET ปี 2568–2565 (${pastExamUnits.length})` },
                    { key: 'curriculum', label: `📚 หลักสูตรไวยากรณ์ ม.1–ม.3 (${GRAMMAR_TEACHING_UNITS.length})` },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setHomeSection(tab.key as HomeSectionFilter)}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                        homeSection === tab.key
                          ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/70'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 1: 5 CORE O-NET WRITING BOOSTER UNITS */}
              {(homeSection === 'all' || homeSection === 'booster') &&
                filteredBoosterCore.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                      <div>
                        <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                          <span className="w-2.5 h-6 rounded-full bg-amber-400 inline-block" />
                          🎯 หมวดที่ 1: O-NET Writing Booster (5 เรื่องหลักที่ออกสอบทุกปี)
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                          ปูพื้นฐานเรื่องที่ออกข้อสอบพาร์ท Writing &amp; Cloze Test บ่อยที่สุด พร้อมเทคนิคตัดช้อยส์
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredBoosterCore.map((u, idx) => (
                        <div
                          key={u.id}
                          className="rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-400/50 p-5 flex flex-col justify-between gap-4 transition shadow-lg"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="px-2.5 py-1 rounded-lg bg-amber-400/15 text-amber-300 border border-amber-400/30 text-xs font-black">
                                Booster {idx + 1}
                              </span>
                              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> ~{u.durationMinutes || 45} นาที
                              </span>
                            </div>

                            <div>
                              <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                                {u.title.replace(/^Booster \d+:\s*/, '')}
                              </h3>
                              <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                {u.overview}
                              </p>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 text-xs text-amber-200/90 leading-relaxed">
                              <span className="font-black text-amber-400 mr-1">⚡ ทริคจำ:</span>
                              {u.goldenTrick}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800/80">
                            <button
                              type="button"
                              onClick={() => selectUnit(u.unitNumber, 'concept', 0)}
                              className="py-2 px-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border border-sky-400/30 text-xs font-extrabold transition cursor-pointer text-center"
                            >
                              📘 เนื้อหา ({u.conceptSlides.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => selectUnit(u.unitNumber, 'practice', 0)}
                              className="py-2 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 text-xs font-extrabold transition cursor-pointer text-center"
                            >
                              ✍️ ฝึกทำ ({u.practiceQuestions.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => selectUnit(u.unitNumber, 'onet', 0)}
                              className="py-2 px-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition cursor-pointer text-center"
                            >
                              🏆 O-NET ({u.realOnetQuestions.length})
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

              {/* SECTION 2: REAL O-NET PAST EXAMS BY YEAR (2568 -> 2565) */}
              {(homeSection === 'all' || homeSection === 'past_exams') &&
                filteredPastExams.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                      <div>
                        <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                          <span className="w-2.5 h-6 rounded-full bg-emerald-400 inline-block" />
                          🏆 หมวดที่ 2: ตะลุยข้อสอบจริง O-NET ม.3 รายปี (เรียงปีล่าสุด 2568 ➔ 2565)
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                          เจาะลึกข้อสอบจริงพร้อมบทอ่าน วิธีคิดทีละขั้น กฎไวยากรณ์ประจำข้อ และคำศัพท์สำคัญ
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredPastExams.map((u) => {
                        const yearMatch = u.title.match(/25\d\d/);
                        const yearLabel = yearMatch ? yearMatch[0] : 'O-NET';
                        return (
                          <div
                            key={u.id}
                            className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 hover:border-emerald-400/50 p-5 flex flex-col justify-between gap-4 transition shadow-lg"
                          >
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black">
                                  ข้อสอบจริง ปีการศึกษา {yearLabel}
                                </span>
                                <span className="text-xs text-amber-300 font-bold">
                                  ครบทั้ง {u.realOnetQuestions.length} ข้อ (ข้อ 24–32)
                                </span>
                              </div>

                              <h3 className="text-lg font-black text-white leading-snug">
                                {u.title}
                              </h3>

                              <p className="text-xs text-slate-300 leading-relaxed">
                                {u.goldenTrick}
                              </p>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-slate-800">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => selectUnit(u.unitNumber, 'onet', 0)}
                                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 text-xs sm:text-sm font-black transition cursor-pointer flex items-center justify-center gap-1.5 shadow"
                                >
                                  <Trophy className="w-4 h-4" />
                                  เริ่มลุยข้อสอบจริงปี {yearLabel} ({u.realOnetQuestions.length} ข้อ)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => selectUnit(u.unitNumber, 'concept', 0)}
                                  className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer"
                                >
                                  📘 ดูสรุปภาพรวมก่อนสอบ
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

              {/* SECTION 3: 25 CURRICULUM GRAMMAR UNITS (M.1 - M.3) */}
              {(homeSection === 'all' || homeSection === 'curriculum') && (
                <section className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 px-1">
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                        <span className="w-2.5 h-6 rounded-full bg-sky-400 inline-block" />
                        📚 หมวดที่ 3: คลังหลักสูตรไวยากรณ์และทักษะ ม.1–ม.3 (ครบ 25 เรื่อง)
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                        เลือกกรองตามระดับชั้นหรือหมวดหมู่เรื่องที่ต้องการสอนได้ทันที
                      </p>
                    </div>
                  </div>

                  {/* Grade & Topic Filter Pills */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-400 mr-1">ระดับชั้น:</span>
                      {GRAMMAR_GRADE_TABS.map((tab) => {
                        const isSelected = selectedGrade === tab.key;
                        return (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setSelectedGrade(tab.key)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950 shadow'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
                      <span className="text-xs font-bold text-slate-400 mr-1">หมวดหมู่:</span>
                      {TEACHING_CATEGORY_TABS.map((cat) => {
                        const isSelected = selectedCategory === cat.key;
                        return (
                          <button
                            key={cat.key}
                            type="button"
                            onClick={() => setSelectedCategory(cat.key)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                              isSelected
                                ? 'bg-sky-400 text-slate-950 shadow'
                                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {cat.icon} {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Curriculum Units Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCurriculumUnits.map((u) => (
                      <div
                        key={u.id}
                        className="rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-sky-400/50 p-5 flex flex-col justify-between gap-4 transition"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-amber-300 border border-slate-700 text-xs font-black">
                                บทที่ {u.unitNumber}
                              </span>
                              {u.gradeLevel && (
                                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                                  {u.gradeLevel}
                                </span>
                              )}
                              {u.categoryLabel && (
                                <span className="px-2 py-0.5 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[11px] font-bold">
                                  {u.categoryLabel}
                                </span>
                              )}
                            </div>
                          </div>

                          <h3 className="text-base font-extrabold text-white leading-snug">
                            {u.title.replace(/^Unit \d+:\s*/, '')}
                          </h3>

                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                            <span className="font-bold text-amber-400 mr-1">⚡ ทริค:</span>
                            {u.goldenTrick}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => selectUnit(u.unitNumber, 'concept', 0)}
                            className="py-2 px-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border border-sky-400/30 text-xs font-bold transition cursor-pointer text-center"
                          >
                            📘 เนื้อหา
                          </button>
                          <button
                            type="button"
                            onClick={() => selectUnit(u.unitNumber, 'practice', 0)}
                            className="py-2 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 text-xs font-bold transition cursor-pointer text-center"
                          >
                            ✍️ ฝึกทำ ({u.practiceQuestions.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => selectUnit(u.unitNumber, 'onet', 0)}
                            className="py-2 px-2 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/30 text-xs font-bold transition cursor-pointer text-center"
                          >
                            🏆 O-NET ({u.realOnetQuestions.length})
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            /* ───────────────────────────────────────────────────────────────────
               VIEW 2: CLEAN, READABLE CLASSROOM TEACHING VIEW (โหมดกำลังสอน)
               ─────────────────────────────────────────────────────────────────── */
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Unit Title & Quick Slide/Question Number Bar */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-400/15 text-amber-300 border border-amber-400/30 text-xs font-black">
                        {currentUnit.gradeLabel || 'O-NET Writing Booster'}
                      </span>
                      <h1 className="text-lg sm:text-xl font-black text-white">
                        {currentUnit.title}
                      </h1>
                    </div>
                  </div>

                  {/* Quick Jump Pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {stage === 'concept' &&
                      currentUnit.conceptSlides.map((_, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => {
                            setSlideIndex(sIdx);
                            resetQuestionReveals();
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                            slideIndex === sIdx
                              ? 'bg-sky-400 text-slate-950 shadow'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          สไลด์ {sIdx + 1}
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
                          className={`w-9 h-9 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center ${
                            slideIndex === qIdx
                              ? stage === 'onet'
                                ? 'bg-amber-400 text-slate-950 shadow'
                                : 'bg-emerald-400 text-slate-950 shadow'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {qIdx + 1}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Subtle Golden Trick Banner */}
                <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[11px] shrink-0">
                      สูตรลัดประจำบท
                    </span>
                    <span className="text-amber-100 font-semibold leading-relaxed">
                      {currentUnit.goldenTrick}
                    </span>
                  </div>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════
                  STAGE 1: CONCEPT & TRICK SLIDES (จัดวางให้อ่านง่าย สบายตา)
                  ═══════════════════════════════════════════════════════════════ */}
              {stage === 'concept' && currentConcept && (
                <div className="space-y-6">
                  {/* Slide Heading */}
                  <div className="flex items-center justify-between gap-4 px-1">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-snug">
                      {currentConcept.slideTitle}
                    </h2>
                    <span className="px-3.5 py-1.5 rounded-xl bg-sky-500/20 border border-sky-400/30 text-sky-200 text-xs font-black shrink-0">
                      หน้า {slideIndex + 1} / {slidesCount}
                    </span>
                  </div>

                  {/* Key Formula Card — Split cleanly by `|` so it never looks like a wall of text */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-sky-950/50 via-slate-900 to-indigo-950/40 border border-sky-400/30 space-y-3 shadow-lg">
                    <div className="text-xs font-black uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      โครงสร้าง &amp; สูตรจำหลัก (Key Formula)
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                      {parseFormulaLines(currentConcept.keyFormula).map((line, lIdx) => (
                        <div
                          key={lIdx}
                          className="px-4 py-3 rounded-2xl bg-slate-950/80 border border-sky-500/25 text-base sm:text-lg font-bold text-white leading-relaxed"
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Core Bullet Points — Spacious, clean cards */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-md">
                    <div className="text-sm font-black text-amber-300 uppercase tracking-wider">
                      📌 สรุปประเด็นสำคัญ (เข้าใจง่ายทีละขั้น)
                    </div>
                    <ul className="space-y-3">
                      {currentConcept.bulletPoints.map((point, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-base sm:text-lg text-slate-100 leading-relaxed"
                        >
                          <span className="mt-0.5 w-7 h-7 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex-1">{renderFormattedBullet(point)}</div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Signal Words & Examples Table */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-md">
                    <div className="px-6 py-4 bg-slate-800/60 border-b border-slate-700/80 flex items-center justify-between">
                      <span className="text-sm sm:text-base font-black text-amber-300">
                        🔍 ตารางคำบอกใบ้และตัวอย่างประโยค (กด 🔊 เพื่อฟังเสียงอ่าน)
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-950/50 text-xs uppercase text-slate-400 font-bold">
                            <th className="py-3.5 px-5 w-1/4">คำสังเกต / โครงสร้าง</th>
                            <th className="py-3.5 px-5 w-1/4">ความหมาย &amp; หลักการใช้</th>
                            <th className="py-3.5 px-5">ตัวอย่างประโยคจริง</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 text-sm sm:text-base">
                          {currentConcept.signalTable.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/30 transition">
                              <td className="py-4 px-5 font-extrabold text-sky-300 align-top leading-relaxed">
                                {row.signal}
                              </td>
                              <td className="py-4 px-5 text-slate-200 align-top leading-relaxed">
                                {row.ruleOrMeaning}
                              </td>
                              <td className="py-4 px-5 align-top">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="font-bold text-white text-base sm:text-lg leading-snug">
                                      {row.example}
                                    </div>
                                    <div className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                                      {row.exampleTranslation}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => speakWithWebSpeech(row.example)}
                                    className="p-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 shrink-0 transition cursor-pointer"
                                    title="ฟังเสียงอ่านประโยค"
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

                  {/* Common O-NET Trap — Clean 2-Column Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-rose-950/30 border border-rose-500/30 p-5 space-y-2">
                      <div className="flex items-center gap-2 text-rose-300 font-black text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        ❌ จุดหลอกที่นักเรียนมักพลาด
                      </div>
                      <p className="text-slate-100 text-base leading-relaxed">
                        {currentConcept.commonTrap.trap}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-emerald-950/30 border border-emerald-500/30 p-5 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-300 font-black text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        ✅ วิธีแก้และรูปที่ถูกต้อง
                      </div>
                      <p className="text-emerald-100 text-base leading-relaxed">
                        {currentConcept.commonTrap.howToFix}
                      </p>
                    </div>
                  </div>

                  {/* Optional Teacher Script */}
                  {showTeacherScript && (
                    <div className="rounded-2xl bg-indigo-500/10 border border-indigo-400/30 p-4 flex items-start gap-3">
                      <Mic className="w-5 h-5 text-indigo-300 shrink-0 mt-0.5" />
                      <div className="text-sm sm:text-base text-indigo-100 leading-relaxed">
                        <span className="font-bold text-indigo-300 mr-2">สคริปต์แนะนำครู:</span>
                        {currentConcept.teacherScript}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════
                  STAGE 2 & 3: PRACTICE & REAL O-NET QUESTIONS (อ่านง่าย ไม่รก)
                  ═══════════════════════════════════════════════════════════════ */}
              {(stage === 'practice' || stage === 'onet') && currentQuestion && (
                <div className="space-y-5">
                  {/* Question Header Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span
                        className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black ${
                          stage === 'onet'
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-emerald-400 text-slate-950'
                        }`}
                      >
                        {stage === 'onet' ? '🏆 ข้อสอบจริง O-NET' : '✍️ โจทย์ซ้อมมือ'} ข้อที่{' '}
                        {currentQuestion.questionNumber} / {slidesCount}
                      </span>
                      {currentQuestion.sourceTag && (
                        <span className="text-xs sm:text-sm text-slate-300 font-semibold bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
                          {currentQuestion.sourceTag}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          speakWithWebSpeech(currentQuestion.prompt.replace(/_+/g, ' blank '))
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border border-sky-500/30 transition cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        ฟังเสียงโจทย์
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowTranslation((v) => !v)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          showTranslation
                            ? 'bg-sky-400 text-slate-950 border-sky-300'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        }`}
                      >
                        {showTranslation ? 'ซ่อนคำแปลไทย' : '🇹🇭 แปลโจทย์'}
                      </button>
                      <button
                        type="button"
                        onClick={resetQuestionReveals}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        รีเซ็ต
                      </button>
                    </div>
                  </div>

                  {/* Responsive Split Grid when Passage Exists */}
                  <div
                    className={`grid grid-cols-1 gap-5 items-start ${
                      currentQuestion.passageContext && !showCheatSheet
                        ? 'xl:grid-cols-12'
                        : ''
                    }`}
                  >
                    {/* LEFT COLUMN: Reading Passage (if present) */}
                    {currentQuestion.passageContext && (
                      <div
                        className={`${
                          !showCheatSheet ? 'xl:col-span-5 xl:sticky xl:top-4' : ''
                        } rounded-3xl bg-slate-900/95 border border-amber-400/30 p-5 sm:p-6 space-y-3 shadow-lg`}
                      >
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
                          <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                            📄 บทอ่าน (Passage Context)
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              speakWithWebSpeech(currentQuestion.passageContext || '')
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 text-amber-200 border border-amber-400/30 text-xs font-bold cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            ฟังบทอ่าน
                          </button>
                        </div>
                        <p className="text-base sm:text-lg text-slate-100 leading-relaxed font-medium whitespace-pre-line">
                          {currentQuestion.passageContext}
                        </p>
                        {showTranslation && currentQuestion.passageContextTranslation && (
                          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-amber-400/20 text-sm sm:text-base text-amber-200/95 leading-relaxed">
                            <span className="font-bold text-amber-300 mr-1">🇹🇭 คำแปลบทอ่าน:</span>
                            {currentQuestion.passageContextTranslation}
                          </div>
                        )}
                      </div>
                    )}

                    {/* RIGHT COLUMN (or Full Width): Question Prompt + Choices + Step-by-Step Analysis */}
                    <div
                      className={`${
                        currentQuestion.passageContext && !showCheatSheet
                          ? 'xl:col-span-7'
                          : ''
                      } space-y-5`}
                    >
                      {/* Target Question Prompt Box */}
                      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-7 space-y-3.5 shadow-lg">
                        <div className="text-xs font-bold uppercase tracking-wider text-sky-400">
                          โจทย์คำถาม (Question)
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-white whitespace-pre-line leading-relaxed tracking-wide">
                          {currentQuestion.prompt}
                        </p>
                        {showTranslation && (
                          <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/30 text-base sm:text-lg text-sky-200 leading-relaxed whitespace-pre-line">
                            <span className="font-bold text-sky-300 mr-1.5">คำแปลโจทย์:</span>
                            {currentQuestion.promptTranslation}
                          </div>
                        )}
                      </div>

                      {/* 4 Choices Grid — Clean & Spacious */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {currentQuestion.choices.map((choice, idx) => {
                          const isCorrect = idx === currentQuestion.correctIndex;
                          const isEliminated =
                            showEliminated && currentQuestion.eliminatedIndices.includes(idx);
                          const isSelected = selectedChoice === idx;

                          let cardClass =
                            'bg-slate-900/95 border-slate-700/90 hover:border-sky-400/70 text-slate-100';
                          let badgeClass = 'bg-slate-800 border-slate-700 text-slate-200';

                          if (showAnswer && isCorrect) {
                            cardClass =
                              'bg-emerald-950/50 border-emerald-400 text-emerald-50 ring-2 ring-emerald-400/40';
                            badgeClass = 'bg-emerald-400 border-emerald-300 text-slate-950';
                          } else if (showAnswer && isSelected && !isCorrect) {
                            cardClass = 'bg-rose-950/40 border-rose-400 text-rose-100';
                            badgeClass = 'bg-rose-500 border-rose-400 text-white';
                          } else if (isEliminated) {
                            cardClass =
                              'bg-slate-900/30 border-slate-800/60 text-slate-500 line-through opacity-50';
                          } else if (isSelected) {
                            cardClass =
                              'bg-sky-950/50 border-sky-400 text-white ring-2 ring-sky-400/30';
                            badgeClass = 'bg-sky-400 border-sky-300 text-slate-950';
                          }

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedChoice(idx)}
                              className={`text-left p-4 sm:p-5 rounded-2xl border transition flex items-start gap-3.5 cursor-pointer shadow-sm ${cardClass}`}
                            >
                              <span
                                className={`w-9 h-9 rounded-xl border flex items-center justify-center font-black text-sm shrink-0 transition ${badgeClass}`}
                              >
                                {CHOICE_LABELS[idx]}
                              </span>
                              <div className="space-y-2 flex-1 min-w-0">
                                <div className="text-lg sm:text-xl font-bold leading-snug break-words">
                                  {choice}
                                </div>
                                {showAnswer && (
                                  <div className="text-xs sm:text-sm text-slate-200/95 leading-relaxed pt-2 border-t border-slate-700/60">
                                    {currentQuestion.choiceBreakdowns[idx]}
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Step-by-Step Teaching Control Bar */}
                      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 space-y-3 shadow-md">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                            🎯 ลำดับการสอนเจาะลึก (กดเปิดทีละขั้น หรือเปิดใบสรุปแกรมม่าเทียบ):
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setShowCheatSheet((v) => !v)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-black cursor-pointer"
                            >
                              📖 {showCheatSheet ? 'ซ่อนใบสรุปข้างกาย' : 'เปิดใบสรุปแกรมม่าเทียบ'}
                            </button>
                            <button
                              type="button"
                              onClick={revealAllDeepAnalysis}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 text-xs font-black shadow cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              เปิดครบทุกขั้น (1–6)
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowClue((v) => !v)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition cursor-pointer ${
                              showClue
                                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow'
                                : 'bg-slate-950 hover:bg-slate-800 text-amber-300 border-amber-500/40'
                            }`}
                          >
                            <Lightbulb className="w-4 h-4" />
                            1. จุดสังเกต
                          </button>

                          {currentQuestion.howToApproach &&
                            currentQuestion.howToApproach.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setShowApproach((v) => !v)}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition cursor-pointer ${
                                  showApproach
                                    ? 'bg-sky-400 text-slate-950 border-sky-300 shadow'
                                    : 'bg-slate-950 hover:bg-slate-800 text-sky-300 border-sky-500/40'
                                }`}
                              >
                                🧠 2. วิธีมองโจทย์
                              </button>
                            )}

                          {currentQuestion.mustKnowRule && (
                            <button
                              type="button"
                              onClick={() => setShowMustKnow((v) => !v)}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition cursor-pointer ${
                                showMustKnow
                                  ? 'bg-violet-400 text-slate-950 border-violet-300 shadow'
                                  : 'bg-slate-950 hover:bg-slate-800 text-violet-300 border-violet-500/40'
                              }`}
                            >
                              📌 3. กฎที่ต้องรู้
                            </button>
                          )}

                          {currentQuestion.essentialVocab &&
                            currentQuestion.essentialVocab.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setShowVocab((v) => !v)}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition cursor-pointer ${
                                  showVocab
                                    ? 'bg-teal-400 text-slate-950 border-teal-300 shadow'
                                    : 'bg-slate-950 hover:bg-slate-800 text-teal-300 border-teal-500/40'
                                }`}
                              >
                                🔤 4. คำศัพท์ ({currentQuestion.essentialVocab.length})
                              </button>
                            )}

                          <button
                            type="button"
                            onClick={() => setShowEliminated((v) => !v)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition cursor-pointer ${
                              showEliminated
                                ? 'bg-rose-500 text-white border-rose-400 shadow'
                                : 'bg-slate-950 hover:bg-slate-800 text-rose-300 border-rose-500/40'
                            }`}
                          >
                            <Scissors className="w-4 h-4" />
                            5. ตัดช้อยส์หลอก
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowAnswer((v) => !v)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition cursor-pointer ${
                              showAnswer
                                ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow'
                                : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            6. เฉลยละเอียด
                          </button>
                        </div>
                      </div>

                      {/* REVEALED EXPLANATION CARDS */}
                      <div className="space-y-3.5">
                        {/* 1. Spot Clue */}
                        {showClue && (
                          <div className="rounded-2xl bg-amber-950/30 border border-amber-400/40 p-5 space-y-1.5">
                            <div className="text-xs font-black uppercase tracking-wider text-amber-300">
                              🔍 1. จุดสังเกตในโจทย์ข้อนี้ (Spot Clue)
                            </div>
                            <p className="text-base sm:text-lg font-bold text-amber-50 leading-relaxed">
                              {currentQuestion.clueText}
                            </p>
                          </div>
                        )}

                        {/* 2. Step-by-Step Thinking Process */}
                        {showApproach &&
                          currentQuestion.howToApproach &&
                          currentQuestion.howToApproach.length > 0 && (
                            <div className="rounded-2xl bg-sky-950/30 border border-sky-400/40 p-5 space-y-3">
                              <div className="text-xs font-black uppercase tracking-wider text-sky-300">
                                🧠 2. วิธีมองโจทย์ทีละขั้น (How to Approach)
                              </div>
                              <ul className="space-y-2.5">
                                {currentQuestion.howToApproach.map((stepText, sIdx) => (
                                  <li
                                    key={sIdx}
                                    className="flex items-start gap-3 text-sm sm:text-base text-sky-50 leading-relaxed"
                                  >
                                    <span className="mt-0.5 w-6 h-6 rounded-lg bg-sky-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                                      {sIdx + 1}
                                    </span>
                                    <span>{stepText}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {/* 3. Must-Know Grammar Rule */}
                        {showMustKnow && currentQuestion.mustKnowRule && (
                          <div className="rounded-2xl bg-violet-950/30 border border-violet-400/40 p-5 space-y-2">
                            <div className="text-xs font-black uppercase tracking-wider text-violet-300">
                              📌 3. กฎไวยากรณ์ / โครงสร้างที่ต้องรู้ในข้อนี้
                            </div>
                            <div className="space-y-1.5">
                              {parseFormulaLines(currentQuestion.mustKnowRule).map(
                                (line, rIdx) => (
                                  <p
                                    key={rIdx}
                                    className="text-base sm:text-lg text-violet-50 font-semibold leading-relaxed"
                                  >
                                    {line}
                                  </p>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                        {/* 4. Essential Vocabulary */}
                        {showVocab &&
                          currentQuestion.essentialVocab &&
                          currentQuestion.essentialVocab.length > 0 && (
                            <div className="rounded-2xl bg-teal-950/25 border border-teal-400/40 p-5 space-y-3">
                              <div className="text-xs font-black uppercase tracking-wider text-teal-300">
                                🔤 4. คำศัพท์และวลีสำคัญประจำข้อ (กด 🔊 เพื่อฟังเสียง)
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {currentQuestion.essentialVocab.map((vItem, vIdx) => (
                                  <div
                                    key={vIdx}
                                    className="rounded-xl bg-slate-950/90 border border-teal-500/30 p-3.5 flex items-start justify-between gap-2"
                                  >
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-base font-extrabold text-teal-200">
                                          {vItem.term}
                                        </span>
                                        {vItem.partOfSpeech && (
                                          <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[11px] font-bold">
                                            {vItem.partOfSpeech}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-sm font-semibold text-white">
                                        {vItem.meaning}
                                      </div>
                                      {vItem.usageNote && (
                                        <div className="text-xs text-slate-400 leading-relaxed">
                                          💡 {vItem.usageNote}
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        speakWithWebSpeech(
                                          vItem.term.replace(/\+.*$/g, '').replace(/→/g, ', '),
                                        )
                                      }
                                      className="p-2 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 border border-teal-400/30 shrink-0 cursor-pointer"
                                      title={`ฟังเสียงอ่าน ${vItem.term}`}
                                    >
                                      <Volume2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* 5. Elimination Reason */}
                        {showEliminated && (
                          <div className="rounded-2xl bg-rose-950/30 border border-rose-400/40 px-5 py-4 text-rose-100 text-base leading-relaxed">
                            <span className="font-black text-rose-300 mr-2">
                              ✂️ 5. วิธีตัดช้อยส์หลอก:
                            </span>
                            {currentQuestion.eliminationReason}
                          </div>
                        )}

                        {/* 6. Full Answer Explanation */}
                        {showAnswer && (
                          <div className="rounded-2xl bg-emerald-950/35 border border-emerald-400/40 p-5 space-y-2">
                            <div className="text-sm font-black text-emerald-300">
                              ✅ สรุปเฉลยข้อ {CHOICE_LABELS[currentQuestion.correctIndex]}
                            </div>
                            <p className="text-base sm:text-lg text-white leading-relaxed">
                              {currentQuestion.explanation}
                            </p>
                          </div>
                        )}

                        {/* Optional Teacher Script */}
                        {showTeacherScript && (
                          <div className="rounded-2xl bg-indigo-500/10 border border-indigo-400/30 p-4 flex items-start gap-3">
                            <Mic className="w-5 h-5 text-indigo-300 shrink-0 mt-0.5" />
                            <div className="text-sm sm:text-base text-indigo-100 leading-relaxed">
                              <span className="font-bold text-indigo-300 mr-2">
                                สคริปต์แนะนำครู:
                              </span>
                              {currentQuestion.teacherScript}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* ═════════════════════════════════════════════════════════════════════
            SIDE-BY-SIDE QUICK GRAMMAR CHEAT SHEET DRAWER (ใบสรุปแกรมม่าข้างกาย)
            ═════════════════════════════════════════════════════════════════════ */}
        {showCheatSheet && (
          <aside
            aria-label="ใบสรุปแกรมม่าข้างกาย"
            className={`border-t lg:border-t-0 lg:border-l border-emerald-500/30 bg-slate-900/98 flex flex-col shrink-0 transition-all z-30 ${
              wideCheatSheet
                ? 'w-full lg:w-[680px] xl:w-[780px]'
                : 'w-full lg:w-[450px] xl:w-[520px]'
            } max-h-[85vh] lg:max-h-none overflow-hidden shadow-2xl`}
          >
            {/* Cheat Sheet Drawer Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <BookmarkCheck className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">
                      📖 ใบสรุปแกรมม่าข้างกาย (Quick Reference)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      เปิดทวนสูตรโครงสร้างได้ทันทีโดยไม่ต้องออกจากข้อสอบที่กำลังทำ
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setWideCheatSheet((v) => !v)}
                    className="hidden lg:inline-flex px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer"
                  >
                    {wideCheatSheet ? 'ย่อแถบ' : 'ขยายกว้าง'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCheatSheet(false)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 cursor-pointer"
                    title="ปิดใบสรุป"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Instant Search inside Cheat Sheets */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={cheatSheetSearch}
                  onChange={(e) => setCheatSheetSearch(e.target.value)}
                  placeholder="ค้นหาสูตรด่วน เช่น adjective, in on at, make do, tense, if..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                />
                {cheatSheetSearch && (
                  <button
                    type="button"
                    onClick={() => setCheatSheetSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Topic Tabs Strip */}
              <div className="flex flex-wrap gap-1.5">
                {filteredCheatSheets.map((sheet) => {
                  const isActive = currentCheatSheet.id === sheet.id;
                  return (
                    <button
                      key={sheet.id}
                      type="button"
                      onClick={() => setActiveCheatSheetId(sheet.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                        isActive
                          ? 'bg-emerald-400 text-slate-950 shadow'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                      }`}
                    >
                      <span>{sheet.icon}</span>
                      <span>{sheet.shortTitle}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cheat Sheet Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              {/* Cheat Sheet Title & Golden Formula */}
              <div className="rounded-2xl bg-gradient-to-br from-emerald-950/50 via-slate-900 to-teal-950/40 border border-emerald-400/30 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-black">
                    {currentCheatSheet.icon} {currentCheatSheet.badge}
                  </span>
                  {currentCheatSheet.relatedUnitNumber && (
                    <button
                      type="button"
                      onClick={() =>
                        selectUnit(currentCheatSheet.relatedUnitNumber!, 'concept', 0)
                      }
                      className="inline-flex items-center gap-1 text-xs font-bold text-sky-300 hover:text-sky-200 underline cursor-pointer"
                    >
                      ไปที่บทเรียนเต็ม <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <h4 className="text-base sm:text-lg font-black text-white leading-snug">
                  {currentCheatSheet.title}
                </h4>

                <div className="p-3 rounded-xl bg-slate-950/90 border border-emerald-500/30 text-xs sm:text-sm font-bold text-emerald-200 leading-relaxed">
                  {currentCheatSheet.summaryFormula}
                </div>

                <div className="text-xs text-amber-200/95 leading-relaxed">
                  <span className="font-black text-amber-400 mr-1">💡 เทคนิคจำเร็ว:</span>
                  {currentCheatSheet.memoryTip}
                </div>
              </div>

              {/* Structured Sections & Rows */}
              {currentCheatSheet.sections.map((section, secIdx) => (
                <div
                  key={secIdx}
                  className="rounded-2xl bg-slate-950/80 border border-slate-800 overflow-hidden"
                >
                  <div className="px-4 py-2.5 bg-slate-800/70 border-b border-slate-800">
                    <div className="text-xs sm:text-sm font-black text-amber-300">
                      {section.heading}
                    </div>
                    {section.description && (
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        {section.description}
                      </div>
                    )}
                  </div>

                  <div className="divide-y divide-slate-800/80">
                    {section.rows.map((row, rIdx) => (
                      <div key={rIdx} className="p-3.5 space-y-1.5 hover:bg-slate-900/50">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs sm:text-sm font-black text-sky-300">
                            {row.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => speakWithWebSpeech(row.example)}
                            className="p-1 rounded-lg bg-slate-800 hover:bg-sky-500/20 text-sky-300 border border-slate-700 shrink-0 cursor-pointer"
                            title="ฟังเสียงตัวอย่าง"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                          {row.rule}
                        </div>
                        <div className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs sm:text-sm font-bold text-white leading-snug">
                          Ex: {row.example}
                        </div>
                        {row.translation && (
                          <div className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                            💡 {row.translation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Exam Traps */}
              {currentCheatSheet.examTraps.length > 0 && (
                <div className="rounded-2xl bg-rose-950/25 border border-rose-500/30 p-4 space-y-2.5">
                  <div className="text-xs font-black text-rose-300 uppercase tracking-wider">
                    ⚠️ จุดที่ข้อสอบชอบหลอกบ่อยที่สุด
                  </div>
                  <div className="space-y-2.5">
                    {currentCheatSheet.examTraps.map((trap, tIdx) => (
                      <div
                        key={tIdx}
                        className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1 text-xs sm:text-sm"
                      >
                        <div className="text-rose-300 font-bold">{trap.wrong}</div>
                        <div className="text-emerald-300 font-bold">{trap.right}</div>
                        <div className="text-xs text-slate-300 pt-0.5 leading-relaxed">
                          เหตุผล: {trap.why}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          BOTTOM SLIDE NAVIGATION (SHOWN WHEN INSIDE A LESSON)
          ═══════════════════════════════════════════════════════════════════════ */}
      {!showTopicHub && (
        <footer className="bg-slate-900 border-t border-slate-800 px-5 py-3 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={goPrev}
            disabled={unitNumber === 1 && stage === 'concept' && slideIndex === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm font-bold text-slate-100 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            ก่อนหน้า (←)
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
                className={`h-2.5 rounded-full transition-all cursor-pointer ${
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-xs sm:text-sm font-black text-slate-950 transition cursor-pointer"
          >
            ถัดไป (→)
            <ChevronRight className="w-4 h-4" />
          </button>
        </footer>
      )}

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
