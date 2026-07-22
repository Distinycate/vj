'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/utils/supabase/client';
import { 
  Users, AlertTriangle, LogOut, Shield, CheckCircle2,
  Trophy, BookOpen, Activity, TrendingUp, Sparkles, User, BrainCircuit, X, Download, Filter, RefreshCw, Home, Settings, Gift, Star
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

type AdminTab = 'school-overview' | 'overview' | 'students' | 'teams' | 'weak-words' | 'risks' | 'events' | 'settings';

export default function AdminPage() {
  const [teacher, setTeacher] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('school-overview');
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('');
  
  // Data
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
    const saved = localStorage.getItem('vocab_journey_teacher');
    if (saved) setTeacher(JSON.parse(saved));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return setLoginError('กรุณากรอก Username และ Password');
    setIsLoading(true); setLoginError('');
    try {
      const { data, error } = await supabase.from('teachers').select('*').eq('username', username.trim()).eq('password', password.trim()).maybeSingle();
      if (error || !data) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านครูไม่ถูกต้อง');
      if (!['TEACHER', 'ADMIN'].includes(data.role)) {
        throw new Error('บัญชีนี้ใช้ได้เฉพาะระบบการ์ด กรุณาเข้าผ่านเมนูระบบการ์ดสำหรับคุณครู');
      }
      setTeacher(data);
      localStorage.setItem('vocab_journey_teacher', JSON.stringify(data));
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
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
      const { error } = await supabase.from('students').delete().eq('id', studentId);
      if (error) throw error;
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
      const { error } = await supabase.from('students').update({ is_verified: true }).eq('id', studentId);
      if (error) throw error;
      setStudentsList(prev => prev.map(s => s.id === studentId ? { ...s, is_verified: true } : s));
      alert(`ยืนยันตัวตนนักเรียน ${studentName} เรียบร้อยแล้ว`);
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการยืนยันตัวตน');
    }
  };


  useEffect(() => {
    if (!teacher) return;
    async function loadInitialData() {
      let classQuery = supabase.from('classrooms').select('*');
      if (teacher.role === 'TEACHER') {
        classQuery = classQuery.eq('teacher_id', teacher.id);
      }
      let { data: classData } = await classQuery;
      
      // Fallback for prototype: if teacher has no classrooms assigned, show all classrooms
      if (teacher.role === 'TEACHER' && (!classData || classData.length === 0)) {
        const { data: allClassData } = await supabase.from('classrooms').select('*');
        classData = allClassData;
      }
      
      const validClasses = (classData || []).filter(c => c.class_name.includes('ม.1') || c.class_name.includes('ม.2') || c.class_name.includes('ม.3'));
      
      if (validClasses.length > 0) {
        setClassrooms(validClasses);
        setSelectedClassroom(validClasses[0].id);
      }

      const { data: vData } = await supabase.from('vocabulary').select('*');
      if (vData) setVocabList(vData);

      const { data: iData } = await supabase.from('item_analysis').select('*');
      if (iData) setItemAnalysis(iData);
    }
    loadInitialData();
  }, [teacher]);

  useEffect(() => {
    if (!teacher || !selectedClassroom) return;
    async function loadClassroomData() {
      const { data: students } = await supabase
        .from('students')
        .select('*, classrooms(class_name), analytics_summary(*), learning_paths(*)')
        .eq('classroom_id', selectedClassroom);
      
      if (students) setStudentsList(students);

      const studentIds = students?.map(s => s.id) || [];
      if (studentIds.length > 0) {
        const { data: wData } = await supabase.from('wrong_words').select('*, vocabulary(*)').in('student_id', studentIds);
        if (wData) setWrongWords(wData);
        
        const { data: sData } = await supabase.from('stage_results').select('stars').in('user_id', studentIds);
        if (sData) {
           setTotalStars(sData.reduce((acc, curr) => acc + (curr.stars || 0), 0));
        }

        const { data: tData } = await supabase.from('card_transactions').select('id').in('actor_user_id', studentIds).in('action_type', ['random_card_stolen', 'selected_card_stolen']);
        if (tData) {
           setTotalThefts(tData.length);
        }
      } else {
        setWrongWords([]);
        setTotalStars(0);
        setTotalThefts(0);
      }
    }
    loadClassroomData();
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
    let highRiskCount = 0;
    
    const processedStudents = studentsList.map(s => {
      const stats = (Array.isArray(s.analytics_summary) ? s.analytics_summary[0] : s.analytics_summary) || { pretest_score: 0, posttest_score: 0, success_rate: 0, attempt_count: 0, last_active_at: new Date(0).toISOString() };
      const pre = stats.pretest_score || 0;
      const post = stats.posttest_score || 0;
      const { percentage: gainPercent } = calculateLearningGain(pre, post);
      const acc = stats.success_rate || 0;
      const attempts = stats.attempt_count || 0;
      
      const wwCount = wrongWords.filter(w => w.student_id === s.id).reduce((sum, w) => sum + (w.error_count || 1), 0);
      
      const lp = Array.isArray(s.learning_paths) ? s.learning_paths[0] : s.learning_paths;
      const lastActive = lp?.last_active_date ? new Date(lp.last_active_date) : null;
      const now = new Date();
      const daysInactive = lastActive ? Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 3600 * 24)) : 999;
      
      let riskLevel = 'No Data';
      if (stats?.attempt_count > 0 || stats?.success_rate > 0) {
        const riskScore = calculateRiskScore({ accuracy: acc, reviewWords: wwCount, daysInactive: lastActive ? daysInactive : 0, stageStagnationDays: 0 });
        riskLevel = getRiskLevel(riskScore);
        if (riskLevel === 'High' || riskLevel === 'Critical') highRiskCount++;
      }

      totalPre += pre; totalPost += post; totalGain += gainPercent; totalAcc += acc;
      
      return { ...s, pre, post, gainPercent, acc, attempts, reviewWordsCount: wwCount, daysInactive, riskLevel, trend: getProgressTrend(gainPercent, riskLevel) };
    });

    const activeToday = processedStudents.filter(s => s.daysInactive === 0).length;

    return {
      students: processedStudents,
      avgPre: (totalPre / processedStudents.length).toFixed(1),
      avgPost: (totalPost / processedStudents.length).toFixed(1),
      avgGain: (totalGain / processedStudents.length).toFixed(1),
      avgAcc: (totalAcc / processedStudents.length).toFixed(1),
      activeToday,
      highRiskCount,
      weakestSkill: calculateClassroomWeakestSkill(itemAnalysis, vocabList)
    };
  }, [studentsList, wrongWords, itemAnalysis, vocabList]);

  const aggregatedWeakWords = useMemo(() => {
    if (!wrongWords || wrongWords.length === 0) return [];
    const map = new Map();
    wrongWords.forEach(w => {
      if (!w.vocabulary) return;
      const word = w.vocabulary.word;
      if (!map.has(word)) {
        map.set(word, {
          word,
          meaning: w.vocabulary.meaning,
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 relative">
      {/* Sticky Top Filter & Header */}
      <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 p-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center font-black border border-indigo-500/30">
              {teacher.role === 'ADMIN' ? 'AD' : 'TC'}
            </div>
            <div>
              <h1 className="text-lg font-black text-white">Vocab Journey | Teacher Dashboard</h1>
              <p className="text-xs text-slate-400">ยินดีต้อนรับ, {teacher.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl overflow-hidden px-2">
              <Filter className="w-4 h-4 text-slate-400 ml-2" />
              <select 
                value={selectedClassroom} 
                onChange={(e) => setSelectedClassroom(e.target.value)}
                className="bg-transparent text-white text-sm font-bold p-2 focus:outline-none cursor-pointer"
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
            <button onClick={() => window.location.reload()} className="p-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold">
              <RefreshCw className="w-4 h-4" /> รีเฟรช
            </button>
            <button onClick={() => window.location.href = '/admin/cards'} className="p-2.5 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/20 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold">
              <Sparkles className="w-4 h-4" /> จัดการการ์ด
            </button>
            <button onClick={() => window.location.href = '/'} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold">
              <Home className="w-4 h-4" /> หน้าเข้าใช้งาน
            </button>

            <button onClick={() => window.open('/admin/cards', '_blank')} className="hidden md:flex items-center gap-2 bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-300 border border-fuchsia-500/30 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-lg">
              <Gift className="w-4 h-4" /> แจกเหรียญและตั๋ว
            </button>

            <button onClick={handleLogout} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 p-2.5 rounded-xl transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6">
        
        {/* Tabs Menu */}
        <div className="flex overflow-x-auto gap-2 pb-2 mb-6 custom-scrollbar">
          {[
            { id: 'school-overview', icon: <Activity className="w-4 h-4"/>, label: 'ภาพรวมโรงเรียน' },
            { id: 'overview', icon: <Activity className="w-4 h-4"/>, label: 'ภาพรวมห้องเรียน' },
            { id: 'students', icon: <Users className="w-4 h-4"/>, label: 'นักเรียน' },
            { id: 'teams', icon: <Trophy className="w-4 h-4"/>, label: 'ทีม (Team Battle)' },
            { id: 'events', icon: <Sparkles className="w-4 h-4"/>, label: 'กิจกรรม (Events)' },
            { id: 'weak-words', icon: <BookOpen className="w-4 h-4"/>, label: 'คำที่ผิดบ่อย' },
            { id: 'risks', icon: <AlertTriangle className="w-4 h-4"/>, label: 'กลุ่มเสี่ยง' },
            { id: 'settings', icon: <Settings className="w-4 h-4"/>, label: 'ตั้งค่าระบบ' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                  : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          
          {/* TAB: SCHOOL OVERVIEW */}
          {activeTab === 'school-overview' && classroomMetrics && (
            <motion.div key="school-overview" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}} className="space-y-6">
              <SchoolLevelDashboard studentsList={classroomMetrics.students} />
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
                  <span className="text-sm font-black text-fuchsia-400 uppercase">{classroomMetrics.weakestSkill}</span>
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
                  <h3 className="text-lg font-black text-white mb-4">🏆 ทีมนำอยู่ (Classroom)</h3>
                  <TeamLeaderboard scope="class" classroomId={selectedClassroom} />
                </div>
                
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-indigo-500/20 p-2 rounded-xl"><Sparkles className="w-5 h-5 text-indigo-400" /></div>
                    <h3 className="text-lg font-black text-white">AI Teacher Insight</h3>
                  </div>
                  
                  <div className="bg-slate-900/60 rounded-2xl p-4 mb-3 border border-slate-800">
                    <span className="text-xs font-bold text-slate-400 uppercase block mb-1">💡 ข้อค้นพบหลัก</span>
                    <p className="text-sm text-indigo-200">ห้องเรียนนี้มีพัฒนาการเฉลี่ย ({classroomMetrics.avgGain}%) ทักษะที่เป็นจุดอ่อนที่สุดคือ <strong className="text-fuchsia-400 uppercase">{classroomMetrics.weakestSkill}</strong></p>
                  </div>
                  
                  <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800">
                    <span className="text-xs font-bold text-slate-400 uppercase block mb-1">🎯 สิ่งที่ควรทำ</span>
                    <p className="text-sm text-indigo-200">ควรเน้นจัดกิจกรรมกลุ่มหรือมอบหมายใบงานเสริมในทักษะ {classroomMetrics.weakestSkill} และติดตามนักเรียนกลุ่มเสี่ยง {classroomMetrics.highRiskCount} คนอย่างใกล้ชิด</p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <ClassLevelAnalytics studentsList={classroomMetrics.students} weakestSkill={classroomMetrics.weakestSkill} />
              </div>
            </motion.div>
          )}

          {/* TAB: STUDENTS */}
          {activeTab === 'students' && classroomMetrics && (
            <motion.div key="students" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}} className="space-y-4">
              
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-black text-white">รายชื่อนักเรียนในห้อง</h2>
                <button 
                  onClick={handlePurgeUnverified}
                  disabled={isPurging}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <AlertTriangle className="w-4 h-4" />
                  {isPurging ? 'กำลังลบข้อมูล...' : 'ล้างบัญชีขยะ (ยังไม่ยืนยัน)'}
                </button>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-900 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="p-4">นักเรียน</th>
                      <th className="p-4 text-center">ด่าน</th>
                      <th className="p-4 text-center">Acc</th>
                      <th className="p-4 text-center">Risk</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/50 text-sm text-slate-200">
                    {classroomMetrics.students.map(s => (
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
                        <td className="p-4 text-center font-bold text-indigo-400">{(Array.isArray(s.learning_paths) ? s.learning_paths[0] : s.learning_paths)?.current_stage || 1}</td>
                        <td className="p-4 text-center font-bold">{Math.round(s.acc)}%</td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                            s.riskLevel === 'Critical' || s.riskLevel === 'High' ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20' : 
                            s.riskLevel === 'Medium' ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' : 
                            'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                          }`}>{s.riskLevel}</span>
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          <button onClick={() => setEditingStudent(s)} className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all shadow-md">
                            แก้ไข
                          </button>
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
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
                    <table className="w-full text-left border-collapse">
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
                            <td className="p-4 text-right flex justify-end gap-2">
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
              <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-900">
                <h2 className="text-xl font-black text-white flex items-center gap-2"><Trophy className="text-amber-400"/> Cross-Class Team Battle</h2>
                <p className="text-slate-400 text-sm mt-1">อันดับทีมข้ามห้องเรียนระดับโรงเรียน</p>
              </div>
              
              {teacher.role === 'ADMIN' && (
                <div className="mb-6">
                  <SeasonManager />
                </div>
              )}

              <div className="grid xl:grid-cols-2 gap-6 items-start">
                <div>
                  <div className="mb-3">
                    <h3 className="font-black text-white">ผล Team Battle รายห้อง</h3>
                    <p className="text-xs text-slate-500">
                      ห้อง {classrooms.find((room) => room.id === selectedClassroom)?.class_name || 'ที่เลือก'}
                    </p>
                  </div>
                  <TeamLeaderboard scope="class" classroomId={selectedClassroom} />
                </div>
                <div>
                  <div className="mb-3">
                    <h3 className="font-black text-white">ผล Team Battle ระดับโรงเรียน</h3>
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
               <EventAnalyticsTab />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}} className="space-y-6">
              <div className="bg-slate-900/40 border border-rose-500/20 rounded-3xl p-6">
                <h3 className="text-xl font-black text-rose-400 mb-6 flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6" /> Danger Zone (โซนอันตราย)
                </h3>
                
                <div className="bg-slate-800/50 p-5 rounded-2xl border border-rose-500/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div>
                    <h4 className="text-white font-bold text-lg mb-1">รีเซ็ตข้อมูลนักเรียนทุกคน (Reset All Students)</h4>
                    <p className="text-slate-400 text-sm">การดำเนินการนี้จะล้างข้อมูลการผ่านด่าน, เหรียญ, ตั๋วสุ่ม และ **การ์ดทั้งหมด** ของนักเรียนทุกคนในระบบ ข้อมูลจะไม่สามารถกู้คืนได้</p>
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
          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}} className="space-y-6">
              <SettingsTab teacher={teacher} />
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
