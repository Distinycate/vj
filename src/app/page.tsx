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
    if (!loginUsername.trim() || !loginPassword.trim()) return setError('喔佮福喔膏笓喔侧竵喔｀腑喔� Username 喙佮弗喔� Password');
    setIsLoading(true);
    setError('');

    try {
      // 1. Authenticate with Supabase Auth using virtual email
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: `${loginUsername.trim()}@school.local`,
        password: loginPassword
      });

      if (authError || !authData.user) {
        throw new Error('喔娻阜喙堗腑喔溹腹喙夃箖喔娻箟喔�福喔粪腑喔｀斧喔编釜喔溹箞喔侧笝喙勦浮喙堗笘喔灌竵喔曕箟喔�竾');
      }

      // 2. Fetch student profile mapping
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (studentError || !studentData) throw new Error('喙勦浮喙堗笧喔氞競喙夃腑喔∴腹喔ム箓喔涏福喙勦笩喔ム箤喔權副喔佮箑喔｀傅喔⑧笝');

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
      setError(err.message || '喙€喔佮复喔斷競喙夃腑喔溹复喔斷笧喔ム覆喔斷箖喔權竵喔侧福喙€喔娻阜喙堗腑喔∴笗喙堗腑');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regStudentId || !regName || !regGrade || !regRoom || !regUsername || !regPassword) {
      return setError('喔佮福喔膏笓喔侧竵喔｀腑喔佮競喙夃腑喔∴腹喔ム箖喔�箟喔勦福喔氞笘喙夃抚喔�');
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
        throw new Error(authError?.message || '喔�浮喔编竸喔｀釜喔∴覆喔娻复喔佮箘喔∴箞喔�赋喙€喔｀箛喔�');
      }

      // 3. Create Student profile row mapping to auth user ID
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .insert([{ 
          id: authData.user.id,
          student_id: regStudentId,
          student_name: regName,
          classroom_id: classroomId,
          academic_year: regYear,
          username: regUsername
        }])
        .select()
        .single();
        
      if (studentError) {
         throw studentError;
      }
      
      // 4. Initialize learning path
      await supabase.from('learning_paths').insert([{ 
        student_id: studentData.id,
        current_rank: 1,
        current_stage: 1,
        coins: 0,
        exp: 0
      }]);
      
      setStudent(studentData);
      setProgress({ current_rank: 1, current_stage: 1, coins: 0, exp: 0 });
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setIsLoading(false);
    }
  };

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
          <p className="text-slate-400 font-medium">喔｀赴喔氞笟喔涏福喔班箑喔∴复喔權箒喔ム赴喔澿付喔佮笚喔编竵喔┼赴喔勦赋喔ㄠ副喔炧笚喙屶腑喔编笀喔夃福喔脆涪喔�</p>
        </div>

        <div className="flex bg-slate-950/80 border border-slate-800 rounded-2xl p-1 mb-6">
          <button 
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-2.5 rounded-xl font-bold transition-all ${mode === 'login' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            喙€喔傕箟喔侧釜喔灌箞喔｀赴喔氞笟
          </button>
          <button 
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-2.5 rounded-xl font-bold transition-all ${mode === 'register' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            喔�浮喔编竸喔｀釜喔∴覆喔娻复喔�
          </button>
        </div>

        {error && <div className="error-state mb-6 text-sm">{error}</div>}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-slate-300 text-sm font-bold block mb-1.5">Username</label>
              <input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors glass-input" placeholder="喙€喔娻箞喔� test1" />
            </div>
            <div>
              <label className="text-slate-300 text-sm font-bold block mb-1.5">Password</label>
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors glass-input" placeholder="喙€喔娻箞喔� test111111" />
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-black py-4 rounded-xl shadow-lg mt-4 disabled:opacity-50 transition-all transform active:scale-95">
              {isLoading ? '喔佮赋喔ム副喔囙箓喔�弗喔�...' : '喙€喔傕箟喔侧釜喔灌箞喔｀赴喔氞笟喔溹笀喔嵿笭喔编涪 馃殌'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 text-sm font-bold block mb-1.5">喔娻阜喙堗腑-喔權覆喔∴釜喔佮父喔�</label>
                <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" placeholder="喔娻阜喙堗腑喔堗福喔脆竾" />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-bold block mb-1.5">喔｀斧喔编釜喔權副喔佮箑喔｀傅喔⑧笝</label>
                <input type="text" value={regStudentId} onChange={(e) => setRegStudentId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" placeholder="喔｀斧喔编釜喔涏福喔班笀喔赤笗喔编抚" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-slate-300 text-sm font-bold block mb-1.5">喔娻副喙夃笝 (喙€喔娻箞喔� 喔�.1)</label>
                <input type="text" value={regGrade} onChange={(e) => setRegGrade(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" placeholder="喔�.1" />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-bold block mb-1.5">喔�箟喔�竾 (喙€喔娻箞喔� 1)</label>
                <input type="text" value={regRoom} onChange={(e) => setRegRoom(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" placeholder="1" />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-bold block mb-1.5">喔涏傅喔佮覆喔｀辅喔多竵喔┼覆</label>
                <input type="text" value={regYear} onChange={(e) => setRegYear(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" />
              </div>
            </div>
            
            <hr className="border-slate-800 my-2" />
            
            <div>
              <label className="text-slate-300 text-sm font-bold block mb-1.5">喔曕副喙夃竾 Username</label>
              <input type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" placeholder="喔犩覆喔┼覆喔�副喔囙竵喔む俯" />
            </div>
            <div>
              <label className="text-slate-300 text-sm font-bold block mb-1.5">喔曕副喙夃竾 Password</label>
              <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" placeholder="喔｀斧喔编釜喔�涪喙堗覆喔囙笝喙夃腑喔� 6 喔�弗喔编竵" />
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-black py-4 rounded-xl shadow-lg mt-4 disabled:opacity-50 transition-all transform active:scale-95">
              {isLoading ? '喔佮赋喔ム副喔囙箓喔�弗喔�...' : '喔ム竾喔椸赴喙€喔氞傅喔⑧笝喙佮弗喔班箑喔｀复喙堗浮喔溹笀喔嵿笭喔编涪 馃帀'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-slate-500 space-x-3 border-t border-slate-800 pt-4">
          <a href="/admin" className="hover:text-indigo-400 font-extrabold transition-colors">喔｀赴喔氞笟喔勦福喔灌笢喔灌箟喔�腑喔� 馃敀</a>
          <span>鈥�</span>
          <a href="/admin" className="hover:text-indigo-400 font-extrabold transition-colors">喔｀赴喔氞笟喔勦福喔灌笢喔灌箟喔腑喔 馃敀</a>
          <span>鈥</span>
          <a href="/executive" className="hover:text-emerald-400 font-extrabold transition-colors">喔｀覆喔⑧竾喔侧笝喔溹腹喙夃笟喔｀复喔覆喔 馃搳</a>
        </div>
      </motion.div>
    </div>
  );
}
