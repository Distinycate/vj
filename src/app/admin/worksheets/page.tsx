'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Lock,
  Unlock,
  CheckCircle2,
  Users,
  Download,
  Filter,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { ALL_WORKSHEETS } from '@/data/worksheets/index';

export default function AdminWorksheetsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [unlockedUnits, setUnlockedUnits] = useState<Record<string, { isOpen: boolean; allowedClassrooms: string[] }>>({});
  const [students, setStudents] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<string[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('ALL');
  const [updatingUnitId, setUpdatingUnitId] = useState<string | null>(null);

  // Check teacher session
  useEffect(() => {
    async function loadData() {
      try {
        const meRes = await fetch('/api/auth/me');
        const meJson = await meRes.json();
        if (!meJson.authenticated || (meJson.role !== 'ADMIN' && meJson.role !== 'TEACHER')) {
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

  const handleToggleUnit = async (unitId: string, currentIsOpen: boolean) => {
    setUpdatingUnitId(unitId);
    try {
      const res = await fetch('/api/admin/worksheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId,
          isOpen: !currentIsOpen,
          allowedClassrooms: ['ALL'],
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

  const handleBulkUnlockGrade = async (grade: string, isOpen: boolean) => {
    const targetUnits = ALL_WORKSHEETS.filter((u) => u.grade === grade).map((u) => u.unitId);
    try {
      const res = await fetch('/api/admin/worksheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitIds: targetUnits,
          isOpen,
          allowedClassrooms: ['ALL'],
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

  const exportCSV = () => {
    const filteredStudents = selectedClassroom === 'ALL'
      ? students
      : students.filter((s) => s.classroom === selectedClassroom);

    const headers = ['รหัสนักเรียน', 'ชื่อ-นามสกุล', 'ห้องเรียน', ...ALL_WORKSHEETS.map((u) => u.unitId)];
    const rows = filteredStudents.map((s) => {
      const unitScores = ALL_WORKSHEETS.map((u) => {
        const sub = s.submissions?.[u.unitId];
        return sub ? `${sub.score}/${sub.maxScore}` : '-';
      });
      return [s.studentId, s.studentName, s.classroom, ...unitScores];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.map((c: any) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `คะแนนแบบฝึกหัด_${selectedClassroom}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !authorized) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">กำลังโหลดระบบจัดการแบบฝึกหัดสำหรับครูผู้สอน...</p>
        </div>
      </div>
    );
  }

  const filteredStudents = selectedClassroom === 'ALL'
    ? students
    : students.filter((s) => s.classroom === selectedClassroom);

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
                ระบบจัดการแบบฝึกหัดคำศัพท์ (สพป. บุรีรัมย์ เขต 3)
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              ควบคุมการเปิด/ปิดบทเรียนให้นักเรียนทำในห้องเรียน และติดตามคะแนนสำหรับบันทึกลง ปพ.5
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportCSV}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>ส่งออกไฟล์คะแนน (.csv)</span>
            </button>
          </div>
        </div>

        {/* Section 1: Quick Bulk Actions */}
        <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              ⚡ ควบคุมการเปิดบทเรียนด่วน (Bulk Controls)
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleBulkUnlockGrade('M1', true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
            >
              🔓 เปิดทั้งหมดใน ม.1
            </button>
            <button
              type="button"
              onClick={() => handleBulkUnlockGrade('M2', true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
            >
              🔓 เปิดทั้งหมดใน ม.2
            </button>
            <button
              type="button"
              onClick={() => handleBulkUnlockGrade('M3', true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
            >
              🔓 เปิดทั้งหมดใน ม.3
            </button>
            <button
              type="button"
              onClick={() => {
                const allIds = ALL_WORKSHEETS.map((u) => u.unitId);
                fetch('/api/admin/worksheets', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ unitIds: allIds, isOpen: false, allowedClassrooms: ['ALL'] }),
                }).then((r) => r.json()).then((d) => setUnlockedUnits(d.unlockedUnits));
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs"
            >
              🔒 ล็อกทั้งหมด (รอสั่งการบ้าน)
            </button>
          </div>
        </div>

        {/* Section 2: Units Toggle Cards */}
        <div className="space-y-4">
          <h2 className="text-base font-black text-white">รายชื่อบทเรียนและสถานะการเปิดให้นักเรียนทำ</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {ALL_WORKSHEETS.map((u) => {
              const cfg = unlockedUnits[u.unitId];
              const isOpen = cfg !== undefined ? Boolean(cfg.isOpen) : true;
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
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {u.unitId}
                    </span>
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

                  <h3 className="text-sm font-bold text-white truncate">{u.title}</h3>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {u.questions.length} ข้อ • {u.type}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Live Student Submissions Gradebook */}
        <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white">สมุดบันทึกคะแนนนักเรียน (Gradebook)</h2>
              <p className="text-xs text-slate-400">แสดงผลคะแนนการทำแบบฝึกหัดของนักเรียนรายบุคคล</p>
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

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="py-2.5 px-3">รหัส</th>
                  <th className="py-2.5 px-3">ชื่อ-นามสกุล</th>
                  <th className="py-2.5 px-3">ห้อง</th>
                  {ALL_WORKSHEETS.map((u) => (
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
                    <td className="py-2.5 px-3 font-sans font-bold text-white">{s.studentName}</td>
                    <td className="py-2.5 px-3 text-slate-400">{s.classroom}</td>
                    {ALL_WORKSHEETS.map((u) => {
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
                    <td colSpan={ALL_WORKSHEETS.length + 3} className="py-6 text-center text-slate-500">
                      ไม่พบข้อมูลนักเรียนในห้องเรียนนี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

