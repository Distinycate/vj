'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  Lightbulb,
  Scissors,
  CheckCircle2,
  XCircle,
  Volume2,
  AlertTriangle,
  Trophy,
  RotateCcw,
  ChevronRight,
  HelpCircle,
  Search,
} from 'lucide-react';
import {
  GRAMMAR_TEACHING_UNITS,
  GRAMMAR_GRADE_TABS,
  TEACHING_CATEGORY_TABS,
  type GrammarGradeCategory,
  type TeachingTopicCategory,
  type GrammarTeachingUnit,
  type TeachingQuestionSlide,
} from '@/data/grammar/grammarPresentationData';
import { speakWithWebSpeech } from '@/utils/audio';
import { puzzleAudio } from '@/lib/puzzle/puzzleAudio';

type StudyTab = 'summary' | 'practice' | 'onet';
const CHOICE_LABELS = ['A', 'B', 'C', 'D'] as const;

export default function StudentGrammarPocketGuidePage() {
  const [selectedGrade, setSelectedGrade] = useState<'ALL' | GrammarGradeCategory>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | TeachingTopicCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUnitNum, setSelectedUnitNum] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<StudyTab>('summary');

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
        (unit.categoryLabel ?? '').toLowerCase().includes(q)
      );
    });
  }, [selectedGrade, selectedCategory, searchQuery]);

  // Interactive Question State (keyed by question id)
  const [selectedChoices, setSelectedChoices] = useState<Record<string, number>>({});
  const [openClues, setOpenClues] = useState<Record<string, boolean>>({});
  const [openEliminations, setOpenEliminations] = useState<Record<string, boolean>>({});
  const [openTranslations, setOpenTranslations] = useState<Record<string, boolean>>({});

  const currentUnit: GrammarTeachingUnit = useMemo(() => {
    return (
      GRAMMAR_TEACHING_UNITS.find((u) => u.unitNumber === selectedUnitNum) ??
      GRAMMAR_TEACHING_UNITS[0]
    );
  }, [selectedUnitNum]);

  const handleSelectChoice = (q: TeachingQuestionSlide, choiceIdx: number) => {
    setSelectedChoices((prev) => ({ ...prev, [q.id]: choiceIdx }));
    if (choiceIdx === q.correctIndex) {
      puzzleAudio.playWordSuccess();
    } else {
      puzzleAudio.playSelect();
    }
  };

  const handleResetUnitQuiz = () => {
    const nextChoices = { ...selectedChoices };
    const allQs = [...currentUnit.practiceQuestions, ...currentUnit.realOnetQuestions];
    for (const q of allQs) {
      delete nextChoices[q.id];
    }
    setSelectedChoices(nextChoices);
  };

  const renderQuestionList = (questions: TeachingQuestionSlide[], isOnet: boolean) => {
    const answeredInList = questions.filter((q) => selectedChoices[q.id] !== undefined).length;
    const correctInList = questions.filter(
      (q) => selectedChoices[q.id] === q.correctIndex
    ).length;

    return (
      <div className="space-y-4">
        {/* Mini Score Bar */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold text-slate-300">
            ความคืบหน้าชุดนี้:{' '}
            <span className="text-emerald-400 font-black">
              ตอบถูก {correctInList} / {answeredInList} ข้อ
            </span>{' '}
            (ทั้งหมด {questions.length} ข้อ)
          </div>
          {answeredInList > 0 && (
            <button
              type="button"
              onClick={handleResetUnitQuiz}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>เริ่มทำชุดนี้ใหม่</span>
            </button>
          )}
        </div>

        {questions.map((q) => {
          const picked = selectedChoices[q.id];
          const isAnswered = picked !== undefined;
          const isCorrect = picked === q.correctIndex;
          const clueVisible = Boolean(openClues[q.id]);
          const elimVisible = Boolean(openEliminations[q.id]);
          const transVisible = Boolean(openTranslations[q.id]);

          const cleanPromptForSpeech = q.prompt
            .replace(/_{2,}|\.{3,}/g, isAnswered ? q.choices[q.correctIndex] : 'blank')
            .replace(/\s+/g, ' ')
            .trim();

          return (
            <div
              key={q.id}
              className={`p-4 sm:p-5 rounded-3xl border transition-all space-y-3.5 ${
                isAnswered
                  ? isCorrect
                    ? 'bg-slate-900/95 border-emerald-500/50'
                    : 'bg-slate-900/95 border-rose-500/50'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              {/* Top Row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black ${
                      isOnet
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {isOnet ? `O-NET ข้อที่ ${q.questionNumber}` : `ซ้อมมือข้อที่ ${q.questionNumber}`}
                  </span>
                  {q.sourceTag && (
                    <span className="text-[11px] text-slate-400 font-medium">{q.sourceTag}</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => speakWithWebSpeech(cleanPromptForSpeech)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-[11px] font-bold cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>ฟังโจทย์</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenTranslations((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-bold cursor-pointer"
                  >
                    {transVisible ? 'ซ่อนคำแปล' : 'แปลโจทย์'}
                  </button>
                </div>
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <p className="text-base sm:text-lg font-bold text-white whitespace-pre-line leading-relaxed">
                  {q.prompt}
                </p>
                {transVisible && (
                  <p className="text-xs sm:text-sm text-sky-200 bg-sky-950/40 border border-sky-500/30 rounded-xl p-2.5 whitespace-pre-line">
                    💬 คำแปล: {q.promptTranslation}
                  </p>
                )}
              </div>

              {/* Scaffolding Helper Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpenClues((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    clueVisible
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-slate-800/90 hover:bg-slate-800 text-amber-300 border-amber-500/30'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>{clueVisible ? 'ซ่อนคำใบ้' : 'ดูคำใบ้ (Clue)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setOpenEliminations((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    elimVisible
                      ? 'bg-rose-500 text-white border-rose-400'
                      : 'bg-slate-800/90 hover:bg-slate-800 text-rose-300 border-rose-500/30'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>{elimVisible ? 'ยกเลิกตัดช้อยส์' : 'ตัวช่วยตัด 2 ช้อยส์หลอก'}</span>
                </button>
              </div>

              {clueVisible && (
                <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/40 text-xs sm:text-sm text-amber-100">
                  <span className="font-black text-amber-300 mr-1.5">🔍 จุดสังเกต:</span>
                  {q.clueText}
                </div>
              )}

              {elimVisible && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-400/40 text-xs sm:text-sm text-rose-100">
                  <span className="font-black text-rose-300 mr-1.5">✂️ วิธีตัดช้อยส์:</span>
                  {q.eliminationReason}
                </div>
              )}

              {/* Choices */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {q.choices.map((choice, idx) => {
                  const isThisCorrect = idx === q.correctIndex;
                  const isThisPicked = picked === idx;
                  const isEliminated = elimVisible && q.eliminatedIndices.includes(idx);

                  let btnClass =
                    'bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-slate-100';
                  if (isAnswered && isThisCorrect) {
                    btnClass =
                      'bg-emerald-500/20 border-emerald-400 text-emerald-100 ring-2 ring-emerald-400/40';
                  } else if (isAnswered && isThisPicked && !isThisCorrect) {
                    btnClass = 'bg-rose-500/20 border-rose-400 text-rose-200';
                  } else if (isEliminated) {
                    btnClass =
                      'bg-slate-900/40 border-slate-800 text-slate-500 line-through opacity-50';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectChoice(q, idx)}
                      className={`text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${btnClass}`}
                    >
                      <span className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center font-black text-xs shrink-0">
                        {CHOICE_LABELS[idx]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm sm:text-base font-bold break-words">{choice}</div>
                        {isAnswered && (
                          <div className="text-xs text-slate-300 mt-1.5 pt-1.5 border-t border-slate-700/60 leading-relaxed">
                            {q.choiceBreakdowns[idx]}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Explanation after answering */}
              {isAnswered && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs sm:text-sm leading-relaxed ${
                    isCorrect
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-black mb-1">
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300">
                          ยอดเยี่ยม! ตอบข้อ {CHOICE_LABELS[q.correctIndex]} ถูกต้อง
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-400" />
                        <span className="text-rose-300">
                          ยังไม่ถูกนะครับ — คำตอบที่ถูกคือข้อ {CHOICE_LABELS[q.correctIndex]}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-slate-200">{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link
              href="/challenge/worksheets"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              ใบงานคำศัพท์
            </Link>
            <Link
              href="/challenge/onet"
              className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 hover:text-cyan-200 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30"
            >
              🎯 สนามสอบ O-NET
            </Link>
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            คลังเนื้อหาการสอน &amp; สูตรลัด {GRAMMAR_TEACHING_UNITS.length} เรื่อง (ม.1–ม.3)
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-5 space-y-5">
        {/* Hero Banner */}
        <div className="rounded-3xl bg-gradient-to-br from-indigo-950/90 via-slate-900 to-amber-950/40 border border-indigo-500/30 p-5 sm:p-6 shadow-2xl">
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950">
            STUDENT GRAMMAR, CONVERSATION &amp; VOCAB POCKET GUIDE (M.1 – M.3)
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-white mt-2">
            ⚡ คัมภีร์สูตรลัดไวยากรณ์ บทสนทนา &amp; พิชิตข้อสอบ O-NET ({GRAMMAR_TEACHING_UNITS.length} เรื่อง)
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
            เลือกเรียนหรือเลือกสอนเรื่องไหนก่อนก็ได้! สรุปสูตรจำไว ตารางคำบอกใบ้ (Signal Words) พร้อมเสียงอ่าน โจทย์ซ้อมมือ และใบงานคู่ขนาน แยกตามหมวดหมู่และระดับชั้น ม.1, ม.2, ม.3 ครบ {GRAMMAR_TEACHING_UNITS.length} เรื่อง
          </p>
        </div>

        {/* Grade & Topic Category Filters */}
        <div className="space-y-3 bg-slate-900/60 border border-slate-800 rounded-3xl p-4">
          <div className="flex flex-wrap gap-2">
            {GRAMMAR_GRADE_TABS.map((tab) => {
              const isSelected = selectedGrade === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedGrade(tab.key)}
                  className={`px-3.5 py-2 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 font-bold'
                  }`}
                >
                  <div className="text-xs sm:text-sm">{tab.label}</div>
                  <div className="text-[10px] opacity-80">{tab.shortDesc}</div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
            <div className="flex flex-wrap gap-1.5">
              {TEACHING_CATEGORY_TABS.map((cat) => {
                const isSelected = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? 'bg-sky-400 text-slate-950 shadow'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {cat.icon} {cat.label}
                  </button>
                );
              })}
            </div>

            <div className="relative min-w-[210px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาเรื่องที่อยากเรียน..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Unit Selector Pills */}
        <div className="space-y-2">
          <div className="text-xs font-black uppercase tracking-wider text-slate-400">
            เลือกหัวข้อที่ต้องการเรียน/ทบทวน ({filteredUnits.length} เรื่อง — เรียนเรื่องไหนก่อนก็ได้)
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 select-none">
            {(filteredUnits.length > 0 ? filteredUnits : GRAMMAR_TEACHING_UNITS).map((u) => {
              const isSelected = u.unitNumber === selectedUnitNum;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedUnitNum(u.unitNumber);
                    setActiveTab('summary');
                  }}
                  className={`shrink-0 px-3.5 py-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 border-amber-300 font-black shadow-lg shadow-amber-500/20'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 font-bold'
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wider opacity-80">
                    เรื่องที่ {u.unitNumber} • {u.gradeLevel || 'ALL'} • {u.categoryLabel || ''}
                  </div>
                  <div className="text-xs sm:text-sm truncate max-w-[200px]">
                    {u.title.replace(/^Unit \d+:\s*/, '')}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Golden Trick Card for Selected Unit */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-indigo-500/15 border border-amber-400/40 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg sm:text-xl font-black text-white">{currentUnit.title}</h2>
            <div className="flex items-center gap-1.5 flex-wrap">
              {currentUnit.gradeLabel && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {currentUnit.gradeLabel}
                </span>
              )}
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {currentUnit.onetPartFocus}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-300">{currentUnit.subtitle}</p>
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-amber-400/30 text-xs sm:text-sm text-amber-200 font-bold">
            💡 <span className="text-amber-400 font-black">GOLDEN TRICK:</span>{' '}
            {currentUnit.goldenTrick}
          </div>
          {currentUnit.recommendedWorksheets &&
            currentUnit.recommendedWorksheets.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-bold text-emerald-300">
                  📖 ฝึกทำใบงานคู่ขนานของบทนี้:
                </span>
                {currentUnit.recommendedWorksheets.map((wsId) => (
                  <Link
                    key={wsId}
                    href={`/challenge/worksheets/${wsId}`}
                    className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold transition"
                  >
                    ใบงาน {wsId} →
                  </Link>
                ))}
              </div>
            )}
        </div>

        {/* Mode Tabs: Summary vs Practice vs O-NET */}
        <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'summary'
                ? 'bg-sky-500 text-slate-950 shadow'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>1. สรุปสูตร ({currentUnit.conceptSlides.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('practice')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'practice'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>2. ซ้อมมือ ({currentUnit.practiceQuestions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('onet')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'onet'
                ? 'bg-amber-400 text-slate-950 shadow'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>3. ข้อสอบ O-NET ({currentUnit.realOnetQuestions.length})</span>
          </button>
        </div>

        {/* TAB 1: CONCEPT SUMMARY */}
        {activeTab === 'summary' && (
          <div className="space-y-5">
            {currentUnit.conceptSlides.map((slide, sIdx) => (
              <div
                key={`${currentUnit.id}-slide-${sIdx}`}
                className="p-4 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base sm:text-xl font-black text-white">
                    {slide.slideTitle}
                  </h3>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300">
                    ส่วนที่ {sIdx + 1}/{currentUnit.conceptSlides.length}
                  </span>
                </div>

                {/* Key Formula */}
                <div className="p-3.5 rounded-2xl bg-sky-500/15 border border-sky-400/30">
                  <div className="text-[10px] font-black uppercase tracking-wider text-sky-300 mb-1">
                    สูตรโครงสร้าง (Key Formula)
                  </div>
                  <div className="text-sm sm:text-base font-extrabold text-white">
                    {slide.keyFormula}
                  </div>
                </div>

                {/* Bullet Points */}
                <ul className="space-y-2">
                  {slide.bulletPoints.map((bp, bIdx) => (
                    <li
                      key={bIdx}
                      className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 leading-relaxed"
                    >
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        {bIdx + 1}
                      </span>
                      <span>{bp}</span>
                    </li>
                  ))}
                </ul>

                {/* Signal Table with Audio */}
                <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/60">
                  <div className="px-4 py-2.5 bg-slate-800/70 text-xs font-black text-amber-300">
                    🔍 ตารางคำบอกใบ้ & ตัวอย่างประโยค (แตะลำโพงเพื่อฟังเสียงอ่าน)
                  </div>
                  <div className="divide-y divide-slate-800/80">
                    {slide.signalTable.map((row, rIdx) => (
                      <div
                        key={rIdx}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-black text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/20">
                              {row.signal}
                            </span>
                            <span className="text-xs font-bold text-amber-200">
                              → {row.ruleOrMeaning}
                            </span>
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-white">
                            &ldquo;{row.example}&rdquo;
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {row.exampleTranslation}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => speakWithWebSpeech(row.example)}
                          className="self-start sm:self-center shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-bold cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>ฟังตัวอย่าง</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Common Trap */}
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-1 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 font-black text-rose-300">
                    <AlertTriangle className="w-4 h-4" />
                    <span>ระวังกับดักข้อสอบ O-NET!</span>
                  </div>
                  <p className="text-slate-200">
                    <span className="font-bold text-rose-200">จุดหลอก:</span>{' '}
                    {slide.commonTrap.trap}
                  </p>
                  <p className="text-emerald-200">
                    <span className="font-bold text-emerald-300">วิธีแก้:</span>{' '}
                    {slide.commonTrap.howToFix}
                  </p>
                </div>
              </div>
            ))}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('practice')}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <span>ไปทำโจทย์ซ้อมมือบทนี้ ({currentUnit.practiceQuestions.length} ข้อ)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: PRACTICE QUESTIONS */}
        {activeTab === 'practice' &&
          renderQuestionList(currentUnit.practiceQuestions, false)}

        {/* TAB 3: REAL O-NET QUESTIONS */}
        {activeTab === 'onet' && renderQuestionList(currentUnit.realOnetQuestions, true)}
      </div>
    </div>
  );
}
