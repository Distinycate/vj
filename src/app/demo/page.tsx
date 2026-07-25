'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDemoStore } from '@/store/useDemoStore';
import { useAppStore } from '@/store/useAppStore';
import { motion } from 'framer-motion';
import { Play, Map, BookOpen, Star, Sparkles, LogOut, ArrowRight, Activity, Award } from 'lucide-react';

export default function DemoCenter() {
  const router = useRouter();
  const { isDemoMode, startDemo, resetDemo, demoStudent, demoProgress } = useDemoStore();
  const { setScreen, setStudent, setProgress } = useAppStore();

  useEffect(() => {
    // Automatically initialize demo mode when visiting this page
    if (!isDemoMode) {
      startDemo();
    }
  }, [isDemoMode, startDemo]);

  const handleLaunchToDashboard = () => {
    // Simulate login for the main app UI
    setStudent(demoStudent);
    setProgress(demoProgress);
    setScreen('dashboard');
    router.push('/');
  };

  const handleLaunchToPreTest = () => {
    setStudent(demoStudent);
    setProgress({ ...demoProgress, pretest_date: null }); // Clear pretest date to force pretest
    router.push('/');
  };

  const handleLaunchToTeacherDashboard = () => {
    router.push('/demo/admin'); // We'll create a mock admin dashboard next
  };

  const handleReset = () => {
    resetDemo();
    startDemo(); // Restart fresh
  };

  const handleExit = () => {
    resetDemo();
    router.push('/');
  };

  if (!isDemoMode) return null; // Avoid flicker

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 sm:p-12 pb-24 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full mix-blend-screen filter blur-[128px] pointer-events-none"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-purple-400" />
              Vocab Journey Demo Center
            </h1>
            <p className="text-slate-400 mt-2">โหมดทดลองสำหรับกรรมการ ข้อมูลและผลการเล่นในโหมดนี้จะไม่ถูกบันทึกลงระบบจริง</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleReset}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold transition-colors"
            >
              รีเซ็ต Demo
            </button>
            <button 
              onClick={handleExit}
              className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              ออกจากโหมดทดลอง
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DemoCard
            title="เริ่มชมระบบแบบแนะนำ (Guided Tour)"
            description="พาทัวร์ตั้งแต่ Student Dashboard, เรียนคำศัพท์, เล่นด่าน ไปจนถึงระบบครู (แนะนำสำหรับกรรมการ)"
            icon={<Play className="w-6 h-6" />}
            color="bg-purple-500"
            onClick={handleLaunchToDashboard} // In the future, this could set a guided tour state
            primary
          />
          
          <DemoCard
            title="ทดลอง Pre-test"
            description="ทดลองทำแบบทดสอบก่อนเรียนเพื่อวัดระดับและเลือก Rank จำลอง"
            icon={<Activity className="w-6 h-6" />}
            color="bg-emerald-500"
            onClick={handleLaunchToPreTest}
          />

          <DemoCard
            title="ดู Stage Map (เปิดด่านทั้งหมด)"
            description="เข้าถึงด่าน 1-100 ได้ทั้งหมดโดยไม่ต้องผ่านด่านก่อนหน้า"
            icon={<Map className="w-6 h-6" />}
            color="bg-blue-500"
            onClick={handleLaunchToDashboard}
          />

          <DemoCard
            title="ทดลองเล่น 1-3 ดาว"
            description="เลือกระดับความยาก (1 ดาว=เลือกตอบ, 2 ดาว=ฟัง, 3 ดาว=พิมพ์)"
            icon={<Star className="w-6 h-6" />}
            color="bg-amber-500"
            onClick={handleLaunchToDashboard}
          />

          <DemoCard
            title="ดู Teacher Dashboard (แบบสาธิต)"
            description="หน้าจอแสดงข้อมูลสรุปสำหรับครูผู้สอนเพื่อวิเคราะห์ผู้เรียนรายบุคคล"
            icon={<BookOpen className="w-6 h-6" />}
            color="bg-pink-500"
            onClick={handleLaunchToTeacherDashboard}
          />

          <DemoCard
            title="ดู Certificate และ Hall of Fame"
            description="หน้าจำลองความสำเร็จเมื่อผู้เรียนเคลียร์ระบบทั้งหมด"
            icon={<Award className="w-6 h-6" />}
            color="bg-orange-500"
            onClick={handleLaunchToDashboard} // Placeholder
          />
        </div>
      </div>
    </div>
  );
}

function DemoCard({ title, description, icon, color, onClick, primary = false }: any) {
  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`text-left p-6 rounded-2xl border ${
        primary 
          ? 'border-purple-500/50 bg-purple-500/10 shadow-[0_0_30px_rgba(168,85,247,0.15)]' 
          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-800/80'
      } transition-all relative overflow-hidden group`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white ${color} shadow-lg`}>
        {icon}
      </div>
      <h3 className={`text-lg font-bold mb-2 ${primary ? 'text-purple-300' : 'text-slate-200'}`}>
        {title}
      </h3>
      <p className="text-sm text-slate-400 leading-relaxed">
        {description}
      </p>
      
      <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500 group-hover:text-slate-300 transition-colors">
        คลิกเพื่อเข้าชม <ArrowRight className="w-3 h-3" />
      </div>
    </motion.button>
  );
}
