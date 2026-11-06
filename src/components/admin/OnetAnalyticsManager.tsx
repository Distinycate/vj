'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Flame,
  HelpCircle,
  History,
  Layers,
  Printer,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Tv,
  Users,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { NATIONAL_BENCHMARKS, getOnetYearConfig, OnetQuestion } from '@/data/onet/onetData';
import OnetYearAccessControl from './OnetYearAccessControl';

interface StudentItem {
  id: string;
  studentId: string;
  name: string;
  classroom: string;
  gradeLevel?: string;
  roomNumber?: string;
  isSkull?: boolean;
}

interface AttemptItem {
  attemptNumber: number;
  score100: number;
  correctCount: number;
  totalQuestions: number;
  stars: number;
  isPassed: boolean;
  durationSeconds: number;
  completedAt: string;
}

interface SubmissionItem {
  studentId: string;
  year: number;
  score100: number;
  correctCount: number;
  totalQuestions: number;
  stars: number;
  isPassed: boolean;
  completedAt: string;
  attemptCount?: number;
  firstScore?: number;
  latestScore?: number;
  maxScore?: number;
  growthDelta?: number;
  isImproved?: boolean;
  attempts?: AttemptItem[];
  answers?: Record<string, any>;
  questionResults?: Record<string, any>;
}

export default function OnetAnalyticsManager() {
  const [selectedYear, setSelectedYear] = useState<number>(2568);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classrooms, setClassrooms] = useState<string[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, SubmissionItem>>({});
  const [liveProgress, setLiveProgress] = useState<Record<string, any>>({});
  const [benchmarks, setBenchmarks] = useState(NATIONAL_BENCHMARKS);
  const [copiedLink, setCopiedLink] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [classroomTab, setClassroomTab] = useState<Record<string, 'roster' | 'itemAnalysis'>>({});
  const [selectedQuestionModal, setSelectedQuestionModal] = useState<any | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<{
    student: StudentItem;
    sub: SubmissionItem;
  } | null>(null);

  // Accordion state: which classrooms are expanded to view individual students
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({
    'ม.3/1': true, // Default open the primary target class ม.3/1
  });

  const yearConfig = useMemo(() => getOnetYearConfig(selectedYear), [selectedYear]);
  const allQuestions = useMemo(() => yearConfig?.questions || [], [yearConfig]);

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/challenge/onet`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Fetch data
  const fetchData = async (isQuiet = false) => {
    if (!isQuiet) setLoading(true);
    try {
      const res = await fetch('/api/admin/onet');
      const data = await res.json();
      if (res.ok && data.success) {
        setStudents(data.students || []);
        setClassrooms(data.classrooms || []);
        setSubmissions(data.submissions || {});
        if (data.liveProgress) setLiveProgress(data.liveProgress);
        if (data.benchmarks) setBenchmarks(data.benchmarks);

        // Default select all students initially if not selected yet
        if (!isQuiet && selectedStudentIds.size === 0) {
          const initialSelected = new Set<string>();
          (data.students || []).forEach((s: StudentItem) => initialSelected.add(s.id));
          setSelectedStudentIds(initialSelected);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch O-NET admin data:', e);
    } finally {
      if (!isQuiet) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time polling every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedYear]);

  // Classrooms list
  const classroomsList = useMemo(() => {
    if (classrooms.length > 0) return classrooms;
    const set = new Set<string>();
    students.forEach((s) => set.add(s.classroom));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th', { numeric: true }));
  }, [classrooms, students]);

  // Group students and calculate room-level stats + item analysis
  const classroomData = useMemo(() => {
    const yearLive = liveProgress[String(selectedYear)] || {};

    return classroomsList.map((room) => {
      const roomStudents = students.filter((s) => s.classroom === room);
      const scoredStudents = roomStudents.filter((s) => submissions[`${s.id}_${selectedYear}`]);
      const scores = scoredStudents.map((s) => submissions[`${s.id}_${selectedYear}`].score100);
      const mean =
        scores.length > 0
          ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
          : 0;
      const passedCount = scores.filter((score) => score >= 50).length;
      const passRate =
        scores.length > 0 ? Number(((passedCount / scores.length) * 100).toFixed(1)) : 0;

      const selectedInRoomCount = roomStudents.filter((s) => selectedStudentIds.has(s.id)).length;
      const allSelected = roomStudents.length > 0 && selectedInRoomCount === roomStudents.length;
      const someSelected = selectedInRoomCount > 0 && !allSelected;

      // Merge submission and live in-progress state for each student
      const studentsWithLive = roomStudents.map((s) => {
        const sub = submissions[`${s.id}_${selectedYear}`];
        const live = yearLive[s.id];
        const isLive = live && live.status === 'in_progress' && !sub;
        const questionResults = sub?.questionResults || live?.questionResults || {};
        const answers = sub?.answers || live?.answers || {};
        const status: 'submitted' | 'in_progress' | 'idle' = sub
          ? 'submitted'
          : isLive
          ? 'in_progress'
          : 'idle';

        const displayScore = sub
          ? sub.score100
          : live
          ? Number(((live.correctCount / (live.totalQuestions || 32)) * 100).toFixed(1))
          : null;

        const answeredCount = sub ? sub.totalQuestions : live?.answeredCount || 0;
        const correctCount = sub ? sub.correctCount : live?.correctCount || 0;

        return {
          ...s,
          status,
          score: displayScore,
          answeredCount,
          correctCount,
          sub,
          live,
          answers,
          questionResults,
        };
      });

      // Filtered students in this room if user searched
      const displayedStudents = studentsWithLive.filter((s) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return s.name.toLowerCase().includes(query) || s.studentId.includes(query);
      });

      // Item analysis across all questions for this classroom
      const itemAnalysis = allQuestions.map((q) => {
        const qNum = q.number;
        const qKey = String(qNum);
        let correctCount = 0;
        let wrongCount = 0;
        let unansweredCount = 0;
        const answerDist: Record<string, number> = {};

        studentsWithLive.forEach((st) => {
          const qRes = st.questionResults?.[qKey];
          const rawAns = st.answers?.[qKey];
          if (rawAns) {
            const ansStr = String(rawAns).toUpperCase();
            answerDist[ansStr] = (answerDist[ansStr] || 0) + 1;
          }

          if (qRes && (qRes.answered || qRes.studentAnswer !== null || qRes.isCorrect !== undefined)) {
            if (qRes.isCorrect) correctCount++;
            else wrongCount++;
          } else {
            unansweredCount++;
          }
        });

        const attemptedCount = correctCount + wrongCount;
        const accuracyRate = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
        const wrongRate = attemptedCount > 0 ? Math.round((wrongCount / attemptedCount) * 100) : 0;

        return {
          question: q,
          number: qNum,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || null,
          points: q.points,
          correctCount,
          wrongCount,
          unansweredCount,
          attemptedCount,
          accuracyRate,
          wrongRate,
          answerDist,
        };
      });

      const attemptedItems = itemAnalysis.filter((item) => item.attemptedCount > 0);
      const mostMissed = [...attemptedItems]
        .sort((a, b) => b.wrongRate - a.wrongRate || b.wrongCount - a.wrongCount)
        .slice(0, 5);

      const mostCorrect = [...attemptedItems]
        .sort((a, b) => b.accuracyRate - a.accuracyRate || b.correctCount - a.correctCount)
        .slice(0, 5);

      const liveTestingCount = studentsWithLive.filter((s) => s.status === 'in_progress').length;

      return {
        room,
        roomStudents,
        studentsWithLive,
        displayedStudents,
        totalCount: roomStudents.length,
        submittedCount: scoredStudents.length,
        liveTestingCount,
        mean,
        passRate,
        selectedInRoomCount,
        allSelected,
        someSelected,
        itemAnalysis,
        mostMissed,
        mostCorrect,
      };
    });
  }, [
    classroomsList,
    students,
    submissions,
    liveProgress,
    selectedYear,
    selectedStudentIds,
    searchQuery,
    allQuestions,
  ]);

  // Expand / Collapse controls
  const toggleExpandRoom = (room: string) => {
    setExpandedRooms((prev) => ({
      ...prev,
      [room]: !prev[room],
    }));
  };

  const expandAllRooms = () => {
    const all: Record<string, boolean> = {};
    classroomsList.forEach((r) => (all[r] = true));
    setExpandedRooms(all);
  };

  const collapseAllRooms = () => {
    setExpandedRooms({});
  };

  // Auto-expand rooms on search
  useEffect(() => {
    if (searchQuery.trim()) {
      const matches: Record<string, boolean> = {};
      classroomsList.forEach((room) => {
        const hasMatch = students.some(
          (s) =>
            s.classroom === room &&
            (s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              s.studentId.includes(searchQuery))
        );
        if (hasMatch) matches[room] = true;
      });
      setExpandedRooms((prev) => ({ ...prev, ...matches }));
    }
  }, [searchQuery, classroomsList, students]);

  // Classroom selection helpers
  const toggleClassroomSelection = (room: string) => {
    const targetRoom = classroomData.find((c) => c.room === room);
    if (!targetRoom) return;
    const next = new Set(selectedStudentIds);
    if (targetRoom.allSelected) {
      targetRoom.roomStudents.forEach((s) => next.delete(s.id));
    } else {
      targetRoom.roomStudents.forEach((s) => next.add(s.id));
    }
    setSelectedStudentIds(next);
  };

  const selectRoomOnlySubmitted = (room: string) => {
    const targetRoom = classroomData.find((c) => c.room === room);
    if (!targetRoom) return;
    const next = new Set(selectedStudentIds);
    targetRoom.roomStudents.forEach((s) => {
      if (submissions[`${s.id}_${selectedYear}`]) next.add(s.id);
      else next.delete(s.id);
    });
    setSelectedStudentIds(next);
  };

  const selectAllStudents = () => {
    const next = new Set<string>();
    students.forEach((s) => next.add(s.id));
    setSelectedStudentIds(next);
  };

  const deselectAllStudents = () => {
    setSelectedStudentIds(new Set());
  };

  const selectAllSubmittedStudents = () => {
    const next = new Set<string>();
    students.forEach((s) => {
      if (submissions[`${s.id}_${selectedYear}`]) next.add(s.id);
    });
    setSelectedStudentIds(next);
  };

  // Toggle individual student
  const toggleStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  // Calculations for selected cohort
  const cohortStats = useMemo(() => {
    const selectedList = students.filter((s) => selectedStudentIds.has(s.id));
    const scoredList: { student: StudentItem; sub: SubmissionItem }[] = [];

    selectedList.forEach((s) => {
      const sub = submissions[`${s.id}_${selectedYear}`];
      if (sub) {
        scoredList.push({ student: s, sub });
      }
    });

    const totalSelected = selectedList.length;
    const submittedCount = scoredList.length;

    if (submittedCount === 0) {
      return {
        totalSelected,
        submittedCount,
        mean: 0,
        max: 0,
        min: 0,
        sd: 0,
        passRate: 0,
        passedCount: 0,
        avgGrowth: 0,
        improvedCount: 0,
        multiAttemptCount: 0,
      };
    }

    const scores = scoredList.map((item) => item.sub.score100);
    const sum = scores.reduce((a, b) => a + b, 0);
    const mean = Number((sum / submittedCount).toFixed(2));
    const max = Math.max(...scores);
    const min = Math.min(...scores);

    // Standard deviation
    const variance = scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / submittedCount;
    const sd = Number(Math.sqrt(variance).toFixed(2));

    const passedCount = scores.filter((s) => s >= 50).length;
    const passRate = Number(((passedCount / submittedCount) * 100).toFixed(1));

    // Multi-attempt growth calculations
    const multiAttemptItems = scoredList.filter((item) => (item.sub.attemptCount ?? 1) >= 2);
    const totalGrowth = multiAttemptItems.reduce((acc, item) => acc + (item.sub.growthDelta ?? 0), 0);
    const avgGrowth =
      multiAttemptItems.length > 0
        ? Number((totalGrowth / multiAttemptItems.length).toFixed(1))
        : 0;
    const improvedCount = multiAttemptItems.filter((item) => (item.sub.growthDelta ?? 0) > 0).length;

    return {
      totalSelected,
      submittedCount,
      mean,
      max,
      min,
      sd,
      passRate,
      passedCount,
      avgGrowth,
      improvedCount,
      multiAttemptCount: multiAttemptItems.length,
    };
  }, [students, selectedStudentIds, submissions, selectedYear]);

  // National Benchmark for selected year
  const nationalData = benchmarks[selectedYear] || {
    nationalMean: 31.84,
    nationalSd: 15.65,
    nationalMax: 100.0,
    source: 'สทศ. (NIETS)',
  };

  const delta = Number((cohortStats.mean - nationalData.nationalMean).toFixed(2));
  const isHigherThanNational = delta >= 0;
  const percentDelta = nationalData.nationalMean > 0
    ? Number(((delta / nationalData.nationalMean) * 100).toFixed(1))
    : 0;

  return (
    <div className="space-y-6">
      {/* ── Teacher Guide & Live Status Box ──────────────────────────── */}
      <div className="rounded-3xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/80 via-slate-900/90 to-indigo-950/80 p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                สถานะระบบ: เปิดให้นักเรียนทุกคนเข้าสอบได้ทันที (Online 24 ชม.)
              </span>
              <span className="text-xs font-bold text-amber-300">
                🎁 รางวัล: สอบได้ &ge; 50% รับทันที 5 ตั๋วสุ่มการ์ดฟรี! 🎟️
              </span>
            </div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              🎯 วิธีเปิดให้นักเรียนเข้าทำข้อสอบ O-NET (ครูไม่ต้องกดเปิดระบบเพิ่ม)
            </h3>
            <div className="text-xs text-slate-300 space-y-1 leading-relaxed bg-slate-950/50 p-3 rounded-2xl border border-slate-800/80">
              <p>
                <strong>วิธีที่ 1 (แนะนำ)</strong>: ให้นักเรียนล็อกอินเข้าเว็บ จะเห็นกล่องสีฟ้า <em>"🎯 O-NET English Challenge"</em> บนหน้าแรกทันที
              </p>
              <p>
                <strong>วิธีที่ 2 (ส่งลิงก์ตรง)</strong>: คลิกปุ่ม <span className="text-cyan-300 font-bold">"📋 คัดลอกลิงก์ส่งให้นักเรียน"</span> ด้านขวา แล้ววางใน LINE กลุ่ม หรือมอบหมายใน Google Classroom ได้เลย
              </p>
              <p>
                <strong>การตรวจและประเมินผล</strong>: เมื่อเด็กกดส่งข้อสอบ คะแนนจะตรวจอัตโนมัติและวิ่งมาอัปเดตบนตารางด้านล่างนี้ทันที ครูสามารถติ๊กเลือกนักเรียนเพื่อดูค่าเฉลี่ยเทียบระดับประเทศได้ตลอดเวลา
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <a
              href={`/admin/onet/tv?year=${selectedYear}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25 transition-all cursor-pointer hover:scale-105 active:scale-95 animate-pulse"
              title="เปิดหน้าต่างถ่ายทอดสดต่อขึ้นจอทีวี/โปรเจกเตอร์ในห้องเรียน (ไม่มีเฉลย)"
            >
              <Tv className="w-4 h-4" />
              <span>📺 เปิดจอ Live TV ต่อขึ้นทีวีห้องเรียน (ไม่มีเฉลย) ↗</span>
            </a>

            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'คัดลอกลิงก์เรียบร้อยแล้ว! (พร้อมส่ง)' : '📋 คัดลอกลิงก์ส่งให้นักเรียน'}</span>
            </button>

            <a
              href="/challenge/onet"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-cyan-400"
            >
              <ExternalLink className="w-4 h-4" />
              <span>👁️ ดูหน้าจอข้อสอบของนักเรียน ↗</span>
            </a>
          </div>
        </div>
      </div>

      {/* ── Year & Classroom Access Control ───────────────────────── */}
      <OnetYearAccessControl
        selectedYear={selectedYear}
        onSelectYear={setSelectedYear}
        onUpdated={fetchData}
        classrooms={classrooms}
      />

      {/* ── Control Bar ─────────────────────────────────────────────── */}
      <div className="glass-card p-5 rounded-3xl border border-slate-800 bg-slate-900/70 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="text-base font-black text-white">
                ระบบวัดและประเมินผล O-NET รายห้อง & เปรียบเทียบระดับประเทศ
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              คะแนนเต็ม 100 ทุกปี • คุณครูสามารถเลือกคะแนนของนักเรียนคนใดก็ได้มารวมกันคำนวณค่าเฉลี่ยได้แบบยืดหยุ่น
            </p>
          </div>

          {/* Active Year Badge, Realtime Toggle & Refresh */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400">ชุดข้อสอบ:</span>
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-indigo-500/40 text-xs font-black text-cyan-300">
              ปีการศึกษา {selectedYear}
            </div>

            {/* Realtime Auto-refresh Toggle */}
            <button
              type="button"
              onClick={() => setAutoRefresh((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                autoRefresh
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title={autoRefresh ? 'กำลังอัปเดตข้อมูลสดทุก 5 วินาที' : 'คลิกเพื่อเปิดการอัปเดตสดอัตโนมัติ'}
            >
              <Radio
                className={`w-3.5 h-3.5 ${
                  autoRefresh ? 'text-emerald-400 animate-pulse' : 'text-slate-500'
                }`}
              />
              <span>{autoRefresh ? '🔴 Real-time สด (5วิ)' : '⚪ Real-time ปิด'}</span>
            </button>

            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="รีเฟรชข้อมูลทันที"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Room Overview & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">
              🏫 ห้องเรียนปัจจุบัน (Active):{' '}
              <strong className="text-cyan-300">
                {classroomsList.length > 0 ? classroomsList.join(', ') : 'กำลังโหลด...'}
              </strong>{' '}
              ({students.length} คน)
            </span>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ หรือ รหัสนักเรียน..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* ── National Comparison & Live Metrics ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT: Comparison Highlight Card (7 cols) */}
        <div className="lg:col-span-7 rounded-3xl p-6 bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              📊 การเปรียบเทียบระดับประเทศ (สทศ.)
            </span>
            <span className="text-xs text-slate-400">
              ปีการศึกษา {selectedYear}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 my-4">
            {/* Cohort Mean */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-cyan-400 font-bold block mb-1">
                ⭐ คะแนนเฉลี่ยกลุ่มที่ครูเลือก ({cohortStats.submittedCount} คน)
              </span>
              <div className="flex items-baseline gap-2">
                <strong className="text-3xl sm:text-4xl font-black text-white font-mono">
                  {cohortStats.mean}
                </strong>
                <span className="text-xs text-slate-500">/ 100</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                S.D. = {cohortStats.sd} • ผ่านเกณฑ์ {cohortStats.passRate}%
              </span>
            </div>

            {/* National Mean */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-amber-400 font-bold block mb-1">
                🏛️ ค่าเฉลี่ยระดับประเทศ (สทศ.)
              </span>
              <div className="flex items-baseline gap-2">
                <strong className="text-3xl sm:text-4xl font-black text-amber-300 font-mono">
                  {nationalData.nationalMean}
                </strong>
                <span className="text-xs text-slate-500">/ 100</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                S.D. = {nationalData.nationalSd} • {nationalData.academicYearLabel || 'ข้อมูลทางการ'} {nationalData.examineesCount ? `(${nationalData.examineesCount})` : ''}
              </span>
            </div>
          </div>

          {/* Delta Banner */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
              isHigherThanNational
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{isHigherThanNational ? '📈' : '📉'}</span>
              <div>
                <strong className="font-black text-sm">
                  {isHigherThanNational
                    ? `สูงกว่าค่าเฉลี่ยระดับประเทศ +${delta} คะแนน`
                    : `ต่ำกว่าค่าเฉลี่ยระดับประเทศ ${delta} คะแนน`}
                </strong>
                <span className="block text-[11px] opacity-80">
                  {isHigherThanNational ? `(+${percentDelta}%)` : `(${percentDelta}%)`} เมื่อเทียบกับค่าเฉลี่ยนักเรียนทั่วประเทศ
                </span>
              </div>
            </div>

            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
              {cohortStats.submittedCount > 0 ? 'คำนวณสด' : 'รอข้อมูลส่งสอบ'}
            </span>
          </div>

          {/* Progress Bar Visualization */}
          <div className="mt-5 space-y-2">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>กลุ่มนักเรียนที่เลือก</span>
                <span className="font-bold text-cyan-400">{cohortStats.mean}%</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, cohortStats.mean)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>ค่าเฉลี่ยระดับประเทศ (สทศ.)</span>
                <span className="font-bold text-amber-400">{nationalData.nationalMean}%</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, nationalData.nationalMean)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Quick Metric Summary Pills (6 cols responsive) */}
        <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-bold">นักเรียนที่เลือก</span>
            <div>
              <strong className="text-2xl sm:text-3xl font-black text-white font-mono">
                {selectedStudentIds.size}
              </strong>
              <span className="text-xs text-slate-500 ml-1">/ {students.length} คน</span>
            </div>
            <span className="text-[10px] text-cyan-400">
              (ส่งสอบแล้ว {cohortStats.submittedCount} คน)
            </span>
          </div>

          <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-bold">คะแนนสูงสุด (Max)</span>
            <div>
              <strong className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                {cohortStats.max}
              </strong>
              <span className="text-xs text-slate-500 ml-1">/ 100</span>
            </div>
            <span className="text-[10px] text-slate-500">คะแนนสูงสุดในกลุ่ม</span>
          </div>

          <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-bold">คะแนนต่ำสุด (Min)</span>
            <div>
              <strong className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">
                {cohortStats.min}
              </strong>
              <span className="text-xs text-slate-500 ml-1">/ 100</span>
            </div>
            <span className="text-[10px] text-slate-500">คะแนนต่ำสุดในกลุ่ม</span>
          </div>

          <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-bold">ผ่านเกณฑ์ (&gt;= 50%)</span>
            <div>
              <strong className="text-2xl sm:text-3xl font-black text-indigo-400 font-mono">
                {cohortStats.passRate}%
              </strong>
            </div>
            <span className="text-[10px] text-slate-500">
              {cohortStats.passedCount} จาก {cohortStats.submittedCount} คนที่ส่ง
            </span>
          </div>

          <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> พัฒนาการเฉลี่ย
            </span>
            <div>
              <strong
                className={`text-2xl sm:text-3xl font-black font-mono ${
                  cohortStats.avgGrowth >= 0 ? 'text-cyan-400' : 'text-rose-400'
                }`}
              >
                {cohortStats.multiAttemptCount > 0
                  ? cohortStats.avgGrowth >= 0
                    ? `+${cohortStats.avgGrowth}`
                    : cohortStats.avgGrowth
                  : '-'}
              </strong>
              {cohortStats.multiAttemptCount > 0 && (
                <span className="text-xs text-slate-500 ml-1">คะแนน</span>
              )}
            </div>
            <span className="text-[10px] text-slate-500">
              {cohortStats.multiAttemptCount > 0
                ? `ดีขึ้น ${cohortStats.improvedCount} จาก ${cohortStats.multiAttemptCount} คนที่สอบซ้ำ`
                : 'ยังไม่มีนักเรียนสอบซ้ำ'}
            </span>
          </div>

          <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-bold">ส่วนเบี่ยงเบน (S.D.)</span>
            <div>
              <strong className="text-2xl sm:text-3xl font-black text-slate-200 font-mono">
                {cohortStats.sd}
              </strong>
            </div>
            <span className="text-[10px] text-slate-500">การกระจายตัวของคะแนน</span>
          </div>
        </div>
      </div>

      {/* ── Classrooms Accordion List (แสดงห้องเรียนก่อน & คลี่ดูรายชื่อ) ────────────────────────── */}
      <div className="space-y-4">
        {/* Global Toolbar */}
        <div className="p-4 sm:p-5 rounded-3xl border border-slate-800 bg-slate-900/80 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-xl">
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" /> ห้องเรียนและตัวเลือกคำนวณคะแนน (Classroom Cohorts)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              คลิกติ๊กถูกที่หน้ารายชื่อห้องเพื่อรวมทั้งห้องในการคำนวณ หรือกดปุ่ม <strong className="text-cyan-300">"ดูรายชื่อ"</strong> เพื่อติ๊กเลือกนักเรียนรายคน
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={selectAllStudents}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              ✓ เลือกทุกห้อง ({students.length})
            </button>
            <button
              onClick={selectAllSubmittedStudents}
              className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-colors cursor-pointer"
            >
              ⭐ เฉพาะคนที่ส่งแล้ว ({cohortStats.submittedCount})
            </button>
            <button
              onClick={deselectAllStudents}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold transition-colors cursor-pointer"
            >
              ✕ ล้างการเลือก
            </button>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <button
              onClick={expandAllRooms}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 text-xs font-bold transition-colors cursor-pointer"
            >
              📂 เปิดทุกห้อง
            </button>
            <button
              onClick={collapseAllRooms}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 text-xs font-bold transition-colors cursor-pointer"
            >
              📁 ย่อทุกห้อง
            </button>
          </div>
        </div>

        {/* Classroom Cards */}
        {classroomData.length === 0 ? (
          <div className="p-8 rounded-3xl border border-slate-800 bg-slate-900/40 text-center text-slate-500 text-sm">
            ไม่พบห้องเรียนในภาคเรียนปัจจุบัน
          </div>
        ) : (
          classroomData.map((c) => {
            const isExpanded = Boolean(expandedRooms[c.room]);
            return (
              <div
                key={c.room}
                className="rounded-3xl border border-slate-800/90 bg-slate-900/80 overflow-hidden shadow-xl transition-all"
              >
                {/* Classroom Summary Header */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-950/60 hover:bg-slate-900/90 transition-colors">
                  <div className="flex items-center gap-3.5">
                    {/* Checkbox for entire room */}
                    <button
                      type="button"
                      onClick={() => toggleClassroomSelection(c.room)}
                      className="p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer group"
                      title={c.allSelected ? 'ยกเลิกการเลือกห้องนี้' : 'เลือกห้องนี้คำนวณคะแนน'}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                          c.allSelected
                            ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-black'
                            : c.someSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-black'
                            : 'border-slate-700 bg-slate-900 text-transparent group-hover:border-slate-500'
                        }`}
                      >
                        {c.allSelected ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : c.someSelected ? (
                          <span className="text-xs leading-none font-black">—</span>
                        ) : null}
                      </div>
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-black text-white flex items-center gap-1.5">
                          🏫 ห้อง {c.room}
                        </h4>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {c.totalCount} คน
                        </span>
                        {c.submittedCount > 0 ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            ส่งสอบแล้ว {c.submittedCount}/{c.totalCount} คน
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-500">
                            ยังไม่มีคนส่ง
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 mt-1">
                        {c.allSelected
                          ? `✅ เลือกทั้งห้องนี้ในการคำนวณ (${c.totalCount} คน)`
                          : c.someSelected
                          ? `⚡ เลือกบางส่วน: ${c.selectedInRoomCount}/${c.totalCount} คน`
                          : '⚪ ไม่ได้เลือกห้องนี้ในการคำนวณ'}
                      </p>
                    </div>
                  </div>

                  {/* Room Stats & Expand/Collapse Toggle */}
                  <div className="flex items-center justify-between md:justify-end gap-5 border-t md:border-t-0 border-slate-800/60 pt-3 md:pt-0">
                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-bold block">เฉลี่ยห้องนี้</span>
                        <strong className="text-sm font-black text-cyan-300 font-mono">
                          {c.submittedCount > 0 ? `${c.mean}` : '-'}
                          {c.submittedCount > 0 && <span className="text-[10px] text-slate-500">/100</span>}
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-bold block">ผ่านเกณฑ์ (&gt;=50%)</span>
                        <strong className="text-sm font-black text-indigo-300 font-mono">
                          {c.submittedCount > 0 ? `${c.passRate}%` : '-'}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpandRoom(c.room)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isExpanded
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      <span>{isExpanded ? '📁 ซ่อนรายชื่อ' : `👥 ดูรายชื่อ (${c.totalCount})`}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 p-4 sm:p-5 bg-slate-950/40 space-y-4 animate-in fade-in duration-150">
                    {/* View Switcher: Roster vs Item Analysis */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800">
                        <button
                          type="button"
                          onClick={() =>
                            setClassroomTab((prev) => ({ ...prev, [c.room]: 'roster' }))
                          }
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            (classroomTab[c.room] || 'roster') === 'roster'
                              ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>รายชื่อ & คะแนน ({c.displayedStudents.length} คน)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setClassroomTab((prev) => ({ ...prev, [c.room]: 'itemAnalysis' }))
                          }
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            classroomTab[c.room] === 'itemAnalysis'
                              ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 shadow-md font-black'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Target className="w-3.5 h-3.5" />
                          <span>🎯 ตรวจรายข้อ & วิเคราะห์จุดอ่อนห้องนี้ (Realtime)</span>
                          {c.liveTestingCount > 0 && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                          )}
                        </button>
                      </div>

                      {/* Mini Toolbar for Roster */}
                      {(classroomTab[c.room] || 'roster') === 'roster' && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              const next = new Set(selectedStudentIds);
                              c.roomStudents.forEach((s) => next.add(s.id));
                              setSelectedStudentIds(next);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer text-[11px]"
                          >
                            ✓ เลือกทุกคนในห้องนี้
                          </button>
                          <button
                            type="button"
                            onClick={() => selectRoomOnlySubmitted(c.room)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 font-bold transition-colors cursor-pointer text-[11px]"
                          >
                            ⭐ เฉพาะคนที่ส่งในห้องนี้
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = new Set(selectedStudentIds);
                              c.roomStudents.forEach((s) => next.delete(s.id));
                              setSelectedStudentIds(next);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold transition-colors cursor-pointer text-[11px]"
                          >
                            ✕ ปลดออกทั้งห้อง
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ── TAB 1: ROSTER VIEW ──────────────────────────── */}
                    {(classroomTab[c.room] || 'roster') === 'roster' && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800">
                            <tr>
                              <th className="py-2.5 px-3 w-10 text-center">เลือก</th>
                              <th className="py-2.5 px-3">เลขประจำตัว</th>
                              <th className="py-2.5 px-3">ชื่อ - นามสกุล</th>
                              <th className="py-2.5 px-3 text-center">สถานะสอบ</th>
                              <th className="py-2.5 px-3 text-center">ครั้งที่สอบ</th>
                              <th className="py-2.5 px-3 text-right">ครั้งแรก</th>
                              <th className="py-2.5 px-3 text-right">ล่าสุด</th>
                              <th className="py-2.5 px-3 text-center">พัฒนาการ</th>
                              <th className="py-2.5 px-3 text-right">สูงสุด</th>
                              <th className="py-2.5 px-3 text-center">ผลประเมิน</th>
                              <th className="py-2.5 px-3 text-center">ประวัติ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {c.displayedStudents.length === 0 ? (
                              <tr>
                                <td colSpan={11} className="py-6 text-center text-slate-500">
                                  ไม่พบรายชื่อที่ค้นหาในห้องนี้
                                </td>
                              </tr>
                            ) : (
                              c.displayedStudents.map((s) => {
                                const isChecked = selectedStudentIds.has(s.id);
                                const sub = s.sub;
                                const live = s.live;
                                const isLive = s.status === 'in_progress';
                                const attemptCount = sub?.attemptCount || (sub ? 1 : 0);
                                const growthDelta = sub?.growthDelta ?? 0;

                                return (
                                  <tr
                                    key={s.id}
                                    onClick={() => toggleStudent(s.id)}
                                    className={`cursor-pointer transition-colors ${
                                      isLive
                                        ? 'bg-emerald-950/20 hover:bg-emerald-950/30'
                                        : isChecked
                                        ? 'bg-indigo-950/20 hover:bg-indigo-950/30'
                                        : 'hover:bg-slate-800/40 opacity-60'
                                    }`}
                                  >
                                    {/* Checkbox */}
                                    <td
                                      className="py-2.5 px-3 text-center"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleStudent(s.id)}
                                        className="w-4 h-4 rounded text-cyan-500 bg-slate-950 border-slate-700 focus:ring-cyan-400 focus:ring-offset-slate-900 cursor-pointer"
                                      />
                                    </td>

                                    {/* Student ID */}
                                    <td className="py-2.5 px-3 font-mono text-slate-400">
                                      {s.studentId}
                                    </td>

                                    {/* Name */}
                                    <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                                      <span>{s.name}</span>
                                      {s.isSkull && (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                          💀 พิเศษ
                                        </span>
                                      )}
                                    </td>

                                    {/* Live Status Badge */}
                                    <td className="py-2.5 px-3 text-center">
                                      {isLive ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                          กำลังสอบ ({s.answeredCount}/32)
                                        </span>
                                      ) : sub ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                          🏁 ส่งแล้ว
                                        </span>
                                      ) : (
                                        <span className="text-slate-600 text-[10px]">ยังไม่เริ่ม</span>
                                      )}
                                    </td>

                                    {/* Attempt Count Badge */}
                                    <td className="py-2.5 px-3 text-center">
                                      {attemptCount > 0 ? (
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                                            attemptCount >= 2
                                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                                          }`}
                                        >
                                          {attemptCount} ครั้ง
                                        </span>
                                      ) : (
                                        <span className="text-slate-600 text-[10px]">-</span>
                                      )}
                                    </td>

                                    {/* First Score */}
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                                      {sub ? sub.firstScore ?? sub.score100 : '-'}
                                    </td>

                                    {/* Latest Score */}
                                    <td className="py-2.5 px-3 text-right font-mono font-black text-sm">
                                      {s.score !== null ? (
                                        <span
                                          className={
                                            s.score >= 50 ? 'text-cyan-400' : 'text-rose-400'
                                          }
                                        >
                                          {s.score}
                                          {isLive && (
                                            <span className="text-[10px] text-emerald-400 ml-1">
                                              (สด)
                                            </span>
                                          )}
                                        </span>
                                      ) : (
                                        <span className="text-slate-600">-</span>
                                      )}
                                    </td>

                                    {/* Growth Delta */}
                                    <td className="py-2.5 px-3 text-center font-mono font-bold text-xs">
                                      {attemptCount >= 2 ? (
                                        <span
                                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${
                                            growthDelta > 0
                                              ? 'text-emerald-400 bg-emerald-500/10'
                                              : growthDelta === 0
                                              ? 'text-slate-400 bg-slate-800'
                                              : 'text-rose-400 bg-rose-500/10'
                                          }`}
                                        >
                                          {growthDelta > 0
                                            ? `+${growthDelta} 📈`
                                            : growthDelta === 0
                                            ? '0.0'
                                            : `${growthDelta} 📉`}
                                        </span>
                                      ) : (
                                        <span className="text-slate-600 text-[10px]">-</span>
                                      )}
                                    </td>

                                    {/* Max Score */}
                                    <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">
                                      {sub ? sub.maxScore ?? sub.score100 : '-'}
                                    </td>

                                    {/* Result */}
                                    <td className="py-2.5 px-3 text-center">
                                      {sub ? (
                                        sub.score100 >= 50 ? (
                                          <span className="text-emerald-400 font-bold inline-flex items-center gap-1 text-[11px]">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> ผ่าน (5 ตั๋ว)
                                          </span>
                                        ) : (
                                          <span className="text-rose-400 font-bold inline-flex items-center gap-1 text-[11px]">
                                            <XCircle className="w-3.5 h-3.5" /> ต้องพัฒนา
                                          </span>
                                        )
                                      ) : isLive ? (
                                        <span className="text-emerald-400 text-[10px] font-bold">
                                          ทำข้อสอบอยู่
                                        </span>
                                      ) : (
                                        <span className="text-slate-600 text-[10px]">ยังไม่สอบ</span>
                                      )}
                                    </td>

                                    {/* History Inspection Button */}
                                    <td
                                      className="py-2.5 px-3 text-center"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {sub ? (
                                        <button
                                          type="button"
                                          onClick={() => setSelectedHistory({ student: s, sub })}
                                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                          title="ดูประวัติการสอบทุกครั้ง"
                                        >
                                          <History className="w-3 h-3" />
                                          <span>ดูประวัติ</span>
                                        </button>
                                      ) : (
                                        <span className="text-slate-600 text-[10px]">-</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* ── TAB 2: ITEM ANALYSIS & WEAKNESS BREAKDOWN ──── */}
                    {classroomTab[c.room] === 'itemAnalysis' && (
                      <div className="space-y-5 animate-in fade-in duration-150">
                        {/* Section 1: Most Missed vs Most Correct Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Left: Top Missed (จุดอ่อนที่ต้องติวด่วน) */}
                          <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-rose-300 flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-rose-400" />
                                🚨 ข้อที่เด็กในห้องนี้ผิดมากที่สุด (จุดอ่อนที่ต้องติวด่วน)
                              </span>
                              <span className="text-[10px] text-rose-400/80 font-bold">
                                เรียงตาม % ผิด
                              </span>
                            </div>

                            {c.mostMissed.length === 0 ? (
                              <p className="text-xs text-slate-500 py-3 text-center">
                                ยังไม่มีข้อมูลการตอบข้อสอบในห้องนี้
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {c.mostMissed.map((item, idx) => (
                                  <div
                                    key={item.number}
                                    onClick={() => setSelectedQuestionModal(item)}
                                    className="p-3 rounded-xl bg-slate-950/70 border border-rose-500/20 hover:border-rose-400 flex items-center justify-between transition-colors cursor-pointer group"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-black text-xs">
                                        #{idx + 1}
                                      </div>
                                      <div>
                                        <strong className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                                          ข้อที่ {item.number}
                                        </strong>
                                        <p className="text-[11px] text-slate-400">
                                          ตอบผิด {item.wrongCount}/{item.attemptedCount} คน • เฉลย{' '}
                                          <span className="text-cyan-300 font-bold">
                                            {Array.isArray(item.correctAnswer)
                                              ? item.correctAnswer.join(', ')
                                              : item.correctAnswer}
                                          </span>
                                        </p>
                                      </div>
                                    </div>

                                    <div className="text-right">
                                      <strong className="text-lg font-black text-rose-400 font-mono">
                                        {item.wrongRate}%
                                      </strong>
                                      <span className="text-[10px] text-rose-300/80 block">
                                        ผิด
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Right: Top Mastered (ข้อที่ตอบถูกมากที่สุด) */}
                          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                                <Trophy className="w-4 h-4 text-emerald-400" />
                                ⭐ ข้อที่เด็กในห้องนี้ตอบถูกมากที่สุด (จุดแข็ง)
                              </span>
                              <span className="text-[10px] text-emerald-400/80 font-bold">
                                เรียงตาม % ถูก
                              </span>
                            </div>

                            {c.mostCorrect.length === 0 ? (
                              <p className="text-xs text-slate-500 py-3 text-center">
                                ยังไม่มีข้อมูลการตอบข้อสอบในห้องนี้
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {c.mostCorrect.map((item, idx) => (
                                  <div
                                    key={item.number}
                                    onClick={() => setSelectedQuestionModal(item)}
                                    className="p-3 rounded-xl bg-slate-950/70 border border-emerald-500/20 hover:border-emerald-400 flex items-center justify-between transition-colors cursor-pointer group"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-xs">
                                        #{idx + 1}
                                      </div>
                                      <div>
                                        <strong className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                                          ข้อที่ {item.number}
                                        </strong>
                                        <p className="text-[11px] text-slate-400">
                                          ตอบถูก {item.correctCount}/{item.attemptedCount} คน • เฉลย{' '}
                                          <span className="text-emerald-300 font-bold">
                                            {Array.isArray(item.correctAnswer)
                                              ? item.correctAnswer.join(', ')
                                              : item.correctAnswer}
                                          </span>
                                        </p>
                                      </div>
                                    </div>

                                    <div className="text-right">
                                      <strong className="text-lg font-black text-emerald-400 font-mono">
                                        {item.accuracyRate}%
                                      </strong>
                                      <span className="text-[10px] text-emerald-300/80 block">
                                        ถูก
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Section 2: 32-Question Item Difficulty Heatmap Matrix */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <h5 className="text-xs font-black text-white flex items-center gap-1.5">
                                <BarChart3 className="w-4 h-4 text-cyan-400" />
                                แผนผังความยากง่ายรายข้อ (32 ข้อ) • ข้อสอบปี {selectedYear}
                              </h5>
                              <p className="text-[11px] text-slate-400">
                                สีบ่งบอกความเข้าใจ: 🟩 ถูกมากกว่า 70% | 🟨 ปานกลาง 40-70% | 🟥
                                ผิดเยอะ (&lt;40% ต้องติวซ้ำ) • คลิกที่ข้อเพื่อดูเฉลยละเอียด
                              </p>
                            </div>

                            <div className="flex items-center gap-3 text-[11px]">
                              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                                <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> ถูกดี
                              </span>
                              <span className="flex items-center gap-1 text-amber-400 font-bold">
                                <span className="w-2.5 h-2.5 rounded bg-amber-500" /> ปานกลาง
                              </span>
                              <span className="flex items-center gap-1 text-rose-400 font-bold">
                                <span className="w-2.5 h-2.5 rounded bg-rose-500" /> ผิดเยอะ
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-16 gap-2 pt-2">
                            {c.itemAnalysis.map((item) => {
                              const attempted = item.attemptedCount > 0;
                              const isGood = attempted && item.accuracyRate >= 70;
                              const isMid =
                                attempted && item.accuracyRate >= 40 && item.accuracyRate < 70;
                              const isHard = attempted && item.accuracyRate < 40;

                              return (
                                <button
                                  key={item.number}
                                  type="button"
                                  onClick={() => setSelectedQuestionModal(item)}
                                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1 ${
                                    !attempted
                                      ? 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700'
                                      : isGood
                                      ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 hover:border-emerald-400 hover:scale-105'
                                      : isMid
                                      ? 'bg-amber-950/50 border-amber-500/40 text-amber-300 hover:border-amber-400 hover:scale-105'
                                      : 'bg-rose-950/60 border-rose-500/50 text-rose-300 hover:border-rose-400 hover:scale-105 ring-1 ring-rose-500/30'
                                  }`}
                                  title={`ข้อที่ ${item.number}: ตอบถูก ${item.accuracyRate}% (${item.correctCount}/${item.attemptedCount} คน) คลิกดูโจทย์`}
                                >
                                  <span className="text-[10px] font-bold text-slate-400">
                                    ข้อ {item.number}
                                  </span>
                                  <strong className="text-xs font-black font-mono">
                                    {attempted ? `${item.accuracyRate}%` : '-'}
                                  </strong>
                                  <span className="text-[9px] font-bold px-1 rounded bg-slate-950/80 text-slate-400">
                                    เฉลย{' '}
                                    {Array.isArray(item.correctAnswer)
                                      ? item.correctAnswer[0]
                                      : item.correctAnswer}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Section 3: Live Student-by-Question Checking Matrix Table */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <h5 className="text-xs font-black text-white flex items-center gap-1.5">
                                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                                ตารางตรวจรายข้อรายบุคคล (Real-time Live Matrix)
                              </h5>
                              <p className="text-[11px] text-slate-400">
                                แสดงผลสด: 🟩 ถูก | 🟥 ผิด (แสดงตัวอักษรที่เด็กตอบ) | ⬜ ยังไม่ตอบ
                                • ครูเห็นคำตอบนักเรียนทันทีเมื่อเริ่มทำข้อสอบ
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                                ห้อง {c.room} ({c.studentsWithLive.length} คน)
                              </span>
                              <a
                                href={`/admin/onet/tv?year=${selectedYear}&classroom=${encodeURIComponent(c.room)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-bold text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1 rounded-lg border border-amber-500/40 flex items-center gap-1 transition-colors cursor-pointer"
                                title="เปิดจอทีวีสำหรับห้องนี้โดยเฉพาะ (ไม่มีเฉลย)"
                              >
                                <Tv className="w-3.5 h-3.5" />
                                <span>📺 ต่อทีวีห้องนี้ (ไม่มีเฉลย) ↗</span>
                              </a>
                            </div>
                          </div>

                          <div className="overflow-x-auto max-h-96 overflow-y-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800 sticky top-0 z-10">
                                <tr>
                                  <th className="py-2.5 px-3 min-w-[140px] sticky left-0 bg-slate-900 z-20">
                                    นักเรียน
                                  </th>
                                  <th className="py-2.5 px-2 text-center min-w-[80px]">สถานะ</th>
                                  <th className="py-2.5 px-2 text-center min-w-[60px]">คะแนน</th>
                                  {allQuestions.map((q) => (
                                    <th
                                      key={q.number}
                                      className="py-2.5 px-1.5 text-center min-w-[34px] font-mono text-[10px]"
                                      title={`ข้อ ${q.number} เฉลย ${q.correctAnswer}`}
                                    >
                                      Q{q.number}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60 font-mono">
                                {c.studentsWithLive.map((st) => {
                                  const isLive = st.status === 'in_progress';
                                  const isSubmitted = st.status === 'submitted';

                                  return (
                                    <tr
                                      key={st.id}
                                      className={`hover:bg-slate-900/50 transition-colors ${
                                        isLive ? 'bg-emerald-950/10' : ''
                                      }`}
                                    >
                                      {/* Student info sticky on left */}
                                      <td className="py-2 px-3 sticky left-0 bg-slate-950 font-sans z-10 border-r border-slate-800/60">
                                        <div className="flex flex-col">
                                          <strong className="text-white text-xs truncate max-w-[130px]">
                                            {st.name}
                                          </strong>
                                          <span className="text-[10px] text-slate-500 font-mono">
                                            {st.studentId}
                                          </span>
                                        </div>
                                      </td>

                                      {/* Status */}
                                      <td className="py-2 px-2 text-center font-sans">
                                        {isLive ? (
                                          <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 animate-pulse">
                                            กำลังสอบ ({st.answeredCount})
                                          </span>
                                        ) : isSubmitted ? (
                                          <span className="text-[10px] font-bold text-slate-400">
                                            ส่งแล้ว
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-slate-600">-</span>
                                        )}
                                      </td>

                                      {/* Score */}
                                      <td className="py-2 px-2 text-center font-bold">
                                        {st.score !== null ? (
                                          <span
                                            className={
                                              st.score >= 50 ? 'text-cyan-400' : 'text-rose-400'
                                            }
                                          >
                                            {st.score}
                                          </span>
                                        ) : (
                                          <span className="text-slate-600">-</span>
                                        )}
                                      </td>

                                      {/* Question Cells Q1..Q32 */}
                                      {allQuestions.map((q) => {
                                        const qKey = String(q.number);
                                        const qRes = st.questionResults?.[qKey];
                                        const rawAns = st.answers?.[qKey];
                                        const hasAnswer =
                                          rawAns !== undefined && rawAns !== null && rawAns !== '';

                                        if (!hasAnswer && !qRes) {
                                          return (
                                            <td
                                              key={q.number}
                                              className="py-1.5 px-1 text-center text-slate-700 text-[10px]"
                                            >
                                              -
                                            </td>
                                          );
                                        }

                                        const isCorrect = qRes?.isCorrect;
                                        const displayAns = Array.isArray(rawAns)
                                          ? rawAns[0] || '?'
                                          : String(rawAns || '').toUpperCase();

                                        return (
                                          <td
                                            key={q.number}
                                            className="py-1 px-0.5 text-center"
                                            title={`นักเรียนตอบ: ${rawAns || '-'} | เฉลย: ${
                                              q.correctAnswer
                                            }`}
                                          >
                                            <div
                                              className={`w-6 h-6 mx-auto rounded flex items-center justify-center font-black text-[10px] transition-transform hover:scale-125 cursor-pointer ${
                                                isCorrect
                                                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                                                  : 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                                              }`}
                                            >
                                              {isCorrect ? '✓' : displayAns || '✕'}
                                            </div>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Student Attempt History Modal (Teacher View Only) ────────── */}
      {selectedHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-black">
                  📜
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    ประวัติและพัฒนาการสอบ: {selectedHistory.student.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    เลขประจำตัว {selectedHistory.student.studentId} • ห้อง {selectedHistory.student.classroom} • ข้อสอบปี {selectedYear}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedHistory(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary Score Comparison */}
            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-center">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">สอบครั้งแรก</span>
                <strong className="text-lg font-black text-slate-200 font-mono">
                  {selectedHistory.sub.firstScore ?? selectedHistory.sub.score100}
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">สอบล่าสุด</span>
                <strong className="text-lg font-black text-cyan-400 font-mono">
                  {selectedHistory.sub.latestScore ?? selectedHistory.sub.score100}
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">พัฒนาการสุทธิ</span>
                <strong
                  className={`text-lg font-black font-mono ${
                    (selectedHistory.sub.growthDelta ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {(selectedHistory.sub.attemptCount ?? 1) >= 2
                    ? `${(selectedHistory.sub.growthDelta ?? 0) >= 0 ? '+' : ''}${selectedHistory.sub.growthDelta}`
                    : '-'}
                </strong>
              </div>
            </div>

            {/* Attempts List */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {(selectedHistory.sub.attempts || [selectedHistory.sub]).map((att, idx) => {
                const attemptNo = att.attemptNumber ?? idx + 1;
                const prevAttempt = selectedHistory.sub.attempts?.[idx - 1];
                const stepDelta = prevAttempt ? Number((att.score100 - prevAttempt.score100).toFixed(1)) : null;

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-black text-xs">
                          ครั้งที่ {attemptNo}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {new Date(att.completedAt).toLocaleString('th-TH', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        ตอบถูก {att.correctCount}/{att.totalQuestions} ข้อ • ใช้เวลา {Math.floor(att.durationSeconds / 60)} นาที
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-1">
                        <span
                          className={`text-xl font-black font-mono ${
                            att.score100 >= 50 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {att.score100}
                        </span>
                        <span className="text-[10px] text-slate-500">/ 100</span>
                      </div>
                      {stepDelta !== null && (
                        <span
                          className={`text-[10px] font-bold ${
                            stepDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {stepDelta >= 0 ? `+${stepDelta} 📈` : `${stepDelta} 📉`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedHistory(null)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Question Detail & Explanation Modal ────────────────────── */}
      {selectedQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-black">
                  🎯
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    รายละเอียดข้อสอบ: ข้อที่ {selectedQuestionModal.number} (ปี {selectedYear})
                  </h3>
                  <p className="text-xs text-slate-400">
                    คะแนนเต็ม {selectedQuestionModal.points || 2.5} คะแนน • ชนิดข้อสอบ:{' '}
                    {selectedQuestionModal.question?.type === 'single'
                      ? 'เลือกตอบ (4 ตัวเลือก)'
                      : 'เรียงลำดับ'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedQuestionModal(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Answer & Stats Row */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">
                  เฉลยที่ถูกต้อง
                </span>
                <strong className="text-lg font-black text-emerald-400 font-mono">
                  {Array.isArray(selectedQuestionModal.correctAnswer)
                    ? selectedQuestionModal.correctAnswer.join(', ')
                    : selectedQuestionModal.correctAnswer}
                </strong>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">
                  ตอบถูกในห้อง
                </span>
                <strong className="text-lg font-black text-cyan-400 font-mono">
                  {selectedQuestionModal.correctCount || 0} คน (
                  {selectedQuestionModal.accuracyRate || 0}%)
                </strong>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">
                  ตอบผิดในห้อง
                </span>
                <strong className="text-lg font-black text-rose-400 font-mono">
                  {selectedQuestionModal.wrongCount || 0} คน ({selectedQuestionModal.wrongRate || 0}
                  %)
                </strong>
              </div>
            </div>

            {/* Answer Choice Distribution */}
            {selectedQuestionModal.answerDist &&
              Object.keys(selectedQuestionModal.answerDist).length > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-300 block">
                    📊 สัดส่วนตัวเลือกที่นักเรียนในห้องนี้ตอบ:
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {['A', 'B', 'C', 'D'].map((opt) => {
                      const count = selectedQuestionModal.answerDist[opt] || 0;
                      const isCorrect =
                        String(selectedQuestionModal.correctAnswer).toUpperCase() === opt;
                      return (
                        <div
                          key={opt}
                          className={`p-2 rounded-xl border text-center ${
                            isCorrect
                              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          <strong className="text-sm font-black block font-mono">
                            {opt} {isCorrect && '✓'}
                          </strong>
                          <span className="text-[11px] font-bold">{count} คน</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Explanation / Notes */}
            <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-1.5">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1">
                💡 คำอธิบาย / แนวทางการเฉลย:
              </span>
              <p className="text-xs text-slate-200 leading-relaxed">
                {selectedQuestionModal.explanation ||
                  'สามารถดูรูปโจทย์ข้อนี้ได้จากไฟล์ข้อสอบ PDF ในห้องสอบ'}
              </p>
            </div>

            <div className="pt-1">
              <button
                onClick={() => setSelectedQuestionModal(null)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

