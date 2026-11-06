'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Trophy,
  Flame,
  Maximize2,
  Minimize2,
  RefreshCw,
  Users,
  Sparkles,
  Clock,
  ArrowLeft,
  Activity,
  CheckCircle2,
  Award,
  Zap,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { NATIONAL_BENCHMARKS } from '@/data/onet/onetData';

interface StudentInfo {
  id: string;
  studentId: string;
  studentName: string;
  classroom: string;
}

interface LiveStudentRecord {
  studentId: string;
  studentCode: string;
  studentName: string;
  classroom: string;
  answeredCount: number;
  correctCount: number;
  totalQuestions: number;
  score100?: number;
  durationSeconds?: number;
  status: 'in_progress' | 'completed' | 'idle';
  updatedAt?: string;
}

function OnetTvScoreboardInner() {
  const searchParams = useSearchParams();
  const initialYear = Number(searchParams?.get('year') || '2568');
  const initialClassroom = searchParams?.get('classroom') || 'ALL';

  // Filters & Settings
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedClassroom, setSelectedClassroom] = useState<string>(initialClassroom);
  const [sortBy, setSortBy] = useState<'score' | 'progress' | 'code'>('score');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Data States
  const [classroomsList, setClassroomsList] = useState<string[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [liveProgress, setLiveProgress] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(3);

  // Audio effect generator using Web Audio API (zero external assets)
  const playCheerSound = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  };

  // Fetch live ONET data from Admin API
  const fetchLiveData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await fetch('/api/admin/onet', { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.success) {
        if (Array.isArray(data.classrooms)) {
          setClassroomsList(data.classrooms);
        }
        if (Array.isArray(data.students)) {
          setStudents(data.students);
        }
        if (data.submissions) {
          setSubmissions(data.submissions);
        }
        if (data.liveProgress) {
          setLiveProgress(data.liveProgress);
        }
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.warn('Failed to poll ONET live data:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchLiveData();
  }, []);

  // 3-second auto-refresh countdown loop
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchLiveData(true);
          return 3;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedYear]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Compute live student records (Spoiler-free: aggregate scores and % only)
  const leaderboardData = useMemo(() => {
    const yearLive = liveProgress[String(selectedYear)] || {};
    const benchmark = NATIONAL_BENCHMARKS[selectedYear]?.nationalMean || 30.93;

    // Filter students by classroom if specified
    const filteredStudents = students.filter((s) => {
      if (selectedClassroom !== 'ALL' && s.classroom !== selectedClassroom) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return s.studentName.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q);
      }
      return true;
    });

    const records = filteredStudents.map((s) => {
      const sub = submissions[`${s.id}_${selectedYear}`];
      const live = yearLive[s.id];

      const isSubmitted = Boolean(sub);
      const isLive = Boolean(live && live.status === 'in_progress' && !sub);

      let status: 'completed' | 'in_progress' | 'idle' = 'idle';
      let score100 = 0;
      let answeredCount = 0;
      let totalQuestions = 32;
      let correctCount = 0;
      let durationSeconds = 0;

      if (isSubmitted) {
        status = 'completed';
        score100 = Number(sub.score100 ?? 0);
        correctCount = Number(sub.correctCount ?? 0);
        totalQuestions = Number(sub.totalQuestions ?? 32);
        answeredCount = totalQuestions;
        durationSeconds = sub.durationSeconds || 0;
      } else if (isLive) {
        status = 'in_progress';
        correctCount = Number(live.correctCount ?? 0);
        totalQuestions = Number(live.totalQuestions ?? 32);
        answeredCount = Number(live.answeredCount ?? 0);
        // Compute current live score scaled to 100
        score100 = totalQuestions > 0 ? Number(((correctCount / totalQuestions) * 100).toFixed(2)) : 0;
        durationSeconds = live.durationSeconds || 0;
      }

      const scorePercent = Math.round(score100);
      const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
      const isAboveNationalMean = score100 >= benchmark && (isSubmitted || answeredCount >= 10);

      return {
        id: s.id,
        studentCode: s.studentId,
        studentName: s.studentName,
        classroom: s.classroom,
        status,
        score100,
        scorePercent,
        correctCount,
        totalQuestions,
        answeredCount,
        progressPercent,
        isAboveNationalMean,
        durationSeconds,
      };
    });

    // Sorting
    records.sort((a, b) => {
      if (sortBy === 'score') {
        if (b.score100 !== a.score100) return b.score100 - a.score100;
        if (b.answeredCount !== a.answeredCount) return b.answeredCount - a.answeredCount;
        return a.studentCode.localeCompare(b.studentCode);
      }
      if (sortBy === 'progress') {
        if (b.answeredCount !== a.answeredCount) return b.answeredCount - a.answeredCount;
        return b.score100 - a.score100;
      }
      return a.studentCode.localeCompare(b.studentCode, undefined, { numeric: true });
    });

    return records;
  }, [students, submissions, liveProgress, selectedYear, selectedClassroom, searchQuery, sortBy]);

  // High-level statistics
  const stats = useMemo(() => {
    const total = leaderboardData.length;
    const submitted = leaderboardData.filter((s) => s.status === 'completed').length;
    const inProgress = leaderboardData.filter((s) => s.status === 'in_progress').length;
    const idle = leaderboardData.filter((s) => s.status === 'idle').length;

    const scores = leaderboardData.map((s) => s.score100).filter((sc) => sc > 0);
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const avgScore = scores.length > 0 ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : 0;

    const benchmark = NATIONAL_BENCHMARKS[selectedYear]?.nationalMean || 30.93;
    const aboveMeanCount = leaderboardData.filter((s) => s.isAboveNationalMean).length;

    return {
      total,
      submitted,
      inProgress,
      idle,
      maxScore,
      avgScore,
      benchmark,
      aboveMeanCount,
    };
  }, [leaderboardData, selectedYear]);

  const top3 = useMemo(() => {
    return leaderboardData.filter((s) => s.score100 > 0).slice(0, 3);
  }, [leaderboardData]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* ── Top TV Command & Metric Bar ──────────────────────────────── */}
      <header className="bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 py-3 shrink-0 sticky top-0 z-30 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Branding & Beacon */}
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="กลับหน้าแอดมิน"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">ออก</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
              </span>
              <h1 className="text-base sm:text-lg font-black tracking-wider text-white flex items-center gap-1.5">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-pink-400">
                  ONET LIVE ARENA
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono font-bold uppercase animate-pulse">
                  TV MODE
                </span>
              </h1>
            </div>

            {/* Year Badge */}
            <div className="hidden md:flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 font-bold">ปี:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-cyan-300 font-black cursor-pointer focus:outline-none"
              >
                {[2568, 2567, 2566, 2565, 2564, 2563, 2562, 2561, 2560, 2559].map((y) => (
                  <option key={y} value={y} className="bg-slate-900 text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Classroom Selector */}
            <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <select
                value={selectedClassroom}
                onChange={(e) => setSelectedClassroom(e.target.value)}
                className="bg-transparent text-indigo-300 font-black cursor-pointer focus:outline-none"
              >
                <option value="ALL" className="bg-slate-900 text-white">
                  ทุกห้องเรียน ({students.length} คน)
                </option>
                {classroomsList.map((room) => (
                  <option key={room} value={room} className="bg-slate-900 text-white">
                    ห้อง {room}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Center: Live Stats Ticker (Big readable metrics for classroom TV) */}
          <div className="hidden xl:flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-1.5 rounded-2xl border border-slate-800/80">
              <Activity className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-[10px] text-slate-400 block font-bold leading-none">กำลังสอบ</span>
                <span className="text-sm font-black text-cyan-300 font-mono">
                  {stats.inProgress} <span className="text-[10px] text-slate-500 font-normal">คน</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-1.5 rounded-2xl border border-slate-800/80">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-[10px] text-slate-400 block font-bold leading-none">ส่งแล้ว</span>
                <span className="text-sm font-black text-emerald-400 font-mono">
                  {stats.submitted} <span className="text-[10px] text-slate-500 font-normal">/ {stats.total} คน</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-1.5 rounded-2xl border border-amber-500/30">
              <Trophy className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-[10px] text-amber-300/80 block font-bold leading-none">สูงสุดในห้อง</span>
                <span className="text-sm font-black text-amber-400 font-mono">
                  {stats.maxScore.toFixed(1)} <span className="text-[10px] text-slate-500 font-normal">คะแนน</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-1.5 rounded-2xl border border-slate-800/80">
              <Flame className="w-4 h-4 text-purple-400" />
              <div>
                <span className="text-[10px] text-slate-400 block font-bold leading-none">เฉลี่ยห้อง</span>
                <span className="text-sm font-black text-purple-300 font-mono">
                  {stats.avgScore.toFixed(1)} <span className="text-[10px] text-slate-500 font-normal">คะแนน</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Controls & Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Sort Toggle */}
            <div className="hidden sm:flex bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setSortBy('score')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  sortBy === 'score' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                🏆 อันดับคะแนน
              </button>
              <button
                type="button"
                onClick={() => setSortBy('progress')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  sortBy === 'progress' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚡ ข้อที่ทำแล้ว
              </button>
              <button
                type="button"
                onClick={() => setSortBy('code')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  sortBy === 'code' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                🔢 เรียงตามเลขที่
              </button>
            </div>

            {/* Countdown / Refresh indicator */}
            <button
              type="button"
              onClick={() => fetchLiveData(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              title="กดรีเฟรชสด"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
              <span className="font-mono text-cyan-300">{countdown}s</span>
            </button>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-500 border-slate-700'
              }`}
              title={soundEnabled ? 'เปิดเสียงเอฟเฟกต์' : 'ปิดเสียง'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer active:scale-95 transition-all"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{isFullscreen ? 'ย่อจอ' : 'ต่อขึ้นจอทีวี'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Stats Ticker Strip */}
        <div className="flex xl:hidden items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-800/60 text-xs font-mono">
          <span className="text-cyan-400 font-bold">⚡ กำลังสอบ {stats.inProgress} คน</span>
          <span className="text-emerald-400 font-bold">🏆 ส่งแล้ว {stats.submitted}/{stats.total} คน</span>
          <span className="text-amber-400 font-bold">⭐ สูงสุด {stats.maxScore.toFixed(1)}</span>
        </div>
      </header>

      {/* ── Anti-Cheat Notice Banner ─────────────────────────────────── */}
      <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900/60 to-purple-950/60 px-6 py-2 border-b border-indigo-500/20 text-center text-xs text-indigo-300/90 flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
        <span>
          <strong>โหมดถ่ายทอดสด (Spoiler-Free Classroom Arena):</strong> แสดงคะแนนรวมและความคืบหน้าแบบเรียลไทม์ 
          <span className="text-amber-300 font-bold"> ไม่มีการเปิดเผยข้อสอบหรือตัวเลือกคำตอบ</span> เพื่อความตื่นเต้นและสร้างบรรยากาศแข่งขัน
        </span>
      </div>

      {/* ── Main Arena Content Area ─────────────────────────────────── */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Top 3 Podium Highlights (Only shown when scores exist) */}
        {top3.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Rank 2 (Left) */}
            {top3[1] && (
              <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-700/80 shadow-xl flex items-center gap-4 relative overflow-hidden order-2 md:order-1">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-600 flex items-center justify-center text-2xl shadow-inner shrink-0">
                  🥈
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      อันดับ 2
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">ห้อง {top3[1].classroom}</span>
                  </div>
                  <h3 className="text-base font-black text-white truncate mt-0.5">
                    {top3[1].studentName}
                  </h3>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-black text-slate-200 font-mono">
                      {top3[1].score100.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400">/ 100 คะแนน ({top3[1].scorePercent}%)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Rank 1 Champion (Center - Larger & Glowing) */}
            {top3[0] && (
              <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-amber-950/30 border-2 border-amber-400/80 shadow-2xl shadow-amber-500/20 flex items-center gap-4 relative overflow-hidden order-1 md:order-2 ring-4 ring-amber-500/10 scale-[1.02]">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center text-3xl shadow-lg shrink-0 font-black">
                  👑
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-md">
                      🥇 อันดับ 1 ชัยชนะ
                    </span>
                    <span className="text-xs text-amber-300/80 font-mono font-bold">ห้อง {top3[0].classroom}</span>
                  </div>
                  <h3 className="text-lg font-black text-white truncate mt-1">
                    {top3[0].studentName}
                  </h3>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-amber-400 font-mono">
                      {top3[0].score100.toFixed(1)}
                    </span>
                    <span className="text-xs text-amber-200/70">/ 100 คะแนน ({top3[0].scorePercent}%)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Rank 3 (Right) */}
            {top3[2] && (
              <div className="p-4 rounded-3xl bg-slate-900/90 border border-amber-800/40 shadow-xl flex items-center gap-4 relative overflow-hidden order-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-950/40 border border-amber-700/50 flex items-center justify-center text-2xl shadow-inner shrink-0">
                  🥉
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/50">
                      อันดับ 3
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">ห้อง {top3[2].classroom}</span>
                  </div>
                  <h3 className="text-base font-black text-white truncate mt-0.5">
                    {top3[2].studentName}
                  </h3>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-black text-amber-300 font-mono">
                      {top3[2].score100.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400">/ 100 คะแนน ({top3[2].scorePercent}%)</span>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Complete Classroom Scoreboard Grid ─────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-bold uppercase tracking-wider">
              รายชื่อผู้เข้าสอบ ({leaderboardData.length} คน) • สังกัดห้อง: {selectedClassroom === 'ALL' ? 'ทุกห้องเรียน' : selectedClassroom}
            </span>
            <span>
              คะแนนเต็ม 100 • มีนประเทศ: {stats.benchmark.toFixed(2)} คะแนน
            </span>
          </div>

          {leaderboardData.length === 0 ? (
            <div className="py-20 text-center bg-slate-900/40 rounded-3xl border border-slate-800 p-8 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl mx-auto">
                🔍
              </div>
              <h3 className="text-base font-black text-white">ไม่พบรายชื่อนักเรียนตามตัวกรองนี้</h3>
              <p className="text-xs text-slate-400">กรุณาเลือกห้องเรียนอื่น หรือตรวจสอบการตั้งค่าปีการศึกษา</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {leaderboardData.map((s, idx) => {
                const rankNumber = idx + 1;
                const isChampion = rankNumber === 1 && s.score100 > 0;
                const isSubmitted = s.status === 'completed';
                const isLive = s.status === 'in_progress';

                return (
                  <div
                    key={s.id}
                    className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                      isChampion
                        ? 'bg-gradient-to-br from-amber-950/30 to-slate-900/90 border-amber-400/60 shadow-lg shadow-amber-500/10'
                        : isSubmitted
                        ? 'bg-slate-900/90 border-emerald-500/40 shadow-sm'
                        : isLive
                        ? 'bg-slate-900/80 border-cyan-500/40 shadow-sm'
                        : 'bg-slate-900/40 border-slate-800/80 opacity-75'
                    }`}
                  >
                    {/* Top Row: Rank, Student Info, Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Rank Badge */}
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                            rankNumber === 1 && s.score100 > 0
                              ? 'bg-amber-400 text-slate-950 shadow-md'
                              : rankNumber === 2 && s.score100 > 0
                              ? 'bg-slate-300 text-slate-950'
                              : rankNumber === 3 && s.score100 > 0
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {rankNumber}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-white truncate leading-tight">
                            {s.studentName}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                            <span>รหัส {s.studentCode}</span>
                            <span>•</span>
                            <span className="text-indigo-400 font-bold">{s.classroom}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Tag */}
                      <div className="shrink-0 text-right">
                        {isSubmitted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
                            <CheckCircle2 className="w-3 h-3" /> ส่งแล้ว
                          </span>
                        ) : isLive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-black animate-pulse">
                            <Zap className="w-3 h-3" /> กำลังลุย
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 text-[10px] font-bold">
                            ยังไม่เริ่ม
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Big Score & Percentage */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-end justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                          คะแนนที่ได้ (Score)
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className={`text-2xl font-black font-mono leading-none ${
                              isSubmitted
                                ? 'text-emerald-400'
                                : isLive
                                ? 'text-cyan-400'
                                : 'text-slate-600'
                            }`}
                          >
                            {s.score100.toFixed(1)}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">/ 100</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                          ความแม่นยำ (%)
                        </span>
                        <span
                          className={`text-lg font-black font-mono leading-none ${
                            s.scorePercent >= 50
                              ? 'text-emerald-400'
                              : s.scorePercent >= 30
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {s.scorePercent}%
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Animated Progress Bar */}
                    <div className="mt-2.5 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>
                          ทำแล้ว <strong className="text-white">{s.answeredCount}</strong>/{s.totalQuestions} ข้อ
                        </span>
                        <span>{s.progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isSubmitted
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : isLive
                              ? 'bg-gradient-to-r from-cyan-400 to-indigo-500'
                              : 'bg-slate-700'
                          }`}
                          style={{ width: `${s.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Optional Highlight if above national mean */}
                    {s.isAboveNationalMean && (
                      <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-emerald-300">
                        <span className="flex items-center gap-1 font-bold">
                          <Flame className="w-3 h-3 text-emerald-400" /> เหนือมีนประเทศ (≥ {stats.benchmark.toFixed(1)})
                        </span>
                        <span className="font-mono text-emerald-400 font-black">+{ (s.score100 - stats.benchmark).toFixed(1) }</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="py-3 px-6 bg-slate-950 border-t border-slate-900 text-center text-xs text-slate-600 shrink-0">
        Vocabs Journey • O-NET Exam Live Arena • ออกแบบสำหรับการต่อออกจอโทรทัศน์ / โปรเจกเตอร์ห้องเรียน
      </footer>
    </div>
  );
}

export default function OnetTvScoreboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center font-sans">
          <div className="space-y-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
            <h2 className="text-lg font-black">กำลังโหลดสนามประลองสด O-NET...</h2>
          </div>
        </div>
      }
    >
      <OnetTvScoreboardInner />
    </Suspense>
  );
}
