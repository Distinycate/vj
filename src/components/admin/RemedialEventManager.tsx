'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Search, CheckCircle2, Clock, AlertCircle, X, ChevronRight,
  ArrowLeft, RefreshCw, Sparkles, Bell, Trophy, BookOpen, User, Eye, Calendar,
  Trash2, Lock, Unlock, ClipboardList, CheckSquare, Square, Filter, Users,
  Check, AlertTriangle
} from 'lucide-react';
import { calculateTargetStages } from '@/lib/events/remedialEventsRegistry';

export default function RemedialEventManager({ teacher }: { teacher: any }) {
  const [runs, setRuns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters for Main Runs List
  const [termFilter, setTermFilter] = useState<string>('2567-T2');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('active');

  // Selected Run for Inspection
  const [inspectRunId, setInspectRunId] = useState<string | null>(null);
  const [inspectData, setInspectData] = useState<any | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectSearch, setInspectSearch] = useState('');
  const [addingStudents, setAddingStudents] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
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
  const [selectionViewFilter, setSelectionViewFilter] = useState<'all' | 'selected' | 'unselected'>('all');

  // Quick Paste / Bulk Input tool state
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteFeedback, setPasteFeedback] = useState<{ matched: number; notFound: string[] } | null>(null);

  // Map of studentId -> { selected: boolean, originalScore: number | '', targetStages: number }
  const [participantConfigs, setParticipantConfigs] = useState<Record<string, { selected: boolean; originalScore: number | ''; targetStages: number }>>({});
  const [submittingRun, setSubmittingRun] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  // Load runs list
  const loadRuns = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      let url = '/api/events/runs';
      const params = new URLSearchParams();
      if (termFilter && termFilter !== 'all') {
        params.append('academicYear', termFilter);
      }
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      const queryStr = params.toString();
      if (queryStr) url += `?${queryStr}`;

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
  }, [termFilter, statusFilter]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  // Load classrooms and students (strictly current active internal students)
  const loadClassroomsAndStudents = async () => {
    try {
      const response = await fetch('/api/admin/students?academicYear=2567-T2&userType=INTERNAL&isActive=true');
      if (!response.ok) throw new Error('โหลดรายชื่อนักเรียนไม่สำเร็จ');
      const resStudents = await response.json();
      // Ensure only internal active students of 2567-T2
      const sList = (resStudents.students || []).filter((s: any) =>
        s.user_type === 'INTERNAL' &&
        s.is_active !== false &&
        (!s.academic_year || s.academic_year === '2567-T2')
      );

      const classrooms = new Map<string, string>();
      sList.forEach((s: any) => {
        const room = Array.isArray(s.classrooms) ? s.classrooms[0] : s.classrooms;
        if (s.classroom_id && room?.class_name) {
          classrooms.set(s.classroom_id, room.class_name);
        }
      });

      const sortedRooms = Array.from(classrooms, ([id, class_name]) => ({ id, class_name }))
        .sort((a, b) => a.class_name.localeCompare(b.class_name, 'th'));

      setClassroomsList(sortedRooms);
      setStudentsList(sList);
    } catch (e) {
      console.warn('Failed to load classrooms/students for modal:', e);
      setStudentsList([]);
      setClassroomsList([]);
      alert('โหลดรายชื่อนักเรียนไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  // Toggle Run Status (Active <-> Closed)
  const handleToggleRunStatus = async (runId: string, currentStatus: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextStatus = currentStatus === 'active' ? 'closed' : 'active';
    const confirmMsg = nextStatus === 'closed'
      ? 'ต้องการ "ปิดกิจกรรม" นี้ใช่หรือไม่?\n(เมื่อปิดแล้ว กิจกรรมจะถูกซ่อนออกจากหน้าเด็ก และเด็กจะไม่สามารถเข้าเล่นได้ชั่วคราว)'
      : 'ต้องการ "เปิดกิจกรรม" นี้อีกครั้งใช่หรือไม่?';

    if (!window.confirm(confirmMsg)) return;

    setActionBusyId(runId);
    try {
      const res = await fetch(`/api/events/runs/${runId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'เปลี่ยนสถานะไม่สำเร็จ');

      await loadRuns();
      if (inspectRunId === runId && inspectData) {
        setInspectData((prev: any) => ({
          ...prev,
          run: { ...prev.run, status: nextStatus },
        }));
      }
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
    } finally {
      setActionBusyId(null);
    }
  };

  // Delete entire Event Run
  const handleDeleteRun = async (runId: string, runTitle: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`⚠️ ยืนยันการลบรอบกิจกรรม "${runTitle}" หรือไม่?\n\nข้อมูลรอบกิจกรรม ประวัติการเล่น และผลการแก้ 0 ในรอบนี้จะถูกลบทั้งหมดและไม่สามารถกู้คืนได้`)) {
      return;
    }

    setActionBusyId(runId);
    try {
      const res = await fetch(`/api/events/runs/${runId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'ลบรอบกิจกรรมไม่สำเร็จ');

      alert('ลบรอบกิจกรรมสำเร็จเรียบร้อย');
      if (inspectRunId === runId) {
        setInspectRunId(null);
        setInspectData(null);
      }
      await loadRuns();
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการลบกิจกรรม');
    } finally {
      setActionBusyId(null);
    }
  };

  // Delete single participant from run
  const handleDeleteParticipant = async (participantId: string, studentName: string) => {
    if (!inspectRunId) return;
    if (!window.confirm(`ต้องการนำนักเรียน "${studentName}" ออกจากรอบกิจกรรมนี้ใช่หรือไม่?`)) return;

    try {
      const res = await fetch(`/api/events/runs/${inspectRunId}?participantId=${participantId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'ลบนักเรียนไม่สำเร็จ');
      await handleInspectRun(inspectRunId);
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาด');
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
    setRunTitle('Verb Master Challenge แก้ 0 ภาคเรียนที่ 2/2567');
    setSelectedClassroomId('');
    setStudentSearch('');
    setSelectionViewFilter('all');
    setShowPasteBox(false);
    setPasteText('');
    setPasteFeedback(null);
    setParticipantConfigs({});
    await loadClassroomsAndStudents();
  };

  // Filter students for selection in modal & add panel
  const filteredStudentsForCreate = useMemo(() => {
    return studentsList.filter(s => {
      // Room filter
      if (selectedClassroomId && s.classroom_id !== selectedClassroomId) return false;

      // Selection state filter
      const isSelected = !!participantConfigs[s.id]?.selected;
      if (selectionViewFilter === 'selected' && !isSelected) return false;
      if (selectionViewFilter === 'unselected' && isSelected) return false;

      // Text search
      if (studentSearch.trim()) {
        const q = studentSearch.toLowerCase();
        const name = (s.student_name || s.username || '').toLowerCase();
        const code = (s.student_id || '').toLowerCase();
        if (!name.includes(q) && !code.includes(q)) return false;
      }
      return true;
    });
  }, [studentsList, selectedClassroomId, selectionViewFilter, studentSearch, participantConfigs]);

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

  // Handle select all in a specific classroom
  const handleSelectClassroomAll = (classroomId: string, select: boolean) => {
    const updated = { ...participantConfigs };
    studentsList
      .filter(s => s.classroom_id === classroomId)
      .forEach(s => {
        if (!updated[s.id]) {
          updated[s.id] = { selected: select, originalScore: '', targetStages: 15 };
        } else {
          updated[s.id].selected = select;
        }
      });
    setParticipantConfigs(updated);
  };

  // Handle Quick Paste Matching
  const handleBatchMatchAndSelect = () => {
    if (!pasteText.trim()) return;
    const tokens = pasteText
      .split(/[\n,\t;]+/)
      .map(t => t.trim())
      .filter(Boolean);

    if (tokens.length === 0) return;

    const notFound: string[] = [];
    let matchedCount = 0;
    const updated = { ...participantConfigs };

    tokens.forEach(tok => {
      const q = tok.toLowerCase();
      // Match 4-digit student code, username, or name
      const matched = studentsList.find(s => {
        const code = (s.student_id || '').toLowerCase();
        const user = (s.username || '').toLowerCase();
        const name = (s.student_name || '').toLowerCase();
        return code === q || user === q || name === q || name.includes(q);
      });

      if (matched) {
        if (!updated[matched.id]) {
          updated[matched.id] = { selected: true, originalScore: '', targetStages: 15 };
        } else {
          updated[matched.id].selected = true;
        }
        matchedCount++;
      } else {
        notFound.push(tok);
      }
    });

    setParticipantConfigs(updated);
    setPasteFeedback({ matched: matchedCount, notFound });
  };

  // Batch set target stages for all currently selected students
  const handleBatchSetTargetStages = (stages: number) => {
    const updated = { ...participantConfigs };
    Object.keys(updated).forEach(id => {
      if (updated[id]?.selected) {
        updated[id].targetStages = stages;
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

  // Add participants inside inspect view
  const handleAddParticipants = async () => {
    const participants = Object.entries(participantConfigs)
      .filter(([, c]) => c.selected)
      .map(([studentId, c]) => ({
        studentId,
        originalScore: c.originalScore === '' ? null : Number(c.originalScore),
        targetStages: c.targetStages,
      }));

    if (!inspectRunId || !participants.length) return;
    setAddBusy(true);
    try {
      const res = await fetch(`/api/events/runs/${inspectRunId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'เพิ่มนักเรียนไม่สำเร็จ');
      setAddingStudents(false);
      await handleInspectRun(inspectRunId);
      alert(`เพิ่มนักเรียนเข้ารอบสำเร็จแล้ว ${json.added} คน`);
    } catch (err: any) {
      alert(err.message || 'เพิ่มนักเรียนไม่สำเร็จ');
    } finally {
      setAddBusy(false);
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
    const isClosed = run.status === 'closed';

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
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-white">{run.title}</h2>
                  {isClosed ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" /> ปิดกิจกรรมแล้ว
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> กำลังเปิดใช้งาน
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  เทมเพลต: <strong className="text-slate-300">{run.titleTh}</strong> | ห้อง: <strong className="text-slate-300">{run.className}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isClosed && (
              <button
                onClick={async () => {
                  setParticipantConfigs({});
                  setStudentSearch('');
                  setSelectedClassroomId('');
                  setShowPasteBox(false);
                  setPasteText('');
                  setPasteFeedback(null);
                  setAddingStudents(true);
                  await loadClassroomsAndStudents();
                }}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> เพิ่มนักเรียนเข้ารอบ
              </button>
            )}

            {/* Close / Reopen Button */}
            <button
              disabled={actionBusyId === run.id}
              onClick={(e) => handleToggleRunStatus(run.id, run.status, e)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors ${
                isClosed
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              {isClosed ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {isClosed ? 'เปิดกิจกรรมอีกครั้ง' : 'ปิดกิจกรรมนี้'}
            </button>

            {/* Delete Button */}
            <button
              disabled={actionBusyId === run.id}
              onClick={(e) => handleDeleteRun(run.id, run.title, e)}
              className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> ลบรอบนี้
            </button>

            <button
              onClick={() => handleInspectRun(inspectRunId)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" /> รีเฟรชผล
            </button>
          </div>
        </div>

        {/* Drawer: Add Students into Active Run */}
        {addingStudents && (
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" /> เพิ่มนักเรียนเข้ากิจกรรมรอบนี้ (เฉพาะนักเรียนปัจจุบัน)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">เลือกนักเรียนที่ต้องแก้ 0 เพื่อเปิดด่านภารกิจให้ทำ</p>
              </div>
              <button
                onClick={() => setAddingStudents(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Paste Tool */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-cyan-400" /> นำเข้ารายชื่อด่วน (วางรหัสนักเรียน 4 หลัก หรือชื่อจาก Excel)
                </span>
                <button
                  type="button"
                  onClick={() => setShowPasteBox(!showPasteBox)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-bold"
                >
                  {showPasteBox ? 'ซ่อนกล่องวางข้อความ' : '+ เปิดกล่องวางข้อความ'}
                </button>
              </div>

              {showPasteBox && (
                <div className="space-y-3 mt-3">
                  <textarea
                    rows={3}
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    placeholder="วางรหัสนักเรียน เช่น 4785, 4909, 5058 หรือคัดลอกทั้งคอลัมน์จาก Excel มาวางได้เลย"
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleBatchMatchAndSelect}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black rounded-xl transition-all"
                    >
                      จับคู่และเลือกทันที
                    </button>
                    {pasteFeedback && (
                      <span className="text-xs text-emerald-400 font-bold">
                        ✓ เลือกได้ {pasteFeedback.matched} คน {pasteFeedback.notFound.length > 0 && `(ไม่พบ ${pasteFeedback.notFound.length} รายการ)`}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Classroom Quick Select & Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-2xl border border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400">เลือกด่วนตามห้อง:</span>
                {classroomsList.map(c => {
                  const countInRoom = studentsList.filter(s => s.classroom_id === c.id).length;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectClassroomAll(c.id, true)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700"
                    >
                      + เลือกทั้งห้อง {c.class_name} ({countInRoom} คน)
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBatchSetTargetStages(5)}
                  className="px-2.5 py-1 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-bold rounded-lg border border-amber-500/20"
                >
                  ตั้งเป้า 5 ด่านทุกคน
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchSetTargetStages(15)}
                  className="px-2.5 py-1 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 text-xs font-bold rounded-lg border border-cyan-500/20"
                >
                  ตั้งเป้า 15 ด่านทุกคน
                </button>
              </div>
            </div>

            {/* Search and Student Checklist */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <input
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  placeholder="ค้นหาชื่อหรือรหัสนักเรียน..."
                  className="bg-slate-950 text-white rounded-xl px-3 py-2 text-xs border border-slate-800 w-64 focus:outline-none focus:border-cyan-500"
                />
                <div className="text-xs text-slate-400">
                  เลือกแล้ว: <strong className="text-cyan-400 font-bold">{selectedCount}</strong> คน
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 border border-slate-800 rounded-2xl p-3 bg-slate-950/40">
                {filteredStudentsForCreate
                  .filter(s => !inspectData.participants.some((p: any) => p.studentId === s.id))
                  .map(s => {
                    const c = participantConfigs[s.id] || { selected: false, originalScore: '', targetStages: 15 };
                    return (
                      <div
                        key={s.id}
                        className={`p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs transition-colors ${
                          c.selected ? 'bg-cyan-950/20 border-cyan-500/30' : 'bg-slate-900/40 border-slate-800'
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-[200px]">
                          <input
                            type="checkbox"
                            checked={c.selected}
                            onChange={e => setParticipantConfigs(prev => ({
                              ...prev,
                              [s.id]: { ...c, selected: e.target.checked }
                            }))}
                            className="rounded text-cyan-500 bg-slate-950 border-slate-700"
                          />
                          <div>
                            <span className="font-bold text-white">{s.student_name || s.username}</span>
                            <span className="text-[10px] text-slate-400 ml-2 font-mono">
                              รหัส: {s.student_id} ({s.classrooms?.class_name || 'ม.ต้น'})
                            </span>
                          </div>
                        </label>

                        {c.selected && (
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1 text-[11px] text-slate-300">
                              คะแนนเดิม:
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={c.originalScore}
                                onChange={e => handleScoreChange(s.id, e.target.value)}
                                className="w-16 bg-slate-950 border border-slate-700 rounded-md p-1 text-center font-mono text-white"
                              />
                            </label>
                            <label className="flex items-center gap-1 text-[11px] text-slate-300">
                              เป้าหมาย:
                              <select
                                value={c.targetStages}
                                onChange={e => handleTargetOverride(s.id, Number(e.target.value))}
                                className="bg-slate-950 border border-slate-700 rounded-md p-1 text-amber-400 font-bold"
                              >
                                {Array.from({ length: 15 }, (_, i) => (
                                  <option key={i + 1} value={i + 1}>{i + 1} ด่าน</option>
                                ))}
                              </select>
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setAddingStudents(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                ยกเลิก
              </button>
              <button
                disabled={addBusy || selectedCount === 0}
                onClick={handleAddParticipants}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20"
              >
                {addBusy ? 'กำลังบันทึก...' : `บันทึกเพิ่มนักเรียน ${selectedCount} คน`}
              </button>
            </div>
          </div>
        )}

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
                  <th className="p-4 text-center">สำเร็จเมื่อ / ล่าสุด</th>
                  <th className="p-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredInspectParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
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
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">รหัส: {p.studentCode}</div>
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
                      <td className="p-4 text-center text-slate-400 font-mono text-[11px]">
                        {p.completedAt
                          ? new Date(p.completedAt).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' })
                          : p.lastActive
                          ? new Date(p.lastActive).toLocaleDateString('th-TH')
                          : '-'}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDeleteParticipant(p.id, p.name)}
                          title="ลบนักเรียนออกจากรอบนี้"
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
            สร้างรอบกิจกรรม กำหนดเป้าหมายด่านตามคะแนนสอบเดิม ปิดหรือลบกิจกรรมที่เสร็จสิ้น และติดตามผลแก้ 0
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
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Filter Toolbar (Term & Status Tabs) */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Status Tabs: Active (Default) vs Closed vs All */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === 'active'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> กำลังเปิด (Active)
            </button>
            <button
              onClick={() => setStatusFilter('closed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === 'closed'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-3 h-3 text-slate-400" /> ปิดแล้ว (Closed)
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ทั้งหมด (All)
            </button>
          </div>

          {/* Academic Term Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <select
              value={termFilter}
              onChange={e => setTermFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-cyan-500"
            >
              <option value="2567-T2">ภาคเรียนที่ 2/2567 (ปัจจุบัน)</option>
              <option value="all">ทุกภาคเรียน (All)</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          รอบกิจกรรมในมุมมองนี้: <strong className="text-white">{runs.length}</strong> รอบ
        </div>
      </div>

      {/* Runs Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" /> กำลังโหลดรายการ Event Runs...
        </div>
      ) : runs.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 rounded-3xl border border-slate-800 p-6">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">
            {statusFilter === 'active' ? 'ไม่มีรอบกิจกรรมที่กำลังเปิดอยู่ในขณะนี้' : 'ไม่พบรายการรอบกิจกรรม'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {statusFilter === 'active'
              ? 'รอบกิจกรรมทั้งหมดอาจเสร็จสิ้นและถูกปิดแล้ว คุณสามารถสลับแท็บ "ปิดแล้ว" หรือ "ทั้งหมด" ด้านบนเพื่อดูประวัติ'
              : 'กดปุ่ม "สร้าง Event ครั้งใหม่" เพื่อเปิดรอบกิจกรรมซ่อมเสริมให้นักเรียนที่ต้องแก้ 0 ได้ทันที'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {runs.map(run => {
            const isClosed = run.status === 'closed';

            return (
              <div
                key={run.id}
                className={`glass-card p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isClosed
                    ? 'border-slate-800/60 bg-slate-900/20 opacity-80 hover:opacity-100'
                    : 'border-slate-800 hover:border-slate-700 hover:-translate-y-1'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-2xl shadow-inner">
                      {run.icon || '⭐'}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {isClosed ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> ปิดแล้ว
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          เปิดอยู่
                        </span>
                      )}

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

                <div className="mt-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleInspectRun(run.id)}
                      className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" /> ตรวจสอบ ({run.summary?.total || 0} คน)
                    </button>

                    {/* Quick Close / Reopen Button */}
                    <button
                      disabled={actionBusyId === run.id}
                      onClick={(e) => handleToggleRunStatus(run.id, run.status, e)}
                      title={isClosed ? 'เปิดกิจกรรมอีกครั้ง' : 'ปิดกิจกรรม (ไม่ให้รก & ปิดการเข้าเล่น)'}
                      className={`p-2.5 rounded-xl border transition-colors ${
                        isClosed
                          ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700'
                      }`}
                    >
                      {isClosed ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    </button>

                    {/* Quick Delete Button */}
                    <button
                      disabled={actionBusyId === run.id}
                      onClick={(e) => handleDeleteRun(run.id, run.title, e)}
                      title="ลบรอบกิจกรรมนี้ถาวร"
                      className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL: CREATE NEW EVENT RUN
          ────────────────────────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" /> สร้าง Event ซ่อมเสริม & แก้ 0 (รอบใหม่)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ขั้นตอนที่ {createStep}/3: {createStep === 1 ? 'เลือกเทมเพลตข้อสอบ' : createStep === 2 ? 'ตั้งชื่อ & กรองห้องเรียน' : 'เลือกนักเรียนและตั้งเป้าหมายด่าน'}
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
                  <span className="text-xs font-bold text-slate-300 block">เลือกชุดข้อสอบกิจกรรม (Fixed Content 15 ด่าน):</span>
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
                      placeholder="เช่น Verb Master Challenge แก้ 0 ภาคเรียน 2/2567"
                      className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">ภาคเรียนที่จัดกิจกรรม (Academic Term):</label>
                    <select
                      value={createAcademicYear}
                      onChange={e => setCreateAcademicYear(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="2567-T2">ภาคเรียนที่ 2/2567 (ปัจจุบัน)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">กรองตามห้องเรียน:</label>
                    <select
                      value={selectedClassroomId}
                      onChange={e => setSelectedClassroomId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">-- แสดงนักเรียนทุกห้องเรียน (ม.1, ม.2, ม.3) --</option>
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
                  {/* Quick Paste / Batch Input Tool */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <ClipboardList className="w-4 h-4 text-cyan-400" /> นำเข้ารายชื่อด่วน (วางรหัสนักเรียน 4 หลัก จาก Excel / ตาราง)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPasteBox(!showPasteBox)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-bold"
                      >
                        {showPasteBox ? 'ซ่อน' : '+ เปิดช่องวางรหัส'}
                      </button>
                    </div>

                    {showPasteBox && (
                      <div className="space-y-3 pt-2">
                        <textarea
                          rows={3}
                          value={pasteText}
                          onChange={e => setPasteText(e.target.value)}
                          placeholder="วางรหัสนักเรียน 4 หลัก เช่น: 4785, 4909, 5058 หรือคัดลอกจาก Excel มาวางได้เลย"
                          className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                        />
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={handleBatchMatchAndSelect}
                            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black rounded-xl transition-all"
                          >
                            จับคู่และเลือกทันที
                          </button>
                          {pasteFeedback && (
                            <span className="text-xs text-emerald-400 font-bold">
                              ✓ เลือกได้ {pasteFeedback.matched} คน {pasteFeedback.notFound.length > 0 && `(ไม่พบ ${pasteFeedback.notFound.length} รายการ)`}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Classroom Quick Select & Batch Target Toolbar */}
                  <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-400">เลือกทั้งห้อง:</span>
                        {classroomsList.map(c => {
                          const count = studentsList.filter(s => s.classroom_id === c.id).length;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectClassroomAll(c.id, true)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700"
                            >
                              + {c.class_name} ({count} คน)
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectAll(true)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold"
                        >
                          เลือกทั้งหมด
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleSelectAll(false)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs font-bold"
                        >
                          ยกเลิกทั้งหมด
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60">
                      <span className="text-xs font-bold text-slate-400">กำหนดเป้าหมายทุกคนที่เลือก:</span>
                      <button
                        type="button"
                        onClick={() => handleBatchSetTargetStages(5)}
                        className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-bold rounded-lg border border-amber-500/20"
                      >
                        5 ด่าน
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBatchSetTargetStages(7)}
                        className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-bold rounded-lg border border-amber-500/20"
                      >
                        7 ด่าน
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBatchSetTargetStages(9)}
                        className="px-2.5 py-0.5 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 text-xs font-bold rounded-lg border border-cyan-500/20"
                      >
                        9 ด่าน
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBatchSetTargetStages(12)}
                        className="px-2.5 py-0.5 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 text-xs font-bold rounded-lg border border-cyan-500/20"
                      >
                        12 ด่าน
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBatchSetTargetStages(15)}
                        className="px-2.5 py-0.5 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 text-xs font-bold rounded-lg border border-cyan-500/20"
                      >
                        15 ด่าน
                      </button>
                    </div>
                  </div>

                  {/* Search and Tabs */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="ค้นหาชื่อหรือรหัส 4 หลัก..."
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectionViewFilter('all')}
                        className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                          selectionViewFilter === 'all' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
                        }`}
                      >
                        ทั้งหมด ({studentsList.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectionViewFilter('selected')}
                        className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                          selectionViewFilter === 'selected' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                        }`}
                      >
                        เลือกแล้ว ({selectedCount})
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
                                <div className="text-[10px] text-slate-400 font-mono">
                                  รหัส: <strong className="text-slate-300">{student.student_id}</strong> • ห้อง: {student.classrooms?.class_name || student.classroom_name || 'ม.ต้น'}
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
                    เลือกนักเรียนเข้าร่วมแล้ว: <strong className="text-cyan-400 font-bold">{selectedCount}</strong> คน
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
