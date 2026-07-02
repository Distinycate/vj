'use client';
import { useMemo, useState } from 'react';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import { User, Activity, Clock, FileText, Plus, X } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';

interface IndividualStudentProfileProps {
  student: any;
  onClose: () => void;
}

export default function IndividualStudentProfile({ student, onClose }: IndividualStudentProfileProps) {
  
  // 1. Mastery Radar Chart Data (Mock calculation for demonstration)
  const masteryData = useMemo(() => {
    // In a real scenario, this is aggregated from item_analysis for this specific user vs class avg
    const baseAcc = student.acc || 50;
    return [
      { subject: 'Noun', A: Math.min(100, baseAcc + 15), B: 65, fullMark: 100 },
      { subject: 'Verb', A: Math.max(0, baseAcc - 10), B: 60, fullMark: 100 },
      { subject: 'Adjective', A: Math.min(100, baseAcc + 5), B: 70, fullMark: 100 },
      { subject: 'Adverb', A: Math.max(0, baseAcc - 20), B: 55, fullMark: 100 },
      { subject: 'Preposition', A: baseAcc, B: 50, fullMark: 100 },
      { subject: 'Contextual', A: Math.min(100, baseAcc + 20), B: 45, fullMark: 100 },
    ];
  }, [student]);

  // 2. Retention Curve (SRS Memory tracking)
  const retentionData = useMemo(() => {
    // Mocking memory retention over time
    return [
      { day: 'Day 1', retention: 100, baseline: 100 },
      { day: 'Day 3', retention: 85, baseline: 60 },
      { day: 'Day 7', retention: 90, baseline: 40 },
      { day: 'Day 14', retention: 75, baseline: 25 },
      { day: 'Day 30', retention: 80, baseline: 10 },
    ];
  }, []);

  // 3. Intervention Log
  const [logs, setLogs] = useState([
    { id: 1, date: '2024-05-10', text: 'เริ่มเล่นเกมครั้งแรก', type: 'system' },
    { id: 2, date: '2024-05-15', text: 'ใช้งาน Hint บ่อยผิดปกติในหมวด Adverb', type: 'system' }
  ]);
  const [newLog, setNewLog] = useState('');

  const addLog = () => {
    if (!newLog.trim()) return;
    const dateStr = new Date().toISOString().split('T')[0];
    setLogs([{ id: Date.now(), date: dateStr, text: newLog, type: 'teacher' }, ...logs]);
    setNewLog('');
    // TODO: Save to database (e.g. `student_interventions` table)
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="max-w-5xl mx-auto bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl relative mt-10 mb-10 overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/30">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">{student.first_name} {student.last_name}</h2>
              <p className="text-sm text-slate-400">Student ID: {student.student_id} | Class: {student.classrooms?.class_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Stats & Radar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Academic Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Pre-test</span>
                  <span className="text-white font-bold">{student.pre}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Post-test</span>
                  <span className="text-emerald-400 font-bold">{student.post}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Learning Gain</span>
                  <span className="text-indigo-400 font-bold">+{student.gainPercent}%</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                  <span className="text-slate-400 text-sm">Risk Level</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    student.riskLevel === 'Critical' ? 'bg-rose-500/20 text-rose-400' :
                    student.riskLevel === 'High' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {student.riskLevel}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
              <h3 className="text-sm font-black text-white mb-1">Vocabulary Mastery</h3>
              <p className="text-xs text-slate-500 mb-4">ทักษะรายหมวดหมู่ (เทียบค่าเฉลี่ยห้อง)</p>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={masteryData}>
                    <PolarGrid stroke="#1e293b" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name={student.first_name} dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                    <Radar name="Class Average" dataKey="B" stroke="#64748b" fill="#64748b" fillOpacity={0.2} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Column: Retention & Intervention */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Retention Curve */}
            <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-black text-white">Retention Curve (SRS)</h3>
              </div>
              <p className="text-xs text-slate-500 mb-6">ความสามารถในการจดจำคำศัพท์ระยะยาว (เทียบกับทฤษฎีการลืม)</p>
              
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={retentionData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="retention" name={`${student.first_name}'s Memory`} stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="baseline" name="Ebbinghaus Forgetting Curve" stroke="#475569" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Intervention Log */}
            <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-black text-white">Intervention Log</h3>
              </div>
              
              <div className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  value={newLog} 
                  onChange={e => setNewLog(e.target.value)} 
                  placeholder="เพิ่มบันทึกพฤติกรรมหรือการช่วยเหลือ..." 
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  onKeyDown={e => e.key === 'Enter' && addLog()}
                />
                <button onClick={addLog} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-2 transition-colors">
                  <Plus className="w-4 h-4" /> บันทึก
                </button>
              </div>

              <div className="space-y-4 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-4 items-start relative pl-4 border-l-2 border-slate-800">
                    <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-slate-950 ${log.type === 'system' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
                    <div>
                      <span className="text-xs text-slate-500 font-mono">{log.date}</span>
                      <p className={`text-sm mt-0.5 ${log.type === 'system' ? 'text-slate-300 italic' : 'text-emerald-100 font-bold'}`}>{log.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
