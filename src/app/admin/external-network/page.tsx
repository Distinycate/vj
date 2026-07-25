'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileSpreadsheet, Globe2, Loader2, Printer, RefreshCw } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';

type ExternalStudentRow = {
  id: string;
  student_name: string;
  username: string;
  school_name: string;
  grade_level: string | null;
  created_at: string | null;
  learning_paths: any;
  analytics_summary: any;
};

function relationObject(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export default function ExternalNetworkAdminPage() {
  const [teacher, setTeacher] = useState<any>(undefined);
  const [rows, setRows] = useState<ExternalStudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('vocab_journey_teacher');
    setTeacher(saved ? JSON.parse(saved) : null);
  }, []);

  async function loadRows() {
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('students')
      .select('id, student_name, username, school_name, grade_level, created_at, learning_paths(current_stage), analytics_summary(success_rate)')
      .eq('user_type', 'EXTERNAL')
      .order('created_at', { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setRows([]);
    } else {
      setRows((data || []) as ExternalStudentRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (teacher) loadRows();
  }, [teacher]);

  const reportRows = useMemo(() => rows.map((row) => {
    const path = relationObject(row.learning_paths);
    const analytics = relationObject(row.analytics_summary);
    return {
      id: row.id,
      name: row.student_name,
      username: row.username,
      schoolName: row.school_name || '-',
      gradeLevel: row.grade_level || '-',
      currentStage: Number(path?.current_stage || 1),
      accuracy: Math.round(Number(analytics?.success_rate || 0)),
      createdAt: row.created_at ? new Date(row.created_at).toLocaleDateString('th-TH') : '-',
    };
  }), [rows]);

  function exportCsv() {
    const header = ['Name', 'Username', 'School Name', 'Grade', 'Current Stage', 'Accuracy (%)', 'Registered At'];
    const body = reportRows.map((row) => [
      row.name,
      row.username,
      row.schoolName,
      row.gradeLevel,
      row.currentStage,
      row.accuracy,
      row.createdAt,
    ]);
    const csv = [header, ...body].map((line) => line.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `external-network-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (teacher === undefined) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-300" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center">
          <Globe2 className="w-12 h-12 text-cyan-300 mx-auto mb-4" />
          <h1 className="text-xl font-black text-white">กรุณาเข้าสู่ระบบแอดมินก่อน</h1>
          <button onClick={() => window.location.href = '/admin'} className="mt-5 w-full min-h-11 bg-cyan-500 text-slate-950 rounded-xl font-black">
            ไปหน้า Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 safe-bottom">
      <div className="max-w-7xl mx-auto">
        <header className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 sm:p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <button onClick={() => window.location.href = '/admin'} className="mb-4 min-h-10 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold">
                <ArrowLeft className="w-4 h-4" /> กลับ Teacher Dashboard
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 flex items-center justify-center">
                  <Globe2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-black text-cyan-300 tracking-widest uppercase">External Network Report</p>
                  <h1 className="text-2xl sm:text-3xl font-black text-white">รายงานโรงเรียนเครือข่ายภายนอก</h1>
                </div>
              </div>
              <p className="text-sm text-slate-400 mt-3">
                แสดงเฉพาะผู้ใช้ `EXTERNAL` สำหรับหลักฐานการเผยแพร่นวัตกรรม โดยไม่ปนกับข้อมูลนักเรียนโรงเรียนบ้านโคกยาง
              </p>
            </div>
            <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2">
              <button onClick={loadRows} className="min-h-11 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /> รีเฟรช
              </button>
              <button onClick={exportCsv} className="min-h-11 px-4 py-2 bg-emerald-500 text-slate-950 rounded-xl font-black text-sm flex items-center justify-center gap-2">
                <FileSpreadsheet className="w-4 h-4" /> Export Excel
              </button>
              <button onClick={() => window.print()} className="min-h-11 px-4 py-2 bg-cyan-500 text-slate-950 rounded-xl font-black text-sm flex items-center justify-center gap-2">
                <Printer className="w-4 h-4" /> Export PDF
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs text-slate-500 font-bold">External Users</div>
            <div className="text-2xl font-black text-white mt-1">{reportRows.length}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs text-slate-500 font-bold">โรงเรียนเครือข่าย</div>
            <div className="text-2xl font-black text-cyan-300 mt-1">{new Set(reportRows.map((row) => row.schoolName)).size}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs text-slate-500 font-bold">Accuracy เฉลี่ย</div>
            <div className="text-2xl font-black text-emerald-300 mt-1">
              {reportRows.length ? Math.round(reportRows.reduce((sum, row) => sum + row.accuracy, 0) / reportRows.length) : 0}%
            </div>
          </div>
        </div>

        {error && <div className="mb-5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl p-4">{error}</div>}

        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm text-left">
              <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">School Name</th>
                  <th className="p-4 text-center">Current Stage</th>
                  <th className="p-4 text-center">Accuracy (%)</th>
                  <th className="p-4">Username</th>
                  <th className="p-4">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {reportRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/30">
                    <td className="p-4 font-bold text-white">{row.name}</td>
                    <td className="p-4 text-cyan-200">{row.schoolName}</td>
                    <td className="p-4 text-center font-black text-indigo-300">{row.currentStage}</td>
                    <td className="p-4 text-center font-black text-emerald-300">{row.accuracy}%</td>
                    <td className="p-4 font-mono text-xs text-slate-400">{row.username}</td>
                    <td className="p-4 text-slate-400">{row.createdAt}</td>
                  </tr>
                ))}
                {!loading && reportRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500">ยังไม่มีผู้ใช้เครือข่ายภายนอก</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {loading && (
            <div className="p-10 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลดข้อมูล...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
