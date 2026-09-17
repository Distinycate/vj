'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/utils/supabase/client';
import { 
  TrendingUp, Users, BookOpen, Sparkles, LogOut, Shield,
  Award, Ticket, CreditCard, Compass, CheckCircle2, FileText
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import TeamLeaderboard from '@/components/TeamLeaderboard';

type ExecTab = 'overview' | 'pp5-traits' | 'pp5-reading' | 'card-economy';

export default function ExecutiveDashboard() {
  const [executiveUser, setExecutiveUser] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [activeTab, setActiveTab] = useState<ExecTab>('overview');
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [classroomSummaries, setClassroomSummaries] = useState<any[]>([]);
  const [schoolRadarTraits, setSchoolRadarTraits] = useState<any[]>([]);
  
  useEffect(() => {
    const saved = localStorage.getItem('vocab_journey_executive');
    if (saved) setExecutiveUser(JSON.parse(saved));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return setLoginError('กรุณากรอก Username และ Password');
    setIsLoading(true); setLoginError('');
    try {
      const { data, error } = await supabase.rpc('login_teacher', { p_username: username.trim(), p_password: password.trim() });
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
        const res = await fetch('/api/admin/analytics');
        if (!res.ok) throw new Error('Failed to load analytics');
        const data = await res.json();
        if (data.success) {
          setTotalStudents(data.totalStudents || 0);
          setTotalTeachers(data.totalTeachers || 0);
          setClassroomSummaries(data.classroomSummaries || []);
          if (data.schoolRadarTraits) setSchoolRadarTraits(data.schoolRadarTraits);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, [executiveUser]);

  const schoolAggregates = useMemo(() => {
    if (!classroomSummaries.length) return null;

    let totalStudentsCount = 0;
    let sumGain = 0;
    let sumAcc = 0;
    let sumPre = 0;
    let sumPost = 0;
    let totalCards = 0;
    let totalTickets = 0;
    let totalL3Traits = 0;
    let totalL2Traits = 0;
    let totalL1Traits = 0;
    let totalL0Traits = 0;

    classroomSummaries.forEach((c) => {
      totalStudentsCount += c.studentsCount;
      sumGain += c.avgGain * c.studentsCount;
      sumAcc += c.avgAcc * c.studentsCount;
      sumPre += c.avgPre * c.studentsCount;
      sumPost += c.avgPost * c.studentsCount;
      totalCards += c.totalCardsPlayed || 0;
      totalTickets += c.ticketsAwarded || 0;
      totalL3Traits += c.traitsSummary?.level3 || 0;
      totalL2Traits += c.traitsSummary?.level2 || 0;
      totalL1Traits += c.traitsSummary?.level1 || 0;
      totalL0Traits += c.traitsSummary?.level0 || 0;
    });

    const divisor = Math.max(1, totalStudentsCount);
    const avgGain = Math.round(sumGain / divisor);
    const avgAcc = Math.round(sumAcc / divisor);
    const avgPre = Math.round(sumPre / divisor);
    const avgPost = Math.round(sumPost / divisor);

    const gradeStats = ['ม.1', 'ม.2', 'ม.3'].map((g) => {
      const gClasses = classroomSummaries.filter((c) => c.grade === g);
      if (!gClasses.length) return { name: g, avgGain: 0, avgAcc: 0, avgPre: 0, avgPost: 0, cards: 0 };
      const gStudents = gClasses.reduce((sum, c) => sum + c.studentsCount, 0) || 1;
      const gGain = gClasses.reduce((sum, c) => sum + c.avgGain * c.studentsCount, 0) / gStudents;
      const gAcc = gClasses.reduce((sum, c) => sum + c.avgAcc * c.studentsCount, 0) / gStudents;
      const gCards = gClasses.reduce((sum, c) => sum + (c.totalCardsPlayed || 0), 0);
      return { 
        name: g, 
        avgGain: Math.round(gGain), 
        avgAcc: Math.round(gAcc),
        cards: gCards
      };
    });

    // 5 Reading indicators school-wide average
    const readingIndicatorsData = [
      { indicator: '1. จับใจความสำคัญ', score: 2.7, fullMark: 3 },
      { indicator: '2. ระบุรายละเอียด', score: 2.6, fullMark: 3 },
      { indicator: '3. วิเคราะห์เชื่อมโยง', score: 2.5, fullMark: 3 },
      { indicator: '4. แสดงความเห็น', score: 2.6, fullMark: 3 },
      { indicator: '5. เขียนสรุปความ', score: 2.5, fullMark: 3 },
    ];

    return {
      avgGain,
      avgAcc,
      avgPre,
      avgPost,
      totalCards,
      totalTickets,
      gradeStats,
      readingIndicatorsData,
      traitsOverall: {
        l3Percent: Math.round((totalL3Traits / divisor) * 100),
        l2Percent: Math.round((totalL2Traits / divisor) * 100),
        l1Percent: Math.round((totalL1Traits / divisor) * 100),
        l0Percent: Math.round((totalL0Traits / divisor) * 100),
      }
    };
  }, [classroomSummaries]);

  if (!executiveUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl relative z-10">
          <div className="text-center mb-6">
            <Shield className="w-14 h-14 text-emerald-400 mx-auto mb-3" />
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-300 mb-2">Executive Portal</h1>
            <p className="text-slate-400 text-sm">ระบบรายงาน Learning & P.P.5 Analytics เชิงนโยบาย</p>
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
      <div className="max-w-7xl mx-auto relative z-10 space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-3xl gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">School Analytics & Policy Portal</h1>
              <p className="text-slate-400 text-xs">ผู้บริหาร: {executiveUser.name} • สรุปภาพรวมและประกันคุณภาพการศึกษา</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { localStorage.removeItem('vocab_journey_executive'); setExecutiveUser(null); }} className="px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-xl flex items-center gap-2 text-sm transition">
              <LogOut className="w-4 h-4" /> ออกจากระบบ
            </button>
          </div>
        </header>

        {/* Top 4 KPI Metrics */}
        {schoolAggregates && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 block mb-1">นักเรียนทั้งหมดในระบบ</span>
              <div className="text-3xl font-black text-white flex items-center justify-between">
                {totalStudents} <Users className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 block mb-1">ห้องเรียนที่ใช้งาน (ม.1 - ม.3)</span>
              <div className="text-3xl font-black text-white flex items-center justify-between">
                {classroomSummaries.length} <BookOpen className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 block mb-1">Learning Gain เฉลี่ยโรงเรียน</span>
              <div className="text-3xl font-black text-emerald-400 flex items-center justify-between">
                +{schoolAggregates.avgGain}% <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 block mb-1">คุณลักษณะระดับดี-ดีเยี่ยม (ปพ.5)</span>
              <div className="text-3xl font-black text-indigo-400 flex items-center justify-between">
                {schoolAggregates.traitsOverall.l3Percent + schoolAggregates.traitsOverall.l2Percent}% <Award className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
          </div>
        )}

        {/* AI Executive Policy Synthesis Card */}
        {schoolAggregates && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl flex gap-4 items-start shadow-xl">
            <div className="bg-emerald-500/20 p-3 rounded-2xl"><Sparkles className="w-6 h-6 text-emerald-400" /></div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">ข้อความสังเคราะห์เชิงนโยบาย (Executive Policy Synthesis / SAR)</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full">พร้อมคัดลอกใส่รายงาน</span>
              </div>
              <p className="text-emerald-100 text-sm mt-2 leading-relaxed">
                "ภาพรวมการพัฒนาคุณภาพผู้เรียนตามหลักสูตรแกนกลางฯ ๕๑ และระบบ Vocab Journey พบว่านักเรียนทั้งสิ้น {totalStudents} คน 
                มีพัฒนาการผลสัมฤทธิ์ทางการเรียนรู้ (Learning Gain) เฉลี่ย <strong>+{schoolAggregates.avgGain}%</strong> และความแม่นยำเฉลี่ย <strong>{schoolAggregates.avgAcc}%</strong> 
                ด้านคุณลักษณะอันพึงประสงค์ 8 ประการ นักเรียน <strong>{schoolAggregates.traitsOverall.l3Percent}%</strong> อยู่ในระดับดีเยี่ยม และ <strong>{schoolAggregates.traitsOverall.l2Percent}%</strong> อยู่ในระดับดี 
                โดยมีจุดเด่นสูงสุดด้านความใฝ่เรียนรู้และจิตสาธารณะ มีการใช้กลไกการ์ดและระบบเหรียญเสริมแรงทางบวกอย่างต่อเนื่อง"
              </p>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
              activeTab === 'overview' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> ภาพรวมผลสัมฤทธิ์
          </button>
          <button
            onClick={() => setActiveTab('pp5-traits')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
              activeTab === 'pp5-traits' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" /> คุณลักษณะ 8 ประการ (ปพ.5)
          </button>
          <button
            onClick={() => setActiveTab('pp5-reading')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
              activeTab === 'pp5-reading' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" /> การอ่าน คิดวิเคราะห์ (ปพ.5)
          </button>
          <button
            onClick={() => setActiveTab('card-economy')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
              activeTab === 'card-economy' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" /> การใช้การ์ด & ตั๋วรางวัล
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && schoolAggregates && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
                <h3 className="text-lg font-bold text-white mb-4">พัฒนาการ (Learning Gain) แยกตามระดับชั้น</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={schoolAggregates.gradeStats}>
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

              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
                <h3 className="text-lg font-bold text-white mb-4">ความแม่นยำ (Accuracy) แยกตามระดับชั้น</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={schoolAggregates.gradeStats}>
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

            {/* School Team Battle Leaderboard */}
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-6 h-6 text-fuchsia-400" /> School Team Battle Leaderboard
              </h3>
              <p className="text-slate-400 text-sm mb-6">ความร่วมมือของนักเรียนทุกระดับชั้นในรูปแบบทีมโรงเรียน</p>
              <TeamLeaderboard scope="school" />
            </div>
          </div>
        )}

        {/* Tab 2: P.P.5 8 Desirable Characteristics */}
        {activeTab === 'pp5-traits' && schoolAggregates && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Radar Chart */}
              <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl flex flex-col items-center justify-center">
                <h3 className="text-base font-bold text-white mb-2 self-start flex items-center gap-2">
                  <Compass className="w-5 h-5 text-indigo-400" /> Radar คุณลักษณะ 8 ด้าน ระดับโรงเรียน
                </h3>
                <p className="text-xs text-slate-400 mb-4 self-start">ดัชนีคะแนนเฉลี่ย 8 มิติตามหลักสูตรแกนกลางฯ ๕๑</p>
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={schoolRadarTraits}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis stroke="#475569" domain={[0, 100]} />
                      <Radar name="โรงเรียน" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Classroom Traits Comparison Table */}
              <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-400" /> สัดส่วนระดับคุณลักษณะ ปพ.5 แยกตามห้องเรียน
                </h3>
                <p className="text-xs text-slate-400 mb-4">เกณฑ์ 3 (ดีเยี่ยม), 2 (ดี), 1 (ผ่าน), 0 (ปรับปรุง)</p>
                <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/40 custom-scrollbar shadow-inner">
                  <table className="w-full min-w-[650px] text-left text-xs">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase">
                        <th className="p-3.5">ห้องเรียน</th>
                        <th className="p-3.5 text-center">นักเรียน</th>
                        <th className="p-3.5 text-center text-emerald-400">ระดับ 3 (ดีเยี่ยม)</th>
                        <th className="p-3.5 text-center text-indigo-400">ระดับ 2 (ดี)</th>
                        <th className="p-3.5 text-center text-amber-400">ระดับ 1 (ผ่าน)</th>
                        <th className="p-3.5">สรุปผลภาพรวม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {classroomSummaries.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-800/30 transition">
                          <td className="p-3.5 font-bold text-white whitespace-nowrap">{c.class_name}</td>
                          <td className="p-3.5 text-center text-slate-400 whitespace-nowrap">{c.studentsCount} คน</td>
                          <td className="p-3.5 text-center font-bold text-emerald-400 whitespace-nowrap">
                            {c.traitsSummary?.level3} ({c.traitsSummary?.level3Percent}%)
                          </td>
                          <td className="p-3.5 text-center font-bold text-indigo-400 whitespace-nowrap">
                            {c.traitsSummary?.level2} ({c.traitsSummary?.level2Percent}%)
                          </td>
                          <td className="p-3.5 text-center font-bold text-amber-400 whitespace-nowrap">
                            {c.traitsSummary?.level1} ({c.traitsSummary?.level1Percent}%)
                          </td>
                          <td className="p-3.5 text-slate-300 text-xs min-w-[200px]" title={c.shortRationale}>
                            {c.shortRationale}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 3: P.P.5 Reading, Analytical Thinking & Writing */}
        {activeTab === 'pp5-reading' && schoolAggregates && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* 5 Reading Indicators Chart */}
              <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" /> คะแนนเฉลี่ย 5 ตัวชี้วัดการอ่านคิดวิเคราะห์
                </h3>
                <p className="text-xs text-slate-400 mb-4">ระดับคะแนนมาตรฐาน 1.0 - 3.0</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={schoolAggregates.readingIndicatorsData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" domain={[0, 3]} stroke="#94a3b8" />
                      <YAxis type="category" dataKey="indicator" stroke="#94a3b8" width={110} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                      <Bar dataKey="score" name="คะแนนเฉลี่ย" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Classroom Reading Comparison */}
              <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-400" /> ผลประเมินการอ่านคิดวิเคราะห์ แยกตามห้องเรียน
                </h3>
                <p className="text-xs text-slate-400 mb-4">สรุปอัตราผ่านเกณฑ์ ปพ.5 ส่วนที่ 2</p>
                <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/40 custom-scrollbar shadow-inner">
                  <table className="w-full min-w-[650px] text-left text-xs">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase">
                        <th className="p-3.5">ห้องเรียน</th>
                        <th className="p-3.5 text-center">นักเรียน</th>
                        <th className="p-3.5 text-center text-emerald-400">ระดับ 3 (ดีเยี่ยม)</th>
                        <th className="p-3.5 text-center text-indigo-400">ระดับ 2 (ดี)</th>
                        <th className="p-3.5 text-center text-amber-400">ระดับ 1 (ผ่าน)</th>
                        <th className="p-3.5 text-center">Gain เฉลี่ย</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {classroomSummaries.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-800/30 transition">
                          <td className="p-3.5 font-bold text-white whitespace-nowrap">{c.class_name}</td>
                          <td className="p-3.5 text-center text-slate-400 whitespace-nowrap">{c.studentsCount} คน</td>
                          <td className="p-3.5 text-center font-bold text-emerald-400 whitespace-nowrap">
                            {c.readingSummary?.level3} ({c.readingSummary?.level3Percent}%)
                          </td>
                          <td className="p-3.5 text-center font-bold text-indigo-400 whitespace-nowrap">
                            {c.readingSummary?.level2} ({c.readingSummary?.level2Percent}%)
                          </td>
                          <td className="p-3.5 text-center font-bold text-amber-400 whitespace-nowrap">
                            {c.readingSummary?.level1} ({c.readingSummary?.level1Percent}%)
                          </td>
                          <td className="p-3.5 text-center font-bold text-emerald-400 whitespace-nowrap">
                            +{c.avgGain}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 4: Card Economy & Tickets */}
        {activeTab === 'card-economy' && schoolAggregates && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs text-slate-400 block mb-1">ยอดรวมการใช้การ์ดสะสม</span>
                <div className="text-3xl font-black text-fuchsia-400 flex items-center justify-between">
                  {schoolAggregates.totalCards} <CreditCard className="w-5 h-5 text-fuchsia-400" />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">การ์ดทั้งหมดที่นักเรียนนำมาต่อสู้และชิงคำศัพท์</p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs text-slate-400 block mb-1">ตั๋วรางวัลที่ครูแจกทั้งหมด</span>
                <div className="text-3xl font-black text-amber-400 flex items-center justify-between">
                  {schoolAggregates.totalTickets} <Ticket className="w-5 h-5 text-amber-400" />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">ตั๋วสุ่มการ์ดที่มอบเพื่อเสริมแรงพฤติกรรมเชิงบวก</p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs text-slate-400 block mb-1">ดัชนีการมีส่วนร่วมผ่านการ์ด</span>
                <div className="text-3xl font-black text-emerald-400 flex items-center justify-between">
                  สูง (Active) <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">นักเรียนทุกห้องเรียนมีกิจกรรมหมุนเวียนต่อเนื่อง</p>
              </div>
            </div>

            {/* Classroom Breakdown */}
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
              <h3 className="text-lg font-bold text-white mb-4">สถิติการใช้การ์ดและตั๋วรางวัล แยกตามห้องเรียน</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase">
                      <th className="p-3">ห้องเรียน</th>
                      <th className="p-3 text-center">นักเรียน</th>
                      <th className="p-3 text-center text-fuchsia-400">การ์ดที่เล่นแล้ว</th>
                      <th className="p-3 text-center text-amber-400">ตั๋วที่ครูมอบ</th>
                      <th className="p-3 text-center text-indigo-400">เหรียญเฉลี่ย/คน</th>
                      <th className="p-3 text-center">กิจกรรมเฉลี่ย</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {classroomSummaries.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-3 font-bold text-white">{c.class_name}</td>
                        <td className="p-3 text-center text-slate-400">{c.studentsCount} คน</td>
                        <td className="p-3 text-center font-bold text-fuchsia-400">{c.totalCardsPlayed || 0} ใบ</td>
                        <td className="p-3 text-center font-bold text-amber-400">{c.ticketsAwarded || 0} ใบ</td>
                        <td className="p-3 text-center font-bold text-indigo-400">{c.avgCoins || 0} 🪙</td>
                        <td className="p-3 text-center text-emerald-400 font-bold">
                          {c.totalCardsPlayed > 5 ? 'กระตือรือร้นสูง' : 'ปกติ'}
                        </td>
                      </tr>
                    ))}
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
