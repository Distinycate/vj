'use client';
import { useMemo, useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Target, Info, AlertTriangle, BookOpen } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';

interface SchoolLevelDashboardProps {
  studentsList: any[];
}

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export default function SchoolLevelDashboard({ studentsList }: SchoolLevelDashboardProps) {
  
  const [frequentWrongWords, setFrequentWrongWords] = useState<any[]>([]);
  const [topWrongWord, setTopWrongWord] = useState<string>('-');
  const [topWrongCount, setTopWrongCount] = useState<number>(0);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    async function fetchWrongWords() {
      if (!studentsList || studentsList.length === 0) return;
      
      const studentIds = studentsList.map(s => s.id);
      
      const { data } = await supabase
        .from('wrong_words')
        .select('error_count, vocabulary(word, meaning)')
        .in('student_id', studentIds);

      if (data) {
        const wordCounts: Record<string, { count: number, meaning: string }> = {};
        data.forEach((row: any) => {
          const word = row.vocabulary?.word || 'Unknown';
          const meaning = row.vocabulary?.meaning || '';
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

        setFrequentWrongWords(sorted);
        if (sorted.length > 0) {
          setTopWrongWord(sorted[0].word);
          setTopWrongCount(sorted[0].count);
        }
      }
    }
    fetchWrongWords();
  }, [studentsList]);

  // Fetch real pre_tests and post_tests data grouped by month
  useEffect(() => {
    async function fetchMonthlyAssessments() {
      if (!studentsList || studentsList.length === 0) {
        setDataLoading(false);
        return;
      }

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
    }
    fetchMonthlyAssessments();
  }, [studentsList]);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Frequently Wrong Words Chart */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex flex-col">
          <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-rose-400" /> คำศัพท์ที่นักเรียนตอบผิดบ่อย
          </h3>
          <p className="text-xs text-slate-400 mb-6">Top 10 คำศัพท์ที่เป็นจุดอ่อนของนักเรียนและควรได้รับการทบทวนพิเศษ</p>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {frequentWrongWords.length > 0 ? frequentWrongWords.map((item, idx) => {
              const maxCount = frequentWrongWords[0].count;
              const width = Math.max(10, (item.count / maxCount) * 100);
              return (
                <div key={idx} className="relative bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 overflow-hidden group">
                  <div className="absolute top-0 left-0 bottom-0 bg-rose-500/10 transition-all duration-1000 ease-out" style={{ width: `${width}%` }}></div>
                  <div className="relative flex justify-between items-center z-10">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-500 w-4 text-center">{idx + 1}</span>
                      <div>
                        <h4 className="text-base font-black text-white group-hover:text-rose-400 transition-colors">{item.word}</h4>
                        <p className="text-xs text-slate-400">{item.meaning}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-rose-400 font-bold text-lg">{item.count}</span>
                      <span className="text-xs text-slate-500 block">ครั้ง</span>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center text-slate-500 py-10">ยังไม่มีข้อมูลการตอบผิด</div>
            )}
          </div>
        </div>

        {/* School-Wide Learning Gain Line Chart — REAL DATA */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex flex-col">
          <h3 className="text-lg font-black text-white mb-2">School-Wide Learning Gain</h3>
          <p className="text-xs text-slate-400 mb-2">ค่าเฉลี่ย Pre-test vs Post-test จริงจัดกลุ่มตามเดือน</p>
          
          {dataLoading ? (
            <div className="flex-1 min-h-[250px] flex items-center justify-center text-slate-500">
              <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mr-3"></div>
              กำลังโหลดข้อมูล...
            </div>
          ) : hasChartData ? (
            <div className="flex-1 min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="preTest" name="Pre-test Avg" stroke="#64748b" strokeWidth={3} dot={{ r: 4 }} connectNulls />
                  <Line type="monotone" dataKey="postTest" name="Post-test Avg" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 min-h-[250px] flex flex-col items-center justify-center text-slate-500">
              <Info className="w-8 h-8 mb-3 text-slate-600" />
              <p className="text-sm font-bold">ยังไม่มีข้อมูล Pre-test / Post-test</p>
              <p className="text-xs mt-1 max-w-xs text-center">กราฟจะแสดงข้อมูลจริงเมื่อนักเรียนทำ Pre-test และ Post-test ในระบบแล้ว</p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
