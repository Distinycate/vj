'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Filter,
  Layers,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react';
import { NATIONAL_BENCHMARKS } from '@/data/onet/onetData';

interface StudentItem {
  id: string;
  studentId: string;
  name: string;
  classroom: string;
  gradeLevel?: string;
  roomNumber?: string;
  isSkull?: boolean;
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
}

export default function OnetAnalyticsManager() {
  const [selectedYear, setSelectedYear] = useState<number>(2568);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classrooms, setClassrooms] = useState<string[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, SubmissionItem>>({});
  const [benchmarks, setBenchmarks] = useState(NATIONAL_BENCHMARKS);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/challenge/onet`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/onet');
      const data = await res.json();
      if (res.ok && data.success) {
        setStudents(data.students || []);
        setClassrooms(data.classrooms || []);
        setSubmissions(data.submissions || {});
        if (data.benchmarks) setBenchmarks(data.benchmarks);

        // Default select all students initially
        const initialSelected = new Set<string>();
        (data.students || []).forEach((s: StudentItem) => initialSelected.add(s.id));
        setSelectedStudentIds(initialSelected);
      }
    } catch (e) {
      console.warn('Failed to fetch O-NET admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter students based on classroom and search
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchRoom = selectedClassroom === 'ALL' || s.classroom === selectedClassroom;
      const matchSearch =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentId.includes(searchQuery);
      return matchRoom && matchSearch;
    });
  }, [students, selectedClassroom, searchQuery]);

  // Handle classroom change: select all students in that room by default
  const handleClassroomChange = (room: string) => {
    setSelectedClassroom(room);
    const inRoom = students.filter((s) => room === 'ALL' || s.classroom === room);
    const newSelected = new Set<string>();
    inRoom.forEach((s) => newSelected.add(s.id));
    setSelectedStudentIds(newSelected);
  };

  // Toggle selection
  const toggleStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  const selectAllFiltered = () => {
    const next = new Set(selectedStudentIds);
    filteredStudents.forEach((s) => next.add(s.id));
    setSelectedStudentIds(next);
  };

  const deselectAllFiltered = () => {
    const next = new Set(selectedStudentIds);
    filteredStudents.forEach((s) => next.delete(s.id));
    setSelectedStudentIds(next);
  };

  const selectOnlySubmitted = () => {
    const next = new Set<string>();
    filteredStudents.forEach((s) => {
      const sub = submissions[`${s.id}_${selectedYear}`];
      if (sub) next.add(s.id);
    });
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

    return {
      totalSelected,
      submittedCount,
      mean,
      max,
      min,
      sd,
      passRate,
      passedCount,
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
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'คัดลอกลิงก์เรียบร้อยแล้ว! (พร้อมส่ง)' : '📋 คัดลอกลิงก์ส่งให้นักเรียน'}</span>
            </button>

            <a
              href="/challenge/onet"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-cyan-400"
            >
              <ExternalLink className="w-4 h-4" />
              <span>👁️ ดูหน้าจอข้อสอบของนักเรียน ↗</span>
            </a>
          </div>
        </div>
      </div>

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

          {/* Year Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">ชุดข้อสอบ:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-slate-950 border border-indigo-500/40 rounded-xl px-3.5 py-2 text-xs font-black text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              {[2568, 2567, 2566, 2565, 2564, 2563, 2562, 2561, 2560, 2559].map((y) => (
                <option key={y} value={y}>
                  ปีการศึกษา {y} (เต็ม 100 คะแนน)
                </option>
              ))}
            </select>

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Classroom Pills & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> เลือกห้อง:
            </span>
            <button
              onClick={() => handleClassroomChange('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedClassroom === 'ALL'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              ทุกห้องเรียน ({students.length})
            </button>
            {classrooms.map((room) => {
              const countInRoom = students.filter((s) => s.classroom === room).length;
              return (
                <button
                  key={room}
                  onClick={() => handleClassroomChange(room)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedClassroom === room
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  {room} ({countInRoom})
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-56">
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

        {/* RIGHT: Quick Metric Summary Pills (5 cols) */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-3">
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
        </div>
      </div>

      {/* ── Student Selection Table ─────────────────────────────────── */}
      <div className="glass-card rounded-3xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" /> รายชื่อนักเรียนและตัวเลือกคำนวณ (Custom Cohort)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              ติ๊กถูกที่หน้ารายชื่อเพื่อเลือก/ไม่เลือกนักเรียนคนใดมารวมคำนวณค่าเฉลี่ย
            </p>
          </div>

          {/* Quick Selection Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={selectAllFiltered}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors"
            >
              ✓ เลือกทั้งหมด ({filteredStudents.length})
            </button>
            <button
              onClick={selectOnlySubmitted}
              className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 font-bold transition-colors"
            >
              ⭐ เฉพาะที่ส่งแล้ว
            </button>
            <button
              onClick={deselectAllFiltered}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold transition-colors"
            >
              ✕ ล้างการเลือก
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 w-12 text-center">เลือก</th>
                <th className="py-3 px-3">เลขประจำตัว</th>
                <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                <th className="py-3 px-3">ห้อง</th>
                <th className="py-3 px-3 text-center">สถานะ</th>
                <th className="py-3 px-3 text-right">ข้อที่ถูก</th>
                <th className="py-3 px-4 text-right">คะแนนเต็ม 100</th>
                <th className="py-3 px-3 text-center">ผลประเมิน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    ไม่พบข้อมูลนักเรียนที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => {
                  const isChecked = selectedStudentIds.has(s.id);
                  const sub = submissions[`${s.id}_${selectedYear}`];

                  return (
                    <tr
                      key={s.id}
                      onClick={() => toggleStudent(s.id)}
                      className={`cursor-pointer transition-colors ${
                        isChecked ? 'bg-indigo-950/20 hover:bg-indigo-950/30' : 'hover:bg-slate-800/40 opacity-60'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleStudent(s.id)}
                          className="w-4 h-4 rounded text-cyan-500 bg-slate-950 border-slate-700 focus:ring-cyan-400 focus:ring-offset-slate-900 cursor-pointer"
                        />
                      </td>

                      {/* Student ID */}
                      <td className="py-3 px-3 font-mono text-slate-400">
                        {s.studentId}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-1.5">
                        <span>{s.name}</span>
                        {s.isSkull && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            💀 พิเศษ
                          </span>
                        )}
                      </td>

                      {/* Classroom */}
                      <td className="py-3 px-3 text-slate-400 font-mono">
                        {s.classroom}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        {sub ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> ส่งแล้ว
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-500">
                            ยังไม่ส่ง
                          </span>
                        )}
                      </td>

                      {/* Raw Score */}
                      <td className="py-3 px-3 text-right font-mono text-slate-300">
                        {sub ? `${sub.correctCount}/${sub.totalQuestions}` : '-'}
                      </td>

                      {/* Score out of 100 */}
                      <td className="py-3 px-4 text-right font-mono font-black text-sm">
                        {sub ? (
                          <span className={sub.score100 >= 50 ? 'text-cyan-400' : 'text-rose-400'}>
                            {sub.score100}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Result */}
                      <td className="py-3 px-3 text-center">
                        {sub ? (
                          sub.score100 >= 50 ? (
                            <span className="text-emerald-400 font-bold inline-flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> ผ่าน
                            </span>
                          ) : (
                            <span className="text-rose-400 font-bold inline-flex items-center gap-1 text-[11px]">
                              <XCircle className="w-3.5 h-3.5" /> ไม่ผ่าน
                            </span>
                          )
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
      </div>
    </div>
  );
}

