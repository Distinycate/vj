'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/utils/supabase/client';
import { 
  BarChart3, Users, AlertTriangle, FileSpreadsheet, Plus, LogOut, Shield, 
  Trophy, BookOpen, Activity, TrendingUp, AlertCircle, Sparkles, User, BrainCircuit, ArrowRight
} from 'lucide-react';
import Papa from 'papaparse';
import { 
  LineChart, Line, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { calculateLearningGain, calculateRiskScore, getRiskLevel, getProgressTrend, calculateClassroomWeakestSkill, calculateStudentSkillRadar } from '@/utils/analyticsUtils';
import { generateClassroomInsight, generateStudentInsight, generateItemInsight } from '@/utils/aiTeacherInsight';

import TeamLeaderboard from '@/components/TeamLeaderboard';

type AdminTab = 'overview' | 'students' | 'student-detail' | 'classroom' | 'school' | 'item-analysis' | 'intervention' | 'reports' | 'team-battle';

export default function AdminPage() {
  const [teacher, setTeacher] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('');
  
  // Data
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [vocabList, setVocabList] = useState<any[]>([]);
  const [itemAnalysis, setItemAnalysis] = useState<any[]>([]);
  const [wrongWords, setWrongWords] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Authentication
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

  // Fetch Core Data
  useEffect(() => {
    if (!teacher) return;
    async function loadInitialData() {
      // 1. Fetch Classrooms for this teacher (or all if admin)
      let classQuery = supabase.from('classrooms').select('*');
      if (teacher.role === 'TEACHER') {
        classQuery = classQuery.eq('teacher_id', teacher.id);
      }
      const { data: classData } = await classQuery;
      
      // Filter out non M.1 - M.3 rooms if any slipped through
      const validClasses = (classData || []).filter(c => c.class_name.includes('ม.1') || c.class_name.includes('ม.2') || c.class_name.includes('ม.3'));
      
      if (validClasses.length > 0) {
        setClassrooms(validClasses);
        setSelectedClassroom(validClasses[0].id);
      }

      // Fetch Vocab and Item Analysis
      const { data: vData } = await supabase.from('vocabulary').select('*');
      if (vData) setVocabList(vData);

      const { data: iData } = await supabase.from('item_analysis').select('*');
      if (iData) setItemAnalysis(iData);
    }
    loadInitialData();
  }, [teacher]);

  // Fetch Classroom Specific Data
  useEffect(() => {
    if (!teacher || !selectedClassroom) return;
    async function loadClassroomData() {
      // Fetch students with analytics and paths
      const { data: students } = await supabase
        .from('students')
        .select('*, analytics_summary(*), learning_paths(*)')
        .eq('classroom_id', selectedClassroom);
      
      if (students) setStudentsList(students);

      const studentIds = (students || []).map(s => s.id);
      if (studentIds.length > 0) {
        const { data: wwData } = await supabase.from('user_review_words').select('*, vocabulary(*)').in('user_id', studentIds);
        if (wwData) setWrongWords(wwData);
      } else {
        setWrongWords([]);
      }
    }
    loadClassroomData();
  }, [selectedClassroom, teacher]);

  // Derived Analytics Computations
  const classroomMetrics = useMemo(() => {
    if (!studentsList.length) return null;
    
    let totalPre = 0, totalPost = 0, totalGain = 0, totalAcc = 0, activeToday = 0;
    const now = new Date();

    const studentsWithMetrics = studentsList.map(s => {
      const pre = s.analytics_summary?.pretest_score || 0;
      const post = s.analytics_summary?.posttest_score || 0;
      const { gain, percentage } = calculateLearningGain(pre, post);
      const acc = s.analytics_summary?.success_rate || 0;
      
      const lastActive = s.learning_paths?.last_active_date ? new Date(s.learning_paths.last_active_date) : null;
      const daysInactive = lastActive ? Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 3600 * 24)) : 999;
      if (daysInactive === 0) activeToday++;

      const sReviewWords = wrongWords.filter(w => w.user_id === s.id).length;
      const riskScore = calculateRiskScore({ accuracy: acc, daysInactive, reviewWords: sReviewWords, stageStagnationDays: daysInactive });
      const riskLevel = getRiskLevel(riskScore);
      const trend = getProgressTrend(percentage, riskLevel);

      totalPre += pre; totalPost += post; totalGain += percentage; totalAcc += acc;

      return { ...s, pre, post, gainPercent: percentage, acc, daysInactive, reviewWordsCount: sReviewWords, riskScore, riskLevel, trend };
    });

    const len = studentsList.length;
    return {
      totalStudents: len,
      activeToday,
      avgPre: totalPre / len,
      avgPost: totalPost / len,
      avgGain: totalGain / len,
      avgAcc: totalAcc / len,
      weakestSkill: calculateClassroomWeakestSkill(itemAnalysis, vocabList),
      students: studentsWithMetrics,
      highRiskCount: studentsWithMetrics.filter(s => s.riskLevel === 'High' || s.riskLevel === 'Critical').length
    };
  }, [studentsList, wrongWords, itemAnalysis, vocabList]);

  const handleExportCSV = () => {
    const className = classrooms.find(c => c.id === selectedClassroom)?.class_name || 'Classroom';
    const dataToExport = classroomMetrics?.students.map(s => ({
      'รหัสนักเรียน': s.student_id,
      'ชื่อ': s.student_name,
      'ชั้น/ห้อง': className,
      'Pre-Test': s.pre,
      'Post-Test': s.post,
      'Learning Gain (%)': s.gainPercent,
      'ความแม่นยำ (%)': s.acc,
      'จำนวนคำศัพท์ที่ต้องทบทวน': s.reviewWordsCount,
      'ระดับความเสี่ยง': s.riskLevel,
      'แนวโน้ม': s.trend
    })) || [];

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `VocabJourney_${className}_Analytics.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!teacher) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl relative z-10">
          <div className="text-center mb-6">
            <Shield className="w-14 h-14 text-indigo-400 mx-auto mb-3" />
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-300 mb-2">Teacher Analytics</h1>
            <p className="text-slate-400">ระบบแดชบอร์ดวัดและประเมินผลสำหรับครู</p>
          </div>
          {loginError && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl mb-6 text-sm text-center">{loginError}</div>}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">ชื่อผู้ใช้ (ครู)</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">รหัสผ่าน</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 text-white font-bold py-4 rounded-xl shadow-lg mt-4 disabled:opacity-50">
              {isLoading ? 'กำลังโหลด...' : 'ลงชื่อเข้าใช้ระบบ 🔒'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const renderTabNavigation = () => (
    <div className="flex bg-slate-900 border border-slate-900 rounded-2xl p-1 mb-6 overflow-x-auto custom-scrollbar">
      {[
        { id: 'overview', icon: Activity, label: 'Overview' },
        { id: 'students', icon: Users, label: 'Student Analytics' },
        { id: 'classroom', icon: BarChart3, label: 'Classroom' },
        { id: 'item-analysis', icon: BookOpen, label: 'Item Analysis' },
        { id: 'intervention', icon: AlertTriangle, label: 'Intervention' },
        { id: 'team-battle', icon: Trophy, label: 'Team Battle' },
        { id: 'reports', icon: FileSpreadsheet, label: 'Reports & Export' },
      ].map(tab => (
        <button key={tab.id} onClick={() => { setActiveTab(tab.id as AdminTab); setSelectedStudent(null); }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
          <tab.icon className="w-4 h-4" /> {tab.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 pb-20 relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-center mb-6 bg-slate-900 border border-slate-900 p-6 rounded-3xl gap-4">
          <div className="flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-indigo-400" />
            <div>
              <h1 className="text-2xl font-black text-white">Learning Analytics Dashboard</h1>
              <p className="text-slate-400 text-sm">ผู้สอน: {teacher.name}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select value={selectedClassroom} onChange={e => setSelectedClassroom(e.target.value)} className="bg-slate-950 border border-slate-800 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500">
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
            </select>
            <button onClick={() => { localStorage.removeItem('vocab_journey_teacher'); setTeacher(null); }} className="px-4 py-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl font-bold flex items-center gap-2 hover:bg-rose-500/20">
              <LogOut className="w-4 h-4" /> ออกจากระบบ
            </button>
          </div>
        </header>

        {renderTabNavigation()}

        <AnimatePresence mode="wait">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && classroomMetrics && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
                  <span className="text-sm text-slate-400 block mb-1">นักเรียนทั้งหมด</span>
                  <div className="text-3xl font-black text-white">{classroomMetrics.totalStudents} คน</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
                  <span className="text-sm text-slate-400 block mb-1">ความแม่นยำเฉลี่ย (Accuracy)</span>
                  <div className="text-3xl font-black text-indigo-400">{Math.round(classroomMetrics.avgAcc)}%</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
                  <span className="text-sm text-slate-400 block mb-1">Learning Gain เฉลี่ย</span>
                  <div className="text-3xl font-black text-emerald-400">+{Math.round(classroomMetrics.avgGain)}%</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
                  <span className="text-sm text-slate-400 block mb-1">นักเรียนกลุ่มเสี่ยง (Risk)</span>
                  <div className="text-3xl font-black text-rose-400">{classroomMetrics.highRiskCount} คน</div>
                </div>
              </div>

              <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-3xl flex gap-4 items-start">
                <div className="bg-indigo-500/20 p-3 rounded-full"><Sparkles className="w-6 h-6 text-indigo-400" /></div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">AI Teacher Insight</h3>
                  <p className="text-indigo-200">
                    {generateClassroomInsight({
                      avgGain: classroomMetrics.avgGain,
                      lowAccuracyCount: classroomMetrics.highRiskCount,
                      weakestSkill: classroomMetrics.weakestSkill,
                      classroomName: classrooms.find(c => c.id === selectedClassroom)?.class_name || ''
                    })}
                  </p>
                </div>
              </div>

              {/* Chart section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
                  <h3 className="text-lg font-bold text-white mb-4">Pre-Test vs Post-Test (คะแนนเฉลี่ย)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[{ name: 'Class Average', PreTest: classroomMetrics.avgPre, PostTest: classroomMetrics.avgPost }]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                        <Legend />
                        <Bar dataKey="PreTest" fill="#64748b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="PostTest" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
                  <h3 className="text-lg font-bold text-white mb-4">การกระจายตัวของระดับความเสี่ยง</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { level: 'Low Risk', count: classroomMetrics.students.filter(s => s.riskLevel === 'Low').length, fill: '#10b981' },
                        { level: 'Medium Risk', count: classroomMetrics.students.filter(s => s.riskLevel === 'Medium').length, fill: '#f59e0b' },
                        { level: 'High Risk', count: classroomMetrics.students.filter(s => s.riskLevel === 'High').length, fill: '#f43f5e' },
                        { level: 'Critical', count: classroomMetrics.students.filter(s => s.riskLevel === 'Critical').length, fill: '#9f1239' }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="level" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: STUDENT ANALYTICS (TABLE) */}
          {activeTab === 'students' && classroomMetrics && (
            <motion.div key="students" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-900 text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <th className="p-4">นักเรียน</th>
                        <th className="p-4 text-center">ด่านปัจจุบัน</th>
                        <th className="p-4 text-center">Pre / Post</th>
                        <th className="p-4 text-center">Learning Gain</th>
                        <th className="p-4 text-center">Accuracy</th>
                        <th className="p-4 text-center">Review Words</th>
                        <th className="p-4 text-center">Risk Level</th>
                        <th className="p-4 text-center">Trend</th>
                        <th className="p-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/50 text-sm text-slate-200">
                      {classroomMetrics.students.map(s => {
                        const riskColor = s.riskLevel === 'Critical' || s.riskLevel === 'High' ? 'text-rose-400 bg-rose-500/10' : s.riskLevel === 'Medium' ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-400 bg-emerald-500/10';
                        const trendColor = s.trend === 'Improving' ? 'text-emerald-400' : s.trend === 'Declining' ? 'text-rose-400' : 'text-slate-400';
                        return (
                          <tr key={s.id} className="hover:bg-slate-900/35 transition-colors">
                            <td className="p-4 font-bold">
                              <div className="flex items-center gap-3">
                                <img src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${s.learning_paths?.avatar_seed || s.id}`} alt="Avatar" className="w-8 h-8 rounded-full bg-slate-800" />
                                <div>
                                  <div>{s.student_name}</div>
                                  <div className="text-xs text-slate-500 font-mono">{s.student_id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-center font-bold text-indigo-400">{s.learning_paths?.current_stage || 1}</td>
                            <td className="p-4 text-center font-bold">{s.pre} / {s.post}</td>
                            <td className="p-4 text-center font-bold text-emerald-400">+{s.gainPercent}%</td>
                            <td className="p-4 text-center font-bold">{Math.round(s.acc)}%</td>
                            <td className="p-4 text-center font-bold text-amber-400">{s.reviewWordsCount}</td>
                            <td className="p-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border border-transparent ${riskColor}`}>{s.riskLevel}</span>
                            </td>
                            <td className={`p-4 text-center font-bold ${trendColor}`}>{s.trend}</td>
                            <td className="p-4 text-right">
                              <button onClick={() => { setSelectedStudent(s); setActiveTab('student-detail'); }} className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg text-xs font-bold transition-all">
                                ดูรายละเอียด
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {classroomMetrics.students.length === 0 && (
                        <tr><td colSpan={9} className="p-8 text-center text-slate-500">ไม่มีข้อมูลนักเรียน</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: STUDENT DETAIL */}
          {activeTab === 'student-detail' && selectedStudent && (
            <motion.div key="student-detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <button onClick={() => setActiveTab('students')} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold mb-2">
                &larr; กลับไปหน้ารายชื่อนักเรียน
              </button>
              
              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl flex items-center gap-6">
                <img src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${selectedStudent.learning_paths?.avatar_seed || selectedStudent.id}`} alt="Avatar" className="w-24 h-24 rounded-full bg-slate-800" />
                <div>
                  <h2 className="text-2xl font-black text-white">{selectedStudent.student_name}</h2>
                  <p className="text-slate-400 font-mono mb-2">ID: {selectedStudent.student_id} | ด่านปัจจุบัน: {selectedStudent.learning_paths?.current_stage || 1}</p>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-bold">EXP: {selectedStudent.learning_paths?.exp || 0}</span>
                    <span className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-xs font-bold">Coins: {selectedStudent.learning_paths?.coins || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-3xl flex gap-4 items-start">
                <div className="bg-indigo-500/20 p-3 rounded-full"><Sparkles className="w-6 h-6 text-indigo-400" /></div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">AI Teacher Insight สำหรับนักเรียนคนนี้</h3>
                  <p className="text-indigo-200">
                    {generateStudentInsight({
                      gainPercent: selectedStudent.gainPercent,
                      accuracy: selectedStudent.acc,
                      weakestSkill: classroomMetrics?.weakestSkill || 'Listening',
                      reviewCount: selectedStudent.reviewWordsCount,
                      inactiveDays: selectedStudent.daysInactive
                    })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
                  <h3 className="text-lg font-bold text-white mb-4">Skill Radar (ความถนัดแต่ละทักษะ)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                        { subject: 'Meaning', A: calculateStudentSkillRadar(selectedStudent.acc, wrongWords.filter(w => w.user_id === selectedStudent.id)).Meaning, fullMark: 100 },
                        { subject: 'Listening', A: calculateStudentSkillRadar(selectedStudent.acc, wrongWords.filter(w => w.user_id === selectedStudent.id)).Listening, fullMark: 100 },
                        { subject: 'Context', A: calculateStudentSkillRadar(selectedStudent.acc, wrongWords.filter(w => w.user_id === selectedStudent.id)).Context, fullMark: 100 },
                        { subject: 'Spelling', A: calculateStudentSkillRadar(selectedStudent.acc, wrongWords.filter(w => w.user_id === selectedStudent.id)).Spelling, fullMark: 100 },
                        { subject: 'Word Recog', A: calculateStudentSkillRadar(selectedStudent.acc, wrongWords.filter(w => w.user_id === selectedStudent.id))['Word Recog'], fullMark: 100 },
                      ]}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Student Skills" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.5} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
                  <h3 className="text-lg font-bold text-white mb-4">คำศัพท์ที่ผิดบ่อย (Review Burden)</h3>
                  <div className="space-y-3 h-64 overflow-y-auto custom-scrollbar pr-2">
                    {wrongWords.filter(w => w.user_id === selectedStudent.id).slice(0, 8).map(w => (
                      <div key={w.id} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl">
                        <span className="font-bold text-white uppercase">{w.vocabulary?.word}</span>
                        <span className="text-xs bg-rose-500/20 text-rose-400 px-2 py-1 rounded-md">ผิด {w.wrong_count} ครั้ง</span>
                      </div>
                    ))}
                    {wrongWords.filter(w => w.user_id === selectedStudent.id).length === 0 && (
                      <div className="text-slate-500 text-center py-10">ไม่มีคำศัพท์ที่ต้องทบทวนพิเศษ</div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 6: ITEM ANALYSIS */}
          {activeTab === 'item-analysis' && (
            <motion.div key="item-analysis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-900">
                <h2 className="text-xl font-bold text-white">Item Analysis & Vocabulary Insights</h2>
                <p className="text-slate-400 text-sm mt-0.5">วิเคราะห์จุดอ่อนของคำศัพท์แต่ละคำ เพื่อปรับแนวทางการสอน</p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-900 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="p-5">คำศัพท์</th>
                      <th className="p-5">หมวดหมู่</th>
                      <th className="p-5 text-center">ระดับความยาก (Difficulty)</th>
                      <th className="p-5 text-center">อัตราข้อผิดพลาด (Error Rate)</th>
                      <th className="p-5">คำแนะนำ AI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-200">
                    {[...vocabList].sort((a, b) => {
                      const analysisA = itemAnalysis.find(i => i.word_id === a.id);
                      const analysisB = itemAnalysis.find(i => i.word_id === b.id);
                      const errorA = Math.min(100, Math.max(0, 100 - (analysisA?.success_rate || 100)));
                      const errorB = Math.min(100, Math.max(0, 100 - (analysisB?.success_rate || 100)));
                      return errorB - errorA;
                    }).slice(0, 30).map((v) => {
                      const analysis = itemAnalysis.find(i => i.word_id === v.id);
                      const errorRate = Math.min(100, Math.max(0, 100 - (analysis?.success_rate || 100)));
                      return (
                        <tr key={v.id} className="hover:bg-slate-900/35 transition-colors">
                          <td className="p-5 font-bold uppercase text-white">{v.word}</td>
                          <td className="p-5 text-slate-400">{v.difficulty_level || 'Normal'}</td>
                          <td className="p-5 text-center font-bold">
                            {analysis ? (Number(analysis.p_value) < 0.3 ? 'ยากมาก' : 'ปานกลาง') : 'รอข้อมูล'}
                          </td>
                          <td className="p-5 text-center font-bold text-rose-400">{errorRate}%</td>
                          <td className="p-5 text-xs text-slate-400 line-clamp-2">
                            {errorRate > 60 ? generateItemInsight(v.word, errorRate, 'ม.ต้น') : 'อยู่ในเกณฑ์ปกติ'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* TAB 7: INTERVENTION DASHBOARD */}
          {activeTab === 'intervention' && classroomMetrics && (
            <motion.div key="intervention" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-900">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-rose-500" /> ระบบแจ้งเตือนสอนเสริม (Intervention)
                </h2>
                <p className="text-slate-400 text-sm mt-0.5">จำแนกกลุ่มนักเรียนอัตโนมัติตามความเสี่ยง เพื่อให้ครูจัดการสอนเสริมได้ตรงจุด</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* High Risk Group */}
                <div className="bg-rose-950/20 border border-rose-500/20 p-6 rounded-3xl">
                  <h3 className="text-lg font-bold text-rose-400 mb-4 flex items-center gap-2">เร่งด่วน (High / Critical Risk)</h3>
                  <div className="space-y-3">
                    {classroomMetrics.students.filter(s => s.riskLevel === 'High' || s.riskLevel === 'Critical').map(s => (
                      <div key={s.id} className="bg-slate-900 p-4 rounded-xl">
                        <div className="font-bold text-white">{s.student_name}</div>
                        <div className="text-sm text-slate-400 mt-1">Accuracy: {Math.round(s.acc)}% | ไม่เข้าเรียน: {s.daysInactive} วัน</div>
                        <div className="text-xs text-rose-300 mt-2 bg-rose-500/10 p-2 rounded">
                          คำแนะนำ: เรียกพบเพื่อพูดคุย และมอบหมายภารกิจทบทวนคำศัพท์พื้นฐาน
                        </div>
                      </div>
                    ))}
                    {classroomMetrics.students.filter(s => s.riskLevel === 'High' || s.riskLevel === 'Critical').length === 0 && (
                      <div className="text-slate-500 italic">ไม่มีนักเรียนกลุ่มเสี่ยงสูง</div>
                    )}
                  </div>
                </div>

                {/* Normal/Fast Progress Group */}
                <div className="bg-emerald-950/20 border border-emerald-500/20 p-6 rounded-3xl">
                  <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">ก้าวหน้าเร็ว (Fast Progress)</h3>
                  <div className="space-y-3">
                    {classroomMetrics.students.filter(s => s.trend === 'Improving').map(s => (
                      <div key={s.id} className="bg-slate-900 p-4 rounded-xl">
                        <div className="font-bold text-white">{s.student_name}</div>
                        <div className="text-sm text-slate-400 mt-1">Learning Gain: +{s.gainPercent}% | Accuracy: {Math.round(s.acc)}%</div>
                        <div className="text-xs text-emerald-300 mt-2 bg-emerald-500/10 p-2 rounded">
                          คำแนะนำ: เพิ่มความท้าทายด้วยคำศัพท์ที่ยากขึ้น (Expert Level)
                        </div>
                      </div>
                    ))}
                    {classroomMetrics.students.filter(s => s.trend === 'Improving').length === 0 && (
                      <div className="text-slate-500 italic">ยังไม่มีนักเรียนที่มีพัฒนาการก้าวกระโดด</div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 8: REPORTS & EXPORT */}
          {activeTab === 'reports' && (
            <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-slate-900/60 p-8 rounded-3xl border border-slate-800 text-center">
                <FileSpreadsheet className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">ระบบออกรายงาน Learning Analytics</h2>
                <p className="text-slate-400 max-w-md mx-auto mb-8">ส่งออกข้อมูลดิบ (Raw Data) และข้อมูลสรุปการวิเคราะห์ (Analytics) เป็นไฟล์ CSV เพื่อนำไปทำวิจัยหรือรายงานต่อผู้บริหาร</p>
                
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <button onClick={handleExportCSV} className="px-6 py-4 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg">
                    ดาวน์โหลดรายงานนักเรียนรายห้อง (CSV)
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* TAB 9: TEAM BATTLE */}
          {activeTab === 'team-battle' && (
            <motion.div key="team-battle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-900 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-fuchsia-500" /> Cross-Class Team Battle
                  </h2>
                  <p className="text-slate-400 text-sm mt-0.5">กระตุ้นให้นักเรียนเกิดความร่วมมือกันทั้งภายในห้องเรียนและข้ามระดับชั้น</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold border border-slate-700 transition-all">
                    ⚖️ จัดสมดุลทีม (Rebalance)
                  </button>
                  <button className="px-4 py-2 bg-fuchsia-500 hover:bg-fuchsia-400 text-white rounded-xl text-sm font-bold shadow-lg transition-all">
                    🏁 เริ่ม Season ใหม่
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <TeamLeaderboard scope="class" />
                </div>
                <div>
                  <TeamLeaderboard scope="school" />
                </div>
              </div>
            </motion.div>
          )}
          
        </AnimatePresence>
      </div>
    </div>
  );
}
