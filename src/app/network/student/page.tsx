'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe2,
  LogOut,
  Star,
  MapPin,
  Lock,
  Play,
  CheckCircle2,
  Crown,
  Swords,
  RefreshCw,
  Trophy,
  GraduationCap,
  Sparkles,
  ArrowRight,
  School,
  User,
  ShieldCheck,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/store/useAppStore';
import { saveStudentSession } from '@/utils/studentSession';

const Game = dynamic(() => import('@/components/Game'), { ssr: false });
const PreTest = dynamic(() => import('@/components/PreTest'), { ssr: false });
const PostTest = dynamic(() => import('@/components/PostTest'), { ssr: false });

interface NetworkStudentData {
  id: string;
  studentId: string;
  studentName: string;
  username: string;
  schoolName: string;
  classroomName: string;
  gradeLevel?: string;
  roomNumber?: string;
  userType: string;
}

interface ProgressionData {
  currentStage: number;
  totalStars: number;
  stageStarsMap: Record<number, number>;
  unlockedStages: number[];
  campaignCompleted: boolean;
}

interface AssessmentData {
  hasCompletedPreTest: boolean;
  hasCompletedPostTest: boolean;
  preTestCount: number;
  latestPreTest: { score: number; total_questions: number } | null;
  latestPostTest: { score: number; total_questions: number } | null;
}

export default function NetworkStudentDashboardPage() {
  const router = useRouter();
  const {
    student: storeStudent,
    setStudent,
    setProgress,
    setSelectedStageNumber,
    currentScreen,
    setScreen,
    logout,
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [studentData, setStudentData] = useState<NetworkStudentData | null>(null);
  const [progression, setProgression] = useState<ProgressionData>({
    currentStage: 1,
    totalStars: 0,
    stageStarsMap: {},
    unlockedStages: [1],
    campaignCompleted: false,
  });
  const [assessment, setAssessment] = useState<AssessmentData>({
    hasCompletedPreTest: false,
    hasCompletedPostTest: false,
    preTestCount: 0,
    latestPreTest: null,
    latestPostTest: null,
  });

  const [activeView, setActiveView] = useState<'map' | 'pretest' | 'posttest' | 'game'>('map');
  const [selectedWorld, setSelectedWorld] = useState<number>(1);

  // Fetch initial student state
  const loadInitData = useCallback(async () => {
    try {
      setError('');
      const res = await fetch('/api/network/student/init');
      if (res.status === 401) {
        router.push('/network');
        return;
      }
      if (res.status === 403) {
        setError('บัญชีนี้ไม่ได้รับอนุญาตให้ใช้งานในโหมด Lite (เฉพาะนักเรียนโรงเรียนเครือข่าย)');
        setTimeout(() => router.push('/'), 3000);
        return;
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load student data');

      setStudentData(json.student);
      setProgression(json.progression);
      setAssessment(json.assessment);

      // Sync Zustand store for Game/PreTest compatibility
      saveStudentSession(json.student);
      setStudent(json.student);
      setProgress({
        current_stage: json.progression.currentStage,
        current_rank: 1,
        total_stages: 100,
      });

      // Compute which world to show by default
      const currWorld = Math.min(10, Math.max(1, Math.ceil(json.progression.currentStage / 10)));
      setSelectedWorld(currWorld);

      // Pre-test gate: if not completed, force pre-test view
      if (!json.assessment.hasCompletedPreTest) {
        setActiveView('pretest');
      } else {
        setActiveView('map');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  }, [router, setStudent, setProgress]);

  useEffect(() => {
    loadInitData();
  }, [loadInitData]);

  // Handle stage click
  const handleStageClick = (stageNum: number) => {
    const isUnlocked = progression.unlockedStages.includes(stageNum) || stageNum <= progression.currentStage;
    if (!isUnlocked) return;

    setSelectedStageNumber(stageNum);
    setScreen('game');
    setActiveView('game');
  };

  // Return from game to map
  const handleFinishGame = async () => {
    setActiveView('map');
    setSelectedStageNumber(null);
    setScreen('dashboard');
    await loadInitData();
  };

  // Sync screen changes: if store screen transitions back to dashboard while game view is active, switch to map
  useEffect(() => {
    if (activeView === 'game' && currentScreen === 'dashboard') {
      handleFinishGame();
    }
  }, [currentScreen, activeView]);

  // Handle Post-test click
  const handleOpenPostTest = () => {
    setActiveView('posttest');
  };

  // Return from Pre-test / Post-test
  const handleFinishAssessment = async () => {
    await loadInitData();
    setActiveView('map');
  };

  // Logout
  const handleLogout = async () => {
    logout();
    router.push('/network');
  };

  // ── Render Loading State ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-400 font-bold">กำลังโหลดห้องเรียนผจญภัยคำศัพท์ VJ Network...</p>
      </div>
    );
  }

  // ── Render Forbidden / Error ──────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-8 max-w-md text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <LogOut className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-white">ข้อความแจ้งเตือน</h2>
          <p className="text-sm text-slate-400 leading-relaxed">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
          >
            กลับสู่หน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  // ── 1. PRE-TEST VIEW (GATED) ─────────────────────────────────────────────
  if (activeView === 'pretest' || !assessment.hasCompletedPreTest) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-black text-white uppercase tracking-wider">
              VJ Network • แบบทดสอบก่อนเรียน (Pre-Test)
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>ออกจากระบบ</span>
          </button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <PreTest onExit={handleFinishAssessment} onDashboard={handleFinishAssessment} />
        </main>
      </div>
    );
  }

  // ── 2. POST-TEST VIEW ─────────────────────────────────────────────────────
  if (activeView === 'posttest') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-black text-white uppercase tracking-wider">
              VJ Network • แบบทดสอบหลังเรียน (Post-Test)
            </span>
          </div>
          <button
            onClick={() => setActiveView('map')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
          >
            กลับสู่แผนที่
          </button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <PostTest />
        </main>
      </div>
    );
  }

  // ── 3. GAMEPLAY VIEW (100% MCQ / SKULL MODE) ──────────────────────────────
  if (activeView === 'game') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <div className="fixed top-3 left-4 z-40">
          <button
            onClick={handleFinishGame}
            className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold backdrop-blur-md shadow-lg transition-colors flex items-center gap-1.5"
          >
            &larr; กลับหน้าแผนที่
          </button>
        </div>
        <Game onFinish={handleFinishGame} />
      </div>
    );
  }

  // ── 4. LITE 100-STAGE MAP DASHBOARD VIEW ──────────────────────────────────
  const currentStageNum = progression.currentStage;
  const totalStarsCount = progression.totalStars;
  const isPostTestUnlocked = currentStageNum >= 100 || progression.stageStarsMap[100] !== undefined;

  // Build 10 Worlds
  const worlds = Array.from({ length: 10 }, (_, i) => {
    const worldNum = i + 1;
    const startStage = (worldNum - 1) * 10 + 1;
    const endStage = worldNum * 10;
    const worldStages = Array.from({ length: 10 }, (_, j) => startStage + j);
    return {
      worldNum,
      startStage,
      endStage,
      stages: worldStages,
    };
  });

  const activeWorldObj = worlds.find((w) => w.worldNum === selectedWorld) || worlds[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-xl sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand & Student info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  NETWORK LITE
                </span>
                <span className="text-xs text-slate-400 font-medium truncate max-w-[140px] sm:max-w-none">
                  {studentData?.schoolName} • {studentData?.classroomName}
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-black text-white truncate max-w-[200px] sm:max-w-none">
                {studentData?.studentName}
              </h1>
            </div>
          </div>

          {/* Metrics & Logout */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Current Stage Badge */}
            <div className="px-3 py-1.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              <div className="text-xs font-black text-indigo-300">
                ด่าน {Math.min(100, currentStageNum)} / 100
              </div>
            </div>

            {/* Total Stars Badge */}
            <div className="px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <div className="text-xs font-black text-amber-300">
                {totalStarsCount} ⭐
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 sm:px-3 sm:py-1.5 rounded-2xl bg-slate-800/80 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 border border-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content: Map Navigation */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Post-Test Announcement Card (When Unlocked) */}
        {isPostTestUnlocked && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black mb-1">
                  <Sparkles className="w-3 h-3" />
                  <span>แบบทดสอบหลังเรียนเปิดแล้ว</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  {assessment.hasCompletedPostTest
                    ? `คุณทำแบบทดสอบหลังเรียนแล้ว (คะแนน ${assessment.latestPostTest?.score}/${assessment.latestPostTest?.total_questions})`
                    : 'ยินดีด้วย! คุณผ่านด่าน 100 แล้ว ทำแบบทดสอบหลังเรียนเพื่อดูผลลัพธ์'}
                </h3>
                <p className="text-xs text-amber-200/80">
                  {assessment.hasCompletedPostTest
                    ? 'สามารถทำซ้ำเพื่อฝึกฝนและประเมินความรู้เพิ่มเติมได้'
                    : 'ประเมินพัฒนาการคำศัพท์จากการผจญภัยทั้งหมด'}
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenPostTest}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <span>{assessment.hasCompletedPostTest ? 'ทำแบบทดสอบอีกครั้ง' : 'เริ่มทำแบบทดสอบหลังเรียน'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* World Tabs Selector */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
              เลือกดินแดนคำศัพท์ (World 1 - 10)
            </span>
            <span className="text-xs font-bold text-indigo-400">
              ดินแดนที่ {selectedWorld}: ด่าน {activeWorldObj.startStage} – {activeWorldObj.endStage}
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {worlds.map((w) => {
              const isCurrentWorld = Math.ceil(currentStageNum / 10) === w.worldNum;
              const isSelected = selectedWorld === w.worldNum;
              const isWorldUnlocked = w.startStage <= currentStageNum || progression.unlockedStages.includes(w.startStage);

              return (
                <button
                  key={w.worldNum}
                  onClick={() => setSelectedWorld(w.worldNum)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : isWorldUnlocked
                      ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                      : 'bg-slate-950 text-slate-600 border border-slate-800/80'
                  }`}
                >
                  <span>World {w.worldNum}</span>
                  {isCurrentWorld && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  )}
                  {!isWorldUnlocked && <Lock className="w-3 h-3 text-slate-600" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 10-Stage Grid for Active World */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span>ดินแดนที่ {selectedWorld}</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-300">
                  ด่าน {activeWorldObj.startStage} – {activeWorldObj.endStage}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                เลือกด่านเพื่อเริ่มฝึกฝนคำศัพท์แบบ Multiple Choice (4 ตัวเลือก)
              </p>
            </div>

            {/* Quick Legend */}
            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> ผ่านแล้ว
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> ด่านปัจจุบัน
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" /> ยังไม่ปลดล็อก
              </span>
            </div>
          </div>

          {/* Grid of 10 Stages */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {activeWorldObj.stages.map((stageNum) => {
              const stars = progression.stageStarsMap[stageNum] || 0;
              const isCompleted = stars > 0;
              const isCurrent = stageNum === currentStageNum;
              const isUnlocked = progression.unlockedStages.includes(stageNum) || stageNum <= currentStageNum;

              // Determine Boss types
              const isFinalBoss = stageNum === 100;
              const isWorldBoss = stageNum % 10 === 0 && !isFinalBoss;
              const isMiniBoss = stageNum % 10 === 5;

              return (
                <motion.button
                  key={stageNum}
                  whileHover={isUnlocked ? { scale: 1.03 } : {}}
                  whileTap={isUnlocked ? { scale: 0.97 } : {}}
                  disabled={!isUnlocked}
                  onClick={() => handleStageClick(stageNum)}
                  className={`relative p-5 rounded-3xl border flex flex-col items-center justify-between text-center min-h-[140px] transition-all ${
                    isCurrent
                      ? 'bg-gradient-to-b from-indigo-900/60 to-slate-900 border-indigo-500 shadow-xl shadow-indigo-500/20 ring-2 ring-indigo-500/50'
                      : isCompleted
                      ? 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-500 shadow-md'
                      : isUnlocked
                      ? 'bg-slate-900/60 border-slate-700 hover:border-indigo-400'
                      : 'bg-slate-950/60 border-slate-800/80 opacity-60 cursor-not-allowed'
                  }`}
                >
                  {/* Top Badge: Boss / Type Tag */}
                  <div className="w-full flex items-center justify-between text-[10px] font-black">
                    {isFinalBoss ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 mx-auto">
                        <Crown className="w-3 h-3 text-amber-400" /> FINAL BOSS
                      </span>
                    ) : isWorldBoss ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 mx-auto">
                        <Crown className="w-3 h-3 text-rose-400" /> WORLD BOSS
                      </span>
                    ) : isMiniBoss ? (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 mx-auto">
                        <Swords className="w-3 h-3 text-purple-400" /> MINI BOSS
                      </span>
                    ) : (
                      <span className="text-slate-500 font-bold mx-auto">STAGE</span>
                    )}
                  </div>

                  {/* Stage Number & Icon */}
                  <div className="my-2">
                    <div
                      className={`text-2xl font-black ${
                        isCurrent
                          ? 'text-white'
                          : isCompleted
                          ? 'text-emerald-300'
                          : isUnlocked
                          ? 'text-slate-200'
                          : 'text-slate-600'
                      }`}
                    >
                      {stageNum}
                    </div>
                  </div>

                  {/* Bottom Status: Stars / Current Indicator / Locked */}
                  <div className="w-full flex items-center justify-center">
                    {isCompleted ? (
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: 3 }).map((_, idx) => (
                          <Star
                            key={idx}
                            className={`w-3.5 h-3.5 ${
                              idx < stars ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    ) : isCurrent ? (
                      <span className="px-3 py-1 rounded-full bg-indigo-500 text-white text-[10px] font-black flex items-center gap-1 shadow-md shadow-indigo-500/30">
                        <Play className="w-3 h-3 fill-white" /> เล่นตอนนี้
                      </span>
                    ) : isUnlocked ? (
                      <span className="text-[10px] text-slate-400 font-bold">พร้อมเล่น</span>
                    ) : (
                      <Lock className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center text-xs text-slate-600 pb-8">
          Vocab Journey Lite • โหมดการเรียนรู้สำหรับโรงเรียนเครือข่าย • 100 ด่านคำศัพท์ Multiple Choice
        </div>
      </main>
    </div>
  );
}
