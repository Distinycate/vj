'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/utils/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import Dashboard from '@/components/Dashboard';
import StudyCamp from '@/components/StudyCamp';
import Game from '@/components/Game';
import PreTest from '@/components/PreTest';

export default function Home() {
  const { student, setStudent, setProgress, currentScreen } = useAppStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Login State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register State
  const [regStudentId, setRegStudentId] = useState('');
  const [regName, setRegName] = useState('');
  const [regGrade, setRegGrade] = useState('');
  const [regRoom, setRegRoom] = useState('');
  const [regYear, setRegYear] = useState(new Date().getFullYear().toString());
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) return setError('กรุณากรอก Username และ Password');
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('username', loginUsername)
        .eq('password_hash', loginPassword) // Basic text comparison for prototype
        .single();

      if (error || !data) throw new Error('Username หรือ Password ไม่ถูกต้อง');

      const { data: progressData } = await supabase
        .from('progress_summary')
        .select('*')
        .eq('student_id', data.id)
        .single();

      setStudent(data);
      setProgress(progressData || { current_rank: 1, current_stage: 1 });
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regStudentId || !regName || !regGrade || !regRoom || !regUsername || !regPassword) {
      return setError('กรุณากรอกข้อมูลให้ครบถ้วน');
    }
    setIsLoading(true);
    setError('');

    try {
      // Create Student
      const { data, error } = await supabase
        .from('students')
        .insert([{ 
          student_id: regStudentId,
          student_name: regName,
          grade: regGrade,
          room: regRoom,
          academic_year: regYear,
          username: regUsername,
          password_hash: regPassword
        }])
        .select()
        .single();
        
      if (error) {
         if (error.code === '23505') throw new Error('Username หรือ รหัสนักเรียนนี้ถูกใช้ไปแล้ว');
         throw error;
      }
      
      // Init Progress
      await supabase.from('progress_summary').insert([{ student_id: data.id }]);
      await supabase.from('stage_progress').insert([{ student_id: data.id, grade_level: regGrade, stage: 1, is_unlocked: true }]);
      
      // Auto login
      setStudent(data);
      setProgress({ current_rank: 1, current_stage: 1 });
      
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (student) {
    if (!progress?.pretest_date) return <PreTest />;
    if (currentScreen === 'study') return <StudyCamp />;
    if (currentScreen === 'game') return <Game />;
    return <Dashboard />;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/20 rounded-full mix-blend-screen filter blur-[128px]"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/20 rounded-full mix-blend-screen filter blur-[128px]"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/10 backdrop-blur-2xl border border-white/20 p-8 rounded-3xl w-full max-w-md shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto"
      >
        <div className="text-center mb-6">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 mb-2">
            Vocab Journey
          </h1>
          <p className="text-slate-400">ระบบประเมินและฝึกทักษะคำศัพท์</p>
        </div>

        <div className="flex bg-black/30 rounded-xl p-1 mb-6">
          <button 
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-2 rounded-lg font-bold transition-all ${mode === 'login' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            เข้าสู่ระบบ
          </button>
          <button 
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-2 rounded-lg font-bold transition-all ${mode === 'register' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            สมัครสมาชิก
          </button>
        </div>

        {error && <div className="bg-rose-500/20 border border-rose-500/50 text-rose-300 p-3 rounded-xl mb-6 text-sm text-center">{error}</div>}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-slate-300 text-sm mb-1 block">Username</label>
              <input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div>
              <label className="text-slate-300 text-sm mb-1 block">Password</label>
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-white font-bold py-4 rounded-xl shadow-lg mt-4 disabled:opacity-50">
              {isLoading ? 'กำลังโหลด...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 text-sm mb-1 block">ชื่อ-นามสกุล</label>
                <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="text-slate-300 text-sm mb-1 block">รหัสนักเรียน</label>
                <input type="text" value={regStudentId} onChange={(e) => setRegStudentId(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-slate-300 text-sm mb-1 block">ชั้น (เช่น ม.1)</label>
                <input type="text" value={regGrade} onChange={(e) => setRegGrade(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="text-slate-300 text-sm mb-1 block">ห้อง</label>
                <input type="text" value={regRoom} onChange={(e) => setRegRoom(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="text-slate-300 text-sm mb-1 block">ปีการศึกษา</label>
                <input type="text" value={regYear} onChange={(e) => setRegYear(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white text-sm" />
              </div>
            </div>
            
            <hr className="border-white/10 my-2" />
            
            <div>
              <label className="text-slate-300 text-sm mb-1 block">ตั้ง Username</label>
              <input type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="text-slate-300 text-sm mb-1 block">ตั้ง Password</label>
              <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white text-sm" />
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-white font-bold py-4 rounded-xl shadow-lg mt-4 disabled:opacity-50">
              {isLoading ? 'กำลังโหลด...' : 'ลงทะเบียน'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
