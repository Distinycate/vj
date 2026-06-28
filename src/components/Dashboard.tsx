'use client';
import { motion } from 'framer-motion';
import { Play, Store, Trophy, Target, Star, Bug, LogOut } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export default function Dashboard() {
  const { student, progress, logout } = useAppStore();

  if (!student) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8 pb-24 relative overflow-hidden">
      
      {/* Premium Gradient Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/20 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              สวัสดี, {student.student_name}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full text-sm font-semibold shadow-lg shadow-amber-500/30">
                Rank {progress?.current_rank || 1}
              </span>
              <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-sm text-emerald-300 font-medium border border-white/5">
                🔥 ต่อเนื่อง {progress?.streak_days || 0} วัน
              </span>
            </div>
          </div>
          <button onClick={logout} className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-lg border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-slate-300 hover:text-white">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Current Progress Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl mb-6 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
          
          <div className="flex justify-between items-end mb-4 relative z-10">
            <div>
              <p className="text-slate-400 font-medium mb-1">ด่านปัจจุบัน</p>
              <h2 className="text-4xl font-extrabold text-white flex items-center gap-2">
                ด่าน {progress?.current_stage || 1} <Star className="text-amber-400 fill-amber-400 w-6 h-6" />
              </h2>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-sm mb-1">ความคืบหน้า</p>
              <p className="text-xl font-bold text-emerald-400">0%</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden relative z-10">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '0%' }}
              transition={{ duration: 1, delay: 0.2 }}
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
            />
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white p-5 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-500/25 border border-emerald-400/20"
          >
            <Target className="w-6 h-6" />
            เข้า Study Camp
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 backdrop-blur-lg text-white p-5 rounded-2xl font-bold text-lg border border-white/10 transition-colors"
          >
            <Play className="w-6 h-6 text-blue-400" />
            เริ่ม Challenge
          </motion.button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Trophy className="w-8 h-8 text-amber-400 mb-3" />
            <h3 className="font-bold text-lg mb-1">ภารกิจประจำวัน</h3>
            <p className="text-sm text-slate-400">ทำภารกิจรับเหรียญ</p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Store className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="font-bold text-lg mb-1">ร้านค้า Avatar</h3>
            <p className="text-sm text-slate-400">แลกของรางวัล</p>
          </motion.div>
        </div>

      </div>

      {/* Floating Bug Report */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-rose-500/20 hover:bg-rose-500/40 backdrop-blur-xl border border-rose-500/30 rounded-full flex items-center justify-center text-rose-400 shadow-lg transition-all z-50">
        <Bug className="w-6 h-6" />
      </button>

    </div>
  );
}
