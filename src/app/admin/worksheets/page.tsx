'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Lock,
  Unlock,
  Download,
  BookOpen,
  Award,
  Sparkles,
  Users,
} from 'lucide-react';
import { ALL_WORKSHEETS, type WorksheetGrade } from '@/data/worksheets/index';
import {
  READING_5_INDICATORS,
  DESIRABLE_8_TRAITS,
  calculateStudentReading,
  calculateStudentTrait,
  getStudentOverallReading,
  getStudentOverallTrait,
  getStudentRationale,
  formatGradeLevelText,
  type EvaluatableStudent,
} from '@/utils/pp5Evaluation';

type GradeFilter = 'ALL' | WorksheetGrade;
type GradebookViewMode = 'scores' | 'pp5';

function buildEvaluatableFromWorksheets(s: any): EvaluatableStudent {
  const subs = Object.values(s.submissions || {}) as Array<{
    score: number;
    maxScore: number;
    accuracy: number;
  }>;
  const completedCount = subs.length;
  const avgAcc =
    completedCount > 0
      ? Math.round(subs.reduce((sum, item) => sum + Number(item.accuracy || 0), 0) / completedCount)
      : 0;

  return {
    id: s.id,
    student_id: s.studentId,
    student_name: s.studentName,
    classroom_id: s.classroom,
    worksheetsCompleted: completedCount,
    worksheetAccuracy: avgAcc,
    accuracy: avgAcc,
  };
}

export default function AdminWorksheetsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [unlockedUnits, setUnlockedUnits] = useState<
    Record<string, { isOpen: boolean; allowedClassrooms: string[] }>
  >({});
  const [students, setStudents] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<string[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('ALL');
  const [targetLockClassroom, setTargetLockClassroom] = useState<string>('ALL');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<GradeFilter>('M1');
  const [gradebookView, setGradebookView] = useState<GradebookViewMode>('scores');
  const [updatingUnitId, setUpdatingUnitId] = useState<string | null>(null);

  // Check teacher session
  useEffect(() => {
    async function loadData() {
      try {
        const meRes = await fetch('/api/auth/me');
        const meJson = await meRes.json();
        if (
          !meJson.authenticated ||
          (meJson.role !== 'ADMIN' && meJson.role !== 'TEACHER')
        ) {
          router.replace('/admin');
          return;
        }
        setAuthorized(true);

        const res = await fetch('/api/admin/worksheets');
        const data = await res.json();
        if (data.success) {
          setUnlockedUnits(data.unlockedUnits || {});
          setStudents(data.students || []);
          setClassrooms(data.classrooms || []);
        }
      } catch (e) {
        console.error('Failed to load admin worksheets:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const visibleUnits = useMemo(() => {
    if (selectedGradeFilter === 'ALL') return ALL_WORKSHEETS;
    return ALL_WORKSHEETS.filter((u) => u.grade === selectedGradeFilter);
  }, [selectedGradeFilter]);

  const handleToggleUnit = async (unitId: string, currentIsOpen: boolean) => {
    setUpdatingUnitId(unitId);
    try {
      const targetRooms =
        targetLockClassroom === 'ALL' ? ['ALL'] : [targetLockClassroom];
      const res = await fetch('/api/admin/worksheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId,
          isOpen: !currentIsOpen,
          allowedClassrooms: targetRooms,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUnlockedUnits(data.unlockedUnits);
      }
    } catch (e) {
      console.error('Failed to toggle unit:', e);
    } finally {
      setUpdatingUnitId(null);
    }
  };

  const handleAssignUnitToTargetRoom = async (unitId: string) => {
    setUpdatingUnitId(unitId);
    try {
      const targetRooms =
        targetLockClassroom === 'ALL' ? ['ALL'] : [targetLockClassroom];
      const res = await fetch('/api/admin/worksheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId,
          isOpen: true,
          allowedClassrooms: targetRooms,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUnlockedUnits(data.unlockedUnits);
      }
    } catch (e) {
      console.error('Failed to assign room for unit:', e);
    } finally {
      setUpdatingUnitId(null);
    }
  };

  const handleBulkUnlockGrade = async (grade: string, isOpen: boolean) => {
    const targetUnits = ALL_WORKSHEETS.filter((u) => u.grade === grade).map(
      (u) => u.unitId
    );
    const targetRooms =
      targetLockClassroom === 'ALL' ? ['ALL'] : [targetLockClassroom];
    try {
      const res = await fetch('/api/admin/worksheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitIds: targetUnits,
          isOpen,
          allowedClassrooms: targetRooms,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUnlockedUnits(data.unlockedUnits);
      }
    } catch (e) {
      console.error('Failed bulk unlock:', e);
    }
  };

  const filteredStudents = useMemo(() => {
    return selectedClassroom === 'ALL'
      ? students
      : students.filter((s) => s.classroom === selectedClassroom);
  }, [students, selectedClassroom]);

  const exportScoresCSV = () => {
    const headers = [
      'รหัสนักเรียน',
      'ชื่อ-นามสกุล',
      'ห้องเรียน',
      'จำนวนบทที่ส่ง',
      'ความแม่นยำเฉลี่ย (%)',
      ...visibleUnits.map((u) => u.unitId),
    ];
    const rows = filteredStudents.map((s) => {
      const evalSt = buildEvaluatableFromWorksheets(s);
      const unitScores = visibleUnits.map((u) => {
        const sub = s.submissions?.[u.unitId];
        return sub ? `${sub.score}/${sub.maxScore}` : '-';
      });
      return [
        s.studentId,
        s.studentName,
        s.classroom,
        evalSt.worksheetsCompleted || 0,
        `${evalSt.worksheetAccuracy || 0}%`,
        ...unitScores,
      ];
    });

    const csvContent =
      '\uFEFF' +
      [
        headers.join(','),
        ...rows.map((r) => r.map((c: any) => `"${c}"`).join(',')),
      ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `คะแนนใบงาน_${selectedGradeFilter}_${selectedClassroom}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPP5CSV = () => {
    const headers = [
      'รหัสนักเรียน',
      'ชื่อ-นามสกุล',
      'ห้องเรียน',
      'จำนวนใบงานที่ส่ง',
      'ความแม่นยำเฉลี่ย (%)',
      ...READING_5_INDICATORS.map((r) => `อ่านคิดวิเคราะห์_${r.short}`),
      'สรุปการอ่านคิดวิเคราะห์ (0-3)',
      'สรุปคุณลักษณะอันพึงประสงค์ (0-3)',
      'ข้อสังเกตและเหตุผลประกอบ ปพ.5',
    ];

    const rows = filteredStudents.map((s) => {
      const ev = buildEvaluatableFromWorksheets(s);
      const readingScores = READING_5_INDICATORS.map((ind) => {
        const sc = calculateStudentReading(ev, ind.id);
        return sc === -1 ? 'รอประเมิน' : sc;
      });
      const overallR = getStudentOverallReading(ev);
      const overallT = getStudentOverallTrait(ev);
      return [
        s.studentId,
        s.studentName,
        s.classroom,
        ev.worksheetsCompleted || 0,
        `${ev.worksheetAccuracy || 0}%`,
        ...readingScores,
        overallR === -1 ? 'รอประเมิน' : overallR,
        overallT === -1 ? 'รอประเมิน' : overallT,
        getStudentRationale(ev),
      ];
    });

    const csvContent =
      '\uFEFF' +
      [
        headers.join(','),
        ...rows.map((r) => r.map((c: any) => `"${c}"`).join(',')),
      ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `ประเมินปพ5_ใบงาน_${selectedClassroom}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !authorized) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">
            กำลังโหลดระบบจัดการแบบฝึกหัดสำหรับครูผู้สอน...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 pb-16">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:text-white text-slate-400 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                ระบบจัดการแบบฝึกหัดคำศัพท์ 57 บท (A2 Oxford 3000)
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              ควบคุมการเปิด/ปิดใบงานแยกตามห้องเรียน และเชื่อมโยงคะแนนเข้าสู่การประเมิน ปพ.5 อัตโนมัติ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/challenge/grammar"
              className="px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 font-bold text-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>หน้าสูตรลัดนักเรียน</span>
            </Link>
            <button
              type="button"
              onClick={exportScoresCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export คะแนนรายบท (.csv)</span>
            </button>
            <button
              type="button"
              onClick={exportPP5CSV}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>Export ปพ.5 อ่านคิดวิเคราะห์ (.csv)</span>
            </button>
          </div>
        </div>

        {/* Section 1: Classroom-Specific Lock & Bulk Controls */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">
                ⚡ ควบคุมการเปิด/ปิดบทเรียนตามห้องเรียน (Classroom-Specific Lock)
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                เลือกห้องเรียนเป้าหมายก่อนกดปุ่มเปิดบทเรียน เพื่อให้เฉพาะห้องที่กำลังเรียนอยู่เข้าทำได้
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-300">เปิดให้ห้อง:</span>
              <select
                value={targetLockClassroom}
                onChange={(e) => setTargetLockClassroom(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-emerald-500/40 text-emerald-300 text-xs font-black"
              >
                <option value="ALL">ทุกห้องเรียน (ALL)</option>
                {classrooms.map((c) => (
                  <option key={c} value={c}>
                    เฉพาะห้อง {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleBulkUnlockGrade('M1', true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
            >
              🔓 เปิด ม.1 ทั้งหมด (18 บท) ให้{' '}
              {targetLockClassroom === 'ALL' ? 'ทุกห้อง' : targetLockClassroom}
            </button>
            <button
              type="button"
              onClick={() => handleBulkUnlockGrade('M2', true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
            >
              🔓 เปิด ม.2 ทั้งหมด (19 บท) ให้{' '}
              {targetLockClassroom === 'ALL' ? 'ทุกห้อง' : targetLockClassroom}
            </button>
            <button
              type="button"
              onClick={() => handleBulkUnlockGrade('M3', true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
            >
              🔓 เปิด ม.3 ทั้งหมด (20 บท) ให้{' '}
              {targetLockClassroom === 'ALL' ? 'ทุกห้อง' : targetLockClassroom}
            </button>
            <button
              type="button"
              onClick={() => {
                const allIds = ALL_WORKSHEETS.map((u) => u.unitId);
                fetch('/api/admin/worksheets', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    unitIds: allIds,
                    isOpen: false,
                    allowedClassrooms: ['ALL'],
                  }),
                })
                  .then((r) => r.json())
                  .then((d) => setUnlockedUnits(d.unlockedUnits));
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs cursor-pointer"
            >
              🔒 ล็อกทั้งหมด (รอสั่งการบ้าน)
            </button>
          </div>
        </div>

        {/* Grade Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-black text-white">
            รายชื่อบทเรียน ({visibleUnits.length} บท)
          </h2>
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800">
            {(
              [
                { key: 'M1', label: 'ม.1 (18 บท)' },
                { key: 'M2', label: 'ม.2 (19 บท)' },
                { key: 'M3', label: 'ม.3 (20 บท)' },
                { key: 'ALL', label: 'ทั้งหมด (57 บท)' },
              ] as Array<{ key: GradeFilter; label: string }>
            ).map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setSelectedGradeFilter(g.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  selectedGradeFilter === g.key
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Units Toggle Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {visibleUnits.map((u) => {
            const cfg = unlockedUnits[u.unitId];
            const isOpen = cfg !== undefined ? Boolean(cfg.isOpen) : true;
            const allowedRooms = cfg?.allowedClassrooms || ['ALL'];
            const isUpdating = updatingUnitId === u.unitId;

            return (
              <div
                key={u.unitId}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isOpen
                    ? 'bg-slate-900/90 border-emerald-500/40'
                    : 'bg-slate-900/40 border-slate-800/80 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {u.unitId}
                    </span>
                    {isOpen && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                        {allowedRooms.includes('ALL')
                          ? 'ทุกห้อง'
                          : `ห้อง ${allowedRooms.join(', ')}`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {targetLockClassroom !== 'ALL' &&
                      (!isOpen || !allowedRooms.includes(targetLockClassroom)) && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleAssignUnitToTargetRoom(u.unitId)}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 cursor-pointer"
                          title={`เปิดเฉพาะห้อง ${targetLockClassroom}`}
                        >
                          เปิดให้ {targetLockClassroom}
                        </button>
                      )}
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleToggleUnit(u.unitId, isOpen)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                        isOpen
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {isOpen ? (
                        <>
                          <Unlock className="w-3 h-3 text-emerald-400" />
                          <span>เปิดอยู่</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span>ล็อก</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white truncate">{u.title}</h3>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span>
                    {u.questions.length} ข้อ •{' '}
                    {u.type === 'matching'
                      ? 'จับคู่คำนิยาม (ปพ.5 ข้อ 1-2)'
                      : 'บริบทประโยค (ปพ.5 ข้อ 3-5)'}
                  </span>
                  <Link
                    href={`/challenge/worksheets/${u.unitId}`}
                    className="text-emerald-400 hover:underline font-bold"
                  >
                    ดูตัวอย่าง →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Section 3: Live Student Submissions Gradebook & P.P.5 Assessment */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white">
                สมุดบันทึกคะแนนและการประเมิน ปพ.5 รายบุคคล
              </h2>
              <p className="text-xs text-slate-400">
                เชื่อมโยงผลสัมฤทธิ์ใบงานคำศัพท์สู่ตัวชี้วัดการอ่าน คิดวิเคราะห์ และเขียน (5 ตัวชี้วัด) และคุณลักษณะอันพึงประสงค์
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* View Switcher */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setGradebookView('scores')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    gradebookView === 'scores'
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>คะแนนรายบท</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGradebookView('pp5')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    gradebookView === 'pp5'
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>ประเมิน ปพ.5 (อ่านคิดวิเคราะห์)</span>
                </button>
              </div>

              {/* Classroom Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold">ห้องเรียน:</span>
                <select
                  value={selectedClassroom}
                  onChange={(e) => setSelectedClassroom(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold"
                >
                  <option value="ALL">ทุกห้องเรียน ({students.length} คน)</option>
                  {classrooms.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table View 1: Raw Unit Scores */}
          {gradebookView === 'scores' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="py-2.5 px-3">รหัส</th>
                    <th className="py-2.5 px-3">ชื่อ-นามสกุล</th>
                    <th className="py-2.5 px-3">ห้อง</th>
                    {visibleUnits.map((u) => (
                      <th key={u.unitId} className="py-2.5 px-2 text-center" title={u.title}>
                        {u.unitId}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-bold text-slate-300">{s.studentId}</td>
                      <td className="py-2.5 px-3 font-sans font-bold text-white">
                        {s.studentName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{s.classroom}</td>
                      {visibleUnits.map((u) => {
                        const sub = s.submissions?.[u.unitId];
                        return (
                          <td key={u.unitId} className="py-2.5 px-2 text-center">
                            {sub ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                                {sub.score}/{sub.maxScore}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td
                        colSpan={visibleUnits.length + 3}
                        className="py-6 text-center text-slate-500"
                      >
                        ไม่พบข้อมูลนักเรียนในห้องเรียนนี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Table View 2: P.P.5 Authentic Assessment View */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-3">รหัส</th>
                    <th className="py-2.5 px-3">ชื่อ-นามสกุล</th>
                    <th className="py-2.5 px-2 text-center">ห้อง</th>
                    <th className="py-2.5 px-2 text-center">ใบงานที่ส่ง</th>
                    <th className="py-2.5 px-2 text-center">ความแม่นยำ</th>
                    {READING_5_INDICATORS.map((ind) => (
                      <th
                        key={ind.id}
                        className="py-2.5 px-2 text-center text-sky-300"
                        title={ind.name}
                      >
                        {ind.short}
                      </th>
                    ))}
                    <th className="py-2.5 px-2 text-center text-emerald-300">
                      สรุปอ่านคิดวิเคราะห์
                    </th>
                    <th className="py-2.5 px-2 text-center text-amber-300">
                      สรุปคุณลักษณะ 8
                    </th>
                    <th className="py-2.5 px-3">ข้อสังเกต ปพ.5 รายบุคคล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStudents.map((s) => {
                    const ev = buildEvaluatableFromWorksheets(s);
                    const overallR = getStudentOverallReading(ev);
                    const overallT = getStudentOverallTrait(ev);
                    const badgeR = formatGradeLevelText(overallR);
                    const badgeT = formatGradeLevelText(overallT);

                    return (
                      <tr key={s.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-300">
                          {s.studentId}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">{s.studentName}</td>
                        <td className="py-2.5 px-2 text-center text-slate-400">
                          {s.classroom}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-white">
                          {ev.worksheetsCompleted || 0} บท
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-amber-300">
                          {ev.worksheetAccuracy || 0}%
                        </td>
                        {READING_5_INDICATORS.map((ind) => {
                          const sc = calculateStudentReading(ev, ind.id);
                          return (
                            <td
                              key={ind.id}
                              className="py-2.5 px-2 text-center font-mono font-bold"
                            >
                              {sc === -1 ? (
                                <span className="text-slate-600">-</span>
                              ) : (
                                <span className="text-sky-300">{sc}</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2.5 px-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${badgeR.color}`}
                          >
                            {badgeR.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${badgeT.color}`}
                          >
                            {badgeT.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-xs">
                          {getStudentRationale(ev)}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={13} className="py-6 text-center text-slate-500">
                        ไม่พบข้อมูลนักเรียนในห้องเรียนนี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
