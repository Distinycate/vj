'use client';
import { useMemo, useState } from 'react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, Cell
} from 'recharts';
import { Download, BrainCircuit, Users } from 'lucide-react';

interface ClassLevelAnalyticsProps {
  studentsList: any[];
  weakestSkill?: string; // e.g. "verb" or "noun"
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

      let fill = '#94a3b8'; // slate-400
      if (category === 'High Achievers') fill = '#10b981'; // emerald
      else if (category === 'Fast Learners') fill = '#3b82f6'; // blue
      else if (category === 'Needs Intervention (High Effort)') fill = '#f59e0b'; // amber
      else if (category === 'At Risk (Low Effort)') fill = '#f43f5e'; // rose

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
  const skillGapData = useMemo(() => {
    // Ideally we aggregate this from item_analysis. We use a mock representation here based on weakestSkill
    return [
      { category: weakestSkill || 'verb', errorRate: 68 },
      { category: 'adverb', errorRate: 55 },
      { category: 'adjective', errorRate: 42 },
      { category: 'noun', errorRate: 35 },
      { category: 'preposition', errorRate: 20 },
    ].sort((a, b) => b.errorRate - a.errorRate);
  }, [weakestSkill]);

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
      const res = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          avgAccuracy: studentsList.reduce((a, c) => a + (c.analytics_summary?.[0]?.success_rate || 0), 0) / (studentsList.length || 1),
          weakestSkill: weakestSkill || 'verb',
          atRiskCount: clusteringData.filter(d => d.category === 'At Risk (Low Effort)').length
        })
      });
      const data = await res.json();
      if (data.insight) setInsight(data.insight);
      else setInsight('พบข้อผิดพลาดในการเรียก AI กรุณาตรวจสอบ API Key');
    } catch (e) {
      setInsight('ไม่สามารถเชื่อมต่อกับ AI ได้');
    } finally {
      setInsightLoading(false);
    }
  };

  const exportReport = () => {
    // Calling the API endpoint which returns the Excel file
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
                <XAxis type="number" dataKey="effort" name="Effort" stroke="#64748b" fontSize={12} tickLine={false} label={{ value: 'Effort (Attempts)', position: 'bottom', fill: '#64748b', fontSize: 10 }} />
                <YAxis type="number" dataKey="accuracy" name="Accuracy" stroke="#64748b" fontSize={12} tickLine={false} label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                
                {/* Quadrant Lines */}
                <ReferenceLine x={50} stroke="#475569" strokeDasharray="3 3" />
                <ReferenceLine y={60} stroke="#475569" strokeDasharray="3 3" />
                
                <Scatter name="Students" data={clusteringData}>
                  {clusteringData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skill Gap Analysis Horizontal Bar Chart */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-lg font-black text-white mb-2">Skill Gap Analysis</h3>
          <p className="text-xs text-slate-400 mb-6">5 หมวดหมู่คำศัพท์ที่นักเรียนในห้องตอบผิดมากที่สุด (Error Rate %)</p>
          
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skillGapData} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} hide />
                <YAxis dataKey="category" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={80} />
                <RechartsTooltip 
                  cursor={{ fill: '#1e293b' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                />
                <Bar dataKey="errorRate" radius={[0, 8, 8, 0]} barSize={24}>
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
