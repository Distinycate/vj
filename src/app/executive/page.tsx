'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/utils/supabase/client';
import { BarChart3, TrendingUp, Users, BookOpen, AlertCircle, Sparkles, Trophy, LogOut, ArrowLeft, ArrowUpRight } from 'lucide-react';

export default function ExecutiveDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClassrooms: 0,
    schoolAverage: 82,
    atRiskCount: 0,
    growthRate: 15.5 // Normalized gain percentage
  });
  
  const [classPerformance, setClassPerformance] = useState<any[]>([]);
  const [weakCategories, setWeakCategories] = useState<any[]>([]);

  useEffect(() => {
    async function loadExecutiveData() {
      try {
        // 1. Fetch totals
        const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
        const { count: teacherCount } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
        const { count: classCount } = await supabase.from('classrooms').select('*', { count: 'exact', head: true });
        const { count: alertCount } = await supabase.from('intervention_alerts').select('*', { count: 'exact', head: true }).eq('is_resolved', false);

        // 2. Fetch classroom data to summarize
        const { data: classrooms } = await supabase.from('classrooms').select('*, students(*, analytics_summary(*))');
        
        let mappedPerformance: any[] = [];
        if (classrooms) {
          mappedPerformance = classrooms.map((c: any) => {
            const students = c.students || [];
            const scores = students.map((s: any) => s.analytics_summary?.success_rate || 0).filter(Boolean);
            const average = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
            return {
              id: c.id,
              name: c.class_name,
              studentCount: students.length,
              averageScore: average || 70 + (c.class_name.charCodeAt(1) % 15) // fallback mock for demo
            };
          });
          setClassPerformance(mappedPerformance);
        }

        // Mock weak categories
        setWeakCategories([
          { category: 'Technology', display: 'เทคโนโลยี', errorRate: 38 },
          { category: 'Emotion', display: 'อารมณ์', errorRate: 24 },
          { category: 'Health', display: 'สุขภาพ', errorRate: 15 }
        ]);

        setStats({
          totalStudents: studentCount || 0,
          totalTeachers: teacherCount || 0,
          totalClassrooms: classCount || 0,
          schoolAverage: mappedPerformance.length > 0 
            ? Math.round(mappedPerformance.reduce((acc, curr) => acc + curr.averageScore, 0) / mappedPerformance.length)
            : 78,
          atRiskCount: alertCount || 0,
          growthRate: 18.2 // pre vs post gain
        });

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadExecutiveData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400">กำลังดาวน์โหลดข้อมูลผู้บริหารโรงเรียน...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 pb-20 relative overflow-hidden">
      
      {/* Glow orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full filter blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/5 rounded-full filter blur-[120px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8 bg-slate-900 border border-slate-900 p-6 rounded-3xl">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-indigo-400" />
            <div>
              <h1 className="text-2xl font-black text-white">รายงานผลประเมินนวัตกรรมผู้บริหาร</h1>
              <p className="text-slate-400 text-sm">การสรุปคะแนนระดับสถาบันการศึกษาเพื่อวัดผล O-NET</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.href = '/admin'}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold rounded-xl flex items-center justify-center gap-2 hover:scale-102 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> ไปหน้าครูผู้สอน
          </button>
        </header>

        {/* Instutional Top-Level Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/50 border border-slate-900 p-6 rounded-2xl">
            <span className="text-sm text-slate-500 block">นักเรียนสะสมทั้งหมด</span>
            <div className="flex justify-between items-end mt-2">
              <strong className="text-3xl font-black text-white">{stats.totalStudents} คน</strong>
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-900 p-6 rounded-2xl">
            <span className="text-sm text-slate-500 block">ห้องเรียนที่ใช้งาน</span>
            <div className="flex justify-between items-end mt-2">
              <strong className="text-3xl font-black text-white">{stats.totalClassrooms} ห้อง</strong>
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-900 p-6 rounded-2xl">
            <span className="text-sm text-slate-500 block">คะแนนเฉลี่ยทั้งโรงเรียน</span>
            <div className="flex justify-between items-end mt-2">
              <strong className="text-3xl font-black text-white">{stats.schoolAverage}%</strong>
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-900 p-6 rounded-2xl">
            <span className="text-sm text-slate-500 block">นักเรียนกลุ่มเสี่ยงวิกฤต</span>
            <div className="flex justify-between items-end mt-2">
              <strong className="text-3xl font-black text-rose-400">{stats.atRiskCount} คน</strong>
              <AlertCircle className="w-5 h-5 text-rose-400" />
            </div>
          </div>
        </div>

        {/* Detailed institution analytics panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Class performance chart list */}
          <div className="md:col-span-2 bg-slate-900/40 border border-slate-900 p-6 rounded-3xl shadow-xl space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" /> ผลงานเฉลี่ยในแต่ละระดับห้องเรียน
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">การจัดลำดับคะแนนเฉลี่ยสะสมแยกตามห้อง</p>
            </div>

            <div className="space-y-4">
              {classPerformance.map((c) => (
                <div key={c.id} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-slate-200">{c.name} ({c.studentCount} คน)</span>
                    <span className="font-black text-emerald-400">{c.averageScore}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-950 border border-slate-900 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                      style={{ width: `${c.averageScore}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weakest word categories */}
          <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-3xl shadow-xl space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500" /> หมวดคำศัพท์ที่อ่อนที่สุด
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">ระบุหัวข้อวิชาการที่โรงเรียนควรเน้นเป็นพิเศษ</p>
            </div>

            <div className="space-y-4">
              {weakCategories.map((wc, idx) => (
                <div key={idx} className="bg-slate-950/60 border border-slate-900 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-white uppercase">{wc.category}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{wc.display}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">อัตราข้อผิดพลาด</span>
                    <strong className="text-rose-400 font-extrabold">{wc.errorRate}%</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
