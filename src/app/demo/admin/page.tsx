'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, BookOpen, Activity, ArrowLeft, Star, TrendingUp } from 'lucide-react';
import { useDemoStore } from '@/store/useDemoStore';
import { useEffect } from 'react';

export default function DemoAdminDashboard() {
  const router = useRouter();
  const { isDemoMode, startDemo } = useDemoStore();

  useEffect(() => {
    if (!isDemoMode) {
      startDemo();
    }
  }, [isDemoMode, startDemo]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 sm:p-12 pb-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full mix-blend-screen filter blur-[128px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        <button 
          onClick={() => router.push('/demo')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> กลับไปหน้าศูนย์รวมกรรมการ
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-black text-white flex items-center gap-3 mb-2">
            📊 Teacher Dashboard <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded-full ml-2">DEMO MODE</span>
          </h1>
          <p className="text-slate-400">ระบบจำลองหน้ากระดานวิเคราะห์ข้อมูลสำหรับคุณครู (ข้อมูลสมมติเพื่อการสาธิต)</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="นักเรียนทั้งหมด" value="128 คน" subtitle="+12 จากสัปดาห์ที่แล้ว" icon={<Users className="w-6 h-6" />} color="bg-blue-500" />
          <StatCard title="ค่าเฉลี่ย Pre-test" value="45%" subtitle="ความรู้พื้นฐานระดับกลาง" icon={<BookOpen className="w-6 h-6" />} color="bg-rose-500" />
          <StatCard title="ความก้าวหน้าเฉลี่ย" value="ด่าน 34" subtitle="จาก 100 ด่าน" icon={<Activity className="w-6 h-6" />} color="bg-emerald-500" />
          <StatCard title="เวลาเรียนรวม" value="450 ชม." subtitle="เฉลี่ย 3.5 ชม./คน" icon={<TrendingUp className="w-6 h-6" />} color="bg-purple-500" />
        </div>

        {/* Mock Charts Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-lg font-bold text-white mb-6">ความก้าวหน้าของนักเรียนแต่ละห้อง</h3>
            
            <div className="space-y-6">
              <MockBarRoom name="ม.1/1" value={85} />
              <MockBarRoom name="ม.1/2" value={65} />
              <MockBarRoom name="ม.2/1" value={92} />
              <MockBarRoom name="ม.2/2" value={45} />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-6">คำศัพท์ที่นักเรียนมักตอบผิด</h3>
            
            <div className="flex-1 flex flex-col gap-4">
              <MockWord word="Accommodate" translation="จัดให้เหมาะสม" wrong={45} />
              <MockWord word="Evaluate" translation="ประเมินผล" wrong={38} />
              <MockWord word="Significant" translation="สำคัญ" wrong={32} />
              <MockWord word="Consequence" translation="ผลที่ตามมา" wrong={28} />
              <MockWord word="Analyze" translation="วิเคราะห์" wrong={25} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, color }: any) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-start gap-4 hover:border-slate-700 transition-colors">
      <div className={`p-3 rounded-2xl ${color}/10 text-${color.split('-')[1]}-400`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
        <p className="text-2xl font-black text-white mb-1">{value}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function MockBarRoom({ name, value }: any) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="font-bold text-slate-300">{name}</span>
        <span className="text-slate-400">{value}% เข้าเรียนสม่ำเสมอ</span>
      </div>
      <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
        />
      </div>
    </div>
  );
}

function MockWord({ word, translation, wrong }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50">
      <div>
        <p className="font-bold text-white">{word}</p>
        <p className="text-xs text-slate-400">{translation}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-rose-400">{wrong} ครั้ง</p>
        <p className="text-xs text-slate-500">ตอบผิด</p>
      </div>
    </div>
  );
}
