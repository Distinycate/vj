'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Search, CheckCircle2, Clock, AlertCircle, X, ChevronRight,
  ArrowLeft, RefreshCw, Sparkles, Bell, Trophy, BookOpen, User, Eye, Calendar
} from 'lucide-react';
import { calculateTargetStages } from '@/lib/events/remedialEventsRegistry';

export default function RemedialEventManager({ teacher }: { teacher: any }) {
  const [runs, setRuns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Term Filter
  const [termFilter, setTermFilter] = useState<string>('all');

  // Selected Run for Inspection
  const [inspectRunId, setInspectRunId] = useState<string | null>(null);
  const [inspectData, setInspectData] = useState<any | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectSearch, setInspectSearch] = useState('');
  const [inspectStatusFilter, setInspectStatusFilter] = useState<'all' | 'passed' | 'in_progress' | 'not_started'>('all');

  // Create Run Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('event-01-verb-master-challenge');
  const [runTitle, setRunTitle] = useState('');
  const [createAcademicYear, setCreateAcademicYear] = useState<string>('2567-T2');
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [classroomsList, setClassroomsList] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  // Map of studentId -> { selected: boolean, originalScore: number | '', targetStages: number }
  const [participantConfigs, setParticipantConfigs] = useState<Record<string, { selected: boolean; originalScore: number | ''; targetStages: number }>>({});
  const [submittingRun, setSubmittingRun] = useState(false);

  // Load runs list
  const loadRuns = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      let url = '/api/events/runs';
      if (termFilter && termFilter !== 'all') {
        url += `?academicYear=${encodeURIComponent(termFilter)}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('โหลดรายการ Event ไม่สำเร็จ');
      const json = await res.json();
      if (json.success) {
        setRuns(json.runs || []);
        setTemplates(json.templates || []);
        setUnreadTotal(json.unreadPassedTotal || 0);
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  }, [termFilter]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  // Load classrooms and students for modal
  const loadClassroomsAndStudents = async () => {
    try {
      const [resClass, resStudents] = await Promise.all([
        fetch('/api/admin/classrooms').then(r => r.ok ? r.json() : { classrooms: [] }).catch(() => ({ classrooms: [] })),
        fetch('/api/admin/students').then(r => r.ok ? r.json() : { students: [] }).catch(() => ({ students: [] })),
      ]);

      const cList = resClass.classrooms || [];
      const sList = resStudents.students || [];
      setClassroomsList(cList);
      setStudentsList(sList);
    } catch (e) {
      console.warn('Failed to load classrooms/students for modal:', e);
    }
  };

  // Inspect run detail
  const handleInspectRun = async (runId: string) => {
    setInspectRunId(runId);
    setInspectLoading(true);
    try {
      const res = await fetch(`/api/events/runs/${runId}`);
      if (!res.ok) throw new Error('โหลดรายละเอียด Event ไม่สำเร็จ');
      const json = await res.json();
      if (json.success) {
        setInspectData(json);
        // Mark seen
        await fetch(`/api/events/runs/${runId}/mark-seen`, { method: 'POST' }).catch(() => {});
        // Refresh unread counts in background
        loadRuns();
      }
    } catch (e: any) {
      setError(e.message || 'เกิดข้อผิดพลาด');
    } finally {
      setInspectLoading(false);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = async () => {
    setShowCreateModal(true);
    setCreateStep(1);
    setSelectedTemplateId('event-01-verb-master-challenge');
    setRunTitle('Verb Master Challenge แก้ 0 ภาคเรียนที่ 1/2569');
    setSelectedClassroomId('');
    setParticipantConfigs({});
    await loadClassroomsAndStudents();
  };

  // Filter students for selection in modal
  const filteredStudentsForCreate = useMemo(() => {
    return studentsList.filter(s => {
      if (selectedClassroomId && s.classroom_id !== selectedClassroomId) return false;
      if (studentSearch.trim()) {
        const q = studentSearch.toLowerCase();
        const name = (s.student_name || s.username || '').toLowerCase();
        const code = (s.student_id || '').toLowerCase();
        if (!name.includes(q) && !code.includes(q)) return false;
      }
      return true;
    });
  }, [studentsList, selectedClassroomId, studentSearch]);

  // Handle select all students in current filtered view
  const handleToggleSelectAll = (select: boolean) => {
    const updated = { ...participantConfigs };
    filteredStudentsForCreate.forEach(s => {
      if (!updated[s.id]) {
        updated[s.id] = { selected: select, originalScore: '', targetStages: 15 };
      } else {
        updated[s.id].selected = select;
      }
    });
    setParticipantConfigs(updated);
  };

  // Handle score change for student
  const handleScoreChange = (studentId: string, valStr: string) => {
    const updated = { ...participantConfigs };
    if (!updated[studentId]) {
      updated[studentId] = { selected: true, originalScore: '', targetStages: 15 };
    }
    if (valStr === '') {
      updated[studentId].originalScore = '';
      updated[studentId].targetStages = 15;
    } else {
      const num = parseFloat(valStr);
      updated[studentId].originalScore = isNaN(num) ? '' : num;
      updated[studentId].targetStages = calculateTargetStages(isNaN(num) ? null : num);
    }
    setParticipantConfigs(updated);
  };

  // Handle target override
  const handleTargetOverride = (studentId: string, targetVal: number) => {
    const updated = { ...participantConfigs };
    if (!updated[studentId]) {
      updated[studentId] = { selected: true, originalScore: '', targetStages: targetVal };
    } else {
      updated[studentId].targetStages = Math.max(1, Math.min(15, targetVal));
    }
    setParticipantConfigs(updated);
  };

  // Selected count
  const selectedCount = useMemo(() => {
    return Object.values(participantConfigs).filter(c => c.selected).length;
  }, [participantConfigs]);

  // Submit Create Run
  const handleCreateRunSubmit = async () => {
    if (!runTitle.trim()) {
      alert('กรุณากรอกชื่อรอบกิจกรรม');
      return;
    }
    const selectedParticipants = Object.entries(participantConfigs)
      .filter(([_, conf]) => conf.selected)
      .map(([studentId, conf]) => ({
        studentId,
        originalScore: conf.originalScore === '' ? null : Number(conf.originalScore),
        targetStages: conf.targetStages || 15,
      }));

    if (selectedParticipants.length === 0) {
      alert('กรุณาเลือกนักเรียนอย่างน้อย 1 คน');
      return;
    }

    setSubmittingRun(true);
    try {
      const res = await fetch('/api/events/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          title: runTitle.trim(),
          classroomId: selectedClassroomId || null,
          academicYear: createAcademicYear || '2567-T2',
          participants: selectedParticipants,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'สร้าง Event Run ไม่สำเร็จ');
      }

      setShowCreateModal(false);
      await loadRuns();
      if (json.runId) {
        handleInspectRun(json.runId);
      }
    } catch (err: any) {
      alert(`ข้อผิดพลาด: ${err.message}`);
    } finally {
      setSubmittingRun(false);
    }
  };

  // Filter participants in Inspect view
  const filteredInspectParticipants = useMemo(() => {
    if (!inspectData?.participants) return [];
    return inspectData.participants.filter((p: any) => {
      if (inspectStatusFilter !== 'all' && p.status !== inspectStatusFilter) return false;
      if (inspectSearch.trim()) {
        const q = inspectSearch.toLowerCase();
        const name = (p.name || '').toLowerCase();
        const code = (p.studentCode || '').toLowerCase();
        if (!name.includes(q) && !code.includes(q)) return false;
      }
      return true;
    });
  }, [inspectData, inspectStatusFilter, inspectSearch]);

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW: INSPECT EVENT RUN
  // ──────────────────────────────────────────────────────────────────────────
  if (inspectRunId && inspectData) {
    const { run, summary } = inspectData;

    return (
      <div className="space-y-6">
        {/* Back and Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-3xl border border-slate-800">
          <div>
            <button
              onClick={() => { setInspectRunId(null); setInspectData(null); }}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> กลับหน้ารวม Event Run
            </button>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{run.icon || '⭐'}</span>
              <div>
                <h2 className="text-2xl font-black text-white">{run.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  เทมเพลต: <strong className="text-slate-300">{run.titleTh}</strong> | ห้อง: <strong className="text-slate-300">{run.className}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleInspectRun(inspectRunId)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" /> รีเฟรชผล
            </button>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase">ผู้เข้าร่วมทั้งหมด</span>
            <div className="text-3xl font-black text-white mt-1">{summary.total} <span className="text-sm font-normal text-slate-400">คน</span></div>
          </div>
          <div className="bg-emerald-950/20 p-4 rounded-2xl border border-emerald-500/20">
            <span className="text-xs font-bold text-emerald-400 uppercase">ผ่านเกณฑ์แล้ว</span>
            <div className="text-3xl font-black text-emerald-400 mt-1">{summary.passed} <span className="text-sm font-normal text-emerald-300/70">คน</span></div>
          </div>
          <div className="bg-amber-950/20 p-4 rounded-2xl border border-amber-500/20">
            <span className="text-xs font-bold text-amber-400 uppercase">กำลังทำภารกิจ</span>
            <div className="text-3xl font-black text-amber-400 mt-1">{summary.inProgress} <span className="text-sm font-normal text-amber-300/70">คน</span></div>
          </div>
          <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700/40">
            <span className="text-xs font-bold text-slate-400 uppercase">ยังไม่เริ่มเล่น</span>
            <div className="text-3xl font-black text-slate-400 mt-1">{summary.notStarted} <span className="text-sm font-normal text-slate-500">คน</span></div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อหรือรหัสนักเรียน..."
              value={inspectSearch}
              onChange={e => setInspectSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            {(['all', 'passed', 'in_progress', 'not_started'] as const).map(st => (
              <button
                key={st}
                onClick={() => setInspectStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  inspectStatusFilter === st
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                {st === 'all' && `ทั้งหมด (${summary.total})`}
                {st === 'passed' && `ผ่านแล้ว (${summary.passed})`}
                {st === 'in_progress' && `กำลังทำ (${summary.inProgress})`}
                {st === 'not_started' && `ยังไม่เริ่ม (${summary.notStarted})`}
              </button>
            ))}
          </div>
        </div>

        {/* Participants Table */}
        <div className="bg-slate-900/40 rounded-3xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">นักเรียน</th>
                  <th className="p-4 text-center">ห้อง</th>
                  <th className="p-4 text-center">คะแนนเดิม</th>
                  <th className="p-4 text-center">Target (ด่าน)</th>
                  <th className="p-4 text-center">ความคืบหน้า</th>
                  <th className="p-4 text-center">Attempts</th>
                  <th className="p-4 text-center">สถานะ</th>
                  <th className="p-4 text-right">สำเร็จเมื่อ / ล่าสุด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredInspectParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      ไม่พบข้อมูลนักเรียนที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  filteredInspectParticipants.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-white flex items-center gap-2">
                          {p.name}
                          {!p.teacherSeen && p.status === 'passed' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950 animate-pulse">
                              ใหม่
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{p.studentCode}</div>
                      </td>
                      <td className="p-4 text-center font-medium text-slate-400">{p.className}</td>
                      <td className="p-4 text-center">
                        {p.originalScore !== null && p.originalScore !== undefined ? (
                          <span className="px-2 py-1 rounded-md bg-rose-500/10 text-rose-400 font-mono font-bold">
                            {p.originalScore}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center font-bold text-amber-400">
                        {p.targetStages} ด่าน
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-1.5 font-bold">
                          <span className={p.completedStages >= p.targetStages ? 'text-emerald-400' : 'text-slate-200'}>
                            {p.completedStages}
                          </span>
                          <span className="text-slate-500">/</span>
                          <span>{p.targetStages}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center font-mono text-slate-400">
                        {p.totalAttempts || 0}
                      </td>
                      <td className="p-4 text-center">
                        {p.status === 'passed' && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> ผ่านแล้ว
                          </span>
                        )}
                        {p.status === 'in_progress' && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> กำลังทำ
                          </span>
                        )}
                        {p.status === 'not_started' && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 inline-flex items-center gap-1">
                            ⚪ ยังไม่เริ่ม
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right text-slate-400 font-mono text-[11px]">
                        {p.completedAt
                          ? new Date(p.completedAt).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' })
                          : p.lastActive
                          ? new Date(p.lastActive).toLocaleDateString('th-TH')
                          : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW: EVENT RUNS LIST (MAIN)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950/40 p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="text-amber-400 w-5 h-5" /> ระบบกิจกรรมซ่อมเสริม & แก้ 0 (Remedial Events)
            </h2>
            {unreadTotal > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500 text-slate-950 flex items-center gap-1">
                <Bell className="w-3 h-3" /> {unreadTotal} คนผ่านใหม่
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            สร้างรอบกิจกรรม กำหนดเป้าหมายด่านตามคะแนนสอบเดิม และติดตามผลงานเพื่อปลดผลการเรียน
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" /> สร้าง Event ครั้งใหม่
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400">
          {error}
        </div>
      )}

      {/* Term Filter Toolbar */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-400">ภาคเรียน:</span>
          <select
            value={termFilter}
            onChange={e => setTermFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-cyan-500"
          >
            <option value="all">ทุกภาคเรียนทั้งหมด (All Terms)</option>
            <option value="2567-T2">ภาคเรียนที่ 2/2567 (ปัจจุบัน)</option>
            <option value="2567-T1">ภาคเรียนที่ 1/2567 (ย้อนหลัง)</option>
            <option value="2568-T1">ภาคเรียนที่ 1/2568</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          รอบกิจกรรมทั้งหมด: <strong className="text-white">{runs.length}</strong> รอบ
        </div>
      </div>

      {/* Runs Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 text-xs">กำลังโหลดรายการ Event Runs...</div>
      ) : runs.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 rounded-3xl border border-slate-800">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">ยังไม่มีการสร้างรอบกิจกรรม</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            กดปุ่ม "สร้าง Event ครั้งใหม่" เพื่อเปิดรอบกิจกรรมซ่อมเสริมให้นักเรียนที่ต้องแก้ 0 ได้ทันที
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {runs.map(run => (
            <div
              key={run.id}
              className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all hover:-translate-y-1 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-2xl shadow-inner">
                    {run.icon || '⭐'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                      {run.academicYear === '2567-T1' ? 'เทอม 1/2567' : run.academicYear === '2567-T2' ? 'เทอม 2/2567' : run.academicYear || 'เทอม 2/2567'}
                    </span>
                    {run.summary?.unreadPassed > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950 animate-pulse flex items-center gap-1">
                        <Bell className="w-3 h-3" /> ผ่านใหม่ {run.summary.unreadPassed}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-black text-white mt-3 line-clamp-1">{run.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                  {run.titleTh} • <span className="text-slate-300 font-medium">{run.className}</span>
                </p>

                <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-center">
                  <div className="bg-slate-950/40 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">ทั้งหมด</span>
                    <strong className="text-xs text-white">{run.summary?.total || 0}</strong>
                  </div>
                  <div className="bg-emerald-950/20 p-2 rounded-xl">
                    <span className="text-[10px] text-emerald-400 block">ผ่านแล้ว</span>
                    <strong className="text-xs text-emerald-400">{run.summary?.passed || 0}</strong>
                  </div>
                  <div className="bg-amber-950/20 p-2 rounded-xl">
                    <span className="text-[10px] text-amber-400 block">กำลังทำ</span>
                    <strong className="text-xs text-amber-400">{run.summary?.inProgress || 0}</strong>
                  </div>
                  <div className="bg-slate-950/40 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">ยังไม่เริ่ม</span>
                    <strong className="text-xs text-slate-400">{run.summary?.notStarted || 0}</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleInspectRun(run.id)}
                className="mt-5 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" /> ตรวจสอบ Event ({run.summary?.total || 0} คน)
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL: CREATE NEW EVENT RUN
          ────────────────────────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" /> สร้าง Event ครั้งใหม่ (Event Run)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ขั้นตอนที่ {createStep}/3: {createStep === 1 ? 'เลือกเทมเพลตข้อสอบ' : createStep === 2 ? 'ตั้งชื่อ & เลือกห้องเรียน' : 'เลือกนักเรียนและตั้งเป้าหมาย'}
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* STEP 1: Select Template */}
              {createStep === 1 && (
                <div className="space-y-4">
                  <span className="text-xs font-bold text-slate-300 block">เลือก Event Template (Fixed Content 15 ด่าน):</span>
                  <div className="space-y-3">
                    {templates.map(tmpl => {
                      const isSel = selectedTemplateId === tmpl.eventId;
                      return (
                        <div
                          key={tmpl.eventId}
                          onClick={() => setSelectedTemplateId(tmpl.eventId)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-4 ${
                            isSel
                              ? 'bg-cyan-500/10 border-cyan-500 shadow-md shadow-cyan-500/10'
                              : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-3xl">{tmpl.icon || '⭐'}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">{tmpl.title}</h4>
                              <span className="text-xs text-slate-400">({tmpl.titleTh})</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{tmpl.description}</p>
                          </div>
                          <div className="text-right">
                            <span className="px-2.5 py-1 bg-slate-800 rounded-lg text-[10px] font-bold text-slate-300 block">
                              15 ด่าน (150 ข้อ)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2: Name & Classroom */}
              {createStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">ชื่อรอบกิจกรรม (Event Run Title):</label>
                    <input
                      type="text"
                      value={runTitle}
                      onChange={e => setRunTitle(e.target.value)}
                      placeholder="เช่น Verb Master Challenge แก้ 0 ม.2 ภาคเรียน 2/2567"
                      className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">ภาคเรียนที่จัดกิจกรรม (Academic Year / Term):</label>
                    <select
                      value={createAcademicYear}
                      onChange={e => setCreateAcademicYear(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="2567-T2">ภาคเรียนที่ 2/2567 (ปัจจุบัน)</option>
                      <option value="2567-T1">ภาคเรียนที่ 1/2567 (ย้อนหลัง)</option>
                      <option value="2568-T1">ภาคเรียนที่ 1/2568</option>
                      <option value="2568-T2">ภาคเรียนที่ 2/2568</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">กรองตามห้องเรียน (หรือเลือกทุกห้อง):</label>
                    <select
                      value={selectedClassroomId}
                      onChange={e => setSelectedClassroomId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">-- แสดงนักเรียนทุกห้องเรียน --</option>
                      {classroomsList.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.class_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 3: Student Selection & Target Stages */}
              {createStep === 3 && (
                <div className="space-y-4">
                  {/* Criteria Helper Box */}
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl text-[11px] text-slate-300 space-y-1">
                    <div className="font-bold text-cyan-400">เกณฑ์คำนวณจำนวนด่านอัตโนมัติจากคะแนนเดิม (&lt; 40):</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-[10px] text-slate-400">
                      <span>• 35–39 คะแนน → 5 ด่าน</span>
                      <span>• 30–34 คะแนน → 7 ด่าน</span>
                      <span>• 20–29 คะแนน → 9 ด่าน</span>
                      <span>• 10–19 คะแนน → 12 ด่าน</span>
                      <span>• 0–9 คะแนน → 15 ด่าน</span>
                      <span className="text-amber-400">• ครูปรับจำนวนด่านเองได้</span>
                    </div>
                  </div>

                  {/* Student Search & Select All */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="ค้นหาชื่อหรือรหัส..."
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectAll(true)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold"
                      >
                        เลือกทั้งหมด
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleSelectAll(false)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg font-bold"
                      >
                        ยกเลิกทั้งหมด
                      </button>
                    </div>
                  </div>

                  {/* Students List with Checkbox & Target Setting */}
                  <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950/40">
                    {filteredStudentsForCreate.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">ไม่พบนักเรียนในเงื่อนไขที่เลือก</div>
                    ) : (
                      filteredStudentsForCreate.map(student => {
                        const conf = participantConfigs[student.id] || { selected: false, originalScore: '', targetStages: 15 };
                        const displayName = student.student_name || student.username || 'นักเรียน';

                        return (
                          <div
                            key={student.id}
                            className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors ${
                              conf.selected ? 'bg-cyan-950/15' : 'hover:bg-slate-900/40'
                            }`}
                          >
                            <label className="flex items-center gap-2.5 flex-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={conf.selected}
                                onChange={e => {
                                  const updated = { ...participantConfigs };
                                  if (!updated[student.id]) {
                                    updated[student.id] = { selected: e.target.checked, originalScore: '', targetStages: 15 };
                                  } else {
                                    updated[student.id].selected = e.target.checked;
                                  }
                                  setParticipantConfigs(updated);
                                }}
                                className="w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-slate-800 border-slate-700"
                              />
                              <div>
                                <div className="font-bold text-white">{displayName}</div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {student.student_id || ''} • {student.classroom_name || ''}
                                </div>
                              </div>
                            </label>

                            {conf.selected && (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-slate-400">คะแนนเดิม:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder="เช่น 25"
                                    value={conf.originalScore}
                                    onChange={e => handleScoreChange(student.id, e.target.value)}
                                    className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-md text-xs text-white text-center font-mono focus:outline-none focus:border-cyan-500"
                                  />
                                </div>

                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-slate-400">เป้าหมาย:</span>
                                  <select
                                    value={conf.targetStages}
                                    onChange={e => handleTargetOverride(student.id, parseInt(e.target.value, 10))}
                                    className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-md text-xs text-amber-400 font-bold focus:outline-none focus:border-cyan-500"
                                  >
                                    {Array.from({ length: 15 }, (_, i) => i + 1).map(n => (
                                      <option key={n} value={n}>
                                        {n} ด่าน
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="text-right text-xs text-slate-400">
                    เลือกนักเรียนเข้าร่วมแล้ว: <strong className="text-cyan-400">{selectedCount}</strong> คน
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              {createStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCreateStep((createStep - 1) as any)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  ย้อนกลับ
                </button>
              ) : <div />}

              {createStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setCreateStep((createStep + 1) as any)}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1 transition-all"
                >
                  ถัดไป <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submittingRun || selectedCount === 0}
                  onClick={handleCreateRunSubmit}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                >
                  {submittingRun ? 'กำลังเปิด Event...' : `เปิด Event (${selectedCount} คน)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
