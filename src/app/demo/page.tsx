'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useDemoStore } from '@/store/useDemoStore';
import { useAppStore } from '@/store/useAppStore';
import Dashboard from '@/components/Dashboard';
import Game from '@/components/Game';
import StudyCamp from '@/components/StudyCamp';
import PreTest from '@/components/PreTest';
import {
  LayoutDashboard, Gamepad2, BookOpen, ClipboardList,
  GraduationCap, LogOut, ChevronRight, Sparkles, Star,
  Trophy, Brain, Zap, Users, BarChart3, ArrowRight, Play,
} from 'lucide-react';

type DemoView = 'onboarding' | 'dashboard' | 'pretest' | 'game' | 'study';

// ─── Onboarding Steps ────────────────────────────────────────────────────────
const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'ยินดีต้อนรับสู่ Vocab Journey 🚀',
    subtitle: 'ระบบฝึกและประเมินทักษะคำศัพท์ภาษาอังกฤษอัจฉริยะ',
    desc: 'ท่านกำลังอยู่ในโหมดสาธิตสำหรับกรรมการ ข้อมูลทั้งหมดเป็นข้อมูลจำลอง ไม่กระทบนักเรียนจริง',
    icon: '🏆',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'pretest',
    title: 'Pre-test ก่อนเรียน 📝',
    subtitle: 'วัดพื้นฐานเพื่อกำหนด Rank เริ่มต้น',
    desc: 'ระบบทำแบบประเมิน 25 ข้อ 5 รอบ คำนวณ Rank 1–5 โดยอัตโนมัติ เพื่อกำหนดความยากที่เหมาะสมกับผู้เรียนแต่ละคน',
    icon: '📊',
    color: 'from-emerald-500 to-teal-500',
    features: ['สุ่มคำศัพท์จากคลัง', 'คำนวณ Rank อัตโนมัติ', 'เล่นได้ 5 รอบ', 'ข้ามได้ในโหมดสาธิต'],
  },
  {
    id: 'study',
    title: 'Study Camp เรียนก่อนสอบ 📚',
    subtitle: 'Flashcard พร้อมระบบฟังเสียงออกเสียง',
    desc: 'ก่อนทำภารกิจ ผู้เรียนจะเห็นคำศัพท์ทั้งหมดในด่านนั้นก่อน พร้อมคำแปล ตัวอย่างประโยค และฟังเสียงออกเสียงที่ถูกต้อง',
    icon: '📖',
    color: 'from-blue-500 to-cyan-500',
    features: ['Flashcard สไลด์ได้', 'ฟังเสียงออกเสียง', 'คำแปลและตัวอย่าง', 'เตรียมพร้อมก่อนสอบ'],
  },
  {
    id: 'game',
    title: 'ระบบด่าน 1–3 ดาว ⚔️',
    subtitle: 'Adaptive Difficulty ปรับความยากตามผู้เรียน',
    desc: 'แต่ละด่านมี 3 ระดับความยาก: 1 ดาว (เลือกตอบ), 2 ดาว (ฟัง), 3 ดาว (พิมพ์) ระบบ AI ปรับสัดส่วนคำถามให้เหมาะกับ Rank ของผู้เรียน',
    icon: '⚔️',
    color: 'from-amber-500 to-orange-500',
    features: ['10 คำถามต่อด่าน', 'ระบบ Powerup Items', 'ระบบ Combo Streak', 'Immediate Feedback'],
  },
  {
    id: 'dashboard',
    title: 'Dashboard ติดตามความก้าวหน้า 📈',
    subtitle: 'Stage Map, Leaderboard, Rank และ Coin/EXP',
    desc: 'ผู้เรียนเห็น Stage Map 100 ด่าน, Leaderboard ห้องเรียน, ระดับ Rank ปัจจุบัน, Coin สะสม และ EXP ทั้งหมดในหน้าเดียว',
    icon: '🗺️',
    color: 'from-indigo-500 to-purple-500',
    features: ['Stage Map 100 ด่าน', 'Leaderboard ห้อง', 'ระบบการ์ดและไอเทม', 'สถิติส่วนตัว'],
  },
];

// ─── Main Demo Page ───────────────────────────────────────────────────────────
export default function DemoPage() {
  const router = useRouter();
  const [view, setView] = useState<DemoView>('onboarding');
  const [onboardStep, setOnboardStep] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Watch currentScreen from useAppStore to sync when components navigate internally
  const { currentScreen } = useAppStore();

  useEffect(() => {
    // Initialize demo synchronously before anything renders
    useDemoStore.getState().startDemo();
    const ds = useDemoStore.getState();
    const store = useAppStore.getState();
    store.setStudent(ds.demoStudent);
    store.setProgress(ds.demoProgress);
    store.setScreen('dashboard');
    setIsReady(true);
  }, []);

  // Sync view when internal component calls setScreen (e.g., Game back button)
  useEffect(() => {
    if (!isReady || view === 'onboarding') return;
    if (currentScreen === 'dashboard') setView('dashboard');
    else if (currentScreen === 'game') setView('game');
    else if (currentScreen === 'study') setView('study');
  }, [currentScreen, isReady]);

  const switchView = useCallback((newView: DemoView) => {
    const store = useAppStore.getState();
    const ds = useDemoStore.getState();

    if (newView === 'pretest') {
      // Clear pretest_date so PreTest component renders
      store.setProgress({ ...ds.demoProgress, pretest_date: null });
    } else {
      // Restore full demo progress
      store.setProgress(ds.demoProgress);
    }

    if (newView === 'game') store.setScreen('game');
    else if (newView === 'study') store.setScreen('study');
    else if (newView !== 'pretest') store.setScreen('dashboard');

    setView(newView);
  }, []);

  const handleExit = () => {
    useDemoStore.getState().resetDemo();
    useAppStore.getState().logout();
    router.push('/');
  };

  const handleStartExplore = () => {
    setView('dashboard');
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">กำลังโหลดโหมดสาธิต...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Onboarding ── */}
      <AnimatePresence mode="wait">
        {view === 'onboarding' && (
          <DemoOnboarding
            key="onboarding"
            step={onboardStep}
            onNext={() => setOnboardStep(s => s + 1)}
            onPrev={() => setOnboardStep(s => s - 1)}
            onStart={handleStartExplore}
          />
        )}

        {/* ── App Views ── */}
        {view !== 'onboarding' && (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen"
          >
            {/* Demo Bottom Nav */}
            <DemoBottomNav
              currentView={view}
              onSwitch={switchView}
              onTeacher={() => router.push('/demo/admin')}
              onExit={handleExit}
            />

            {/* Content Area */}
            <AnimatePresence mode="wait">
              {view === 'dashboard' && <Dashboard key="dash" />}
              {view === 'pretest' && <PreTest key="pretest" />}
              {view === 'game' && <Game key="game" />}
              {view === 'study' && <StudyCamp key="study" />}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Onboarding Component ─────────────────────────────────────────────────────
function DemoOnboarding({
  step,
  onNext,
  onPrev,
  onStart,
}: {
  step: number;
  onNext: () => void;
  onPrev: () => void;
  onStart: () => void;
}) {
  const isLast = step === ONBOARDING_STEPS.length - 1;
  const isFirst = step === 0;
  const current = ONBOARDING_STEPS[step];

  return (
    <motion.div
      key="onboarding"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden"
    >
      {/* Background gradient blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full filter blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-pink-600/10 rounded-full filter blur-[100px]" />
      </div>

      {/* Demo badge */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
        <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-4 py-1.5 text-purple-300 text-xs font-bold">
          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
          โหมดสาธิตสำหรับกรรมการ
        </div>
        <button
          onClick={onStart}
          className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
        >
          ข้ามขั้นตอนแนะนำ →
        </button>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          className="max-w-2xl w-full text-center relative z-10"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="text-8xl mb-6"
          >
            {current.icon}
          </motion.div>

          {/* Title */}
          <h1 className={`text-3xl sm:text-4xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r ${current.color}`}>
            {current.title}
          </h1>
          <p className="text-lg text-slate-300 font-semibold mb-3">{current.subtitle}</p>
          <p className="text-slate-400 leading-relaxed mb-8 max-w-lg mx-auto">{current.desc}</p>

          {/* Feature chips */}
          {current.features && (
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {current.features.map((f, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-full text-sm"
                >
                  <Star className="w-3 h-3 text-amber-400" />
                  {f}
                </motion.span>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="relative z-10 flex flex-col items-center gap-4 mt-4">
        {/* Progress dots */}
        <div className="flex gap-2">
          {ONBOARDING_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-purple-400' : i < step ? 'w-3 bg-purple-600' : 'w-3 bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 mt-2">
          {!isFirst && (
            <button
              onClick={onPrev}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm transition-colors"
            >
              ← ย้อนกลับ
            </button>
          )}

          {isLast ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={onStart}
              className="px-8 py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black rounded-2xl shadow-lg shadow-purple-500/30 flex items-center gap-2 text-base"
            >
              <Play className="w-5 h-5" />
              เริ่มสำรวจระบบ!
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onNext}
              className="px-7 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 flex items-center gap-2"
            >
              ถัดไป <ChevronRight className="w-4 h-4" />
            </motion.button>
          )}
        </div>

        {/* Step counter */}
        <p className="text-slate-600 text-xs">{step + 1} / {ONBOARDING_STEPS.length}</p>
      </div>
    </motion.div>
  );
}

// ─── Demo Bottom Navigation ───────────────────────────────────────────────────
const NAV_ITEMS = [
  { view: 'dashboard' as DemoView, icon: LayoutDashboard, label: 'Dashboard' },
  { view: 'pretest' as DemoView, icon: ClipboardList, label: 'Pre-test' },
  { view: 'study' as DemoView, icon: BookOpen, label: 'Study Camp' },
  { view: 'game' as DemoView, icon: Gamepad2, label: 'เล่นด่าน' },
];

function DemoBottomNav({
  currentView,
  onSwitch,
  onTeacher,
  onExit,
}: {
  currentView: DemoView;
  onSwitch: (v: DemoView) => void;
  onTeacher: () => void;
  onExit: () => void;
}) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl px-3 py-2 shadow-2xl shadow-black/50">
      {/* Demo Badge */}
      <div className="hidden sm:flex items-center gap-1.5 pr-2 border-r border-slate-700 mr-1">
        <Sparkles className="w-3 h-3 text-purple-400" />
        <span className="text-purple-400 text-xs font-bold">DEMO</span>
      </div>

      {/* Nav buttons */}
      {NAV_ITEMS.map(({ view, icon: Icon, label }) => (
        <button
          key={view}
          onClick={() => onSwitch(view)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all text-xs font-bold ${
            currentView === view
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:block">{label}</span>
        </button>
      ))}

      <div className="w-px h-6 bg-slate-700 mx-1" />

      {/* Teacher Dashboard */}
      <button
        onClick={onTeacher}
        className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all text-xs font-bold"
      >
        <GraduationCap className="w-4 h-4" />
        <span className="hidden sm:block">ครู</span>
      </button>

      <div className="w-px h-6 bg-slate-700 mx-1" />

      {/* Exit */}
      <button
        onClick={onExit}
        className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all text-xs font-bold"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:block">ออก</span>
      </button>
    </div>
  );
}
