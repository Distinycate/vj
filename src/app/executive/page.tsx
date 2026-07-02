'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/utils/supabase/client';
import { 
  TrendingUp, Users, BookOpen, AlertCircle, Sparkles, LogOut, ArrowLeft, Shield, BarChart3
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { generateSchoolInsight } from '@/utils/aiTeacherInsight';
import { calculateLearningGain } from '@/utils/analyticsUtils';
import TeamLeaderboard from '@/components/TeamLeaderboard';

export default function ExecutiveDashboard() {
  const [executiveUser, setExecutiveUser] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [classroomsData, setClassroomsData] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalTeachers, setTotalTeachers] = useState(0);
  
  useEffect(() => {
    const saved = localStorage.getItem('vocab_journey_executive');
    if (saved) setExecutiveUser(JSON.parse(saved));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return setLoginError('กรุณากรอก Username และ Password');
    setIsLoading(true); setLoginError('');
    try {
      const { data, error } = await supabase.from('teachers').select('*').eq('username', username.trim()).eq('password', password.trim()).maybeSingle();
      if (error || !data) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านผู้บริหารไม่ถูกต้อง');
      if (data.role !== 'EXECUTIVE' && data.role !== 'ADMIN') throw new Error('บัญชีนี้ไม่มีสิทธิ์เข้าใช้ระบบผู้บริหาร');
      setExecutiveUser(data);
      localStorage.setItem('vocab_journey_executive', JSON.stringify(data));
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!executiveUser) return;
    async function loadData() {
      try {
        const { count: sCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
        const { count: tCount } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
        setTotalStudents(sCount || 0);
        setTotalTeachers(tCount || 0);

        const { data: classData } = await supabase.from('classrooms').select('*, students(*, analytics_summary(*), learning_paths(*))');
        
        // Filter out non M.1 - M.3 rooms if any slipped through
        const validClasses = (classData || []).filter(c => c.class_name.includes('ม.1') || c.class_name.includes('ม.2') || c.class_name.includes('ม.3'));
        
        setClassroomsData(validClasses);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, [executiveUser]);

  const schoolMetrics = useMemo(() => {
    if (!classroomsData.length) return null;

    let totalGain = 0;
    let totalAcc = 0;
    let count = 0;
    let totalAtRisk = 0;
    const now = new Date();

    const classStats = classroomsData.map(c => {
      let cPre = 0, cPost = 0, cAcc = 0, cGain = 0, studentsCount = c.students?.length || 0;
      
      (c.students || []).forEach((s: any) => {
        const stats = Array.isArray(s.analytics_summary) ? s.analytics_summary[0] : s.analytics_summary;
        const pre = stats?.pretest_score || 0;
        const post = stats?.posttest_score || 0;
        const acc = stats?.success_rate || 0;
        const { percentage } = calculateLearningGain(pre, post);
        
        cPre += pre; cPost += post; cAcc += acc; cGain += percentage;
        
        totalGain += percentage;
        totalAcc += acc;
        count++;

        // Simple risk estimation for executive overview (accuracy and inactivity)
        const lp = Array.isArray(s.learning_paths) ? s.learning_paths[0] : s.learning_paths;
        const lastActive = lp?.last_active_date ? new Date(lp.last_active_date) : null;
        const daysInactive = lastActive ? Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 3600 * 24)) : 999;
        let riskScore = 0;
        if (acc < 50) riskScore += 40;
        else if (acc < 70) riskScore += 20;
        if (daysInactive > 7) riskScore += 30;
        
        if (riskScore >= 50) totalAtRisk++;
      });

      return {
        id: c.id,
        name: c.class_name,
        students: studentsCount,
        avgPre: studentsCount ? cPre / studentsCount : 0,
        avgPost: studentsCount ? cPost / studentsCount : 0,
        avgGain: studentsCount ? cGain / studentsCount : 0,
        avgAcc: studentsCount ? cAcc / studentsCount : 0,
        grade: c.class_name.substring(0, 3) // e.g. "ม.1"
      };
    });

    const gradeStats = ['ม.1', 'ม.2', 'ม.3'].map(g => {
      const gClasses = classStats.filter(c => c.grade === g);
      if (!gClasses.length) return { name: g, avgGain: 0, avgAcc: 0 };
      const avgGain = gClasses.reduce((sum, c) => sum + c.avgGain, 0) / gClasses.length;
      const avgAcc = gClasses.reduce((sum, c) => sum + c.avgAcc, 0) / gClasses.length;
      return { name: g, avgGain: Math.round(avgGain), avgAcc: Math.round(avgAcc) };
    });

    // Find top and weak grades safely
    const validGrades = gradeStats.filter(g => g.avgGain > 0);
    const topGrade = validGrades.length ? [...validGrades].sort((a, b) => b.avgGain - a.avgGain)[0].name : 'ยังไม่มีข้อมูล';
    const weakGrade = validGrades.length ? [...validGrades].sort((a, b) => a.avgGain - b.avgGain)[0].name : 'ยังไม่มีข้อมูล';

    return {
      avgGain: count ? totalGain / count : 0,
      avgAcc: count ? totalAcc / count : 0,
      classStats: classStats.sort((a, b) => b.avgGain - a.avgGain),
      gradeStats,
      topGrade,
      weakGrade,
      totalAtRisk
    };
  }, [classroomsData]);

  if (!executiveUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl relative z-10">
          <div className="text-center mb-6">
            <Shield className="w-14 h-14 text-emerald-400 mx-auto mb-3" />
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-300 mb-2">Executive Portal</h1>
            <p className="text-slate-400">ระบบรายงาน Learning Analytics เชิงนโยบาย</p>
          </div>
          {loginError && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl mb-6 text-sm text-center">{loginError}</div>}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">ชื่อผู้ใช้</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">รหัสผ่าน</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500" />
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 text-white font-bold py-4 rounded-xl shadow-lg mt-4 disabled:opacity-50">
              {isLoading ? 'กำลังโหลด...' : 'เข้าสู่ระบบ 🔒'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400">กำลังประมวลผลข้อมูลทั้งโรงเรียน...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 pb-20 relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-slate-900 border border-slate-900 p-6 rounded-3xl gap-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-emerald-400" />
            <div>
              <h1 className="text-2xl font-black text-white">School Analytics Dashboard</h1>
              <p className="text-slate-400 text-sm">ผู้บริหาร: {executiveUser.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => window.location.href = '/admin'} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl flex gap-2">
              <ArrowLeft className="w-4 h-4" /> ไปหน้าครูผู้สอน
            </button>
            <button onClick={() => { localStorage.removeItem('vocab_journey_executive'); setExecutiveUser(null); }} className="px-5 py-2.5 bg-rose-500/10 text-rose-400 font-bold rounded-xl flex gap-2">
              <LogOut className="w-4 h-4" /> ออกจากระบบ
            </button>
          </div>
        </header>

        {schoolMetrics && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
                <span className="text-sm text-slate-400 block mb-1">นักเรียนทั้งหมด</span>
                <div className="text-3xl font-black text-white flex items-center justify-between">
                  {totalStudents} <Users className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
                <span className="text-sm text-slate-400 block mb-1">ห้องเรียนที่ใช้งาน (ม.1-ม.3)</span>
                <div className="text-3xl font-black text-white flex items-center justify-between">
                  {classroomsData.length} <BookOpen className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
                <span className="text-sm text-slate-400 block mb-1">Learning Gain โรงเรียน</span>
                <div className="text-3xl font-black text-emerald-400 flex items-center justify-between">
                  +{Math.round(schoolMetrics.avgGain)}% <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
                <span className="text-sm text-slate-400 block mb-1">Accuracy เฉลี่ยโรงเรียน</span>
                <div className="text-3xl font-black text-indigo-400 flex items-center justify-between">
                  {Math.round(schoolMetrics.avgAcc)}% <BarChart3 className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl flex gap-4 items-start">
              <div className="bg-emerald-500/20 p-3 rounded-full"><Sparkles className="w-6 h-6 text-emerald-400" /></div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">AI Executive Insight (สรุปภาพรวมโรงเรียน)</h3>
                <p className="text-emerald-200">
                  {generateSchoolInsight({
                    avgGain: schoolMetrics.avgGain,
                    topGrade: schoolMetrics.topGrade,
                    weakGrade: schoolMetrics.weakGrade,
                    totalAtRisk: schoolMetrics.totalAtRisk
                  })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Learning Gain by Grade Level */}
              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
                <h3 className="text-lg font-bold text-white mb-4">พัฒนาการ (Learning Gain) แยกตามระดับชั้น</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={schoolMetrics.gradeStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                      <Legend />
                      <Bar dataKey="avgGain" name="Learning Gain (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Accuracy by Grade Level */}
              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
                <h3 className="text-lg font-bold text-white mb-4">ความแม่นยำ (Accuracy) แยกตามระดับชั้น</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={schoolMetrics.gradeStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                      <Legend />
                      <Bar dataKey="avgAcc" name="Accuracy (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* School Team Battle Overview */}
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl mt-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-6 h-6 text-fuchsia-400" /> School Team Battle Overview
              </h3>
              <p className="text-slate-400 text-sm mb-6">ความร่วมมือของนักเรียนทุกระดับชั้นในรูปแบบทีมโรงเรียน</p>
              <TeamLeaderboard scope="school" />
            </div>

            {/* Top Classrooms Table */}
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
              <h3 className="text-lg font-bold text-white mb-4">ผลการประเมินรายห้องเรียน (Ranking)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-900 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="p-4">อันดับ</th>
                      <th className="p-4">ห้องเรียน</th>
                      <th className="p-4 text-center">จำนวนนักเรียน</th>
                      <th className="p-4 text-center">Learning Gain</th>
                      <th className="p-4 text-center">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/50 text-sm text-slate-200">
                    {schoolMetrics.classStats.map((c, idx) => (
                      <tr key={c.id} className="hover:bg-slate-900/35 transition-colors">
                        <td className="p-4 font-bold">{idx + 1}</td>
                        <td className="p-4 font-bold text-white">{c.name}</td>
                        <td className="p-4 text-center text-slate-400">{c.students} คน</td>
                        <td className="p-4 text-center font-bold text-emerald-400">+{Math.round(c.avgGain)}%</td>
                        <td className="p-4 text-center font-bold text-indigo-400">{Math.round(c.avgAcc)}%</td>
                      </tr>
                    ))}
                    {schoolMetrics.classStats.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-500">ไม่มีข้อมูลห้องเรียน</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
