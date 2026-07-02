'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/utils/supabase/client';
import { 
  Users, AlertTriangle, LogOut, Shield, 
  Trophy, BookOpen, Activity, TrendingUp, Sparkles, User, BrainCircuit, X, Download, Filter, RefreshCw
} from 'lucide-react';
import { 
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { calculateLearningGain, calculateRiskScore, getRiskLevel, getProgressTrend, calculateClassroomWeakestSkill, calculateStudentSkillRadar } from '@/utils/analyticsUtils';
import { generateStudentInsight } from '@/utils/aiTeacherInsight';

import TeamLeaderboard from '@/components/TeamLeaderboard';
import SchoolLevelDashboard from '@/components/admin/SchoolLevelDashboard';
import ClassLevelAnalytics from '@/components/admin/ClassLevelAnalytics';
import IndividualStudentProfile from '@/components/admin/IndividualStudentProfile';

type AdminTab = 'school-overview' | 'overview' | 'students' | 'teams' | 'weak-words' | 'risks';

export default function AdminPage() {
  const [teacher, setTeacher] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('school-overview');
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('');
  
  // Data
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [vocabList, setVocabList] = useState<any[]>([]);
  const [itemAnalysis, setItemAnalysis] = useState<any[]>([]);
  const [wrongWords, setWrongWords] = useState<any[]>([]);
  
  // Student Detail Modal
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentTab, setStudentTab] = useState<'overview' | 'skills' | 'wrong-words'>('overview');

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
      setTeacher(data);
      localStorage.setItem('vocab_journey_teacher', JSON.stringify(data));
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!teacher) return;
    async function loadInitialData() {
      let classQuery = supabase.from('classrooms').select('*');
      if (teacher.role === 'TEACHER') {
        classQuery = classQuery.eq('teacher_id', teacher.id);
      }
      const { data: classData } = await classQuery;
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
        .select('*, analytics_summary(*), learning_paths(*)')
        .eq('classroom_id', selectedClassroom);
      
      if (students) setStudentsList(students);

      const studentIds = students?.map(s => s.id) || [];
      if (studentIds.length > 0) {
        const { data: wData } = await supabase.from('wrong_words').select('*, vocabulary(*)').in('student_id', studentIds);
        if (wData) setWrongWords(wData);
      } else {
        setWrongWords([]);
      }
    }
    loadClassroomData();
  }, [teacher, selectedClassroom]);

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
                {classrooms.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-900">{c.class_name}</option>
                ))}
              </select>
            </div>
            <button onClick={() => window.location.reload()} className="p-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold">
              <RefreshCw className="w-4 h-4" /> รีเฟรช
            </button>
            <button onClick={() => { localStorage.removeItem('vocab_journey_teacher'); window.location.reload(); }} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors">
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
            { id: 'weak-words', icon: <BookOpen className="w-4 h-4"/>, label: 'คำที่ผิดบ่อย' },
            { id: 'risks', icon: <AlertTriangle className="w-4 h-4"/>, label: 'กลุ่มเสี่ยง' }
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
              
              {/* 6 KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5">
                  <h3 className="text-lg font-black text-white mb-4">🏆 ทีมนำอยู่ (Classroom)</h3>
                  <TeamLeaderboard scope="class" />
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
            <motion.div key="students" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}} className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
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
                          <div className="font-bold text-white">{s.student_name}</div>
                          <div className="text-xs text-slate-500 font-mono">{s.student_id}</div>
                        </td>
                        <td className="p-4 text-center font-bold text-indigo-400">{s.learning_paths?.current_stage || 1}</td>
                        <td className="p-4 text-center font-bold">{Math.round(s.acc)}%</td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                            s.riskLevel === 'Critical' || s.riskLevel === 'High' ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20' : 
                            s.riskLevel === 'Medium' ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' : 
                            'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                          }`}>{s.riskLevel}</span>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => setSelectedStudent(s)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-md">
                            ดูข้อมูล
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* TAB: TEAMS */}
          {activeTab === 'teams' && (
            <motion.div key="teams" initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0}} className="space-y-6">
              <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-900">
                <h2 className="text-xl font-black text-white flex items-center gap-2"><Trophy className="text-amber-400"/> Cross-Class Team Battle</h2>
                <p className="text-slate-400 text-sm mt-1">อันดับทีมข้ามห้องเรียนระดับโรงเรียน</p>
              </div>
              <TeamLeaderboard scope="school" />
            </motion.div>
          )}
          
        </AnimatePresence>
      </div>

      {/* STUDENT DETAIL MODAL */}
      <AnimatePresence>
        {selectedStudent && (
          <IndividualStudentProfile student={selectedStudent} onClose={() => setSelectedStudent(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
