'use client';
import { useMemo, useState, useEffect } from 'react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, Cell
} from 'recharts';
import { Download, BrainCircuit, Users } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';

interface ClassLevelAnalyticsProps {
  studentsList: any[];
  weakestSkill?: string;
}

export default function ClassLevelAnalytics({ studentsList, weakestSkill }: ClassLevelAnalyticsProps) {
  
  // 1. Student Clustering Data
  const clusteringData = useMemo(() => {
    return studentsList.map(s => {
      const stats = s.analytics_summary?.[0] || {};
      const accuracy = stats.success_rate || 0; // Y axis
      const effort = stats.attempt_count || 0; // X axis
      
      // Categorize
      let category = '';
      if (accuracy >= 60 && effort >= 50) category = 'High Achievers';
      else if (accuracy >= 60 && effort < 50) category = 'Fast Learners';
      else if (accuracy < 60 && effort >= 50) category = 'Needs Intervention (High Effort)';
      else category = 'At Risk (Low Effort)';

      let fill = '#94a3b8'; 
      if (category === 'High Achievers') fill = '#10b981'; 
      else if (category === 'Fast Learners') fill = '#3b82f6'; 
      else if (category === 'Needs Intervention (High Effort)') fill = '#f59e0b'; 
      else if (category === 'At Risk (Low Effort)') fill = '#f43f5e'; 

      return {
        id: s.id,
        name: s.first_name || 'Unknown',
        accuracy,
        effort,
        category,
        fill
      };
    });
  }, [studentsList]);

  // 2. Skill Gap Analysis Data
  const [skillGapData, setSkillGapData] = useState<any[]>([]);

  useEffect(() => {
    async function loadSkillGap() {
      if (!studentsList.length) return;
      const studentIds = studentsList.map(s => s.id);
      
      const { data } = await supabase
        .from('wrong_words')
        .select('vocabulary(part_of_speech)')
        .in('user_id', studentIds);

      if (data) {
        const errorCounts: Record<string, number> = {};
        let totalErrors = 0;
        
        data.forEach((w: any) => {
          let pos = w.vocabulary?.part_of_speech || 'Other';
          errorCounts[pos] = (errorCounts[pos] || 0) + 1;
          totalErrors++;
        });

        const formatted = Object.keys(errorCounts).map(pos => ({
          category: pos,
          errorRate: totalErrors > 0 ? Math.round((errorCounts[pos] / totalErrors) * 100) : 0
        })).sort((a, b) => b.errorRate - a.errorRate).slice(0, 5); // top 5 gaps

        if (formatted.length > 0) {
          setSkillGapData(formatted);
        } else {
           // Fallback to empty if no errors ever
          setSkillGapData([{category: 'ไม่มีประวัติ', errorRate: 0}]);
        }
      }
    }
    loadSkillGap();
  }, [studentsList]);


  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl">
          <p className="font-bold text-white mb-1">{data.name}</p>
          <p className="text-xs text-slate-400">Accuracy: <span className="text-emerald-400">{data.accuracy}%</span></p>
          <p className="text-xs text-slate-400">Effort (Attempts): <span className="text-indigo-400">{data.effort}</span></p>
          <div className="mt-2 pt-2 border-t border-slate-800">
            <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: data.fill }}>
              {data.category}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const [insightLoading, setInsightLoading] = useState(false);
  const [insight, setInsight] = useState('');

  const generateInsight = async () => {
    setInsightLoading(true);
    setInsight('');
    try {
      const actualWeakest = skillGapData[0]?.category || 'ไม่มี';
      const res = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          avgAccuracy: studentsList.reduce((a, c) => a + (c.analytics_summary?.[0]?.success_rate || 0), 0) / (studentsList.length || 1),
          weakestSkill: actualWeakest,
          atRiskCount: clusteringData.filter(d => d.category === 'At Risk (Low Effort)').length
        })
      });
      const data = await res.json();
      if (data.insight) setInsight(data.insight);
      else setInsight('พบข้อผิดพลาดในการเรียก AI กรุณาตรวจสอบ API Key');
    } catch (e) {
      setInsight('ไม่สามารถเชื่อมต่อกับ AI ได้ (อาจต้องตั้งค่า OPENAI_API_KEY ก่อน)');
    } finally {
      setInsightLoading(false);
    }
  };

  const exportReport = () => {
    window.location.href = '/api/export-report';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-indigo-400" />
          <div>
            <h2 className="text-xl font-black text-white">Class-Level Analytics</h2>
            <p className="text-xs text-slate-400">การวิเคราะห์พฤติกรรมและการจัดกลุ่มนักเรียน (Student Clustering)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={generateInsight} disabled={insightLoading} className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
            <BrainCircuit className="w-4 h-4" /> {insightLoading ? 'กำลังวิเคราะห์...' : 'AI สรุปผล'}
          </button>
          <button onClick={exportReport} className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
            <Download className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      {insight && (
        <div className="bg-indigo-950/30 border border-indigo-500/30 p-4 rounded-2xl flex gap-4 items-start">
          <div className="bg-indigo-500/20 p-2 rounded-xl">
            <BrainCircuit className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm font-black text-indigo-300 mb-1">AI Teacher Insight</h4>
            <p className="text-sm text-indigo-100 leading-relaxed">{insight}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Student Clustering Scatter Plot */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-lg font-black text-white mb-2">Student Clustering (4 Quadrants)</h3>
          <p className="text-xs text-slate-400 mb-6">จัดกลุ่มนักเรียนตามความพยายาม (Effort) และความแม่นยำ (Accuracy)</p>
          
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" dataKey="effort" name="Effort (Attempts)" stroke="#64748b" fontSize={12} label={{ value: 'Effort', position: 'insideBottom', offset: -10, fill: '#64748b' }} />
                <YAxis type="number" dataKey="accuracy" name="Accuracy (%)" stroke="#64748b" fontSize={12} label={{ value: 'Accuracy', angle: -90, position: 'insideLeft', fill: '#64748b' }} />
                <RechartsTooltip content={<CustomTooltip />} />
                <ReferenceLine x={50} stroke="#334155" strokeDasharray="5 5" />
                <ReferenceLine y={60} stroke="#334155" strokeDasharray="5 5" />
                <Scatter name="Students" data={clusteringData}>
                  {clusteringData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4 flex-wrap">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-xs text-slate-400">High Achievers</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span className="text-xs text-slate-400">Fast Learners</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-xs text-slate-400">Needs Intervention</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500"></div><span className="text-xs text-slate-400">At Risk</span></div>
          </div>
        </div>

        {/* Skill Gap Analysis Bar Chart */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-lg font-black text-white mb-2">Skill Gap Analysis (จุดอ่อน)</h3>
          <p className="text-xs text-slate-400 mb-6">ความถี่ของการตอบผิดแยกตามหมวดหมู่ Part of Speech 5 อันดับแรก</p>
          
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skillGapData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={12} unit="%" />
                <YAxis type="category" dataKey="category" stroke="#94a3b8" fontSize={12} width={80} />
                <RechartsTooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                <Bar dataKey="errorRate" name="Error Rate" radius={[0, 8, 8, 0]}>
                  {skillGapData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#f43f5e' : index === 1 ? '#f59e0b' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
      </div>
    </div>
  );
}
