'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  School,
  LogOut,
  Users,
  PlusCircle,
  KeyRound,
  FileSpreadsheet,
  Edit2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Star,
  Trophy,
  Copy,
  Download,
  X,
  UserPlus,
  ShieldCheck,
  ChevronDown,
  BookOpen,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface Classroom {
  id: string;
  class_name: string;
  teacher_id: string;
  grade_level?: string;
  room_number?: string;
  created_at: string;
}

interface StudentItem {
  id: string;
  student_id: string;
  username: string;
  student_name: string;
  classroom_id: string;
  user_type: string;
  school_name: string;
  grade_level?: string;
  room_number?: string;
  is_active: boolean;
  created_at: string;
  current_stage: number;
  total_stars: number;
  pre_test_score: string;
  post_test_score: string;
}

interface NewlyCreatedCred {
  studentName: string;
  username: string;
  password: string;
}

export default function NetworkTeacherDashboard() {
  const router = useRouter();

  const [teacher, setTeacher] = useState<any>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Modals state
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newGradeLevel, setNewGradeLevel] = useState('');
  const [newRoomNumber, setNewRoomNumber] = useState('');

  const [showRenameClassModal, setShowRenameClassModal] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const [showSingleStudentModal, setShowSingleStudentModal] = useState(false);
  const [studentFormName, setStudentFormName] = useState('');
  const [studentFormUsername, setStudentFormUsername] = useState('');
  const [studentFormPassword, setStudentFormPassword] = useState('');

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchNamesText, setBatchNamesText] = useState('');
  const [batchPrefix, setBatchPrefix] = useState('st');
  const [batchDefaultPassword, setBatchDefaultPassword] = useState('1234');

  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [targetStudentForReset, setTargetStudentForReset] = useState<StudentItem | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  const [newlyCreatedCreds, setNewlyCreatedCreds] = useState<NewlyCreatedCred[]>([]);
  const [showCredsSummaryModal, setShowCredsSummaryModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  // Load teacher from session or localStorage
  useEffect(() => {
    const raw = localStorage.getItem('vocab_journey_teacher');
    if (raw) {
      try {
        setTeacher(JSON.parse(raw));
      } catch {}
    }
  }, []);

  // Fetch Classrooms
  const fetchClassrooms = useCallback(async () => {
    try {
      setFetchError('');
      const res = await fetch('/api/network/classrooms');
      if (res.status === 401 || res.status === 403) {
        router.push('/network/teacher');
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load classrooms');

      setClassrooms(json.classrooms || []);
      if (json.classrooms?.length > 0) {
        setSelectedClassroomId((prev) => {
          if (prev && json.classrooms.some((c: Classroom) => c.id === prev)) {
            return prev;
          }
          return json.classrooms[0].id;
        });
      } else {
        setSelectedClassroomId('');
      }
    } catch (err: any) {
      setFetchError(err.message || 'เกิดข้อผิดพลาดในการโหลดห้องเรียน');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  // Fetch Students for selected classroom
  const fetchStudents = useCallback(async (classroomId: string) => {
    if (!classroomId) {
      setStudents([]);
      return;
    }
    setIsRefreshing(true);
    setFetchError('');
    try {
      const res = await fetch(`/api/network/students?classroomId=${classroomId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load students');
      setStudents(json.students || []);
    } catch (err: any) {
      setFetchError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลนักเรียน');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (selectedClassroomId) {
      fetchStudents(selectedClassroomId);
    }
  }, [selectedClassroomId, fetchStudents]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('vocab_journey_teacher');
    router.push('/network/teacher');
  };

  // Create Classroom
  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/network/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          className: newClassName.trim(),
          gradeLevel: newGradeLevel.trim() || undefined,
          roomNumber: newRoomNumber.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create classroom');

      showToast(`สร้างห้องเรียน "${json.classroom.class_name}" สำเร็จ`);
      setShowCreateClassModal(false);
      setNewClassName('');
      setNewGradeLevel('');
      setNewRoomNumber('');
      await fetchClassrooms();
      setSelectedClassroomId(json.classroom.id);
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการสร้างห้องเรียน');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rename Classroom
  const handleRenameClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameValue.trim() || !selectedClassroomId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/network/classrooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId: selectedClassroomId,
          className: renameValue.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to rename classroom');

      showToast('เปลี่ยนชื่อห้องเรียนสำเร็จ');
      setShowRenameClassModal(false);
      setRenameValue('');
      await fetchClassrooms();
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการเปลี่ยนชื่อห้องเรียน');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Single Student
  const handleCreateSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentFormName || !studentFormUsername || !studentFormPassword || !selectedClassroomId) return;

    setIsSubmitting(true);
    try {
      const currentClass = classrooms.find((c) => c.id === selectedClassroomId);
      const res = await fetch('/api/network/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: studentFormName.trim(),
          username: studentFormUsername.trim(),
          password: studentFormPassword,
          classroomId: selectedClassroomId,
          schoolName: teacher?.schoolName,
          gradeLevel: currentClass?.grade_level,
          roomNumber: currentClass?.room_number,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create student');

      setNewlyCreatedCreds([
        {
          studentName: studentFormName.trim(),
          username: studentFormUsername.trim(),
          password: studentFormPassword,
        },
      ]);
      setShowSingleStudentModal(false);
      setStudentFormName('');
      setStudentFormUsername('');
      setStudentFormPassword('');
      setShowCredsSummaryModal(true);
      showToast('สร้างบัญชีนักเรียนสำเร็จ');
      await fetchStudents(selectedClassroomId);
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการสร้างบัญชีนักเรียน');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Batch Create Students
  const handleBatchCreateStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    const names = batchNamesText
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (names.length === 0 || !selectedClassroomId) {
      alert('กรุณากรอกรายชื่อนักเรียนอย่างน้อย 1 คน');
      return;
    }

    setIsSubmitting(true);
    const createdList: NewlyCreatedCred[] = [];
    const errorsList: string[] = [];

    const currentClass = classrooms.find((c) => c.id === selectedClassroomId);

    let startIdx = 1;
    const existingUsernames = new Set(students.map((s) => s.username.toLowerCase()));

    for (const name of names) {
      let usernameCandidate = `${batchPrefix}${String(startIdx).padStart(2, '0')}`.toLowerCase();
      while (existingUsernames.has(usernameCandidate)) {
        startIdx++;
        usernameCandidate = `${batchPrefix}${String(startIdx).padStart(2, '0')}`.toLowerCase();
      }
      existingUsernames.add(usernameCandidate);
      startIdx++;

      const password = batchDefaultPassword || '1234';

      try {
        const res = await fetch('/api/network/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentName: name,
            username: usernameCandidate,
            password: password,
            classroomId: selectedClassroomId,
            schoolName: teacher?.schoolName,
            gradeLevel: currentClass?.grade_level,
            roomNumber: currentClass?.room_number,
          }),
        });

        const json = await res.json();
        if (res.ok) {
          createdList.push({
            studentName: name,
            username: usernameCandidate,
            password: password,
          });
        } else {
          errorsList.push(`${name}: ${json.error}`);
        }
      } catch {
        errorsList.push(`${name}: network error`);
      }
    }

    setIsSubmitting(false);
    setShowBatchModal(false);
    setBatchNamesText('');

    if (createdList.length > 0) {
      setNewlyCreatedCreds(createdList);
      setShowCredsSummaryModal(true);
      showToast(`สร้างบัญชีสำเร็จ ${createdList.length} คน`);
      await fetchStudents(selectedClassroomId);
    }

    if (errorsList.length > 0) {
      alert(`มี ${errorsList.length} รายการที่ไม่สามารถสร้างได้:\n` + errorsList.join('\n'));
    }
  };

  // Reset Student Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentForReset || !newPasswordInput) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/network/students/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: targetStudentForReset.id,
          newPassword: newPasswordInput,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to reset password');

      showToast(`รีเซ็ตรหัสผ่านของ "${targetStudentForReset.student_name}" สำเร็จแล้ว`);
      setShowResetPasswordModal(false);
      setTargetStudentForReset(null);
      setNewPasswordInput('');
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export CSV (Safe, contains only teacher-owned classroom students, zero password/hash/token)
  const handleExportCSV = () => {
    if (students.length === 0) {
      alert('ไม่มีข้อมูลนักเรียนสำหรับส่งออก');
      return;
    }

    const currentClass = classrooms.find((c) => c.id === selectedClassroomId);
    const headers = ['ลำดับ', 'ชื่อ-นามสกุล', 'Username', 'โรงเรียน', 'ห้องเรียน', 'ด่านปัจจุบัน', 'ดาวรวม', 'Pre-test', 'Post-test'];
    const rows = students.map((s, idx) => [
      idx + 1,
      `"${s.student_name.replace(/"/g, '""')}"`,
      `"${s.username.replace(/"/g, '""')}"`,
      `"${(teacher?.schoolName || s.school_name || 'โรงเรียนเครือข่าย').replace(/"/g, '""')}"`,
      `"${(currentClass?.class_name || '-').replace(/"/g, '""')}"`,
      s.current_stage,
      s.total_stars,
      `"${s.pre_test_score}"`,
      `"${s.post_test_score}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `นักเรียน_${currentClass?.class_name || 'ห้องเรียน'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Newly Created Credentials to Clipboard
  const handleCopyNewCreds = () => {
    const text = newlyCreatedCreds
      .map((c, i) => `${i + 1}. ชื่อ: ${c.studentName} | Username: ${c.username} | Password: ${c.password}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    showToast('คัดลอกรายชื่อและรหัสผ่านทั้งหมดลงคลิปบอร์ดแล้ว');
  };

  // Export Newly Created Credentials as CSV
  const handleExportNewCredsCSV = () => {
    const headers = ['ลำดับ', 'ชื่อ-นามสกุล', 'Username', 'Password', 'ช่องทางเข้าสู่ระบบ'];
    const rows = newlyCreatedCreds.map((c, i) => [
      i + 1,
      `"${c.studentName.replace(/"/g, '""')}"`,
      `"${c.username.replace(/"/g, '""')}"`,
      `"${c.password.replace(/"/g, '""')}"`,
      `"เข้าที่ /network"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `รหัสผ่านนักเรียนใหม่.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentClass = classrooms.find((c) => c.id === selectedClassroomId);
  const filteredStudents = students.filter(
    (s) =>
      s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-400 font-bold">กำลังโหลดแดชบอร์ดคุณครู...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-500 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-sm font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-xl sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <School className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  VOCAB JOURNEY NETWORK
                </span>
                <span className="text-xs text-slate-400 font-medium truncate max-w-[140px] sm:max-w-none">
                  {teacher?.schoolName || 'โรงเรียนเครือข่าย'}
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-black text-white truncate max-w-[200px] sm:max-w-none">
                {teacher?.name || 'แดชบอร์ดคุณครู'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowHelpModal(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 text-xs font-black transition-all flex items-center gap-1.5 shadow-sm"
              title="เปิดคู่มือการใช้งานสำหรับคุณครู"
            >
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>คู่มือการใช้งาน</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 border border-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Error Alert Bar */}
        {fetchError && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{fetchError}</span>
            </div>
            <button
              onClick={() => (selectedClassroomId ? fetchStudents(selectedClassroomId) : fetchClassrooms())}
              className="px-3 py-1 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors shrink-0"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        )}

        {/* Controls & Classroom Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <label className="text-xs text-slate-400 font-bold block mb-1">เลือกห้องเรียน:</label>
              <div className="relative">
                <select
                  value={selectedClassroomId}
                  onChange={(e) => setSelectedClassroomId(e.target.value)}
                  disabled={classrooms.length === 0}
                  aria-label="เลือกห้องเรียน"
                  className="w-full appearance-none bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm font-bold text-white focus:border-indigo-500 outline-none pr-10"
                >
                  {classrooms.length === 0 ? (
                    <option value="">ยังไม่มีห้องเรียน (กดปุ่มสร้างห้องเรียน)</option>
                  ) : (
                    classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.class_name} {c.grade_level ? `(${c.grade_level})` : ''}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {selectedClassroomId && (
              <button
                onClick={() => {
                  setRenameValue(currentClass?.class_name || '');
                  setShowRenameClassModal(true);
                }}
                className="mt-auto sm:mt-5 p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center justify-center gap-1.5 text-xs font-bold"
                title="เปลี่ยนชื่อห้องเรียน"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">เปลี่ยนชื่อห้อง</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateClassModal(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>สร้างห้องเรียนใหม่</span>
            </button>
          </div>
        </div>

        {/* Classroom Overview & Student Actions */}
        {selectedClassroomId ? (
          <>
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">นักเรียนทั้งหมด</div>
                  <div className="text-xl font-black text-white">{students.length} คน</div>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">ดาวรวมทั้งห้อง</div>
                  <div className="text-xl font-black text-amber-300">
                    {students.reduce((acc, curr) => acc + curr.total_stars, 0)} ⭐
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">ด่านสูงสุดในห้อง</div>
                  <div className="text-xl font-black text-emerald-400">
                    ด่าน {students.length > 0 ? Math.max(...students.map((s) => s.current_stage)) : 1}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">โหมดระบบ</div>
                  <div className="text-sm font-black text-cyan-400">โรงเรียนเครือข่าย (Lite)</div>
                </div>
              </div>
            </div>

            {/* Students Table & Card Section */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              {/* Action Ribbon & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <div className="relative w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ค้นหาชื่อ, Username หรือ ID..."
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl pl-10 pr-4 py-2 text-xs text-white outline-none"
                    />
                  </div>
                  <button
                    onClick={() => fetchStudents(selectedClassroomId)}
                    disabled={isRefreshing}
                    className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                    title="รีเฟรชข้อมูล"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowSingleStudentModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
                    <span>เพิ่มเดี่ยว</span>
                  </button>

                  <button
                    onClick={() => setShowBatchModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>เพิ่มแบบชุด (Batch)</span>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>ส่งออก CSV</span>
                  </button>
                </div>
              </div>

              {/* Desktop Table (Hidden on small mobile) */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-800/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase font-extrabold border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">#</th>
                      <th className="py-3.5 px-4">ชื่อ-สกุล</th>
                      <th className="py-3.5 px-4">Username</th>
                      <th className="py-3.5 px-4 text-center">ด่านปัจจุบัน</th>
                      <th className="py-3.5 px-4 text-center">ดาวรวม</th>
                      <th className="py-3.5 px-4 text-center">Pre-Test</th>
                      <th className="py-3.5 px-4 text-center">Post-Test</th>
                      <th className="py-3.5 px-4 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          {searchQuery
                            ? 'ไม่พบบัญชีนักเรียนที่ตรงกับคำค้นหา'
                            : 'ยังไม่มีนักเรียนในห้องนี้ กดปุ่ม "เพิ่มเดี่ยว" หรือ "เพิ่มแบบชุด" เพื่อสร้างบัญชีให้นักเรียน'}
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((s, idx) => {
                        const progressPercent = Math.min(100, Math.round((s.current_stage / 100) * 100));
                        return (
                          <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4 text-slate-400 font-bold">{idx + 1}</td>
                            <td className="py-3.5 px-4 font-bold text-white">
                              <div>{s.student_name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{s.student_id}</div>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">{s.username}</td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="inline-flex flex-col items-center gap-1">
                                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black text-[11px]">
                                  {s.current_stage} / 100
                                </span>
                                <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-indigo-500 rounded-full"
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center font-black text-amber-300">
                              {s.total_stars} ⭐
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-300">
                              {s.pre_test_score}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-300">
                              {s.post_test_score}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => {
                                  setTargetStudentForReset(s);
                                  setNewPasswordInput('');
                                  setShowResetPasswordModal(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 border border-slate-700 transition-colors inline-flex items-center gap-1 font-bold text-[11px]"
                              >
                                <KeyRound className="w-3 h-3 text-amber-400" />
                                <span>รีเซ็ตรหัส</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Compact Card View (Visible on small screens) */}
              <div className="block md:hidden space-y-3">
                {filteredStudents.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-slate-800">
                    {searchQuery
                      ? 'ไม่พบบัญชีนักเรียนที่ตรงกับคำค้นหา'
                      : 'ยังไม่มีนักเรียนในห้องนี้ กดปุ่ม "เพิ่มเดี่ยว" หรือ "เพิ่มแบบชุด" เพื่อสร้างบัญชีให้นักเรียน'}
                  </div>
                ) : (
                  filteredStudents.map((s, idx) => {
                    const progressPercent = Math.min(100, Math.round((s.current_stage / 100) * 100));
                    return (
                      <div
                        key={s.id}
                        className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 font-black text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-bold text-white text-sm">{s.student_name}</div>
                              <div className="text-[11px] font-mono text-indigo-400 font-bold">{s.username}</div>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setTargetStudentForReset(s);
                              setNewPasswordInput('');
                              setShowResetPasswordModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700 transition-colors inline-flex items-center gap-1 font-bold text-[11px]"
                          >
                            <KeyRound className="w-3 h-3 text-amber-400" />
                            <span>รีเซ็ตรหัส</span>
                          </button>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-900 text-center text-[11px]">
                          <div className="bg-slate-900/60 rounded-xl p-2">
                            <div className="text-slate-400 text-[10px]">ด่าน</div>
                            <div className="font-black text-indigo-300">{s.current_stage}/100</div>
                          </div>
                          <div className="bg-slate-900/60 rounded-xl p-2">
                            <div className="text-slate-400 text-[10px]">ดาวรวม</div>
                            <div className="font-black text-amber-300">{s.total_stars} ⭐</div>
                          </div>
                          <div className="bg-slate-900/60 rounded-xl p-2">
                            <div className="text-slate-400 text-[10px]">Pre-test</div>
                            <div className="font-bold text-slate-300">{s.pre_test_score}</div>
                          </div>
                          <div className="bg-slate-900/60 rounded-xl p-2">
                            <div className="text-slate-400 text-[10px]">Post-test</div>
                            <div className="font-bold text-slate-300">{s.post_test_score}</div>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <School className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white">ยินดีต้อนรับสู่ระบบเครือข่าย VJ Network</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              เริ่มต้นสร้างห้องเรียนแรกของคุณ เพื่อสร้างและแจกจ่ายบัญชีนักเรียนสำหรับฝึกคำศัพท์
            </p>
            <button
              onClick={() => setShowCreateClassModal(true)}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm shadow-xl shadow-indigo-600/30 transition-all inline-flex items-center gap-2"
            >
              <PlusCircle className="w-5 h-5" />
              <span>สร้างห้องเรียนแรกตอนนี้</span>
            </button>
          </div>
        )}
      </main>

      {/* ================= MODALS ================= */}

      {/* 1. Modal Create Classroom */}
      {showCreateClassModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-400" /> สร้างห้องเรียนใหม่
              </h3>
              <button
                onClick={() => setShowCreateClassModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClassroom} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">ชื่อห้องเรียน (เช่น ป.4/1, ม.1/2)*</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="เช่น ม.1/1 ห้องเรียนพิเศษ"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">ระดับชั้น</label>
                  <input
                    type="text"
                    value={newGradeLevel}
                    onChange={(e) => setNewGradeLevel(e.target.value)}
                    placeholder="เช่น ม.1 หรือ ป.4"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">ห้อง</label>
                  <input
                    type="text"
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    placeholder="เช่น 1 หรือ 2"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateClassModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'สร้างห้องเรียน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Rename Classroom */}
      {showRenameClassModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-400" /> แก้ไขชื่อห้องเรียน
              </h3>
              <button
                onClick={() => setShowRenameClassModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRenameClassroom} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">ชื่อห้องเรียนใหม่</label>
                <input
                  type="text"
                  required
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRenameClassModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Single Student */}
      {showSingleStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" /> เพิ่มนักเรียนเดี่ยว
              </h3>
              <button
                onClick={() => setShowSingleStudentModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSingleStudent} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">ชื่อ-นามสกุล นักเรียน*</label>
                <input
                  type="text"
                  required
                  value={studentFormName}
                  onChange={(e) => setStudentFormName(e.target.value)}
                  placeholder="เช่น ด.ช. วิชัย รักเรียน"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">ชื่อผู้ใช้ (Username)*</label>
                <input
                  type="text"
                  required
                  value={studentFormUsername}
                  onChange={(e) => setStudentFormUsername(e.target.value)}
                  placeholder="เช่น ext_wichai01"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">รหัสผ่านเริ่มต้น (Password)*</label>
                <input
                  type="text"
                  required
                  value={studentFormPassword}
                  onChange={(e) => setStudentFormPassword(e.target.value)}
                  placeholder="เช่น 1234"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300 text-xs">
                💡 ระบบจะบังคับประเภทบัญชีเป็น <strong>EXTERNAL</strong> อัตโนมัติ เพื่อความปลอดภัย
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSingleStudentModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'กำลังสร้าง...' : 'สร้างบัญชี'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal Batch Add Students */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" /> เพิ่มนักเรียนแบบชุด (Batch Add)
              </h3>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBatchCreateStudents} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">คำนำหน้า Username</label>
                  <input
                    type="text"
                    value={batchPrefix}
                    onChange={(e) => setBatchPrefix(e.target.value)}
                    placeholder="เช่น st, m1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">รหัสผ่านเริ่มต้น</label>
                  <input
                    type="text"
                    value={batchDefaultPassword}
                    onChange={(e) => setBatchDefaultPassword(e.target.value)}
                    placeholder="เช่น 1234"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  วางรายชื่อนักเรียน (1 คนต่อ 1 บรรทัด)
                </label>
                <textarea
                  rows={6}
                  required
                  value={batchNamesText}
                  onChange={(e) => setBatchNamesText(e.target.value)}
                  placeholder={`ด.ช. สมชาย มุ่งมั่น\nด.ญ. สมศรี ตั้งใจ\nนาย เก่งกาจ สามารถ`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-400 text-xs space-y-1">
                <div>ระบบจะตั้ง Username ให้อัตโนมัติตามลำดับ เช่น {batchPrefix}01, {batchPrefix}02 ...</div>
                <div>สามารถดาวน์โหลดหรือคัดลอกรหัสผ่านทั้งหมดหลังสร้างเสร็จได้ทันที</div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'กำลังประมวลผล...' : 'สร้างบัญชีทั้งหมด'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal Reset Password */}
      {showResetPasswordModal && targetStudentForReset && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" /> รีเซ็ตรหัสผ่านนักเรียน
              </h3>
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setTargetStudentForReset(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-1">
              <div className="text-slate-400">นักเรียน: <span className="text-white font-bold">{targetStudentForReset.student_name}</span></div>
              <div className="text-slate-400">Username: <span className="text-indigo-400 font-mono font-bold">{targetStudentForReset.username}</span></div>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">ตั้งรหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)*</label>
                <input
                  type="text"
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="เช่น 1234 หรือ newpass"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs leading-relaxed">
                ⚠️ รหัสผ่านเดิมถูกเข้ารหัสด้วย Hash อย่างปลอดภัย จึงไม่สามารถแสดงรหัสเดิมได้ คุณครูสามารถตั้งรหัสผ่านใหม่และแจ้งให้นักเรียนทราบได้ทันที
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPasswordModal(false);
                    setTargetStudentForReset(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-400 shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันรีเซ็ตรหัสผ่าน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal Created Credentials Summary (Show Once & Export) */}
      {showCredsSummaryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  บัญชีนักเรียนสร้างสำเร็จ
                </span>
                <h3 className="text-xl font-black text-white mt-1">
                  รายชื่อและรหัสผ่านสำหรับแจกนักเรียน
                </h3>
              </div>
              <button
                onClick={() => setShowCredsSummaryModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
              ⚠️ กรุณาคัดลอกหรือดาวน์โหลดไฟล์รหัสผ่านนี้เก็บไว้ เนื่องจากระบบจะเก็บรหัสผ่านในรูปแบบ Hash และจะไม่สามารถแสดงรหัสผ่านนี้ได้อีก
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-bold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">ชื่อนักเรียน</th>
                    <th className="py-2.5 px-3">Username</th>
                    <th className="py-2.5 px-3">Password</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-mono">
                  {newlyCreatedCreds.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-800/50">
                      <td className="py-2 px-3 text-slate-500">{i + 1}</td>
                      <td className="py-2 px-3 font-sans font-bold text-white">{c.studentName}</td>
                      <td className="py-2 px-3 text-indigo-300 font-bold">{c.username}</td>
                      <td className="py-2 px-3 text-emerald-400 font-bold">{c.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyNewCreds}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Copy className="w-4 h-4 text-indigo-400" />
                <span>คัดลอกทั้งหมด</span>
              </button>
              <button
                type="button"
                onClick={handleExportNewCredsCSV}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลด CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal Teacher Self-Service Guide */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-7 w-full max-w-2xl shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    คู่มือการใช้งานสำหรับคุณครูโรงเรียนเครือข่าย
                  </h3>
                  <p className="text-xs text-slate-400">ขั้นตอนการจัดการห้องเรียนและติดตามผลนักเรียนแบบครบวงจร</p>
                </div>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-1 text-xs text-slate-300">
              {/* Step 1 */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-1.5">
                <div className="font-bold text-sm text-indigo-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-black text-xs flex items-center justify-center">1</span>
                  <span>การสมัครใช้งาน</span>
                </div>
                <p className="text-slate-300 leading-relaxed pl-7">
                  คุณครูโรงเรียนเครือข่ายสามารถสมัครบัญชีได้ทันที โดยกรอกชื่อ-นามสกุล, ชื่อโรงเรียน, ตั้งชื่อผู้ใช้ (Username) และรหัสผ่าน เมื่อสมัครแล้วสามารถเข้าสู่แดชบอร์ดได้ทันทีโดยไม่ต้องรออนุมัติ
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-1.5">
                <div className="font-bold text-sm text-indigo-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-black text-xs flex items-center justify-center">2</span>
                  <span>การสร้างห้องเรียน</span>
                </div>
                <p className="text-slate-300 leading-relaxed pl-7">
                  กดปุ่ม <strong className="text-white">"+ สร้างห้องเรียนใหม่"</strong> ที่ด้านบน แล้วระบุชื่อห้องเรียน เช่น <em>"ม.1/1"</em> หรือ <em>"ป.4/1"</em> คุณครูสามารถสร้างห้องเรียนได้หลายห้องตามรายวิชาที่สอน
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-1.5">
                <div className="font-bold text-sm text-indigo-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-black text-xs flex items-center justify-center">3</span>
                  <span>การสร้างบัญชีนักเรียน (เดี่ยว / ชุด)</span>
                </div>
                <div className="space-y-2 text-slate-300 leading-relaxed pl-7">
                  <p>
                    เลือกห้องเรียนที่ต้องการ แล้วกดปุ่ม <strong>"เพิ่มเดี่ยว"</strong> หรือ <strong>"เพิ่มแบบชุด (Batch)"</strong> โดยการเพิ่มแบบชุด คุณครูสามารถคัดลอกรายชื่อนักเรียนมาวาง (1 บรรทัดต่อ 1 คน) ระบบจะสร้าง Username และ Password เริ่มต้นให้อัตโนมัติ
                  </p>
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-[11px] leading-relaxed">
                    ⚠️ <strong>ข้อสำคัญ:</strong> รหัสผ่านจะแสดงให้เห็นบนหน้าจอเพียงครั้งเดียวตอนสร้างบัญชีเสร็จสิ้น เพื่อความปลอดภัย ให้กดปุ่ม <strong>"ดาวน์โหลด CSV"</strong> หรือ <strong>"คัดลอกทั้งหมด"</strong> เก็บไว้แจกให้นักเรียน หากทำหายสามารถกดรีเซ็ตรหัสผ่านใหม่ได้ตลอดเวลา
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-1.5">
                <div className="font-bold text-sm text-indigo-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-black text-xs flex items-center justify-center">4</span>
                  <span>วิธีให้นักเรียนเข้าใช้งาน</span>
                </div>
                <p className="text-slate-300 leading-relaxed pl-7">
                  ให้นักเรียนเปิดหน้าเว็บไซต์ที่ <strong>/network</strong> หรือกดปุ่ม <strong>"นักเรียนโรงเรียนเครือข่าย"</strong> บนหน้าแรกของ Vocab Journey จากนั้นกรอก Username และ Password ที่ได้รับจากคุณครู
                </p>
              </div>

              {/* Step 5 */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-1.5">
                <div className="font-bold text-sm text-indigo-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-black text-xs flex items-center justify-center">5</span>
                  <span>การเรียนและการฝึกคำศัพท์ของนักเรียน</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed pl-7">
                  <li><strong>ครั้งแรก:</strong> นักเรียนจะเข้าสู่แบบทดสอบก่อนเรียน (Pre-test) ทันที</li>
                  <li><strong>การเล่นด่าน:</strong> ฝึกคำศัพท์ตามลำดับตั้งแต่ด่าน 1 ถึง 100</li>
                  <li><strong>รูปแบบข้อสอบ:</strong> ทุกด่านเป็นคำถามแบบ 4 ตัวเลือก เข้าใจง่ายและตรงจุด</li>
                  <li><strong>มุมมองของนักเรียน:</strong> จะเห็นเฉพาะด่านปัจจุบันและจำนวนดาวสะสม</li>
                  <li><strong>เมื่อผ่านด่าน 100:</strong> ระบบจะเปิดแบบทดสอบหลังเรียน (Post-test) ให้อัตโนมัติ</li>
                </ul>
              </div>

              {/* Step 6 */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-1.5">
                <div className="font-bold text-sm text-indigo-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-black text-xs flex items-center justify-center">6</span>
                  <span>การติดตามผลการเรียน</span>
                </div>
                <p className="text-slate-300 leading-relaxed pl-7">
                  แดชบอร์ดครูจะแสดงรายชื่อ, Username, ด่านปัจจุบัน (เช่น 25/100), ดาวสะสม, คะแนน Pre-test และ Post-test ของนักเรียนทุกคนในห้อง คุณครูสามารถกดปุ่ม <strong>"รีเฟรชข้อมูล (🔄)"</strong> เพื่อดึงข้อมูลความก้าวหน้าล่าสุดได้ตลอดเวลา
                </p>
              </div>

              {/* Step 7 */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-1.5">
                <div className="font-bold text-sm text-indigo-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-black text-xs flex items-center justify-center">7</span>
                  <span>การรีเซ็ตรหัสผ่าน (Reset Password)</span>
                </div>
                <p className="text-slate-300 leading-relaxed pl-7">
                  หากนักเรียนลืมรหัสผ่าน ให้กดปุ่ม <strong>"รีเซ็ตรหัส"</strong> ที่รายชื่อนักเรียนคนนั้น แล้วกรอกรหัสผ่านใหม่ (เช่น 1234) แล้วแจ้งนักเรียนได้ทันที (ระบบไม่สามารถกู้รหัสผ่านเดิมได้เนื่องจากถูกเข้ารหัสความปลอดภัย)
                </p>
              </div>

              {/* Step 8 */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-1.5">
                <div className="font-bold text-sm text-indigo-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-black text-xs flex items-center justify-center">8</span>
                  <span>การส่งออกรายงาน (Export CSV)</span>
                </div>
                <p className="text-slate-300 leading-relaxed pl-7">
                  คุณครูสามารถกดปุ่ม <strong>"ส่งออก CSV"</strong> เพื่อบันทึกไฟล์สรุปผลคะแนนและความก้าวหน้าของนักเรียนทั้งห้องเรียน สามารถนำไปเปิดใช้งานต่อใน Microsoft Excel ได้ทันที
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-right">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition-colors shadow-lg shadow-indigo-600/20"
              >
                เข้าใจแล้ว ปิดคู่มือ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
