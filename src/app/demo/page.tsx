'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDemoStore } from '@/store/useDemoStore';
import { useAppStore } from '@/store/useAppStore';
import { motion } from 'framer-motion';
import { Play, Map, BookOpen, Star, Sparkles, LogOut, ArrowRight, Activity, Award, Loader2 } from 'lucide-react';

// Demo student/progress data defined here to avoid null issues
const DEMO_STUDENT = {
  id: 'demo-judge-id',
  student_id: 'DEMO-001',
  student_name: 'กรรมการ ตัวอย่าง',
  first_name: 'กรรมการ',
  last_name: 'ตัวอย่าง',
  grade_level: 'ม.2',
  room: '1',
  classroom_id: 'demo-classroom',
  is_demo_account: true,
  is_verified: true,
  role: 'STUDENT',
};

const DEMO_PROGRESS = {
  id: 'demo-progress-id',
  student_id: 'demo-judge-id',
  coins: 1250,
  exp: 3400,
  total_exp: 3400,
  current_stage: 35,
  stars: 72,
  rank: 3,
  current_rank: 3,
  initial_rank: 3,
  pretest_score: 15,
  pretest_date: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export default function DemoCenter() {
  const router = useRouter();
  const { startDemo, resetDemo } = useDemoStore();
  const { setScreen, setStudent, setProgress } = useAppStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Initialize demo immediately and synchronously
    startDemo();
    setReady(true);
  }, []); // Run once on mount, no dependencies needed

  const goToApp = (screen: 'dashboard' | 'game' | 'study', withPretest = false) => {
    // Always use the static DEMO_STUDENT/DEMO_PROGRESS constants (not store state which may lag)
    setStudent(DEMO_STUDENT);
    if (withPretest) {
      setProgress({ ...DEMO_PROGRESS, pretest_date: null }); // Force pretest
      sessionStorage.setItem('demo_screen', 'pretest');
    } else {
      setProgress(DEMO_PROGRESS);
      setScreen(screen);
      sessionStorage.setItem('demo_screen', screen);
    }
    router.push('/');
  };

  const handleExit = () => {
    resetDemo();
    setStudent(null);
    setProgress(null);
    router.push('/');
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div data-demo-guide="demo-center" className="min-h-screen bg-slate-950 text-slate-200 p-6 sm:p-12 pb-24 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full mix-blend-screen filter blur-[128px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-pink-500/10 rounded-full mix-blend-screen filter blur-[128px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-4 py-1.5 text-purple-300 text-xs font-bold mb-3">
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
              โหมดกรรมการ (Demo Mode)
            </div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-purple-400" />
              Vocab Journey Demo Center
            </h1>
            <p className="text-slate-400 mt-2 text-sm">ข้อมูลและผลการเล่นในโหมดนี้จะไม่ถูกบันทึกลงระบบจริง</p>
          </div>
          <button
            onClick={handleExit}
            className="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            ออกจากโหมดทดลอง
          </button>
        </div>

        {/* Demo Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DemoCard
            title="🏠 Student Dashboard"
            description="ดู Stage Map, Leaderboard, คะแนน Coin/EXP, และระบบการ์ดของนักเรียน"
            color="bg-purple-500"
            onClick={() => goToApp('dashboard')}
            primary
          />

          <DemoCard
            title="📝 ทดลอง Pre-test"
            description="ทำแบบทดสอบก่อนเรียนเพื่อวัดระดับและกำหนด Rank เริ่มต้น"
            color="bg-emerald-500"
            onClick={() => goToApp('dashboard', true)}
          />

          <DemoCard
            title="⚔️ ทดลองเล่นด่าน (Game)"
            description="เล่นด่านตัวอย่างพร้อมระบบคำถาม Adaptive และ Powerup Items"
            color="bg-amber-500"
            onClick={() => goToApp('game')}
          />

          <DemoCard
            title="📚 Study Camp"
            description="ดูระบบ Flashcard เรียนคำศัพท์ก่อนทำด่าน พร้อมระบบฟังเสียง"
            color="bg-blue-500"
            onClick={() => goToApp('study')}
          />

          <DemoCard
            title="👩‍🏫 Teacher Dashboard"
            description="ดูหน้าจอสรุปข้อมูลสำหรับครูผู้สอน วิเคราะห์นักเรียนรายบุคคล"
            color="bg-pink-500"
            onClick={() => router.push('/demo/admin')}
          />

          <DemoCard
            title="📊 Executive Report"
            description="ดูรายงานสรุปภาพรวมระบบสำหรับผู้บริหาร"
            color="bg-orange-500"
            onClick={() => router.push('/executive')}
          />
        </div>

        {/* Info box */}
        <div className="mt-8 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-sm text-slate-400">
          <p className="font-bold text-slate-300 mb-2">ℹ️ เกี่ยวกับโหมดกรรมการ</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>ข้อมูลทั้งหมดเป็นข้อมูลจำลอง ไม่กระทบฐานข้อมูลนักเรียนจริง</li>
            <li>กรรมการสามารถทดลองทุกฟังก์ชันได้โดยอิสระ</li>
            <li>กดปุ่ม "ออกจากโหมดทดลอง" เพื่อกลับสู่หน้าหลัก</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function DemoCard({ title, description, color, onClick, primary = false }: {
  title: string;
  description: string;
  color: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`text-left p-5 rounded-2xl border transition-all relative overflow-hidden group ${
        primary
          ? 'border-purple-500/50 bg-purple-500/10 shadow-[0_0_30px_rgba(168,85,247,0.1)]'
          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-800/80'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-white text-lg ${color} shadow-md`}>
        {title.slice(0, 2)}
      </div>
      <h3 className={`text-base font-bold mb-1 ${primary ? 'text-purple-300' : 'text-slate-200'}`}>
        {title.slice(3)}
      </h3>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
      <div className="mt-3 flex items-center gap-1 text-xs font-bold text-slate-500 group-hover:text-slate-300 transition-colors">
        คลิกเพื่อเข้าชม <ArrowRight className="w-3 h-3" />
      </div>
    </motion.button>
  );
}
