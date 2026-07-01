'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/utils/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import Dashboard from '@/components/Dashboard';
import StudyCamp from '@/components/StudyCamp';
import Game from '@/components/Game';
import PreTest from '@/components/PreTest';

const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

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
  const [regStudentId, setRegStudentId] = useState(''); // This will store เลขที่ (Seat Number)
  const [regName, setRegName] = useState('');
  const [regGrade, setRegGrade] = useState('');
  const [regRoom, setRegRoom] = useState('1'); // Default to room 1 since there is only 1 room per grade
  const [regYear, setRegYear] = useState('2569'); // Default academic year to 2569
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [loginRole, setLoginRole] = useState<'student' | 'teacher' | 'executive'>('student');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) return setError('กรุณากรอก Username และ Password');
    setIsLoading(true);
    setError('');

    try {
      if (loginRole === 'student') {
        // 1. Authenticate student by querying the students table directly
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('username', loginUsername.trim())
          .eq('password', loginPassword.trim())
          .maybeSingle();

        if (studentError || !studentData) {
          throw new Error('ชื่อผู้ใช้หรือรหัสผ่านนักเรียนไม่ถูกต้อง');
        }

        // 2. Fetch learning path progression
        const { data: progressData } = await supabase
          .from('learning_paths')
          .select('*')
          .eq('student_id', studentData.id)
          .single();

        // 3. Fetch pre-test record (order by latest in case of multiple attempts)
        const { data: pretestList } = await supabase
          .from('pre_tests')
          .select('created_at')
          .eq('student_id', studentData.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const pretestDate = pretestList && pretestList.length > 0 ? pretestList[0].created_at : null;

        setStudent(studentData);
        setProgress({ 
          ...progressData, 
          pretest_date: pretestDate 
        });
      } else {
        // Authenticate teacher/executive directly
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select('*')
          .eq('username', loginUsername.trim())
          .eq('password', loginPassword.trim())
          .maybeSingle();

        if (teacherError || !teacherData) {
          throw new Error('ชื่อผู้ใช้หรือรหัสผ่านเจ้าหน้าที่ไม่ถูกต้อง');
        }

        if (loginRole === 'teacher') {
          if (teacherData.role !== 'TEACHER' && teacherData.role !== 'ADMIN') {
            throw new Error('บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานระบบครูผู้สอน');
          }
          localStorage.setItem('vocab_journey_teacher', JSON.stringify(teacherData));
          window.location.href = '/admin';
        } else if (loginRole === 'executive') {
          if (teacherData.role !== 'EXECUTIVE' && teacherData.role !== 'ADMIN') {
            throw new Error('บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานระบบผู้บริหาร');
          }
          localStorage.setItem('vocab_journey_executive', JSON.stringify(teacherData));
          window.location.href = '/executive';
        }
      }
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

      // 2. Create Student profile row directly in database (no Supabase Auth)
      const newStudentUuid = generateUUID();
      const computedStudentId = `${className}-${regStudentId.trim()}`; // e.g. "ม.1/1-12"
      
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .insert([{ 
          id: newStudentUuid,
          student_id: computedStudentId,
          student_name: regName.trim(),
          username: regUsername.trim(),
          password: regPassword.trim(),
          classroom_id: classroomId,
          academic_year: regYear.trim()
        }])
        .select()
        .single();

      if (studentError || !studentData) {
        throw new Error(studentError?.message || 'สมัครสมาชิกไม่สำเร็จ (อาจมี Username หรือเลขที่ซ้ำในระบบ)');
      }

      // 3. Initialize Learning Path with basic stats
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

        {mode === 'login' && (
          <div className="grid grid-cols-3 gap-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-1 mb-6">
            <button 
              type="button"
              onClick={() => { setLoginRole('student'); setError(''); }}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${loginRole === 'student' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-white border border-transparent'}`}
            >
              👩‍🎓 นักเรียน
            </button>
            <button 
              type="button"
              onClick={() => { setLoginRole('teacher'); setError(''); }}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${loginRole === 'teacher' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-white border border-transparent'}`}
            >
              👨‍🏫 ครูผู้สอน
            </button>
            <button 
              type="button"
              onClick={() => { setLoginRole('executive'); setError(''); }}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${loginRole === 'executive' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-white border border-transparent'}`}
            >
              📊 ผู้บริหาร
            </button>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-slate-300 text-sm font-bold block mb-1.5">Username</label>
              <input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors glass-input" placeholder="กรอกชื่อผู้ใช้งาน" />
            </div>
            <div>
              <label className="text-slate-300 text-sm font-bold block mb-1.5">Password</label>
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors glass-input" placeholder="กรอกรหัสผ่าน" />
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-black py-4 rounded-xl shadow-lg mt-4 disabled:opacity-50 transition-all transform active:scale-95">
              {isLoading ? 'กำลังโหลด...' : 
               loginRole === 'student' ? 'เข้าสู่ระบบผจญภัย 🚀' : 
               loginRole === 'teacher' ? 'เข้าสู่ระบบจัดการเรียนรู้ 👨‍🏫' : 
               'เข้าสู่ระบบรายงานผู้บริหาร 📊'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div>
              <label className="text-slate-300 text-sm font-bold block mb-1.5">ชื่อ-นามสกุล</label>
              <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" placeholder="เช่น เด็กชายส้ม สมมติ" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 text-sm font-bold block mb-1.5">ชั้น</label>
                <input type="text" value={regGrade} onChange={(e) => setRegGrade(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" placeholder="ม.1" />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-bold block mb-1.5">เลขที่</label>
                <input type="text" value={regStudentId} onChange={(e) => setRegStudentId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" placeholder="15" />
              </div>
            </div>
            
            <hr className="border-slate-800 my-2" />
            
            <div>
              <label className="text-slate-300 text-sm font-bold block mb-1.5">ตั้ง Username</label>
              <input type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" placeholder="สำหรับเข้าใช้งาน" />
            </div>
            <div>
              <label className="text-slate-300 text-sm font-bold block mb-1.5">ตั้ง Password</label>
              <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" placeholder="รหัสผ่านเข้าสู่ระบบ" />
            </div>
 
            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-black py-4 rounded-xl shadow-lg mt-4 disabled:opacity-50 transition-all transform active:scale-95">
              {isLoading ? 'กำลังโหลด...' : 'ลงทะเบียนและเริ่มผจญภัย 🎉'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
