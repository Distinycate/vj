'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/utils/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import Dashboard from '@/components/Dashboard';
import StudyCamp from '@/components/StudyCamp';
import Game from '@/components/Game';
import PreTest from '@/components/PreTest';

export default function Home() {
  const { student, progress, setStudent, setProgress, currentScreen } = useAppStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        },
        (err) => {
          console.log('ServiceWorker registration failed: ', err);
        }
      );
    }
  }, []);
  
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
      // 1. Authenticate with Supabase Auth using virtual email
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: `${loginUsername.trim()}@school.local`,
        password: loginPassword
      });

      if (authError || !authData.user) {
        throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }

      // 2. Fetch student profile mapping
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (studentError || !studentData) throw new Error('ไม่พบข้อมูลโปรไฟล์นักเรียน');

      // 3. Fetch learning path progression
      const { data: progressData } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('student_id', studentData.id)
        .single();

      // 4. Fetch pre-test record to determine if they have completed it
      const { data: pretestData } = await supabase
        .from('pre_tests')
        .select('created_at')
        .eq('student_id', studentData.id)
        .maybeSingle();

      setStudent(studentData);
      setProgress({ 
        ...progressData, 
        pretest_date: pretestData ? pretestData.created_at : null 
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
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
      // 1. Resolve Classroom dynamically
      const className = `${regGrade.trim()}/${regRoom.trim()}`;
      let classroomId = null;

      const { data: existingClass } = await supabase
        .from('classrooms')
        .select('id')
        .eq('class_name', className)
        .maybeSingle();

      if (existingClass) {
        classroomId = existingClass.id;
      } else {
        const { data: newClass, error: classError } = await supabase
          .from('classrooms')
          .insert([{ class_name: className }])
          .select()
          .single();
        if (classError) throw classError;
        if (newClass) classroomId = newClass.id;
      }

      // 2. Register user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `${regUsername.trim()}@school.local`,
        password: regPassword
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'สมัครสมาชิกไม่สำเร็จ');
      }

      // 3. Create Student profile row mapping to auth user ID
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .insert([{ 
          id: authData.user.id,
          student_id: regStudentId.trim(),
          name: regName.trim(),
          classroom_id: classroomId,
          academic_year: parseInt(regYear)
        }])
        .select()
        .single();

      if (studentError || !studentData) throw studentError;

      // 4. Initialize Learning Path with basic stats
      const { data: progressData, error: progressError } = await supabase
        .from('learning_paths')
        .insert([{
          student_id: studentData.id,
          current_rank: 1,
          current_stage: 1,
          coins: 0,
          exp: 0
        }])
        .select()
        .single();
        
      if (progressError) throw progressError;

      // Auto-login after register
      setStudent(studentData);
      setProgress(progressData);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setIsLoading(false);
    }
  };

  // If user is authenticated, redirect to App
  if (student) {
    if (!progress?.pretest_date) return <PreTest />;
    if (currentScreen === 'dashboard') return <Dashboard />;
    if (currentScreen === 'study') return <StudyCamp />;
    if (currentScreen === 'game') return <Game />;
    return <Dashboard />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full mix-blend-screen filter blur-[128px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full mix-blend-screen filter blur-[128px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 rounded-3xl w-full max-w-md shadow-2xl relative z-10 max-h-[95vh] overflow-y-auto"
      >
        <div className="text-center mb-6">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 mb-2">
            Vocab Journey
          </h1>
          <p className="text-slate-400 font-medium">ระบบประเมินและฝึกทักษะคำศัพท์อัจฉริยะ</p>
        </div>

        <div className="flex bg-slate-950/80 border border-slate-800 rounded-2xl p-1 mb-6">
          <button 
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-2.5 rounded-xl font-bold transition-all ${mode === 'login' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            เข้าสู่ระบบ
          </button>
          <button 
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-2.5 rounded-xl font-bold transition-all ${mode === 'register' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            สมัครสมาชิก
          </button>
        </div>

        {error && <div className="error-state mb-6 text-sm">{error}</div>}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-slate-300 text-sm font-bold block mb-1.5">Username</label>
              <input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors glass-input" placeholder="เช่น test1" />
            </div>
            <div>
              <label className="text-slate-300 text-sm font-bold block mb-1.5">Password</label>
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors glass-input" placeholder="เช่น test111111" />
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-black py-4 rounded-xl shadow-lg mt-4 disabled:opacity-50 transition-all transform active:scale-95">
              {isLoading ? 'กำลังโหลด...' : 'เข้าสู่ระบบผจญภัย 🚀'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 text-sm font-bold block mb-1.5">ชื่อ-นามสกุล</label>
                <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" placeholder="ชื่อจริง" />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-bold block mb-1.5">รหัสนักเรียน</label>
                <input type="text" value={regStudentId} onChange={(e) => setRegStudentId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" placeholder="รหัสประจำตัว" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-slate-300 text-sm font-bold block mb-1.5">ชั้น (เช่น ป.1)</label>
                <input type="text" value={regGrade} onChange={(e) => setRegGrade(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" placeholder="ป.1" />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-bold block mb-1.5">ห้อง (เช่น 1)</label>
                <input type="text" value={regRoom} onChange={(e) => setRegRoom(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" placeholder="1" />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-bold block mb-1.5">ปีการศึกษา</label>
                <input type="text" value={regYear} onChange={(e) => setRegYear(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" />
              </div>
            </div>
            
            <hr className="border-slate-800 my-2" />
            
            <div>
              <label className="text-slate-300 text-sm font-bold block mb-1.5">ตั้ง Username</label>
              <input type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" placeholder="ภาษาอังกฤษ" />
            </div>
            <div>
              <label className="text-slate-300 text-sm font-bold block mb-1.5">ตั้ง Password</label>
              <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" placeholder="รหัสอย่างน้อย 6 หลัก" />
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-black py-4 rounded-xl shadow-lg mt-4 disabled:opacity-50 transition-all transform active:scale-95">
              {isLoading ? 'กำลังโหลด...' : 'ลงทะเบียนและเริ่มผจญภัย 🎉'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-slate-500 space-x-3 border-t border-slate-800 pt-4">
          <a href="/admin" className="hover:text-indigo-400 font-extrabold transition-colors">ระบบครูผู้สอน 👨‍🏫</a>
          <span>&middot;</span>
          <a href="/executive" className="hover:text-emerald-400 font-extrabold transition-colors">รายงานผู้บริหาร 📊</a>
        </div>
      </motion.div>
    </div>
  );
}
