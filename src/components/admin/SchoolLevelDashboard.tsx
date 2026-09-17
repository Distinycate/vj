'use client';
import { useMemo, useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Target, Info, AlertTriangle, BookOpen, Trophy, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import RankDistribution from './RankDistribution';
import { supabase } from '@/utils/supabase/client';

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
  studentsList: any[];
  wrongWords?: WrongWordItem[];
}

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export default function SchoolLevelDashboard({ studentsList, wrongWords = [] }: SchoolLevelDashboardProps) {
  
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [isFetchingAll, setIsFetchingAll] = useState(false);
  const [hasFetchedAll, setHasFetchedAll] = useState(false);
  const [showRankDistribution, setShowRankDistribution] = useState(false);
  const [showLearningGainChart, setShowLearningGainChart] = useState(false);

  useEffect(() => {
    if (!showRankDistribution || hasFetchedAll) return;
    async function fetchAllStudents() {
      setIsFetchingAll(true);
      try {
        const res = await fetch('/api/admin/students?fields=rank');
        if (res.ok) {
          const json = await res.json();
          if (json.students) {
            setAllStudents(json.students);
            setHasFetchedAll(true);
          }
        }
      } catch (err) {
        console.error("Error fetching all students:", err);
      } finally {
        setIsFetchingAll(false);
      }
    }
    fetchAllStudents();
  }, [showRankDistribution, hasFetchedAll]);

  const { frequentWrongWords, topWrongWord, topWrongCount } = useMemo(() => {
    if (!wrongWords || wrongWords.length === 0 || !studentsList || studentsList.length === 0) {
      return { frequentWrongWords: [], topWrongWord: '-', topWrongCount: 0 };
    }

    const wordCounts: Record<string, { count: number; meaning: string }> = {};
    wrongWords.forEach((row) => {
      const word = row.vocabulary?.word || 'Unknown';
      const meaning = row.vocabulary?.meaning || row.vocabulary?.meaning_th || '';
      if (!wordCounts[word]) {
        wordCounts[word] = { count: 0, meaning };
      }
      wordCounts[word].count += row.error_count || 1;
    });

    const sorted = Object.keys(wordCounts)
      .map(word => ({
        word,
        count: wordCounts[word].count,
        meaning: wordCounts[word].meaning
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      frequentWrongWords: sorted,
      topWrongWord: sorted.length > 0 ? sorted[0].word : '-',
      topWrongCount: sorted.length > 0 ? sorted[0].count : 0
    };
  }, [wrongWords, studentsList]);

  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [hasFetchedMonthly, setHasFetchedMonthly] = useState(false);

  // Fetch real pre_tests and post_tests data grouped by month on-demand
  useEffect(() => {
    if (!showLearningGainChart || hasFetchedMonthly) return;
    async function fetchMonthlyAssessments() {
      if (!studentsList || studentsList.length === 0) {
        setDataLoading(false);
        return;
      }

      setDataLoading(true);
      const studentIds = studentsList.map(s => s.id);

      const [preResult, postResult] = await Promise.all([
        supabase
          .from('pre_tests')
          .select('score, total_questions, created_at')
          .in('student_id', studentIds)
          .order('created_at', { ascending: true }),
        supabase
          .from('post_tests')
          .select('score, total_questions, created_at')
          .in('student_id', studentIds)
          .order('created_at', { ascending: true }),
      ]);

      const preTests = preResult.data || [];
      const postTests = postResult.data || [];

      // Group by month key (YYYY-MM)
      const monthMap: Record<string, { preSums: number; preCount: number; postSums: number; postCount: number }> = {};

      for (const row of preTests) {
        const date = new Date(row.created_at);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap[key]) monthMap[key] = { preSums: 0, preCount: 0, postSums: 0, postCount: 0 };
        monthMap[key].preSums += Number(row.score || 0);
        monthMap[key].preCount += 1;
      }

      for (const row of postTests) {
        const date = new Date(row.created_at);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap[key]) monthMap[key] = { preSums: 0, preCount: 0, postSums: 0, postCount: 0 };
        monthMap[key].postSums += Number(row.score || 0);
        monthMap[key].postCount += 1;
      }

      // Convert to array sorted by date
      const chartData = Object.keys(monthMap)
        .sort()
        .map(key => {
          const parts = key.split('-');
          const monthIndex = parseInt(parts[1], 10) - 1;
          const year = parts[0].slice(2); // Last 2 digits
          const entry = monthMap[key];
          return {
            month: `${THAI_MONTHS[monthIndex]} ${year}`,
            preTest: entry.preCount > 0 ? Math.round(entry.preSums / entry.preCount) : null,
            postTest: entry.postCount > 0 ? Math.round(entry.postSums / entry.postCount) : null,
          };
        });

      setMonthlyData(chartData);
      setDataLoading(false);
      setHasFetchedMonthly(true);
    }
    fetchMonthlyAssessments();
  }, [showLearningGainChart, studentsList, hasFetchedMonthly]);

  // Calculate real avg Learning Gain from analytics_summary
  const avgLearningGain = useMemo(() => {
    if (!studentsList || studentsList.length === 0) return 0;
    let totalPre = 0;
    let totalPost = 0;
    let count = 0;
    studentsList.forEach(s => {
      const stats = Array.isArray(s.analytics_summary) ? s.analytics_summary[0] : s.analytics_summary;
      const pre = stats?.pretest_score || 0;
      const post = stats?.posttest_score || 0;
      if (pre > 0 || post > 0) {
        totalPre += pre;
        totalPost += post;
        count++;
      }
    });
    return count > 0 ? Math.round(((totalPost - totalPre) / Math.max(1, count))) : 0;
  }, [studentsList]);

  // Determine PDCA status based on data
  const pdcaStatus = useMemo(() => {
    if (avgLearningGain > 5) return { label: 'On Track', color: 'text-amber-400' };
    if (avgLearningGain > 0) return { label: 'Progressing', color: 'text-emerald-400' };
    if (avgLearningGain === 0) return { label: 'รอข้อมูล', color: 'text-slate-400' };
    return { label: 'Needs Attention', color: 'text-rose-400' };
  }, [avgLearningGain]);

  const hasChartData = monthlyData.length > 0 && monthlyData.some(d => d.preTest !== null || d.postTest !== null);

  return (
    <div className="space-y-6">
      
      {/* KPI Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><AlertTriangle className="w-16 h-16" /></div>
          <span className="text-sm text-slate-400 font-bold mb-1">คำที่ตอบผิดบ่อยที่สุด</span>
          <span className="text-3xl font-black text-rose-400">{topWrongWord}</span>
          <span className="text-xs text-slate-500 mt-2">ตอบผิดรวม {topWrongCount} ครั้งในระบบ</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="w-16 h-16" /></div>
          <span className="text-sm text-slate-400 font-bold mb-1">Avg. Learning Gain</span>
          <span className="text-3xl font-black text-indigo-400">{avgLearningGain > 0 ? '+' : ''}{avgLearningGain} คะแนน</span>
          <span className="text-xs text-slate-500 mt-2">
            {avgLearningGain === 0 ? 'ยังไม่มีข้อมูล Post-test' : 'ค่าเฉลี่ย Post-test − Pre-test จริง'}
          </span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Target className="w-16 h-16" /></div>
          <span className="text-sm text-slate-400 font-bold mb-1">School Target (PDCA)</span>
          <span className={`text-3xl font-black ${pdcaStatus.color}`}>{pdcaStatus.label}</span>
          <span className="text-xs text-slate-500 mt-2">สถานะจากข้อมูลผลลัพธ์จริง</span>
        </div>
      </div>


      {/* Rank Distribution - School Level (On-Demand / Collapsible) */}
      <div className="mt-6 bg-slate-900/50 border border-slate-800 rounded-3xl p-4 sm:p-5 transition-all">
        <button
          type="button"
          onClick={() => setShowRankDistribution(prev => !prev)}
          className="w-full flex items-center justify-between text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors">
                การกระจายตัวระดับ Rank (ภาพรวมโรงเรียน)
              </h3>
              <p className="text-xs text-slate-400">
                {showRankDistribution ? 'คลิกเพื่อซ่อนรายละเอียด' : 'คลิกเพื่อแสดงสถิติและรายชื่อนักเรียนในแต่ละ Rank'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-white transition-colors bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span>{showRankDistribution ? 'ซ่อน' : 'แสดงข้อมูล'}</span>
            {showRankDistribution ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {showRankDistribution && (
          <div className="mt-5 pt-5 border-t border-slate-800">
            {isFetchingAll ? (
              <div className="p-8 flex flex-col justify-center items-center gap-2 text-slate-400">
                <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                <span className="text-xs">กำลังโหลดข้อมูล Rank นักเรียน...</span>
              </div>
            ) : (
              <RankDistribution 
                students={allStudents} 
                title="ระดับ Rank นักเรียนในโรงเรียน" 
                subtitle="สรุปจำนวนนักเรียนตามระดับทักษะความสามารถ (Adaptive Rank 1 - 5)" 
              />
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Frequently Wrong Words Chart */}
        <div className="bg-slate-900/50 border border-slate-800 p-5 sm:p-6 rounded-3xl flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">คำศัพท์ที่ตอบผิดบ่อย</h3>
              <p className="text-xs text-slate-400">Top 10 คำศัพท์ที่ควรได้รับการทบทวนพิเศษ</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2.5 max-h-[340px]">
            {frequentWrongWords.length > 0 ? frequentWrongWords.map((item, idx) => {
              const maxCount = frequentWrongWords[0].count;
              const width = Math.max(10, (item.count / maxCount) * 100);
              return (
                <div key={idx} className="relative bg-slate-950/60 p-3 rounded-2xl border border-slate-850 overflow-hidden group">
                  <div className="absolute top-0 left-0 bottom-0 bg-rose-500/10 transition-all duration-700 ease-out" style={{ width: `${width}%` }}></div>
                  <div className="relative flex justify-between items-center z-10">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-500 w-4 text-center">{idx + 1}</span>
                      <div>
                        <h4 className="text-sm font-black text-white group-hover:text-rose-300 transition-colors">{item.word}</h4>
                        <p className="text-xs text-slate-400">{item.meaning}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-rose-400 font-black text-base">{item.count}</span>
                      <span className="text-[10px] text-slate-500 ml-1">ครั้ง</span>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center text-slate-500 py-10 text-xs">ยังไม่มีข้อมูลการตอบผิด</div>
            )}
          </div>
        </div>

        {/* School-Wide Learning Gain Line Chart — ON-DEMAND */}
        <div className="bg-slate-900/50 border border-slate-800 p-5 sm:p-6 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">กราฟแนวโน้มพัฒนาการ (Gain)</h3>
                  <p className="text-xs text-slate-400">เปรียบเทียบคะแนน Pre-test และ Post-test ตามช่วงเวลา</p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setShowLearningGainChart(prev => !prev)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{showLearningGainChart ? 'ซ่อนกราฟ' : 'แสดงกราฟ'}</span>
                {showLearningGainChart ? <ChevronUp className="w-3.5 h-3.5 text-indigo-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            </div>

            {!showLearningGainChart ? (
              <div className="py-12 px-4 text-center rounded-2xl bg-slate-950/40 border border-slate-850">
                <BarChart2 className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="text-xs text-slate-400 mb-4">คลิกเพื่อประมวลผลกราฟแนวโน้มพัฒนาการของโรงเรียนแบบ On-Demand</p>
                <button
                  type="button"
                  onClick={() => setShowLearningGainChart(true)}
                  className="px-5 py-2.5 rounded-2xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold text-xs transition-all shadow-md cursor-pointer hover:scale-105"
                >
                  📊 โหลดและแสดงกราฟพัฒนาการ
                </button>
              </div>
            ) : dataLoading ? (
              <div className="min-h-[240px] flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                <span className="text-xs">กำลังประมวลผลข้อมูลกราฟ...</span>
              </div>
            ) : hasChartData ? (
              <div className="min-h-[240px] pt-2">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={monthlyData} margin={{ top: 5, right: 15, bottom: 5, left: -15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line type="monotone" dataKey="preTest" name="Pre-test" stroke="#64748b" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                    <Line type="monotone" dataKey="postTest" name="Post-test" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="min-h-[240px] flex flex-col items-center justify-center text-slate-500 text-xs">
                <Info className="w-6 h-6 mb-2 text-slate-600" />
                <span>ยังไม่มีข้อมูลคะแนนก่อนเรียนและหลังเรียนในระบบ</span>
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
