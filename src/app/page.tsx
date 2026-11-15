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
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col bg-[radial-gradient(ellipse_at_top_left,_rgba(16,185,129,0.09),transparent_50%),radial-gradient(ellipse_at_bottom_right,_rgba(56,189,248,0.07),transparent_50%)] safe-bottom">
      {/* World-Class Minimalist Top Navbar */}
      <header className="w-full border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-sm shrink-0">
              VJ
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-black text-white text-base sm:text-lg tracking-tight truncate">Vocab Journey</span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-[11px] font-medium text-slate-400">
                โรงเรียนบ้านโคกยาง
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => router.push('/network')}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors inline-flex items-center gap-1.5"
            >
              <Globe2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="hidden min-[420px]:inline">โรงเรียนเครือข่าย</span>
              <span className="min-[420px]:hidden">VJ Lite</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/demo')}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-amber-300 hover:bg-white/[0.06] transition-colors"
            >
              โหมดทดลอง
            </button>
            <button
              type="button"
              onClick={() => setShowAboutModal(true)}
              className="p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-emerald-300 hover:bg-white/[0.06] transition-colors inline-flex items-center gap-1.5"
              title="เกี่ยวกับนวัตกรรมและผู้พัฒนา"
            >
              <Info className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="hidden md:inline">เกี่ยวกับระบบ</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Split Workspace */}
      <main className="flex-1 flex items-center justify-center w-full">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 sm:py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          {/* Left Editorial Showcase (PC/Desktop only) */}
          <section className="hidden lg:flex lg:col-span-7 flex-col justify-center space-y-8 pr-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold w-fit">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Active Learning Platform • O-NET English</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.15]">
                ฝึกคำศัพท์และไวยากรณ์
                <span className="block text-emerald-400 mt-1.5">
                  เพื่อความมั่นใจในสนามสอบ O-NET
                </span>
              </h1>
              <p className="text-slate-400 text-base xl:text-lg max-w-xl leading-relaxed">
                แพลตฟอร์มการเรียนภาษาอังกฤษที่ออกแบบมาเพื่อนักเรียนและครู ปรับระดับตามความสามารถอัตโนมัติ พร้อมระบบทบทวนและใบงานในที่เดียว
              </p>
            </div>

            {/* 3 Minimalist Bento Highlights */}
            <div className="grid grid-cols-3 gap-4 max-w-2xl pt-2">
              <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4">
                <p className="text-2xl font-black text-white">100+</p>
                <p className="text-xs font-semibold text-emerald-400 mt-1">ด่านผจญภัย</p>
                <p className="text-[11px] text-slate-400 mt-0.5">ปรับระดับอัตโนมัติ</p>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4">
                <p className="text-2xl font-black text-white">25 บท</p>
                <p className="text-xs font-semibold text-sky-400 mt-1">ไวยากรณ์ &amp; ทริค</p>
                <p className="text-[11px] text-slate-400 mt-0.5">พร้อมข้อสอบจริง</p>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4">
                <p className="text-2xl font-black text-white">SRS</p>
                <p className="text-xs font-semibold text-amber-400 mt-1">ทบทวนแม่นยำ</p>
                <p className="text-[11px] text-slate-400 mt-0.5">จำระยะยาวรายบุคคล</p>
              </div>
            </div>
          </section>

          {/* Right Auth Card */}
          <section className="lg:col-span-5 flex justify-center lg:justify-end w-full">
            <motion.div
              id="login-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-[430px] bg-slate-900/90 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.75)]"
            >
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิกใหม่'}
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">
                  {mode === 'login'
                    ? 'เลือกบทบาทและกรอกข้อมูลเพื่อเริ่มต้นใช้งาน'
                    : 'กรอกข้อมูลนักเรียนเพื่อสร้างบัญชีการเรียนรู้'}
                </p>
              </div>

              {/* Mode Switcher */}
              {isRegistrationOpen ? (
                <div className="grid grid-cols-2 gap-1 bg-slate-950/90 border border-slate-800 rounded-xl p-1 mb-5">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); }}
                    className={`min-h-[40px] py-2 px-3 rounded-lg font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 ${
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
                    className={`min-h-[40px] py-2 px-3 rounded-lg font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 ${
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
          <p className="text-xs text-slate-400 text-center mb-4">
            ใช้เลขบัตรประชาชน 13 หลัก และรหัสนักเรียน 4 หลัก
          </p>
        )}

        {error && (
          <div className="mb-4 text-xs sm:text-sm p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 font-semibold">
            ⚠️ {error}
          </div>
        )}

        {mode === 'login' && (
          <div className="grid grid-cols-3 gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1 mb-4">
            <button
              type="button"
              onClick={() => { setLoginRole('student'); setError(''); }}
              className={`min-h-[42px] py-2 px-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                loginRole === 'student'
                  ? 'bg-slate-800 text-emerald-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              นักเรียน
            </button>
            <button
              type="button"
              onClick={() => { setLoginRole('teacher'); setError(''); }}
              className={`min-h-[42px] py-2 px-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                loginRole === 'teacher'
                  ? 'bg-slate-800 text-sky-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ครูผู้สอน
            </button>
            <button
              type="button"
              onClick={() => { setLoginRole('executive'); setError(''); }}
              className={`min-h-[42px] py-2 px-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                loginRole === 'executive'
                  ? 'bg-slate-800 text-amber-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ผู้บริหาร
            </button>
          </div>
        )}

        {mode === 'login' ? (
          <div className="flex flex-col gap-3.5" onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(e); }}>
            <div className="space-y-1.5">
              <label className="text-slate-300 text-xs sm:text-sm font-bold flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{loginRole === 'student' ? 'เลขประจำตัวประชาชน 13 หลัก' : 'ชื่อผู้ใช้งาน (Username)'}</span>
              </label>
              <input
                type="text"
                autoComplete="off"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full min-h-[48px] bg-slate-950 border border-slate-800 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-white text-base sm:text-sm outline-none transition-colors placeholder:text-slate-600"
                placeholder={loginRole === 'student' ? 'เลขประจำตัวประชาชน 13 หลัก' : 'Username'}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-300 text-xs sm:text-sm font-bold flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{loginRole === 'student' ? 'รหัสนักเรียน 4 หลัก' : 'รหัสผ่าน (Password)'}</span>
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full min-h-[48px] bg-slate-950 border border-slate-800 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-white text-base sm:text-sm outline-none transition-colors placeholder:text-slate-600"
                placeholder={loginRole === 'student' ? 'รหัสนักเรียน 4 หลัก' : 'Password'}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer py-1">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-emerald-500" />
              <span className="text-slate-400 text-xs sm:text-sm hover:text-white transition-colors">จดจำรหัสผ่าน</span>
            </label>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full min-h-[48px] py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm sm:text-base transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {loginRole === 'student'
                      ? 'เข้าสู่ระบบ'
                      : loginRole === 'teacher'
                        ? 'เข้าสู่ระบบครู'
                        : 'เข้าสู่ระบบผู้บริหาร'}
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

            </motion.div>
          </section>
        </div>
      </main>

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
