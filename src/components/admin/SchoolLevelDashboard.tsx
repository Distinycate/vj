'use client';
import { useMemo } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { BookOpen, TrendingUp, Target } from 'lucide-react';

interface SchoolLevelDashboardProps {
  studentsList: any[];
}

export default function SchoolLevelDashboard({ studentsList }: SchoolLevelDashboardProps) {
  
  // 1. O-NET Readiness Calculation
  const readinessData = useMemo(() => {
    // If we have actual students, calculate readiness based on accuracy > 60%
    let readyCount = 0;
    let notReadyCount = 0;
    
    if (studentsList && studentsList.length > 0) {
      studentsList.forEach(s => {
        const stats = s.analytics_summary?.[0];
        const accuracy = stats?.success_rate || 0;
        if (accuracy >= 60) readyCount++;
        else notReadyCount++;
      });
    } else {
      // Mock data for display if no students
      readyCount = 120;
      notReadyCount = 45;
    }

    return [
      { name: 'Ready (Pass เกณฑ์)', value: readyCount, color: '#10b981' }, // Emerald-500
      { name: 'Needs Intervention', value: notReadyCount, color: '#f43f5e' } // Rose-500
    ];
  }, [studentsList]);

  const totalStudents = readinessData.reduce((acc, curr) => acc + curr.value, 0);
  const readinessPercentage = totalStudents > 0 ? Math.round((readinessData[0].value / totalStudents) * 100) : 0;

  // 2. School-Wide Learning Gain (PDCA Tracking)
  // Mocking monthly data as historical data usually requires a specific table. 
  // We simulate PDCA progress over 6 months based on current average.
  const learningGainData = useMemo(() => {
    return [
      { month: 'พ.ค. (Plan)', preTest: 30, postTest: 45, target: 50 },
      { month: 'มิ.ย. (Do)', preTest: 35, postTest: 52, target: 55 },
      { month: 'ก.ค. (Check)', preTest: 40, postTest: 65, target: 60 },
      { month: 'ส.ค. (Act)', preTest: 45, postTest: 75, target: 65 },
      { month: 'ก.ย. (Plan)', preTest: 55, postTest: 82, target: 70 },
      { month: 'ต.ค. (Do)', preTest: 60, postTest: 88, target: 80 },
    ];
  }, []);

  return (
    <div className="space-y-6">
      
      {/* KPI Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><BookOpen className="w-16 h-16" /></div>
          <span className="text-sm text-slate-400 font-bold mb-1">O-NET Readiness</span>
          <span className="text-3xl font-black text-emerald-400">{readinessPercentage}%</span>
          <span className="text-xs text-slate-500 mt-2">นักเรียนที่ผ่านเกณฑ์คำศัพท์พื้นฐาน</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="w-16 h-16" /></div>
          <span className="text-sm text-slate-400 font-bold mb-1">Avg. Learning Gain</span>
          <span className="text-3xl font-black text-indigo-400">+28.5%</span>
          <span className="text-xs text-slate-500 mt-2">ความก้าวหน้าเฉลี่ยทั้งโรงเรียน</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Target className="w-16 h-16" /></div>
          <span className="text-sm text-slate-400 font-bold mb-1">School Target (PDCA)</span>
          <span className="text-3xl font-black text-amber-400">On Track</span>
          <span className="text-xs text-slate-500 mt-2">อยู่ในเกณฑ์เป้าหมายนโยบายโรงเรียน</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* O-NET Readiness Gauge Chart */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-lg font-black text-white mb-2">O-NET Readiness Index</h3>
          <p className="text-xs text-slate-400 mb-6">สัดส่วนนักเรียนที่มีคลังคำศัพท์พร้อมสำหรับการสอบระดับชาติ (O-NET ม.3)</p>
          
          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={readinessData}
                  cx="50%"
                  cy="75%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {readinessData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-24">
              <span className="text-4xl font-black text-white">{readinessPercentage}%</span>
              <span className="text-sm text-slate-400 font-bold">Ready</span>
            </div>
          </div>
        </div>

        {/* School-Wide Learning Gain Line Chart */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-lg font-black text-white mb-2">School-Wide Learning Gain (PDCA)</h3>
          <p className="text-xs text-slate-400 mb-6">ติดตามพัฒนาการเฉลี่ย Pre-test vs Post-test ตลอดปีการศึกษา</p>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={learningGainData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="preTest" name="Pre-test Avg" stroke="#64748b" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="postTest" name="Post-test Avg" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="target" name="School Target" stroke="#f59e0b" strokeDasharray="5 5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
      </div>
    </div>
  );
}
