'use client';
import { useMemo, useState } from 'react';
import { Target, Info, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { calculateLearningGain, getRiskLevel } from '@/utils/analyticsUtils';

interface IndividualComparisonTableProps {
  studentsList: any[];
}

export default function IndividualComparisonTable({ studentsList }: IndividualComparisonTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const processedData = useMemo(() => {
    return studentsList.map(s => {
      const stats = (Array.isArray(s.analytics_summary) ? s.analytics_summary[0] : s.analytics_summary) || {};
      const pre = stats.pretest_score || 0;
      const post = stats.posttest_score || 0; // This can now be from Boss stage
      const { percentage: gainPercent } = calculateLearningGain(pre, post);
      
      const currentStage = (Array.isArray(s.learning_paths) ? s.learning_paths[0] : s.learning_paths)?.current_stage || 1;
      
      // We know they have Boss Post-test if their stage > 10, or if they took it manually.
      // But we just show the score that is in posttest_score.
      const hasPostTest = post > 0;
      
      let pdcaColor = 'text-slate-400 bg-slate-900/50';
      let pdcaLabel = 'รอประเมิน';
      let Icon = Info;
      
      if (hasPostTest) {
        if (gainPercent >= 50) {
          pdcaColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
          pdcaLabel = 'พัฒนาดีเยี่ยม';
          Icon = TrendingUp;
        } else if (gainPercent > 0) {
          pdcaColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
          pdcaLabel = 'กำลังพัฒนา';
          Icon = TrendingUp;
        } else {
          pdcaColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
          pdcaLabel = 'ต้องทบทวนด่วน';
          Icon = TrendingDown;
        }
      }

      return {
        ...s,
        pre,
        post,
        gainPercent,
        currentStage,
        hasPostTest,
        pdcaColor,
        pdcaLabel,
        Icon
      };
    }).filter(s => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (s.student_name || '').toLowerCase().includes(term) || 
             (s.student_id || '').toLowerCase().includes(term);
    }).sort((a, b) => b.post - a.post); // Sort by post-test score descending
  }, [studentsList, searchTerm]);

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Target className="text-fuchsia-400" /> ตารางเปรียบเทียบคะแนนรายบุคคล
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            คะแนนจะอัปเดตอัตโนมัติเมื่อนักเรียนผ่านด่าน Boss (ด่าน 10, 20...) หรือทำ Post-test
          </p>
        </div>
        <div className="w-full md:w-64">
          <input
            type="text"
            placeholder="ค้นหาชื่อ หรือ รหัสนักเรียน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-900 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <th className="p-4 rounded-tl-xl">นักเรียน</th>
              <th className="p-4 text-center">ด่านล่าสุด</th>
              <th className="p-4 text-center">Pre-test<br/><span className="text-[10px] text-slate-500">(เต็ม 25)</span></th>
              <th className="p-4 text-center">Post-test<br/><span className="text-[10px] text-slate-500">(เทียบ 25)</span></th>
              <th className="p-4 text-center">Learning Gain</th>
              <th className="p-4 text-center rounded-tr-xl">สถานะ (PDCA)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/50 text-sm text-slate-200">
            {processedData.length > 0 ? (
              processedData.map(s => (
                <tr key={s.id} className="hover:bg-slate-900/35 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-white flex items-center gap-2">
                      {s.student_name}
                      {s.is_verified && <span title="ยืนยันตัวตนแล้ว"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /></span>}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 font-mono">{s.student_id || '-'}</div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="font-black text-indigo-400">ด่าน {s.currentStage}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="font-bold text-slate-300">{s.pre}</span>
                  </td>
                  <td className="p-4 text-center">
                    {s.hasPostTest ? (
                      <span className="font-black text-white">{s.post}</span>
                    ) : (
                      <span className="text-xs text-slate-500">-</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {s.hasPostTest ? (
                      <div className="flex flex-col items-center">
                        <span className={`font-black ${s.gainPercent > 0 ? 'text-emerald-400' : s.gainPercent === 0 ? 'text-slate-300' : 'text-rose-400'}`}>
                          {s.gainPercent > 0 ? '+' : ''}{s.gainPercent}%
                        </span>
                        <div className="w-16 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={`h-full ${s.gainPercent > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(100, Math.max(0, s.gainPercent))}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">รอข้อมูล</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${s.pdcaColor}`}>
                      <s.Icon className="w-3.5 h-3.5" />
                      {s.pdcaLabel}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-500">
                  <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  ไม่พบข้อมูลนักเรียน
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
