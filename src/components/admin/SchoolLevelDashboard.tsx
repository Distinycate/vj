'use client';
import { useState, useEffect, useCallback } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, Target, AlertTriangle, BookOpen, Trophy, 
  Users, Award, RefreshCw, Sparkles, ArrowUpRight, BarChart3, CheckCircle2
} from 'lucide-react';

export interface WrongWordItem {
  id?: string;
  student_id?: string;
  error_count?: number;
  vocabulary?: {
    word?: string;
    meaning?: string;
    meaning_th?: string;
    part_of_speech?: string;
  } | null;
}

interface SchoolLevelDashboardProps {
  studentsList?: any[];
  wrongWords?: WrongWordItem[];
}

interface SchoolOverviewData {
  totalStudents: number;
  classroomsCount: number;
  avgPre: number;
  avgPost: number;
  avgGain: number;
  avgAcc: number;
  pdcaStatus: {
    label: string;
    status: string;
    color: string;
    badgeBg: string;
  };
  rankDistribution: Array<{
    rank: number;
    name: string;
    title: string;
    count: number;
    percent: number;
    color: string;
  }>;
  frequentWrongWords: Array<{
    word: string;
    count: number;
    meaning: string;
    partOfSpeech: string;
  }>;
  topWrongWord: string;
  topWrongCount: number;
  monthlyTrend: Array<{
    month: string;
    preTest: number | null;
    postTest: number | null;
  }>;
}

export default function SchoolLevelDashboard({ studentsList, wrongWords }: SchoolLevelDashboardProps) {
  const [data, setData] = useState<SchoolOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchOverview = useCallback(async (force = false) => {
    try {
      if (force) setIsRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch(`/api/admin/school-overview${force ? '?force=true' : ''}`);
      if (!res.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลภาพรวมโรงเรียนได้');
      }
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'เกิดข้อผิดพลาดในการประมวลผลข้อมูล');
      }

      setData(json);
      setLastUpdated(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      console.error('Failed to load school overview:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        {/* Skeleton Header */}
        <div className="h-16 bg-slate-900/40 rounded-2xl border border-slate-800/80 animate-pulse" />
        {/* Skeleton KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-slate-900/40 rounded-2xl border border-slate-800/80 animate-pulse" />
          ))}
        </div>
        {/* Skeleton Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-900/40 rounded-3xl border border-slate-800/80 animate-pulse" />
          <div className="h-80 bg-slate-900/40 rounded-3xl border border-slate-800/80 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">เกิดข้อผิดพลาด</h3>
        <p className="text-sm text-slate-400 mb-4">{error}</p>
        <button
          onClick={() => fetchOverview(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  const {
    totalStudents = 0,
    classroomsCount = 0,
    avgPre = 0,
    avgPost = 0,
    avgGain = 0,
    avgAcc = 0,
    pdcaStatus = { label: 'On Track', status: 'ตามเป้าหมาย', color: 'text-emerald-400', badgeBg: 'bg-emerald-500/10 border-emerald-500/30' },
    rankDistribution = [],
    frequentWrongWords = [],
    monthlyTrend = []
  } = data || {};

  const hasChartData = monthlyTrend.length > 0 && monthlyTrend.some(d => d.preTest !== null || d.postTest !== null);
  const maxRankCount = Math.max(...rankDistribution.map(r => r.count), 1);

  const rankIcons: Record<number, string> = {
    1: '🥉',
    2: '🥈',
    3: '🥇',
    4: '💎',
    5: '👑'
  };

  return (
    <div className="space-y-6">
      
      {/* School Executive Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 p-5 sm:p-6 shadow-xl backdrop-blur-xl">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-tight">ภาพรวมระดับโรงเรียน (Executive School Overview)</h2>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ประมวลผลข้อมูลเชิงสถิติของนักเรียนทั้งโรงเรียน {totalStudents.toLocaleString()} คน จาก {classroomsCount} ห้องเรียน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-[11px] font-mono text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                อัปเดตล่าสุด {lastUpdated} น.
              </span>
            )}
            <button
              type="button"
              onClick={() => fetchOverview(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
              title="รีเฟรชข้อมูลล่าสุด"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'กำลังโหลด...' : 'รีเฟรช'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Students */}
        <div className="relative overflow-hidden bg-slate-900/60 border border-slate-800/80 p-5 rounded-3xl shadow-lg hover:border-indigo-500/30 transition-all group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-20 h-20 text-indigo-400" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">นักเรียนทั้งหมด</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {totalStudents.toLocaleString()} <span className="text-sm font-semibold text-slate-400">คน</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>ครอบคลุม {classroomsCount} ห้องเรียนที่เปิดใช้งาน</span>
          </div>
        </div>

        {/* Avg Learning Gain */}
        <div className="relative overflow-hidden bg-slate-900/60 border border-slate-800/80 p-5 rounded-3xl shadow-lg hover:border-emerald-500/30 transition-all group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-20 h-20 text-emerald-400" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg. Learning Gain</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 tracking-tight flex items-baseline gap-1">
            <span>+{avgGain}</span>
            <span className="text-sm font-semibold text-slate-400">คะแนน</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <span className="text-slate-500">Pre-test {avgPre}</span>
            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-300 font-bold">Post-test {avgPost}</span>
          </div>
        </div>

        {/* Accuracy */}
        <div className="relative overflow-hidden bg-slate-900/60 border border-slate-800/80 p-5 rounded-3xl shadow-lg hover:border-amber-500/30 transition-all group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Target className="w-20 h-20 text-amber-400" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ความแม่นยำเฉลี่ย</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-400 tracking-tight">
            {avgAcc}%
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            อัตราการตอบคำถามถูกเฉลี่ยทั้งโรงเรียน
          </div>
        </div>

        {/* PDCA Quality Status */}
        <div className="relative overflow-hidden bg-slate-900/60 border border-slate-800/80 p-5 rounded-3xl shadow-lg hover:border-fuchsia-500/30 transition-all group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Award className="w-20 h-20 text-fuchsia-400" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">สถานะคุณภาพ (PDCA)</span>
            <div className="w-8 h-8 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black tracking-tight ${pdcaStatus.color}`}>
            {pdcaStatus.status}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${pdcaStatus.badgeBg} ${pdcaStatus.color}`}>
              {pdcaStatus.label}
            </span>
            <span className="text-[11px] text-slate-400">อิงผลลัพธ์ Gain จริง</span>
          </div>
        </div>
      </div>

      {/* Charts & Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Learning Gain Trend (AreaChart) */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-5 sm:p-6 rounded-3xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">แนวโน้มพัฒนาการภาพรวมโรงเรียน</h3>
                  <p className="text-xs text-slate-400">เปรียบเทียบคะแนนเฉลี่ย Pre-test vs Post-test รายเดือน</p>
                </div>
              </div>
            </div>

            {hasChartData ? (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend} margin={{ top: 10, right: 15, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="postTestGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="preTestGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64748b" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderColor: '#334155', 
                        borderRadius: '16px', 
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                        fontSize: '12px' 
                      }} 
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Area 
                      type="monotone" 
                      dataKey="preTest" 
                      name="Pre-test (ก่อนเรียน)" 
                      stroke="#64748b" 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#preTestGrad)" 
                      connectNulls 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="postTest" 
                      name="Post-test (หลังเรียน)" 
                      stroke="#10b981" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#postTestGrad)" 
                      connectNulls 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-slate-850/60 p-6 text-center">
                <BarChart3 className="w-8 h-8 mb-2 text-slate-600" />
                <p className="font-bold text-slate-400">ยังไม่มีข้อมูลคะแนน Pre-test และ Post-test รวมในระบบ</p>
                <p className="text-[11px] text-slate-500 mt-1">เมื่อนักเรียนทำแบบทดสอบ ระบบจะคำนวณและแสดงกราฟแนวโน้มพัฒนาการอัตโนมัติ</p>
              </div>
            )}
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> พัฒนาการเฉลี่ยรวม +{avgGain} คะแนน
            </span>
            <span>กลุ่มตัวอย่างผลการทดสอบทั้งหมด</span>
          </div>
        </div>

        {/* Adaptive Rank Distribution */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-5 sm:p-6 rounded-3xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">การกระจายตัวระดับความสามารถ (Adaptive Rank)</h3>
                  <p className="text-xs text-slate-400">จัดกลุ่มนักเรียนทั้งโรงเรียนตามเกณฑ์ทักษะ Rank 1 ถึง 5</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {rankDistribution.map((item) => {
                const widthPercent = (item.count / maxRankCount) * 100;
                return (
                  <div key={item.rank} className="relative bg-slate-950/50 p-3 rounded-2xl border border-slate-800/80 overflow-hidden group hover:border-slate-700 transition-colors">
                    {/* Energy Bar Fill */}
                    <div 
                      className="absolute top-0 left-0 bottom-0 opacity-15 transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${Math.max(3, widthPercent)}%`, 
                        backgroundColor: item.color 
                      }} 
                    />
                    
                    <div className="relative flex items-center justify-between z-10">
                      <div className="flex items-center gap-3">
                        <span className="text-xl select-none">{rankIcons[item.rank] || '🛡️'}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-white">{item.name}</h4>
                            <span className="text-[10px] text-slate-400 font-medium">({item.title})</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            สัดส่วน {item.percent}% ของนักเรียนทั้งหมด
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-sm text-white font-mono">{item.count}</span>
                        <span className="text-[10px] text-slate-500 ml-1">คน</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>เกณฑ์ประเมินแบบ Adaptive ปรับระดับตามความแม่นยำ</span>
            <span className="text-amber-400 font-bold">5 ระดับทักษะ</span>
          </div>
        </div>

      </div>

      {/* Top 10 Frequently Wrong Words in School */}
      <div className="bg-slate-900/60 border border-slate-800/80 p-5 sm:p-6 rounded-3xl shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">10 คำศัพท์ที่นักเรียนทั้งโรงเรียนตอบผิดบ่อยที่สุด</h3>
              <p className="text-xs text-slate-400">คำศัพท์วิกฤตที่ครูควรจัดกิจกรรมทบทวนและเน้นย้ำเป็นพิเศษ</p>
            </div>
          </div>
          {frequentWrongWords.length > 0 && (
            <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-xl self-start sm:self-auto">
              คำผิดสูงสุด: {frequentWrongWords[0]?.word} ({frequentWrongWords[0]?.count} ครั้ง)
            </span>
          )}
        </div>

        {frequentWrongWords.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {frequentWrongWords.map((item, idx) => {
              const maxCount = frequentWrongWords[0].count;
              const barWidth = Math.max(8, (item.count / maxCount) * 100);
              return (
                <div key={idx} className="relative bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 overflow-hidden group hover:border-rose-500/30 transition-all">
                  <div 
                    className="absolute top-0 left-0 bottom-0 bg-rose-500/10 transition-all duration-700 ease-out" 
                    style={{ width: `${barWidth}%` }}
                  />
                  <div className="relative flex justify-between items-center z-10">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-xl flex items-center justify-center text-xs font-black ${
                        idx === 0 ? 'bg-rose-500 text-white' :
                        idx === 1 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        idx === 2 ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white group-hover:text-rose-300 transition-colors">
                            {item.word}
                          </h4>
                          {item.partOfSpeech && (
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                              {item.partOfSpeech}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{item.meaning || 'ไม่มีคำแปล'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-rose-400 font-black text-base">{item.count}</span>
                      <span className="text-[10px] text-slate-500 ml-1">ครั้ง</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 text-xs bg-slate-950/30 rounded-2xl border border-slate-850">
            <Sparkles className="w-6 h-6 text-slate-600 mx-auto mb-2" />
            <span>ยอดเยี่ยม! ยังไม่มีสถิติคำศัพท์ที่ตอบผิดสะสมในระบบ</span>
          </div>
        )}
      </div>

    </div>
  );
}
