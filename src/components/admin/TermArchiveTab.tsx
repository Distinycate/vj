'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BookOpen, Download, Search, RefreshCw, FileSpreadsheet,
  Award, TrendingUp, Users, Target, CheckCircle2, ChevronRight,
  Filter, Calendar, Sparkles, BrainCircuit, AlertCircle, Clock
} from 'lucide-react';
import { 
  DESIRABLE_8_TRAITS, 
  READING_5_INDICATORS,
  calculateStudentTrait,
  calculateStudentReading,
  getStudentOverallTrait,
  getStudentOverallReading,
  getStudentRationale,
  formatGradeLevelText,
  EvaluatableStudent
} from '@/utils/pp5Evaluation';

interface TermArchiveTabProps {
  classrooms: any[];
}

export default function TermArchiveTab({ classrooms }: TermArchiveTabProps) {
  // Filters
  const [selectedTerm, setSelectedTerm] = useState<string>('2567-T1');
  const [selectedClassroom, setSelectedClassroom] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSubView, setActiveSubView] = useState<'academic' | 'traits' | 'reading'>('academic');

  // Data
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Selected student for quick inspect
  const [inspectStudent, setInspectStudent] = useState<any | null>(null);

  // Load students by term & classroom
  const loadTermStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      let url = `/api/admin/students?includeInactive=true`;
      if (selectedTerm && selectedTerm !== 'all') {
        url += `&academicYear=${encodeURIComponent(selectedTerm)}`;
      }
      if (selectedClassroom) {
        url += `&classroomId=${encodeURIComponent(selectedClassroom)}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('โหลดข้อมูลนักเรียนประจำภาคเรียนไม่สำเร็จ');
      const json = await res.json();
      if (json.success) {
        setStudents(json.students || []);
      } else {
        throw new Error(json.error || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      }
    } catch (err: any) {
      console.error('Failed to load term students:', err);
      setError(err.message || 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  }, [selectedTerm, selectedClassroom]);

  useEffect(() => {
    loadTermStudents();
  }, [loadTermStudents]);

  // Filtered students by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(s => {
      const name = (s.student_name || '').toLowerCase();
      const code = (s.student_id || '').toLowerCase();
      const username = (s.username || '').toLowerCase();
      return name.includes(q) || code.includes(q) || username.includes(q);
    });
  }, [students, searchQuery]);

  // Map students to evaluatable format for P.P.5
  const evaluatableList = useMemo(() => {
    return filteredStudents.map(s => {
      const lp = s.learning_paths || {};
      const an = s.analytics_summary || {};
      const evalObj: EvaluatableStudent = {
        id: s.id,
        student_id: s.student_id || s.username || '-',
        student_name: s.student_name || 'ไม่ระบุชื่อ',
        classroom_id: s.classroom_id,
        currentStage: lp.current_stage || 1,
        tickets: lp.free_pull_tickets || 0,
        coins: lp.coins || 0,
        pretestScore: an.pretest_score ?? 0,
        posttestScore: an.posttest_score ?? 0,
        accuracy: an.success_rate ?? 0,
        learningGain: an.learning_gain ?? an.normalized_gain ?? 0,
        ticketsAwarded: (lp.coins || 0) > 50 ? 2 : 1,
        coinsAwarded: lp.coins || 0,
        positiveActions: lp.current_stage >= 5 ? 1 : 0,
        disciplineActions: lp.current_stage >= 3 ? 1 : 0,
      };
      return {
        ...s,
        evalObj,
      };
    });
  }, [filteredStudents]);

  // Aggregate Metrics for KPI
  const metrics = useMemo(() => {
    const total = evaluatableList.length;
    if (total === 0) {
      return {
        total: 0,
        avgPre: 0,
        avgPost: 0,
        avgGain: 0,
        avgAcc: 0,
        traitsExcellentPct: 0,
        readingExcellentPct: 0,
      };
    }

    let preSum = 0;
    let postSum = 0;
    let gainSum = 0;
    let accSum = 0;
    let traitExcCount = 0;
    let readingExcCount = 0;

    evaluatableList.forEach(({ evalObj }) => {
      preSum += evalObj.pretestScore || 0;
      postSum += evalObj.posttestScore || 0;
      gainSum += evalObj.learningGain || 0;
      accSum += evalObj.accuracy || 0;

      const tOverall = getStudentOverallTrait(evalObj);
      if (tOverall === 3) traitExcCount++;

      const rOverall = getStudentOverallReading(evalObj);
      if (rOverall === 3) readingExcCount++;
    });

    return {
      total,
      avgPre: Number((preSum / total).toFixed(1)),
      avgPost: Number((postSum / total).toFixed(1)),
      avgGain: Number((gainSum / total).toFixed(1)),
      avgAcc: Number((accSum / total).toFixed(1)),
      traitsExcellentPct: Math.round((traitExcCount / total) * 100),
      readingExcellentPct: Math.round((readingExcCount / total) * 100),
    };
  }, [evaluatableList]);

  // Export Academic Report as CSV
  const handleExportAcademicCSV = () => {
    if (!evaluatableList.length) return alert('ไม่มีข้อมูลสำหรับส่งออก');
    
    const headers = [
      'ลำดับ',
      'รหัสประจำตัวนักเรียน',
      'เลขประจำตัวประชาชน/Username',
      'ชื่อ-สกุล',
      'ระดับชั้น/ห้อง',
      'ภาคเรียน',
      'สถานะ',
      'คะแนน Pre-test',
      'คะแนน Post-test',
      'Learning Gain (%)',
      'ความแม่นยำ Accuracy (%)',
      'ด่านสูงสุดที่เล่น',
      'จำนวนครั้งที่พยายาม (Attempts)'
    ];

    const rows = evaluatableList.map(({ evalObj, classrooms: c, academic_year, is_active, analytics_summary: an }, idx) => [
      idx + 1,
      evalObj.student_id,
      evalObj.id,
      evalObj.student_name,
      c?.class_name || 'ไม่ระบุ',
      academic_year || selectedTerm,
      is_active ? 'กำลังศึกษา (Active)' : 'คลังย้อนหลัง (Archived)',
      evalObj.pretestScore ?? 0,
      evalObj.posttestScore ?? 0,
      evalObj.learningGain ?? 0,
      evalObj.accuracy ? `${evalObj.accuracy}%` : '0%',
      evalObj.currentStage ?? 1,
      an?.attempt_count ?? 0
    ]);

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `VocabJourney_Academic_Report_${selectedTerm}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // Export P.P.5 Full Assessment as CSV
  const handleExportPP5CSV = () => {
    if (!evaluatableList.length) return alert('ไม่มีข้อมูลสำหรับส่งออก');

    const headers = [
      'ลำดับ',
      'รหัสนักเรียน',
      'ชื่อ-สกุล',
      'ระดับชั้น/ห้อง',
      'ภาคเรียน',
      ...DESIRABLE_8_TRAITS.map(t => `คุณลักษณะ_${t.short}`),
      'สรุปผลคุณลักษณะ (0-3)',
      'ระดับคุณลักษณะ',
      ...READING_5_INDICATORS.map(r => `อ่านคิด_${r.short}`),
      'สรุปผลการอ่านคิดวิเคราะห์ (0-3)',
      'ระดับการอ่านคิดวิเคราะห์',
      'เหตุผลและหลักฐานเชิงประจักษ์'
    ];

    const rows = evaluatableList.map(({ evalObj, classrooms: c, academic_year }, idx) => {
      const traitScores = DESIRABLE_8_TRAITS.map(t => calculateStudentTrait(evalObj, t.id));
      const traitOverall = getStudentOverallTrait(evalObj);
      const traitText = formatGradeLevelText(traitOverall).label;

      const readingScores = READING_5_INDICATORS.map(r => calculateStudentReading(evalObj, r.id));
      const readingOverall = getStudentOverallReading(evalObj);
      const readingText = formatGradeLevelText(readingOverall).label;

      const rationale = getStudentRationale(evalObj);

      return [
        idx + 1,
        evalObj.student_id,
        evalObj.student_name,
        c?.class_name || 'ไม่ระบุ',
        academic_year || selectedTerm,
        ...traitScores,
        traitOverall,
        traitText,
        ...readingScores,
        readingOverall,
        readingText,
        rationale
      ];
    });

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `VocabJourney_PP5_Assessment_${selectedTerm}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-black text-white">คลังประวัติเทอมเก่า & รายงานสรุปผล (Term Archive & Reports)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            แยกดูผลสัมฤทธิ์ทางการเรียน ผลทดสอบ Pre-Test / Post-Test และแบบประเมิน ปพ.5 รายภาคเรียน พร้อมส่งออก Excel/CSV
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportAcademicCSV}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Download className="w-3.5 h-3.5" /> ส่งออกคะแนน (CSV)
          </button>
          <button
            onClick={handleExportPP5CSV}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-600/20"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> ส่งออก ปพ.5 (CSV)
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Term Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-slate-400">ภาคเรียน:</span>
            <select
              value={selectedTerm}
              onChange={e => setSelectedTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="2567-T1">ภาคเรียนที่ 1/2567 (ระยะทดลอง Pilot)</option>
              <option value="2567-T2">ภาคเรียนที่ 2/2567 (Active ปัจจุบัน)</option>
              <option value="all">ทุกภาคเรียนทั้งหมด (All Terms)</option>
            </select>
          </div>

          {/* Classroom Selector */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-400">ห้องเรียน:</span>
            <select
              value={selectedClassroom}
              onChange={e => setSelectedClassroom(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
            >
              <option value="">ทุกห้องเรียน</option>
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>
                  {c.class_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input & Refresh */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="relative w-full md:w-60">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อหรือรหัส นร...."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={loadTermStudents}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* 6 KPI Cards for Chosen Term */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold mb-1">
            <Users className="w-3.5 h-3.5 text-indigo-400" /> นักเรียนทั้งหมด
          </div>
          <div className="text-2xl font-black text-white">{metrics.total} <span className="text-xs font-normal text-slate-400">คน</span></div>
          <div className="text-[10px] text-slate-500 mt-1">
            {selectedTerm === '2567-T1' ? 'บัญชีทดลอง (Pilot)' : selectedTerm === '2567-T2' ? 'บัญชีทางการ (Active)' : 'รวมทุกเทอม'}
          </div>
        </div>

        <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold mb-1">
            <Target className="w-3.5 h-3.5 text-amber-400" /> Pre-Test เฉลี่ย
          </div>
          <div className="text-2xl font-black text-amber-400">{metrics.avgPre} <span className="text-xs font-normal text-slate-400">คะแนน</span></div>
          <div className="text-[10px] text-slate-500 mt-1">เกณฑ์วัดก่อนเรียน</div>
        </div>

        <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold mb-1">
            <Award className="w-3.5 h-3.5 text-emerald-400" /> Post-Test เฉลี่ย
          </div>
          <div className="text-2xl font-black text-emerald-400">{metrics.avgPost} <span className="text-xs font-normal text-slate-400">คะแนน</span></div>
          <div className="text-[10px] text-emerald-400/80 mt-1">
            {metrics.avgPost > metrics.avgPre ? `+${(metrics.avgPost - metrics.avgPre).toFixed(1)} คะแนน` : 'ยังไม่มีผลทดสอบ'}
          </div>
        </div>

        <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> Learning Gain
          </div>
          <div className="text-2xl font-black text-cyan-400">+{metrics.avgGain}%</div>
          <div className="text-[10px] text-slate-500 mt-1">พัฒนาการตามสูตร Hake</div>
        </div>

        <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" /> ปพ.5 คุณลักษณะ
          </div>
          <div className="text-2xl font-black text-purple-400">{metrics.traitsExcellentPct}%</div>
          <div className="text-[10px] text-slate-500 mt-1">ระดับดีเยี่ยม (เกรด 3)</div>
        </div>

        <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold mb-1">
            <BrainCircuit className="w-3.5 h-3.5 text-pink-400" /> ปพ.5 อ่านคิดวิเคราะห์
          </div>
          <div className="text-2xl font-black text-pink-400">{metrics.readingExcellentPct}%</div>
          <div className="text-[10px] text-slate-500 mt-1">ระดับดีเยี่ยม (เกรด 3)</div>
        </div>
      </div>

      {/* Sub-view Tabs (Academic / Traits / Reading) */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubView('academic')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubView === 'academic'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-900/60 text-slate-400 hover:text-white'
          }`}
        >
          1. สรุปผลสัมฤทธิ์ทางวิชาการ (Pre/Post/Gain)
        </button>
        <button
          onClick={() => setActiveSubView('traits')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubView === 'traits'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-900/60 text-slate-400 hover:text-white'
          }`}
        >
          2. ปพ.5: คุณลักษณะอันพึงประสงค์ 8 ประการ
        </button>
        <button
          onClick={() => setActiveSubView('reading')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubView === 'reading'
              ? 'bg-pink-600 text-white'
              : 'bg-slate-900/60 text-slate-400 hover:text-white'
          }`}
        >
          3. ปพ.5: การอ่าน คิดวิเคราะห์ และเขียน 5 ด้าน
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-bold uppercase">
                <th className="p-4 w-12 text-center">#</th>
                <th className="p-4">รหัส / ชื่อ-สกุล</th>
                <th className="p-4">ชั้น/ห้อง</th>
                <th className="p-4 text-center">ภาคเรียน</th>

                {/* Academic Columns */}
                {activeSubView === 'academic' && (
                  <>
                    <th className="p-4 text-center">Pre-test</th>
                    <th className="p-4 text-center">Post-test</th>
                    <th className="p-4 text-center">Learning Gain</th>
                    <th className="p-4 text-center">Accuracy</th>
                    <th className="p-4 text-center">ด่านที่เล่น</th>
                    <th className="p-4 text-center">ปพ.5 รวม</th>
                  </>
                )}

                {/* Traits Columns */}
                {activeSubView === 'traits' && (
                  <>
                    {DESIRABLE_8_TRAITS.map(t => (
                      <th key={t.id} className="p-3 text-center text-[10px]" title={t.name}>
                        {t.short}
                      </th>
                    ))}
                    <th className="p-4 text-center">สรุปผล</th>
                  </>
                )}

                {/* Reading Columns */}
                {activeSubView === 'reading' && (
                  <>
                    {READING_5_INDICATORS.map(r => (
                      <th key={r.id} className="p-3 text-center text-[10px]" title={r.name}>
                        {r.short}
                      </th>
                    ))}
                    <th className="p-4 text-center">สรุปผล</th>
                  </>
                )}

                <th className="p-4 text-right">ตรวจดู</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    กำลังโหลดข้อมูลนักเรียนในภาคเรียนที่เลือก...
                  </td>
                </tr>
              ) : evaluatableList.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-slate-500">
                    ไม่พบข้อมูลนักเรียนในภาคเรียนนี้ หรือยังไม่มีข้อมูลนำเข้า
                  </td>
                </tr>
              ) : (
                evaluatableList.map(({ evalObj, classrooms: c, academic_year, is_active }, idx) => {
                  const traitOverall = getStudentOverallTrait(evalObj);
                  const readingOverall = getStudentOverallReading(evalObj);

                  return (
                    <tr
                      key={evalObj.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-4 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-4">
                        <div className="font-bold text-white text-sm">{evalObj.student_name}</div>
                        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>รหัส: {evalObj.student_id}</span>
                          {!is_active && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-400 border border-slate-700">
                              Archived
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-slate-300 font-medium">
                        {c?.class_name || 'ไม่ระบุ'}
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                          {academic_year || selectedTerm}
                        </span>
                      </td>

                      {/* Academic View Cells */}
                      {activeSubView === 'academic' && (
                        <>
                          <td className="p-4 text-center font-mono font-bold text-amber-400">
                            {evalObj.pretestScore ?? '-'}
                          </td>
                          <td className="p-4 text-center font-mono font-bold text-emerald-400">
                            {evalObj.posttestScore ?? '-'}
                          </td>
                          <td className="p-4 text-center font-mono font-bold text-cyan-400">
                            +{evalObj.learningGain}%
                          </td>
                          <td className="p-4 text-center font-mono text-slate-300">
                            {evalObj.accuracy ? `${evalObj.accuracy}%` : '-'}
                          </td>
                          <td className="p-4 text-center font-mono text-slate-300">
                            ด่าน {evalObj.currentStage}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${formatGradeLevelText(traitOverall).color}`}>
                              คุณลักษณะ: {traitOverall} | คิด: {readingOverall}
                            </span>
                          </td>
                        </>
                      )}

                      {/* Traits View Cells */}
                      {activeSubView === 'traits' && (
                        <>
                          {DESIRABLE_8_TRAITS.map(t => {
                            const score = calculateStudentTrait(evalObj, t.id);
                            return (
                              <td key={t.id} className="p-3 text-center font-mono font-bold">
                                <span className={`px-1.5 py-0.5 rounded text-[11px] border ${formatGradeLevelText(score).color}`}>
                                  {score}
                                </span>
                              </td>
                            );
                          })}
                          <td className="p-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${formatGradeLevelText(traitOverall).color}`}>
                              {formatGradeLevelText(traitOverall).label}
                            </span>
                          </td>
                        </>
                      )}

                      {/* Reading View Cells */}
                      {activeSubView === 'reading' && (
                        <>
                          {READING_5_INDICATORS.map(r => {
                            const score = calculateStudentReading(evalObj, r.id);
                            return (
                              <td key={r.id} className="p-3 text-center font-mono font-bold">
                                <span className={`px-1.5 py-0.5 rounded text-[11px] border ${formatGradeLevelText(score).color}`}>
                                  {score}
                                </span>
                              </td>
                            );
                          })}
                          <td className="p-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${formatGradeLevelText(readingOverall).color}`}>
                              {formatGradeLevelText(readingOverall).label}
                            </span>
                          </td>
                        </>
                      )}

                      <td className="p-4 text-right">
                        <button
                          onClick={() => setInspectStudent(evalObj)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors inline-flex items-center gap-1"
                        >
                          สรุปผล <ChevronRight className="w-3 h-3 text-cyan-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Quick Inspect Student Detail */}
      {inspectStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white">{inspectStudent.student_name}</h3>
                <p className="text-xs text-slate-400">รหัสประจำตัว: {inspectStudent.student_id} | ภาคเรียน: {selectedTerm}</p>
              </div>
              <button
                onClick={() => setInspectStudent(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Scores summary */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Pre-test</span>
                <strong className="text-base text-amber-400">{inspectStudent.pretestScore ?? 0}</strong>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Post-test</span>
                <strong className="text-base text-emerald-400">{inspectStudent.posttestScore ?? 0}</strong>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Gain (%)</span>
                <strong className="text-base text-cyan-400">+{inspectStudent.learningGain ?? 0}%</strong>
              </div>
            </div>

            {/* P.P.5 Ratings */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300">ผลประเมิน ปพ.5 รายด้าน:</div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">คุณลักษณะอันพึงประสงค์ 8 ประการ:</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold border text-[11px] ${formatGradeLevelText(getStudentOverallTrait(inspectStudent)).color}`}>
                    {formatGradeLevelText(getStudentOverallTrait(inspectStudent)).label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">การอ่าน คิดวิเคราะห์ และเขียน:</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold border text-[11px] ${formatGradeLevelText(getStudentOverallReading(inspectStudent)).color}`}>
                    {formatGradeLevelText(getStudentOverallReading(inspectStudent)).label}
                  </span>
                </div>
              </div>
            </div>

            {/* Rationale note */}
            <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl text-xs text-indigo-300">
              <span className="font-bold block mb-0.5 text-indigo-200">หลักฐานเชิงประจักษ์ & ข้อเสนอแนะ:</span>
              {getStudentRationale(inspectStudent)}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setInspectStudent(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
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
