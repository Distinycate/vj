'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import dynamic from 'next/dynamic';

const Dashboard = dynamic(() => import('@/components/Dashboard'));
const StudyCamp = dynamic(() => import('@/components/StudyCamp'));
const Game = dynamic(() => import('@/components/Game'));
const PreTest = dynamic(() => import('@/components/PreTest'));
const PostTest = dynamic(() => import('@/components/PostTest'));
import { Globe2, School, User, Lock, Sparkles, LogIn, UserPlus, ArrowRight, Info, X } from 'lucide-react';
import { saveStudentSession } from '@/utils/studentSession';
import { useDemoStore } from '@/store/useDemoStore';

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

const generateRandomStudentId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ST-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const fetchRegistrationOpen = async () => {
  const { data, error } = await supabase
    .from('schools')
    .select('is_registration_open')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('Unable to read registration status:', error.message);
    return true;
  }

  return data?.is_registration_open !== false;
};

export default function Home() {
  const router = useRouter();
  const { student, progress, setStudent, setProgress, currentScreen } = useAppStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          if (registration) console.log('ServiceWorker registration successful with scope: ', registration.scope);
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
  const [loginRole, setLoginRole] = useState<'student' | 'teacher' | 'executive'>('student');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Register State
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regGrade, setRegGrade] = useState('ม.1');
  const [regRoom, setRegRoom] = useState('1');
  const [regStudentId, setRegStudentId] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regYear, setRegYear] = useState(new Date().getFullYear().toString());

  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [showAboutModal, setShowAboutModal] = useState(false);

  useEffect(() => {
    async function checkRegistration() {
      const isOpen = await fetchRegistrationOpen();
      setIsRegistrationOpen(isOpen);
    }
    checkRegistration();

    // Rehydrate session from server on mount (F5 reload protection)
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.authenticated && data.role === 'STUDENT' && data.user) {
          setStudent(data.user);
          saveStudentSession(data.user);
          if (data.progress) setProgress(data.progress);
        }
      })
      .catch(() => {});

    const savedUser = localStorage.getItem('vj_saved_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.username) setLoginUsername(parsed.username);
        if (parsed.password) setLoginPassword(parsed.password);
        if (parsed.role) setLoginRole(parsed.role);
        setRememberMe(true);
      } catch (e) {}
    }
  }, []);

  const handleLogin = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) return setError('กรุณากรอก Username และ Password');
    setIsLoading(true);
    setError('');

    try {
      if (loginRole === 'student') {
        // Intercept demo.judge
        if (loginUsername.trim().toLowerCase() === 'demo.judge') {
          useDemoStore.getState().startDemo();
          const demoStore = useDemoStore.getState();
          setStudent(demoStore.demoStudent);
          saveStudentSession(demoStore.demoStudent);
          setProgress(demoStore.demoProgress);
          return;
        }
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword.trim(),
          role: loginRole.toUpperCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }

      if (data.requires_password_change) {
        window.location.href = '/force-password-change';
        return;
      }

      if (rememberMe) {
        localStorage.setItem(
          'vj_saved_user',
          JSON.stringify({ username: loginUsername.trim(), password: loginPassword.trim(), role: loginRole })
        );
      } else {
        localStorage.removeItem('vj_saved_user');
      }

      if (data.role === 'STUDENT') {
        setStudent(data.user);
        saveStudentSession(data.user);
        setProgress(data.progress);

        if (data.has_remedial_access) {
          window.location.href = '/events';
          return;
        }
      } else if (data.role === 'ADMIN' || data.role === 'TEACHER') {
        localStorage.setItem('vocab_journey_teacher', JSON.stringify(data.user));
        localStorage.setItem('vocab_journey_card_teacher', JSON.stringify(data.user));
        window.location.href = '/admin';
      } else if (data.role === 'CARD_TEACHER') {
        localStorage.setItem('vocab_journey_card_teacher', JSON.stringify(data.user));
        window.location.href = '/card-teacher/dashboard';
      } else if (data.role === 'EXECUTIVE') {
        localStorage.setItem('vocab_journey_executive', JSON.stringify(data.user));
        window.location.href = '/executive';
      }
    } catch (err: any) {
      console.error('Login failure:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!isRegistrationOpen) return setError('ระบบปิดรับลงทะเบียนชั่วคราว กรุณาติดต่อคุณครู');
    if (!regFirstName || !regLastName || !regGrade || !regRoom || !regUsername || !regPassword) {
      return setError('กรุณากรอกข้อมูลให้ครบถ้วน');
    }
    setIsLoading(true);
    setError('');
    
    const fullName = `${regFirstName.trim()} ${regLastName.trim()}`;

    try {
      const latestRegistrationOpen = await fetchRegistrationOpen();
      setIsRegistrationOpen(latestRegistrationOpen);
      if (!latestRegistrationOpen) {
        throw new Error('ระบบปิดรับลงทะเบียนชั่วคราว กรุณาติดต่อคุณครู');
      }

      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: regFirstName.trim(),
          lastName: regLastName.trim(),
          gradeLevel: regGrade.trim(),
          roomNumber: regRoom.trim(),
          username: regUsername.trim(),
          password: regPassword.trim(),
          userType: 'INTERNAL',
        }),
      });

      const regJson = await regRes.json();
      if (!regRes.ok) {
        throw new Error(regJson.error || 'ไม่สามารถลงทะเบียนได้');
      }

      const studentData = regJson.student;
      const initialProgress = {
        current_rank: 1,
        current_stage: 1,
        coins: 0,
        exp: 0,
      };

      // Auto-login after register
      setStudent(studentData);
      saveStudentSession(studentData);
      setProgress(initialProgress);
      
    } catch (err: any) {
      console.error(err);
      
      // Log error to registration_logs if possible (don't block UI if this fails)
      supabase.from('registration_logs').insert([{
        username: regUsername.trim(),
        error_code: err.code || 'UNKNOWN',
        error_message: err.message,
        device_info: navigator.userAgent
      }]).then(() => {}, () => {});

      setError(err.message || 'ข้อมูลนี้มีอยู่ในระบบแล้ว หรือเกิดข้อผิดพลาด');
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
    if (currentScreen === 'posttest') return <PostTest />;
    return <Dashboard />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 safe-bottom">

      <motion.div
        id="login-panel"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl"
      >
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-xl">
            VJ
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Vocab Journey
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            โรงเรียนบ้านโคกยาง • ฝึกคำศัพท์ &amp; เตรียมสอบ O-NET
          </p>
        </div>

        {/* Mode Switcher */}
        {isRegistrationOpen ? (
          <div className="grid grid-cols-2 gap-1.5 bg-slate-950 border border-slate-800 rounded-2xl p-1 mb-5">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`min-h-[44px] py-2.5 px-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
                mode === 'login'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>เข้าสู่ระบบ</span>
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              className={`min-h-[44px] py-2.5 px-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
                mode === 'register'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>สมัครสมาชิก</span>
            </button>
          </div>
        ) : (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 mb-5 text-center shadow-inner">
            <p className="text-xs font-bold text-emerald-300">
              🔑 บัญชีนักเรียนได้รับการลงทะเบียนโดยคุณครูเรียบร้อยแล้ว
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              ใช้เลขประจำตัวประชาชนเข้าใช้งานได้ทันที
            </p>
          </div>
        )}

        {/* New Season Announcement Banner */}
        <div className="mb-5 bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-sky-500/15 border-2 border-emerald-500/40 rounded-3xl p-4 text-center shadow-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black mb-1.5">
            <span>🚀 ต้อนรับสู่ภาคเรียนใหม่ (Season 2)</span>
          </div>
          <h3 className="text-sm sm:text-base font-black text-emerald-200">
            เปิดระบบ Vocab Journey สำหรับภาคเรียนใหม่แล้ว!
          </h3>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            เริ่มต้นการผจญภัยคำศัพท์รอบใหม่ไปด้วยกัน ทุกคนเริ่มต้นที่ <strong className="text-emerald-300">ด่าน 1</strong><br />
            (เหรียญ, คลังการ์ด และไอเทมทั้งหมดยังคงอยู่ครบถ้วน)
          </p>
          <div className="mt-2.5 text-[11px] text-slate-300 bg-slate-950/70 rounded-xl py-2 px-3 border border-slate-800/80 space-y-1">
            <div className="text-amber-300 font-semibold">📝 <strong>นักเรียนที่มีภารกิจแก้ 0/ร:</strong> เข้าสู่ระบบด้วยเลข ปชช. 13 หลัก และรหัส นร. 4 หลัก เพื่อทำภารกิจซ่อมเสริม (ชาเลนจ์) ได้ทันที</div>
          </div>
        </div>

        {error && (
          <div className="error-state mb-5 text-xs sm:text-sm p-4 rounded-xl bg-rose-500/15 border-2 border-rose-500/40 text-rose-300 font-bold flex items-center gap-2 shadow-lg">
            <span>⚠️ {error}</span>
          </div>
        )}

        {mode === 'login' && (
          <div className="grid grid-cols-1 min-[390px]:grid-cols-3 gap-2.5 bg-slate-950/90 border-2 border-slate-800/90 rounded-2xl p-2 mb-5">
            <button 
              type="button"
              onClick={() => { setLoginRole('student'); setError(''); }}
              className={`min-h-[54px] py-2 px-1 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 border-2 ${
                loginRole === 'student' 
                  ? 'bg-gradient-to-br from-emerald-500/30 via-teal-500/25 to-sky-600/30 text-emerald-200 border-emerald-400 shadow-lg shadow-emerald-500/30 scale-[1.03]' 
                  : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-900/80 border-slate-800/80'
              }`}
            >
              <span className="text-xs sm:text-sm font-black">👩‍🎓 นักเรียน</span>
              <span className="text-[10px] text-emerald-400 font-bold">เข้าสู่ระบบ</span>
            </button>
            <button 
              type="button"
              onClick={() => { setLoginRole('teacher'); setError(''); }}
              className={`min-h-[54px] py-2 px-1 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 border-2 ${
                loginRole === 'teacher' 
                  ? 'bg-gradient-to-br from-indigo-500/30 via-blue-500/25 to-indigo-600/30 text-indigo-200 border-indigo-400 shadow-lg shadow-indigo-500/30 scale-[1.03]' 
                  : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-900/80 border-slate-800/80'
              }`}
            >
              <span className="text-xs sm:text-sm font-black">👨‍🏫 ครูผู้สอน</span>
              <span className="text-[10px] text-indigo-400/90 font-bold">สรุปผล/จัดการ</span>
            </button>
            <button 
              type="button"
              onClick={() => { setLoginRole('executive'); setError(''); }}
              className={`min-h-[54px] py-2 px-1 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 border-2 ${
                loginRole === 'executive' 
                  ? 'bg-gradient-to-br from-purple-500/30 via-fuchsia-500/25 to-purple-600/30 text-purple-200 border-purple-400 shadow-lg shadow-purple-500/30 scale-[1.03]' 
                  : 'text-slate-400 hover:text-purple-300 hover:bg-slate-900/80 border-slate-800/80'
              }`}
            >
              <span className="text-xs sm:text-sm font-black">📊 ผู้บริหาร</span>
              <span className="text-[10px] text-purple-400/90 font-bold">สรุปรายงาน</span>
            </button>
          </div>
        )}

        {mode === 'login' ? (
          <div className="flex flex-col gap-4" onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(e); }}>
            <div className="space-y-1.5">
              <label className="text-slate-200 text-xs sm:text-sm font-black flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className={`w-4 h-4 ${loginRole === 'student' ? 'text-emerald-400' : 'text-indigo-400'}`} />
                  <span>{loginRole === 'student' ? 'เลขประจำตัวประชาชน 13 หลัก' : 'Username (ชื่อผู้ใช้งาน)'}</span>
                </span>
              </label>
              <input 
                type="text" 
                autoComplete="off" 
                value={loginUsername} 
                onChange={(e) => setLoginUsername(e.target.value)} 
                className={`w-full bg-slate-950/90 border-2 border-slate-800 rounded-2xl px-4 py-3.5 text-white text-sm outline-none transition-all placeholder:text-slate-500 shadow-inner ${
                  loginRole === 'student'
                    ? 'focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/25'
                    : 'focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/25'
                }`}
                placeholder={loginRole === 'student' ? 'กรอกเลขประจำตัวประชาชน 13 หลัก' : 'กรอกชื่อผู้ใช้งานครูหรือผู้บริหาร'} 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-200 text-xs sm:text-sm font-black flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className={`w-4 h-4 ${loginRole === 'student' ? 'text-emerald-400' : 'text-indigo-400'}`} />
                  <span>{loginRole === 'student' ? 'รหัสผ่าน (รหัสนักเรียน 4 หลัก)' : 'Password (รหัสผ่าน)'}</span>
                </span>
              </label>
              <input 
                type="password" 
                autoComplete="new-password" 
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)} 
                className={`w-full bg-slate-950/90 border-2 border-slate-800 rounded-2xl px-4 py-3.5 text-white text-sm outline-none transition-all placeholder:text-slate-500 shadow-inner ${
                  loginRole === 'student'
                    ? 'focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/25'
                    : 'focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/25'
                }`}
                placeholder={loginRole === 'student' ? 'กรอกรหัสนักเรียน 4 หลัก' : 'กรอกรหัสผ่าน'} 
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900" />
              <span className="text-slate-300 text-xs sm:text-sm font-medium hover:text-white transition-colors">จดจำรหัสผ่าน</span>
            </label>

            {/* Primary Action Button */}
            <button 
              type="button" 
              onClick={handleLogin} 
              disabled={isLoading} 
              className="w-full min-h-[62px] py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600 hover:from-indigo-400 hover:to-blue-400 text-white font-black text-base sm:text-lg transition-all shadow-2xl shadow-indigo-500/40 hover:shadow-indigo-400/60 flex items-center justify-center gap-3 mt-2 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] border-2 border-indigo-300/50"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {loginRole === 'student'
                      ? 'เข้าสู่ระบบผจญภัยคำศัพท์ 🎮'
                      : loginRole === 'teacher'
                        ? 'เข้าสู่ระบบจัดการเรียนรู้ 👨‍🏫'
                        : 'เข้าสู่ระบบรายงานผู้บริหาร 📊'}
                  </span>
                  <ArrowRight className="w-5 h-5 shrink-0" />
                </>
              )}
            </button>

            {/* Prominent Card Teacher System Button */}
            <button 
              type="button" 
              onClick={() => window.location.href = '/card-teacher'} 
              className="w-full min-h-[58px] py-4 px-5 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-black text-sm sm:text-base transition-all shadow-2xl shadow-fuchsia-600/40 hover:shadow-fuchsia-500/60 flex items-center justify-center gap-2.5 border-2 border-fuchsia-300/60 mt-1 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-5 h-5 text-yellow-300 shrink-0 animate-pulse" />
              <span>🃏 ระบบการ์ดคำศัพท์สำหรับคุณครู (สรุปผล/จัดการ) &rarr;</span>
            </button>
          </div>
        ) : mode === 'register' && !isRegistrationOpen ? (
          <div className="bg-rose-500/10 border-2 border-rose-500/30 text-rose-300 p-6 rounded-2xl text-center mb-4 shadow-lg">
            <h3 className="font-black text-lg mb-2">ปิดรับลงทะเบียน</h3>
            <p className="text-sm">ระบบถูกปิดรับการลงทะเบียนชั่วคราว<br/>กรุณาติดต่อคุณครูผู้สอนครับ</p>
          </div>
        ) : mode === 'register' ? (
          <div className="flex flex-col gap-4" onKeyDown={(e) => { if (e.key === 'Enter') handleRegister(e); }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-200 text-xs sm:text-sm font-black block mb-1.5">ชื่อจริง</label>
                <input type="text" value={regFirstName} onChange={(e) => setRegFirstName(e.target.value)} className="w-full bg-slate-950/90 border-2 border-slate-800 focus:border-emerald-400 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="สมชาย" />
              </div>
              <div>
                <label className="text-slate-200 text-xs sm:text-sm font-black block mb-1.5">นามสกุล</label>
                <input type="text" value={regLastName} onChange={(e) => setRegLastName(e.target.value)} className="w-full bg-slate-950/90 border-2 border-slate-800 focus:border-emerald-400 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="ใจดี" />
              </div>
            </div>
            <div className="grid grid-cols-1 min-[390px]:grid-cols-3 gap-4">
              <div>
                <label className="text-slate-200 text-xs sm:text-sm font-black block mb-1.5">ระดับชั้น</label>
                <select value={regGrade} onChange={(e) => setRegGrade(e.target.value)} className="w-full bg-slate-950/90 border-2 border-slate-800 focus:border-emerald-400 rounded-xl px-4 py-3 text-white text-sm outline-none">
                  <option value="ป.1">ป.1</option>
                  <option value="ป.2">ป.2</option>
                  <option value="ป.3">ป.3</option>
                  <option value="ป.4">ป.4</option>
                  <option value="ป.5">ป.5</option>
                  <option value="ป.6">ป.6</option>
                  <option value="ม.1">ม.1</option>
                  <option value="ม.2">ม.2</option>
                  <option value="ม.3">ม.3</option>
                  <option value="ม.4">ม.4</option>
                  <option value="ม.5">ม.5</option>
                  <option value="ม.6">ม.6</option>
                </select>
              </div>
              <div>
                <label className="text-slate-200 text-xs sm:text-sm font-black block mb-1.5">ห้อง</label>
                <input type="text" value={regRoom} onChange={(e) => setRegRoom(e.target.value)} className="w-full bg-slate-950/90 border-2 border-slate-800 focus:border-emerald-400 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="1" />
              </div>
              <div>
                <label className="text-slate-200 text-xs sm:text-sm font-black block mb-1.5">เลขที่</label>
                <input type="text" value={regStudentId} onChange={(e) => setRegStudentId(e.target.value)} className="w-full bg-slate-950/90 border-2 border-slate-800 focus:border-emerald-400 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="15" />
              </div>
            </div>
            
            <hr className="border-slate-800 my-1" />
            
            <div>
              <label className="text-slate-200 text-xs sm:text-sm font-black block mb-1.5">ตั้ง Username</label>
              <input type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} className="w-full bg-slate-950/90 border-2 border-slate-800 focus:border-emerald-400 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="สำหรับเข้าใช้งาน" />
            </div>
            <div>
              <label className="text-slate-200 text-xs sm:text-sm font-black block mb-1.5">ตั้ง Password</label>
              <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="w-full bg-slate-950/90 border-2 border-slate-800 focus:border-emerald-400 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="รหัสผ่านเข้าสู่ระบบ" />
            </div>
 
            {/* Prominent Register Submit Button */}
            <button 
              type="button" 
              onClick={handleRegister} 
              disabled={isLoading} 
              className="w-full min-h-[62px] py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 hover:from-emerald-300 hover:to-teal-200 text-slate-950 font-black text-base sm:text-lg transition-all shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-400/60 flex items-center justify-center gap-3 mt-2 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] border-2 border-emerald-200/50"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <>
                  <span>ลงทะเบียนและเริ่มผจญภัย 🎉</span>
                  <ArrowRight className="w-5 h-5 shrink-0" />
                </>
              )}
            </button>
          </div>
        ) : null}

        {/* Quiet Secondary Links */}
        <div className="mt-6 pt-5 border-t border-slate-800 space-y-2.5">
          <button
            type="button"
            onClick={() => router.push('/network')}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 font-bold text-sm transition-colors flex items-center justify-center gap-2 border border-slate-800"
          >
            <Globe2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span>โรงเรียนเครือข่าย (VJ Lite)</span>
          </button>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => router.push('/demo')}
              className="text-xs text-slate-400 hover:text-amber-300 py-2 px-3 rounded-lg hover:bg-slate-800/60 transition-colors font-semibold"
            >
              โหมดกรรมการ (Demo)
            </button>
            <button
              type="button"
              onClick={() => setShowAboutModal(true)}
              className="text-xs text-slate-400 hover:text-emerald-300 py-2 px-3 rounded-lg hover:bg-slate-800/60 transition-colors inline-flex items-center gap-1.5 font-semibold"
            >
              <Info className="w-3.5 h-3.5" />
              <span>เกี่ยวกับนวัตกรรม &amp; ผู้พัฒนา</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Progressive Disclosure Modal for Academic & Innovator Info */}
      <AnimatePresence>
        {showAboutModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Active Learning Innovation</p>
                  <h2 className="text-xl sm:text-2xl font-black text-white mt-1">เกี่ยวกับ Vocab Journey &amp; ผู้พัฒนา</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAboutModal(false)}
                  aria-label="ปิดหน้าต่าง"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                  <p className="text-xs font-bold text-emerald-400 mb-1">Vygotsky&apos;s ZPD • Flow Theory</p>
                  <h3 className="font-bold text-white mb-1">เรียนรู้ในจังหวะของตัวเอง</h3>
                  <p className="text-slate-400 leading-relaxed">ระบบ Adaptive Rank ปรับความยากให้พอดีกับผู้เรียน ไม่ยากจนท้อ และไม่ง่ายจนน่าเบื่อ</p>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                  <p className="text-xs font-bold text-sky-400 mb-1">Ebbinghaus SRS Memory Curve</p>
                  <h3 className="font-bold text-white mb-1">จำระยะยาวด้วย SRS</h3>
                  <p className="text-slate-400 leading-relaxed">บันทึกคำที่ตอบผิดและดึงกลับมาทบทวนในจังหวะที่เหมาะสมตามหลักการทบทวนแบบเว้นระยะ</p>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                  <p className="text-xs font-bold text-violet-400 mb-1">21st Century Skills • 4Cs</p>
                  <h3 className="font-bold text-white mb-1">ทักษะแห่งศตวรรษที่ 21</h3>
                  <p className="text-slate-400 leading-relaxed">ฝึกการคิดวิเคราะห์ผ่านบริบทประโยค การทำงานร่วมกันผ่าน Team Battle และกำกับตนเองผ่านสถิติ</p>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                  <p className="text-xs font-bold text-amber-400 mb-1">Gamification • SDT</p>
                  <h3 className="font-bold text-white mb-1">เปลี่ยนการท่องจำเป็นการผจญภัย</h3>
                  <p className="text-slate-400 leading-relaxed">คลังคำศัพท์ มินิเกม ด่านบอส และระบบทีม เพื่อการเตรียมสอบ O-NET อย่างต่อเนื่อง</p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-2 text-sm">
                <h3 className="font-black text-white text-base">ผู้จัดทำนวัตกรรม: นายณัฐภัทร พรมปรุ (ครู)</h3>
                <p className="text-slate-300">โรงเรียนบ้านโคกยาง สพป.บุรีรัมย์ เขต 3</p>
                <div className="pt-2 text-xs text-slate-400 space-y-1">
                  <p>• ปริญญาโท: ศษ.ม. การบริหารการศึกษา (ม.วงษ์ชวลิตกุล) / ศศ.ม. ภาษาอังกฤษ (มรภ.บุรีรัมย์)</p>
                  <p>• ปริญญาตรี: ค.บ. ภาษาอังกฤษ (มรภ.บุรีรัมย์)</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
