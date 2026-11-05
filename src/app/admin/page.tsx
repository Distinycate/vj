'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/utils/supabase/client';
import { 
  Users, AlertTriangle, LogOut, Shield, CheckCircle2,
  Trophy, BookOpen, Activity, TrendingUp, Sparkles, User, BrainCircuit, X, Download, Filter, RefreshCw, Home, Settings, Gift, Star, Globe2, Target, ChevronDown, ChevronUp
} from 'lucide-react';
import { 
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { calculateLearningGain, calculateRiskScore, getRiskLevel, getProgressTrend, calculateClassroomWeakestSkill, calculateStudentSkillRadar } from '@/utils/analyticsUtils';
import { generateStudentInsight } from '@/utils/aiTeacherInsight';

import TeamLeaderboard from '@/components/TeamLeaderboard';
import SeasonManager from '@/components/admin/SeasonManager';
import SchoolLevelDashboard from '@/components/admin/SchoolLevelDashboard';
import ClassLevelAnalytics from '@/components/admin/ClassLevelAnalytics';
import IndividualStudentProfile from '@/components/admin/IndividualStudentProfile';
import EventAnalyticsTab from '@/components/admin/EventAnalyticsTab';
import SettingsTab from '@/components/admin/SettingsTab';
import EditStudentModal from '@/components/admin/EditStudentModal';
import IndividualComparisonTable from '@/components/admin/IndividualComparisonTable';
import TermArchiveTab from '@/components/admin/TermArchiveTab';

type AdminTab = 'school-overview' | 'overview' | 'students' | 'assessments' | 'teams' | 'events' | 'term-archive' | 'weak-words' | 'risks' | 'settings';
type AnalyticsDataStatus = 'IDLE' | 'LOADING' | 'LOADED' | 'ERROR';

import { getAdminInitialData, getAdminClassroomStats, getAdminAnalyticsDatasets } from './actions';

export default function AdminPage() {
  const [teacher, setTeacher] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeletingUnplayed, setIsDeletingUnplayed] = useState(false);
  const [isRandomizingTeams, setIsRandomizingTeams] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('school-overview');
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('');
  const [classroomStudentCounts, setClassroomStudentCounts] = useState<Record<string, number>>({});
  
  // Student table visibility
  const [showStudentTable, setShowStudentTable] = useState(true);

  // Data
  const [analyticsDataStatus, setAnalyticsDataStatus] = useState<AnalyticsDataStatus>('IDLE');
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [vocabList, setVocabList] = useState<any[]>([]);
  const [itemAnalysis, setItemAnalysis] = useState<any[]>([]);
  const [wrongWords, setWrongWords] = useState<any[]>([]);
  const [totalStars, setTotalStars] = useState(0);
  const [totalThefts, setTotalThefts] = useState(0);
  
  // Student Detail Modal
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [studentTab, setStudentTab] = useState<'overview' | 'skills' | 'wrong-words'>('overview');
  const [isPurging, setIsPurging] = useState(false);

  useEffect(() => {
    async function verifyTeacherSession() {
      const saved = localStorage.getItem('vocab_journey_teacher');
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved);
        if (parsed.role !== 'ADMIN' && parsed.role !== 'TEACHER') {
          localStorage.setItem('vocab_journey_card_teacher', JSON.stringify(parsed));
          window.location.href = '/card-teacher/dashboard';
          return;
        }
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meJson = await meRes.json();
          if (meJson.authenticated && (meJson.role === 'ADMIN' || meJson.role === 'TEACHER')) {
            setTeacher({ ...parsed, ...meJson.user, role: meJson.role });
            return;
          }
        }
        // Session cookie missing or expired -> clear stale localStorage so teacher logs in cleanly
        localStorage.removeItem('vocab_journey_teacher');
        setTeacher(null);
      } catch {
        setTeacher(null);
      }
    }
    verifyTeacherSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return setLoginError('กรุณากรอก Username และ Password');
    setIsLoading(true); setLoginError('');
    try {
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TEACHER',
          username: username.trim(),
          password: password.trim(),
        }),
      });
      const loginJson = await loginRes.json();
      if (!loginRes.ok || !loginJson.user) {
        throw new Error(loginJson.error || 'ชื่อผู้ใช้หรือรหัสผ่านแอดมินไม่ถูกต้อง');
      }
      const data = { ...loginJson.user, role: loginJson.role || loginJson.user.role };
      if (data.role !== 'ADMIN' && data.role !== 'TEACHER') {
        if (data.role === 'CARD_TEACHER') {
          localStorage.setItem('vocab_journey_card_teacher', JSON.stringify(data));
          window.location.href = '/card-teacher/dashboard';
          return;
        }
        throw new Error('บัญชีนี้ไม่มีสิทธิ์เข้าใช้ระบบแอดมิน');
      }
      setTeacher(data);
      localStorage.setItem('vocab_journey_teacher', JSON.stringify(data));
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout network error
    }
    localStorage.removeItem('vocab_journey_teacher');
    window.location.reload();
  };

  const handlePurgeUnverified = async () => {
    if (!teacher || !selectedClassroom) return;
    if (!window.confirm("คุณแน่ใจหรือไม่ที่จะลบบัญชีนักเรียนที่ยังไม่ยืนยันตัวตนในห้องนี้ทั้งหมด? ข้อมูลจะถูกลบทิ้งและไม่สามารถกู้คืนได้")) return;
    
    setIsPurging(true);
    try {
      const { data, error } = await supabase.rpc('teacher_purge_unverified', {
        p_teacher_id: teacher.id,
        p_classroom_id: selectedClassroom
      });
      if (error) throw error;
      alert(`ลบบัญชีที่ไม่ยืนยันตัวตนสำเร็จจำนวน ${data} บัญชี`);
      window.location.reload();
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการลบข้อมูล: " + err.message);
    } finally {
      setIsPurging(false);
    }
  };

  const handleRandomizeTeams = async () => {
    if (!teacher) return;
    
    if (!confirm('คำเตือน: คุณแน่ใจหรือไม่ว่าต้องการสุ่มทีมระดับโรงเรียนและห้องเรียนใหม่ทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
      return;
    }

    const userInput = prompt('พิมพ์ "SHUFFLE" เพื่อยืนยันการสุ่มทีมใหม่');
    if (userInput !== 'SHUFFLE') {
      alert('การพิมพ์ยืนยันไม่ถูกต้อง ยกเลิกการสุ่มทีม');
      return;
    }

    setIsRandomizingTeams(true);
    try {
      const { error: rpcError } = await supabase.rpc('randomize_all_teams');
      if (rpcError) throw rpcError;
      
      alert('สุ่มทีมใหม่ทั้งหมดสำเร็จแล้ว');
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการสุ่มทีม กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsRandomizingTeams(false);
    }
  };

  const handleResetAllStudents = async () => {
    if (!teacher) return;
    
    if (!confirm('คำเตือน: คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตข้อมูลนักเรียน "ทุกคน" ทั้งด่านและการ์ด? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
      return;
    }

    const userInput = prompt('พิมพ์ "RESET ALL" เพื่อยืนยันการล้างข้อมูลทั้งหมด');
    if (userInput !== 'RESET ALL') {
      alert('การพิมพ์ยืนยันไม่ถูกต้อง ยกเลิกการรีเซ็ต');
      return;
    }

    setIsResettingAll(true);
    try {
      const { error } = await supabase.rpc('teacher_reset_all_students', {
        p_teacher_id: teacher.id
      });
      if (error) throw error;
      alert('รีเซ็ตข้อมูลนักเรียนทุกคนสำเร็จแล้ว');
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการรีเซ็ตข้อมูล');
    } finally {
      setIsResettingAll(false);
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลของนักเรียน: ${studentName}? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/students?studentId=${studentId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete student');
      setStudentsList(prev => prev.filter(s => s.id !== studentId));
      alert(`ลบข้อมูลนักเรียน ${studentName} เรียบร้อยแล้ว`);
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  const handleVerifyStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการยืนยันตัวตนให้นักเรียน: ${studentName}?`)) {
      return;
    }
    try {
      const res = await fetch('/api/admin/students', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, updates: { is_verified: true } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to verify student');
      setStudentsList(prev => prev.map(s => s.id === studentId ? { ...s, is_verified: true } : s));
      alert(`ยืนยันตัวตนนักเรียน ${studentName} เรียบร้อยแล้ว`);
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการยืนยันตัวตน');
    }
  };


  useEffect(() => {
    if (!teacher) return;
    async function loadInitialData() {
      try {
        const data = await getAdminInitialData(teacher.id, teacher.role);
        
        if (data.validClasses.length > 0) {
          setClassrooms(data.validClasses);
          setSelectedClassroom(data.validClasses[0].id);

          let countRows: any[] = [];
          try {
            const res = await fetch('/api/admin/students?countOnly=true');
            if (res.ok) {
              const json = await res.json();
              countRows = json.students || [];
            }
          } catch (e) {
            console.error("Failed to load student counts", e);
          }

          const counts = countRows.reduce((acc, studentRow) => {
            if (studentRow.classroom_id) {
              acc[studentRow.classroom_id] = (acc[studentRow.classroom_id] || 0) + 1;
            }
            return acc;
          }, {} as Record<string, number>);
          setClassroomStudentCounts(counts);
        } else {
          setClassrooms([]);
          setSelectedClassroom('');
          setClassroomStudentCounts({});
        }
      } catch (err) {
        console.error("Failed to load initial admin data", err);
      }
    }
    loadInitialData();
  }, [teacher]);

  const loadAnalyticsDatasets = async () => {
    setAnalyticsDataStatus('LOADING');
    try {
      const data = await getAdminAnalyticsDatasets();
      setVocabList(data.vocabList || []);
      setItemAnalysis(data.itemAnalysis || []);
      setAnalyticsDataStatus('LOADED');
    } catch (err) {
      console.error("Failed to load analytics datasets", err);
      setAnalyticsDataStatus('ERROR');
    }
  };

  useEffect(() => {
    if (activeTab === 'overview' && analyticsDataStatus === 'IDLE') {
      loadAnalyticsDatasets();
    }
  }, [activeTab, analyticsDataStatus]);

  useEffect(() => {
    if (!teacher || !selectedClassroom) return;
    let isCancelled = false;

    async function loadClassroomData() {
      // Clear classroom-scoped data immediately on classroom switch to prevent stale presentation
      setStudentsList([]);
      setWrongWords([]);
      setTotalStars(0);
      setTotalThefts(0);

      let students: any[] = [];
      try {
        const res = await fetch(`/api/admin/students?classroomId=${selectedClassroom}`);
        if (res.ok) {
          const json = await res.json();
          students = json.students || [];
        }
      } catch (e) {
        console.error("Failed to load classroom students", e);
      }
      
      if (isCancelled) return;

      const studentIds = students?.map(s => s.id) || [];
      let stats: { wrongWords: any[]; totalStars: number; totalThefts: number } = { wrongWords: [], totalStars: 0, totalThefts: 0 };
      if (studentIds.length > 0) {
        try {
          stats = await getAdminClassroomStats(studentIds);
        } catch (err) {
          console.error("Failed to load classroom stats", err);
        }
      }

      if (isCancelled) return;

      setStudentsList(students);
      setWrongWords(stats.wrongWords || []);
      setTotalStars(stats.totalStars || 0);
      setTotalThefts(stats.totalThefts || 0);
    }
    loadClassroomData();

    return () => {
      isCancelled = true;
    };
  }, [teacher, selectedClassroom]);

  const groupedClassrooms = useMemo(() => {
    return classrooms.reduce((acc, c) => {
      const grade = c.grade_level || (c.class_name.includes('/') ? c.class_name.split('/')[0] : 'อื่นๆ');
      if (!acc[grade]) acc[grade] = [];
      acc[grade].push(c);
      return acc;
    }, {} as Record<string, any[]>);
  }, [classrooms]);

  const classroomMetrics = useMemo(() => {
    if (studentsList.length === 0) return null;
    
    let totalPre = 0, totalPost = 0, totalGain = 0, totalAcc = 0;
    let preCount = 0, postCount = 0, accCount = 0;
    let highRiskCount = 0;
    
    const processedStudents = studentsList.map(s => {
      const stats = (Array.isArray(s.analytics_summary) ? s.analytics_summary[0] : s.analytics_summary) || { pretest_score: 0, posttest_score: 0, success_rate: 0, attempt_count: 0, last_active_at: new Date(0).toISOString() };
      const pre = stats.pretest_score || 0;
      const post = stats.posttest_score || 0;
      const { percentage: rawGainPercent } = calculateLearningGain(pre, post, 25);
      const gainPercent = post > 0 ? rawGainPercent : 0;
      const acc = stats.success_rate || 0;
      const attempts = stats.attempt_count || 0;
      
      const wwCount = wrongWords.filter(w => w.student_id === s.id).reduce((sum, w) => sum + (w.error_count || 1), 0);
      
      const lp = Array.isArray(s.learning_paths) ? s.learning_paths[0] : s.learning_paths;
      const lastActive = lp?.last_active_date ? new Date(lp.last_active_date) : null;
      const now = new Date();
      const daysInactive = lastActive ? Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 3600 * 24)) : 999;
      
      let riskLevel = 'No Data';
      if (stats?.attempt_count > 0 || stats?.success_rate > 0 || pre > 0) {
        const riskScore = calculateRiskScore({ accuracy: attempts > 0 ? acc : 70, reviewWords: wwCount, daysInactive: lastActive ? daysInactive : 0, stageStagnationDays: 0 });
        riskLevel = getRiskLevel(riskScore);
        if (riskLevel === 'High' || riskLevel === 'Critical') highRiskCount++;
      }

      if (pre > 0) { totalPre += pre; preCount++; }
      if (post > 0) { totalPost += post; totalGain += gainPercent; postCount++; }
      if (attempts > 0 || acc > 0) { totalAcc += acc; accCount++; }
      
      return { ...s, pre, post, gainPercent, acc, attempts, reviewWordsCount: wwCount, daysInactive, riskLevel, trend: getProgressTrend(gainPercent, riskLevel) };
    });

    const activeToday = processedStudents.filter(s => s.daysInactive === 0).length;
    const weakestSkill = analyticsDataStatus === 'LOADED' 
      ? calculateClassroomWeakestSkill(itemAnalysis, vocabList)
      : null;

    return {
      students: processedStudents,
      avgPre: (preCount > 0 ? totalPre / preCount : 0).toFixed(1),
      avgPost: (postCount > 0 ? totalPost / postCount : 0).toFixed(1),
      avgGain: (postCount > 0 ? totalGain / postCount : 0).toFixed(1),
      avgAcc: (accCount > 0 ? totalAcc / accCount : 0).toFixed(1),
      activeToday,
      highRiskCount,
      weakestSkill
    };
  }, [studentsList, wrongWords, itemAnalysis, vocabList, analyticsDataStatus]);

  const aggregatedWeakWords = useMemo(() => {
    if (!wrongWords || wrongWords.length === 0) return [];
    const map = new Map();
    wrongWords.forEach(w => {
      if (!w.vocabulary) return;
      const word = w.vocabulary.word;
      if (!map.has(word)) {
        map.set(word, {
          word,
          meaning: w.vocabulary.meaning_th || w.vocabulary.meaning || '',
          partOfSpeech: w.vocabulary.part_of_speech,
          totalErrors: 0,
          studentIds: new Set()
        });
      }
      const entry = map.get(word);
      entry.totalErrors += (w.error_count || 1);
      entry.studentIds.add(w.student_id);
    });
    return Array.from(map.values())
      .map(entry => ({ ...entry, studentCount: entry.studentIds.size }))
      .sort((a, b) => b.totalErrors - a.totalErrors);
  }, [wrongWords]);

  const atRiskStudents = useMemo(() => {
    if (!classroomMetrics) return [];
    return classroomMetrics.students
      .filter(s => s.riskLevel === 'Critical' || s.riskLevel === 'High' || s.riskLevel === 'Medium')
      .sort((a, b) => {
        const riskScore = { 'Critical': 3, 'High': 2, 'Medium': 1, 'Low': 0, 'No Data': -1 };
        const scoreA = riskScore[a.riskLevel as keyof typeof riskScore] || -1;
        const scoreB = riskScore[b.riskLevel as keyof typeof riskScore] || -1;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return a.acc - b.acc;
      });
  }, [classroomMetrics]);

  if (!teacher) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="glass-card p-8 rounded-3xl w-full max-w-md shadow-2xl">
          <div className="text-center mb-6">
            <Shield className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-white">ระบบจัดการครูผู้สอน</h1>
          </div>
          {loginError && <div className="bg-rose-500/10 text-rose-400 p-3 rounded-lg text-sm mb-4">{loginError}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-slate-300 text-sm font-bold block mb-1">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-slate-300 text-sm font-bold block mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg mt-2">
              {isLoading ? 'กำลังโหลด...' : 'เข้าสู่ระบบ'}
            </button>
            <button type="button" onClick={() => window.location.href = '/'} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2">
              <Home className="w-4 h-4" /> กลับหน้าเข้าใช้งาน
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans safe-bottom relative overflow-x-hidden">
      {/* Sticky Top Filter & Header with Layered Depth */}
      <div className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-2xl border-b border-slate-800/80 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-3.5 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
          
          {/* Identity & Role Brand */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative">
              <div className="w-11 h-11 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-[2px] rounded-2xl shadow-lg shadow-indigo-500/20 flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-indigo-400 font-black text-sm">
                  {teacher.role === 'ADMIN' ? 'AD' : 'TC'}
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full"></span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-wider text-indigo-400 uppercase bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                  TEACHER COMMAND HUB
                </span>
                <span className="text-xs text-slate-500 font-mono hidden sm:inline">• Vocab Journey</span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                ศูนย์จัดการเรียนรู้และการสอน
                <span className="text-xs font-normal text-slate-400 font-sans hidden md:inline">| {teacher.name}</span>
              </h1>
            </div>
          </div>
          
          {/* Action & Filter Hub */}
          <div className="grid grid-cols-2 min-[520px]:flex min-[520px]:flex-wrap items-stretch min-[520px]:items-center gap-2 w-full lg:w-auto">
            {/* Classroom Selector */}
            <div className="col-span-2 min-[520px]:col-span-1 flex items-center bg-slate-900/90 border border-indigo-500/30 hover:border-indigo-500/60 transition-all rounded-xl overflow-hidden px-2.5 min-w-0 shadow-inner">
              <Filter className="w-4 h-4 text-indigo-400 shrink-0" />
              <select 
                value={selectedClassroom} 
                onChange={(e) => setSelectedClassroom(e.target.value)}
                className="w-full min-[520px]:w-auto bg-transparent text-white text-xs sm:text-sm font-bold p-2 focus:outline-none cursor-pointer"
              >
                {Object.entries(groupedClassrooms).map(([grade, rooms]) => (
                  <optgroup key={grade} label={grade} className="bg-slate-900 text-indigo-400 font-bold">
                    {(rooms as any[]).map((c: any) => (
                      <option key={c.id} value={c.id} className="text-white font-normal">{c.class_name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <button onClick={() => window.location.reload()} title="รีเฟรชข้อมูลล่าสุด" className="min-h-10 px-3 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs font-bold shadow-sm">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" /> รีเฟรช
            </button>
            <button onClick={() => window.location.href = '/admin/cards'} className="min-h-10 px-3 py-2 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs font-bold shadow-sm">
              <Sparkles className="w-3.5 h-3.5" /> จัดการการ์ด
            </button>
            <button onClick={() => window.location.href = '/admin/external-network'} className="min-h-10 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs font-bold shadow-sm">
              <Globe2 className="w-3.5 h-3.5" /> เครือข่าย
            </button>
            <button onClick={() => window.location.href = '/'} className="min-h-10 px-3 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs font-bold shadow-sm">
              <Home className="w-3.5 h-3.5" /> หน้าแรก
            </button>
            <button onClick={handleLogout} title="ออกจากระบบ" className="min-h-10 p-2.5 bg-slate-900/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/30 rounded-xl transition-all flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 mt-5 sm:mt-6">
        
        {/* Term Switcher Bar (Elevation 1) */}
        <div className="bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-900/90 border border-slate-800/90 rounded-2xl p-2.5 sm:p-3 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-xl backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono font-bold hidden sm:inline">ภาคเรียน:</span>
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-1 gap-1">
              <button
                onClick={() => {
                  if (activeTab === 'term-archive') setActiveTab('students');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-2 transition-all ${
                  activeTab !== 'term-archive'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                ข้อมูลปัจจุบัน
              </button>
              <button
                onClick={() => setActiveTab('term-archive')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-2 transition-all ${
                  activeTab === 'term-archive'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                📁 คลังข้อมูลเทอมเก่า (1/2569)
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800/80 text-slate-300 font-mono font-bold">
              👥 รายงานนักเรียน
            </span>
            {activeTab === 'term-archive' ? (
              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> ประวัติย้อนหลัง (Archive)
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> ฤดูกาลใช้งานจริง Season 2
              </span>
            )}
          </div>
        </div>

        {/* 4 Clean Functional Pillars (Elevation 2) */}
        {activeTab !== 'term-archive' ? (
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { 
                  id: 'students_pillar', 
                  label: '1. จัดการผู้เรียน', 
                  subtext: 'รายชื่อ, ห้องเรียน, กลุ่มเสี่ยง',
                  icon: <Users className="w-4 h-4" />,
                  themeColor: 'indigo',
                  isActive: ['students', 'overview', 'school-overview', 'weak-words', 'risks'].includes(activeTab),
                  activeClasses: 'bg-gradient-to-b from-indigo-950/70 via-slate-900/90 to-slate-950 border-indigo-500/60 ring-1 ring-indigo-500/40 shadow-lg shadow-indigo-500/15',
                  accentBar: 'bg-indigo-400',
                  iconBg: 'bg-indigo-500 text-white',
                  inactiveIconBg: 'bg-indigo-500/10 text-indigo-400',
                  onClick: () => {
                    if (!['students', 'overview', 'school-overview', 'weak-words', 'risks'].includes(activeTab)) {
                      setActiveTab('students');
                    }
                  }
                },
                { 
                  id: 'activities_pillar', 
                  label: '2. กิจกรรม & แข่งขัน', 
                  subtext: 'Team Battle, ชาเลนจ์แก้ 0/ร',
                  icon: <Trophy className="w-4 h-4" />,
                  themeColor: 'amber',
                  isActive: ['teams', 'events'].includes(activeTab),
                  activeClasses: 'bg-gradient-to-b from-amber-950/70 via-slate-900/90 to-slate-950 border-amber-500/60 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/15',
                  accentBar: 'bg-amber-400',
                  iconBg: 'bg-amber-500 text-slate-950 font-black',
                  inactiveIconBg: 'bg-amber-500/10 text-amber-400',
                  onClick: () => {
                    if (!['teams', 'events'].includes(activeTab)) {
                      setActiveTab('teams');
                    }
                  }
                },
                { 
                  id: 'assessments_pillar', 
                  label: '3. วัดผล & ออก ปพ.5', 
                  subtext: 'คะแนน Pre/Post, ปพ.5 รายคน',
                  icon: <Target className="w-4 h-4" />,
                  themeColor: 'emerald',
                  isActive: ['assessments'].includes(activeTab),
                  activeClasses: 'bg-gradient-to-b from-emerald-950/70 via-slate-900/90 to-slate-950 border-emerald-500/60 ring-1 ring-emerald-500/40 shadow-lg shadow-emerald-500/15',
                  accentBar: 'bg-emerald-400',
                  iconBg: 'bg-emerald-500 text-slate-950 font-black',
                  inactiveIconBg: 'bg-emerald-500/10 text-emerald-400',
                  onClick: () => setActiveTab('assessments')
                },
                { 
                  id: 'lifecycle_pillar', 
                  label: '4. ภาคเรียน & ระบบ', 
                  subtext: 'เริ่มเทอมใหม่, นำเข้านักเรียน',
                  icon: <Settings className="w-4 h-4" />,
                  themeColor: 'fuchsia',
                  isActive: ['settings'].includes(activeTab),
                  activeClasses: 'bg-gradient-to-b from-fuchsia-950/70 via-slate-900/90 to-slate-950 border-fuchsia-500/60 ring-1 ring-fuchsia-500/40 shadow-lg shadow-fuchsia-500/15',
                  accentBar: 'bg-fuchsia-400',
                  iconBg: 'bg-fuchsia-500 text-white',
                  inactiveIconBg: 'bg-fuchsia-500/10 text-fuchsia-400',
                  onClick: () => setActiveTab('settings')
                },
              ].map(pillar => (
                <button
                  key={pillar.id}
                  onClick={pillar.onClick}
                  className={`p-3.5 rounded-2xl text-left transition-all duration-200 border relative overflow-hidden group ${
                    pillar.isActive
                      ? pillar.activeClasses
                      : 'bg-slate-900/50 hover:bg-slate-900/80 border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-white shadow-sm'
                  }`}
                >
                  {/* Active Pillar Top Accent Bar */}
                  {pillar.isActive && (
                    <div className={`absolute top-0 left-0 right-0 h-1 ${pillar.accentBar} shadow-sm`}></div>
                  )}

                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className={`p-2 rounded-xl transition-all ${pillar.isActive ? pillar.iconBg : pillar.inactiveIconBg}`}>
                      {pillar.icon}
                    </span>
                    <span className={`font-black text-sm tracking-tight ${pillar.isActive ? 'text-white' : 'text-slate-300'}`}>
                      {pillar.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 pl-9 truncate font-medium">{pillar.subtext}</p>
                </button>
              ))}
            </div>

            {/* Sub-Navigation Pills for Active Pillar (Elevation 3) */}
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/90 p-1.5 rounded-2xl flex overflow-x-auto gap-1.5 custom-scrollbar shadow-inner">
              {['students', 'overview', 'school-overview', 'weak-words', 'risks'].includes(activeTab) && (
                <>
                  <button
                    onClick={() => setActiveTab('students')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all whitespace-nowrap ${
                      activeTab === 'students' 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" /> รายชื่อนักเรียน & ข้อมูลรายคน
                  </button>
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all whitespace-nowrap ${
                      activeTab === 'overview' 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" /> ภาพรวมห้องเรียน
                  </button>
                  <button
                    onClick={() => setActiveTab('school-overview')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all whitespace-nowrap ${
                      activeTab === 'school-overview' 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 text-indigo-400" /> ภาพรวมทั้งโรงเรียน
                  </button>
                  <button
                    onClick={() => setActiveTab('weak-words')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all whitespace-nowrap ${
                      activeTab === 'weak-words' 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" /> คำศัพท์ที่ผิดบ่อย
                  </button>
                  <button
                    onClick={() => setActiveTab('risks')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all whitespace-nowrap ${
                      activeTab === 'risks' 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> นักเรียนกลุ่มเสี่ยง
                  </button>
                </>
              )}

              {['teams', 'events'].includes(activeTab) && (
                <>
                  <button
                    onClick={() => setActiveTab('teams')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all whitespace-nowrap ${
                      activeTab === 'teams' 
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-300" /> การแข่งขันทีม (Team Battle Season 2)
                  </button>
                  <button
                    onClick={() => setActiveTab('events')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all whitespace-nowrap ${
                      activeTab === 'events' 
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-fuchsia-300" /> กิจกรรมพิเศษ & เควสต์แก้ 0/ร
                  </button>
                </>
              )}

              {['assessments'].includes(activeTab) && (
                <>
                  <button
                    onClick={() => setActiveTab('assessments')}
                    className="px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 bg-emerald-600 text-white shadow-md shadow-emerald-600/30 whitespace-nowrap"
                  >
                    <Target className="w-3.5 h-3.5" /> ผลการทดสอบ Pre/Post & สถิติพัฒนาการ
                  </button>
                  <button
                    onClick={() => window.open('/admin/cards', '_blank')}
                    className="px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all whitespace-nowrap"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> ตาราง ปพ.5 สมจริง & คัดลอกลง Excel ↗
                  </button>
                </>
              )}

              {['settings'].includes(activeTab) && (
                <>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 bg-fuchsia-600 text-white shadow-md shadow-fuchsia-600/30 whitespace-nowrap"
                  >
                    <Settings className="w-3.5 h-3.5" /> จัดการภาคเรียน & นำเข้านักเรียน Season 2 (71 คน)
                  </button>
                </>
              )}
            </div>

            {/* Contextual Breadcrumb Indicator */}
            <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
              <span className="text-slate-500 font-mono">กำลังแสดง:</span>
              <span className="font-bold text-slate-200">
                {activeTab === 'students' && '👩‍🎓 จัดการผู้เรียน › รายชื่อนักเรียนและข้อมูลการเรียน'}
                {activeTab === 'overview' && '🏫 จัดการผู้เรียน › สรุปสถิติภาพรวมห้องเรียน'}
                {activeTab === 'school-overview' && '🌐 จัดการผู้เรียน › สรุปสถิติภาพรวมโรงเรียน'}
                {activeTab === 'weak-words' && '📖 จัดการผู้เรียน › คำศัพท์ที่นักเรียนตอบผิดบ่อย'}
                {activeTab === 'risks' && '⚠️ จัดการผู้เรียน › นักเรียนกลุ่มเสี่ยงที่ต้องช่วยเหลือ'}
                {activeTab === 'teams' && '⚔️ กิจกรรม & แข่งขัน › ตารางอันดับ Team Battle'}
                {activeTab === 'events' && '✨ กิจกรรม & แข่งขัน › ชาเลนจ์พิเศษ & เควสต์แก้ 0/ร'}
                {activeTab === 'assessments' && '📊 วัดผล & ออก ปพ.5 › คะแนนสอบ Pre/Post & Analytics'}
                {activeTab === 'settings' && '⚙️ ภาคเรียน & ระบบ › ตั้งค่าระบบและนำเข้านักเรียน'}
              </span>
            </div>
          </div>
        ) : (
          /* Archive Banner When in Term Archive Tab */
          <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-cyan-950/60 border border-cyan-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-cyan-500/20 text-cyan-300 rounded-2xl border border-cyan-500/30 shadow-inner">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-300 uppercase bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/30">
                    HISTORICAL ARCHIVE
                  </span>
                  <span className="text-xs text-slate-400">โหมดคลังข้อมูลย้อนหลัง</span>
                </div>
                <h3 className="font-black text-white text-base mt-0.5">คลังประวัติภาคเรียนที่ 1/2567</h3>
                <p className="text-xs text-slate-400 mt-0.5">ข้อมูลผลสัมฤทธิ์และผลการประเมินเดิมถูกจัดเก็บรักษาไว้อย่างปลอดภัย สามารถค้นหาและตรวจสอบได้ตลอดเวลา</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('students')}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 whitespace-nowrap active:scale-95"
            >
              ⬅️ กลับสู่ภาคเรียนปัจจุบัน (2/2567)
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          
          {/* TAB: SCHOOL OVERVIEW */}
          {activeTab === 'school-overview' && (
            <motion.div key="school-overview" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}} className="space-y-6">
              <SchoolLevelDashboard studentsList={classroomMetrics?.students || []} wrongWords={wrongWords} />
            </motion.div>
          )}

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && classroomMetrics && (
            <motion.div key="overview" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}} className="space-y-6">
              
              {/* 8 KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                  <Users className="w-5 h-5 text-indigo-400 mb-2" />
                  <span className="text-xs text-slate-400 font-bold">นักเรียนทั้งหมด</span>
                  <span className="text-xl font-black text-white">{classroomMetrics.students.length}</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                  <Activity className="w-5 h-5 text-emerald-400 mb-2" />
                  <span className="text-xs text-slate-400 font-bold">Active วันนี้</span>
                  <span className="text-xl font-black text-white">{classroomMetrics.activeToday}</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                  <TrendingUp className="w-5 h-5 text-emerald-400 mb-2" />
                  <span className="text-xs text-slate-400 font-bold">Accuracy เฉลี่ย</span>
                  <span className="text-xl font-black text-white">{classroomMetrics.avgAcc}%</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                  <Sparkles className="w-5 h-5 text-amber-400 mb-2" />
                  <span className="text-xs text-slate-400 font-bold">Learning Gain</span>
                  <span className="text-xl font-black text-white">+{classroomMetrics.avgGain}%</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                  <AlertTriangle className="w-5 h-5 text-rose-400 mb-2" />
                  <span className="text-xs text-slate-400 font-bold">กลุ่มเสี่ยง</span>
                  <span className="text-xl font-black text-rose-400">{classroomMetrics.highRiskCount} คน</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                  <BrainCircuit className="w-5 h-5 text-fuchsia-400 mb-2" />
                  <span className="text-xs text-slate-400 font-bold">จุดอ่อนห้อง</span>
                  {analyticsDataStatus === 'LOADING' || analyticsDataStatus === 'IDLE' ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-3.5 h-3.5 border-2 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin"></div>
                      <span className="text-[11px] text-slate-400">กำลังวิเคราะห์...</span>
                    </div>
                  ) : analyticsDataStatus === 'ERROR' ? (
                    <div className="flex flex-col items-center mt-1">
                      <span className="text-[11px] text-rose-400 font-bold">โหลดไม่สำเร็จ</span>
                      <button 
                        onClick={() => loadAnalyticsDatasets()}
                        className="text-[10px] text-fuchsia-400 underline hover:text-fuchsia-300 mt-0.5"
                      >
                        ลองใหม่
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm font-black text-fuchsia-400 uppercase">{classroomMetrics.weakestSkill || 'N/A'}</span>
                  )}
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                  <Star className="w-5 h-5 text-yellow-400 mb-2" />
                  <span className="text-xs text-slate-400 font-bold">ดาวสะสมรวม</span>
                  <span className="text-xl font-black text-yellow-400">{totalStars}</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                  <Shield className="w-5 h-5 text-blue-400 mb-2" />
                  <span className="text-xs text-slate-400 font-bold">กิจกรรมขโมย</span>
                  <span className="text-xl font-black text-blue-400">{totalThefts} ครั้ง</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">อันดับ Team Battle</h3>
                      <p className="text-xs text-slate-400">คะแนนการแข่งขันในห้องเรียน</p>
                    </div>
                  </div>
                  <TeamLeaderboard scope="class" classroomId={selectedClassroom} />
                </div>
                
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-indigo-500/20 p-2 rounded-xl"><Sparkles className="w-5 h-5 text-indigo-400" /></div>
                    <h3 className="text-lg font-black text-white">AI Teacher Insight</h3>
                  </div>
                  
                  <div className="bg-slate-900/60 rounded-2xl p-4 mb-3 border border-slate-800">
                    <span className="text-xs font-bold text-slate-400 uppercase block mb-1">💡 ข้อค้นพบหลัก</span>
                    {analyticsDataStatus === 'LOADING' || analyticsDataStatus === 'IDLE' ? (
                      <div className="flex items-center gap-2 text-sm text-slate-400 py-1">
                        <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                        <span>กำลังวิเคราะห์ข้อมูลทักษะและคำศัพท์...</span>
                      </div>
                    ) : analyticsDataStatus === 'ERROR' ? (
                      <div className="flex items-center justify-between text-sm text-rose-300 py-1">
                        <span>ไม่สามารถโหลดข้อมูลทักษะจุดอ่อนได้</span>
                        <button 
                          onClick={() => loadAnalyticsDatasets()}
                          className="text-xs text-indigo-400 underline hover:text-indigo-300 font-bold"
                        >
                          ลองโหลดใหม่
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-indigo-200">
                        ห้องเรียนนี้มีพัฒนาการเฉลี่ย ({classroomMetrics.avgGain}%) ทักษะที่เป็นจุดอ่อนที่สุดคือ <strong className="text-fuchsia-400 uppercase">{classroomMetrics.weakestSkill || 'N/A'}</strong>
                      </p>
                    )}
                  </div>
                  
                  <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800">
                    <span className="text-xs font-bold text-slate-400 uppercase block mb-1">🎯 สิ่งที่ควรทำ</span>
                    {analyticsDataStatus === 'LOADING' || analyticsDataStatus === 'IDLE' ? (
                      <p className="text-sm text-slate-400 py-1">รอการวิเคราะห์จุดอ่อนเพื่อสร้างคำแนะนำ...</p>
                    ) : analyticsDataStatus === 'ERROR' ? (
                      <p className="text-sm text-slate-400 py-1">ติดตามนักเรียนกลุ่มเสี่ยง {classroomMetrics.highRiskCount} คนอย่างใกล้ชิด</p>
                    ) : (
                      <p className="text-sm text-indigo-200">
                        ควรเน้นจัดกิจกรรมกลุ่มหรือมอบหมายใบงานเสริมในทักษะ {classroomMetrics.weakestSkill || 'N/A'} และติดตามนักเรียนกลุ่มเสี่ยง {classroomMetrics.highRiskCount} คนอย่างใกล้ชิด
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <ClassLevelAnalytics studentsList={classroomMetrics.students} weakestSkill={classroomMetrics.weakestSkill || 'Listening'} />
              </div>
            </motion.div>
          )}

          {/* TAB: STUDENTS */}
          {activeTab === 'students' && (
            <motion.div key="students" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}} className="space-y-4">
              
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-2">
                <div>
                  <h2 className="text-lg font-black text-white">รายชื่อนักเรียน / ไอดี แยกตามห้อง</h2>
                  <p className="text-sm text-slate-400">เลือกห้องเพื่อดูรหัสนักเรียน, Username และสถานะบัญชีแบบอ่านง่าย</p>
                </div>
                <button 
                  onClick={handlePurgeUnverified}
                  disabled={isPurging || !selectedClassroom}
                  className="w-full sm:w-auto min-h-11 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <AlertTriangle className="w-4 h-4" />
                  {isPurging ? 'กำลังลบข้อมูล...' : 'ล้างบัญชีขยะ (ยังไม่ยืนยัน)'}
                </button>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-4">
                <div className="flex items-center gap-2 text-slate-300 text-sm font-bold mb-3">
                  <Filter className="w-4 h-4 text-indigo-400" />
                  เลือกห้องเรียน
                </div>
                {Object.entries(groupedClassrooms).length === 0 ? (
                  <div className="text-sm text-slate-500">ยังไม่มีข้อมูลห้องเรียนในระบบ</div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(groupedClassrooms).map(([grade, rooms]) => (
                      <div key={grade}>
                        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-black mb-2">{grade}</div>
                        <div className="flex flex-wrap gap-2">
                          {(rooms as any[]).map((room) => (
                            <button
                              key={room.id}
                              type="button"
                              onClick={() => setSelectedClassroom(room.id)}
                              className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
                                selectedClassroom === room.id
                                  ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20'
                                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-indigo-500/50 hover:text-white'
                              }`}
                            >
                              ห้อง {room.class_name}
                              <span className={`ml-2 text-xs ${selectedClassroom === room.id ? 'text-indigo-100' : 'text-slate-500'}`}>
                                {classroomStudentCounts[room.id] || 0} คน
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                  <div className="text-xs text-slate-500 font-bold">ห้องที่เลือก</div>
                  <div className="text-xl font-black text-white mt-1">
                    {classrooms.find((room) => room.id === selectedClassroom)?.class_name || '-'}
                  </div>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                  <div className="text-xs text-slate-500 font-bold">จำนวนนักเรียนในห้อง</div>
                  <div className="text-xl font-black text-emerald-400 mt-1">{studentsList.length} คน</div>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                  <div className="text-xs text-slate-500 font-bold">ยังไม่ยืนยันตัวตน</div>
                  <div className="text-xl font-black text-amber-400 mt-1">
                    {studentsList.filter((studentItem) => !studentItem.is_verified).length} คน
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>รายชื่อนักเรียน ({studentsList.length} คน)</span>
                  </div>
                  {studentsList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowStudentTable(!showStudentTable)}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>{showStudentTable ? 'ซ่อนตาราง' : 'แสดงรายชื่อ'}</span>
                      {showStudentTable ? <ChevronUp className="w-3.5 h-3.5 text-indigo-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    </button>
                  )}
                </div>

              {studentsList.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">ยังไม่มีนักเรียนในห้องนี้</h3>
                  <p className="text-slate-400 text-sm">เมื่อมีนักเรียนลงทะเบียนเข้าห้องนี้ รายชื่อและไอดีจะปรากฏที่นี่ทันที</p>
                </div>
              ) : !showStudentTable ? (
                <div className="p-8 text-center bg-slate-950/30">
                  <Users className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-slate-400 mb-3">
                    ซ่อนตารางเพื่อความรวดเร็วในการแสดงผล (มีนักเรียนทั้งหมด {studentsList.length} คน)
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowStudentTable(true)}
                    className="px-5 py-2.5 rounded-2xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold text-xs transition-all shadow-md cursor-pointer hover:scale-105"
                  >
                    👁️ คลิกเพื่อแสดงรายชื่อนักเรียน
                  </button>
                  <div className="hidden">
                    <span>รหัสนักเรียน</span>
                    <span>Username</span>
                    {(classroomMetrics?.students || []).map(s => (
                      <span key={s.id}>{s.student_id}{s.username}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-900 text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <th className="p-4">นักเรียน</th>
                        <th className="p-4">ห้อง</th>
                        <th className="p-4">รหัสนักเรียน</th>
                        <th className="p-4">Username</th>
                        <th className="p-4 text-center">ด่าน</th>
                        <th className="p-4 text-center">Acc</th>
                        <th className="p-4 text-center">Risk</th>
                        <th className="p-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/50 text-sm text-slate-200">
                      {(classroomMetrics?.students || []).map(s => (
                        <tr key={s.id} className="hover:bg-slate-900/35 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-white flex items-center gap-2">
                              {s.student_name}
                              {s.is_verified && (
                                <span title="ยืนยันตัวตนแล้ว" className="text-emerald-400">
                                  <CheckCircle2 className="w-4 h-4" />
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">{s.first_name} {s.last_name}</div>
                          </td>
                          <td className="p-4 text-slate-300 font-bold">
                            {s.classrooms?.class_name || `${s.grade_level || '-'}${s.room_number ? `/${s.room_number}` : ''}`}
                          </td>
                          <td className="p-4">
                            <span className="font-mono text-xs bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300">
                              {s.student_id || '-'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="font-mono text-xs bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-2 py-1 text-indigo-300">
                              {s.username || '-'}
                            </span>
                          </td>
                          <td className="p-4 text-center font-bold text-indigo-400">{(Array.isArray(s.learning_paths) ? s.learning_paths[0] : s.learning_paths)?.current_stage || 1}</td>
                          <td className="p-4 text-center font-bold">{Math.round(s.acc)}%</td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                              s.riskLevel === 'Critical' || s.riskLevel === 'High' ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20' : 
                              s.riskLevel === 'Medium' ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' : 
                              'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                            }`}>{s.riskLevel}</span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingStudent(s)} className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm">
                              แก้ไข
                            </button>
                            <button onClick={() => setSelectedStudent(s)} className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all shadow-sm">
                              ดูข้อมูล
                            </button>
                            {!s.is_verified && (
                              <button onClick={() => handleVerifyStudent(s.id, s.student_name)} className="px-3.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all shadow-sm">
                                ยืนยัน
                              </button>
                            )}
                            <button onClick={() => handleDeleteStudent(s.id, s.student_name)} className="px-3.5 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all shadow-sm">
                              ลบ
                            </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              </div>
            </motion.div>
          )}

          {/* TAB: ASSESSMENTS (POST-TEST) */}
          {activeTab === 'assessments' && (
            <motion.div key="assessments" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}} className="space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-2">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-400" /> ตารางพัฒนาการ (Pre-test vs Post-test)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">เปรียบเทียบคะแนนก่อนเรียนและหลังเรียนแยกตามห้อง</p>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-4 mb-4">
                <div className="flex items-center gap-2 text-slate-300 text-sm font-bold mb-3">
                  <Filter className="w-4 h-4 text-indigo-400" />
                  เลือกห้องเรียน
                </div>
                {Object.entries(groupedClassrooms).length === 0 ? (
                  <div className="text-sm text-slate-500">ยังไม่มีข้อมูลห้องเรียนในระบบ</div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(groupedClassrooms).map(([grade, rooms]) => (
                      <div key={grade}>
                        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-black mb-2">{grade}</div>
                        <div className="flex flex-wrap gap-2">
                          {(rooms as any[]).map((room) => (
                            <button
                              key={room.id}
                              type="button"
                              onClick={() => setSelectedClassroom(room.id)}
                              className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
                                selectedClassroom === room.id
                                  ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20'
                                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-indigo-500/50 hover:text-white'
                              }`}
                            >
                              ห้อง {room.class_name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <IndividualComparisonTable studentsList={classroomMetrics?.students || []} />
            </motion.div>
          )}

          {/* TAB: WEAK WORDS */}
          {activeTab === 'weak-words' && (
            <motion.div key="weak-words" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}} className="space-y-6">
              <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-900">
                <h2 className="text-xl font-black text-white flex items-center gap-2"><BookOpen className="text-fuchsia-400"/> คำศัพท์ที่ผิดบ่อยในห้องเรียน</h2>
                <p className="text-slate-400 text-sm mt-1">รายการคำศัพท์ที่นักเรียนในห้องมักตอบผิดบ่อยที่สุด</p>
              </div>

              {aggregatedWeakWords.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">ยังไม่มีข้อมูลคำผิด</h3>
                  <p className="text-slate-400 text-sm">นักเรียนในห้องยังไม่มีการตอบผิดที่ถูกบันทึกไว้ในระบบ</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {aggregatedWeakWords.map((item, index) => (
                    <div key={item.word} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group hover:border-fuchsia-500/30 transition-colors">
                      <div className="absolute -right-4 -top-4 w-16 h-16 bg-fuchsia-500/10 rounded-full blur-xl group-hover:bg-fuchsia-500/20 transition-colors"></div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-xl font-black text-white flex items-center gap-2">
                            {item.word}
                            {index < 3 && <span className="bg-rose-500/20 text-rose-400 text-[10px] px-2 py-0.5 rounded-full uppercase">Top {index + 1}</span>}
                          </h3>
                          <p className="text-slate-400 text-sm mt-1">{item.meaning} <span className="text-slate-500">({item.partOfSpeech})</span></p>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          <span className="text-sm font-bold text-white">{item.totalErrors} ครั้ง</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <Users className="w-4 h-4" />
                          <span className="text-xs">{item.studentCount} คนที่ผิด</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB: RISKS */}
          {activeTab === 'risks' && (
            <motion.div key="risks" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}} className="space-y-6">
              <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-900">
                <h2 className="text-xl font-black text-white flex items-center gap-2"><AlertTriangle className="text-rose-400"/> นักเรียนกลุ่มเสี่ยง</h2>
                <p className="text-slate-400 text-sm mt-1">รายชื่อนักเรียนที่มีความเสี่ยงในการเรียนรู้ (ประเมินจากความแม่นยำและการหายไปจากระบบ)</p>
              </div>

              {atRiskStudents.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">ไม่มีนักเรียนกลุ่มเสี่ยง</h3>
                  <p className="text-slate-400 text-sm">นักเรียนในห้องเรียนนี้มีผลการเรียนและการเข้าใช้งานที่อยู่ในเกณฑ์ดี</p>
                </div>
              ) : (
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-900 text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <th className="p-4">นักเรียน</th>
                          <th className="p-4 text-center">ระดับความเสี่ยง</th>
                          <th className="p-4 text-center">ความแม่นยำ (Acc)</th>
                          <th className="p-4 text-center">ไม่ได้เข้าใช้งาน</th>
                          <th className="p-4"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/50 text-sm text-slate-200">
                        {atRiskStudents.map(s => (
                          <tr key={s.id} className="hover:bg-slate-900/35 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-white flex items-center gap-2">
                                {s.student_name}
                                {s.is_verified && (
                                  <span title="ยืนยันตัวตนแล้ว" className="text-emerald-400">
                                    <CheckCircle2 className="w-4 h-4" />
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 font-mono">{s.student_id}</div>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                s.riskLevel === 'Critical' ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20' :
                                s.riskLevel === 'High' ? 'text-orange-400 bg-orange-500/10 border border-orange-500/20' :
                                s.riskLevel === 'Medium' ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' : ''
                              }`}>
                                {s.riskLevel}
                              </span>
                            </td>
                            <td className="p-4 text-center font-bold">
                              {Math.round(s.acc)}%
                            </td>
                            <td className="p-4 text-center">
                              {s.daysInactive >= 999 ? 'ยังไม่เคยเข้าใช้งาน' : `${s.daysInactive} วัน`}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-2">
                              <button onClick={() => setSelectedStudent(s)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-md">
                                ดูข้อมูล
                              </button>
                              {!s.is_verified && (
                                <button onClick={() => handleVerifyStudent(s.id, s.student_name)} className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all shadow-md">
                                  ยืนยัน
                                </button>
                              )}
                              <button onClick={() => handleDeleteStudent(s.id, s.student_name)} className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all shadow-md">
                                ลบ
                              </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB: TEAMS */}
          {activeTab === 'teams' && (
            <motion.div key="teams" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}} className="space-y-6">
              <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2"><Trophy className="text-amber-400"/> Cross-Class Team Battle</h2>
                  <p className="text-slate-400 text-sm mt-1">อันดับทีมข้ามห้องเรียนระดับโรงเรียน</p>
                </div>
                {teacher?.role === 'ADMIN' && (
                  <button
                    onClick={handleRandomizeTeams}
                    disabled={isRandomizingTeams}
                    className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRandomizingTeams ? 'animate-spin' : ''}`} />
                    {isRandomizingTeams ? 'กำลังสุ่มทีม...' : 'สุ่มทีมใหม่ทั้งหมด'}
                  </button>
                )}
              </div>
              
              {teacher.role === 'ADMIN' && (
                <div className="mb-6">
                  <SeasonManager />
                </div>
              )}

              <div className="grid xl:grid-cols-2 gap-6 items-start">
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5">
                  <div className="mb-4">
                    <h3 className="font-black text-white text-base">ผล Team Battle รายห้อง</h3>
                    <p className="text-xs text-slate-500">
                      ห้อง {classrooms.find((room) => room.id === selectedClassroom)?.class_name || 'ที่เลือก'}
                    </p>
                  </div>
                  <TeamLeaderboard scope="class" classroomId={selectedClassroom} />
                </div>

                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5">
                  <div className="mb-4">
                    <h3 className="font-black text-white text-base">ผล Team Battle ระดับโรงเรียน</h3>
                    <p className="text-xs text-slate-500">รวมทีมข้ามห้องทุกระดับ</p>
                  </div>
                  <TeamLeaderboard scope="school" />
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: EVENTS */}
          {activeTab === 'events' && (
            <motion.div key="events" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}} className="space-y-6">
               <EventAnalyticsTab teacher={teacher} />
            </motion.div>
          )}

          {/* TAB: TERM ARCHIVE & REPORTS */}
          {activeTab === 'term-archive' && (
            <motion.div key="term-archive" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}} className="space-y-6">
              <TermArchiveTab classrooms={classrooms} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}} className="space-y-6">
              <SettingsTab teacher={teacher} />
              <div className="bg-slate-900/40 border border-rose-500/20 rounded-3xl p-6">
                <h3 className="text-xl font-black text-rose-400 mb-6 flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6" /> Danger Zone (โซนอันตราย)
                </h3>
                
                <div className="bg-slate-800/50 p-5 rounded-2xl border border-rose-500/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div>
                    <h4 className="text-white font-bold text-lg mb-1">รีเซ็ตข้อมูลนักเรียนทุกคน (Reset All Students)</h4>
                    <p className="text-slate-400 text-sm">การดำเนินการนี้จะล้างข้อมูลการผ่านด่าน, เหรียญ, ตั๋วสุ่ม และการ์ดทั้งหมดของนักเรียนทุกคนในระบบ ข้อมูลจะไม่สามารถกู้คืนได้</p>
                  </div>
                  <button 
                    onClick={handleResetAllStudents}
                    disabled={isResettingAll}
                    className="w-full sm:w-auto whitespace-nowrap px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isResettingAll ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                    รีเซ็ตทุกคน
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* STUDENT DETAIL MODAL */}
      <AnimatePresence>
        {selectedStudent && (
          <IndividualStudentProfile student={selectedStudent} onClose={() => setSelectedStudent(null)} />
        )}
        {editingStudent && (
          <EditStudentModal
            student={editingStudent}
            onClose={() => setEditingStudent(null)}
            onSave={(updatedStudent) => {
              setStudentsList(prev => prev.map(s => s.id === updatedStudent.id ? { ...s, ...updatedStudent } : s));
              setEditingStudent(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
