'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Globe2, 
  LogIn, 
  Lock, 
  User, 
  ArrowRight, 
  School, 
  HelpCircle, 
  CheckCircle2, 
  Sparkles, 
  BookOpen, 
  Volume2, 
  UserPlus, 
  Award, 
  Layers, 
  GraduationCap, 
  BrainCircuit, 
  Eye, 
  Palette, 
  ShieldCheck, 
  ChevronDown,
  ArrowLeft
} from 'lucide-react';
import { saveStudentSession } from '@/utils/studentSession';
import { useAppStore } from '@/store/useAppStore';

export default function NetworkHomePage() {
  const router = useRouter();
  const { setStudent, setProgress } = useAppStore();
  
  // Student Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // UI accordion/toggle state
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/network/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.trim(), 
          password: password.trim() 
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }

      if (json.student) {
        saveStudentSession(json.student);
        setStudent(json.student);
        
        // Fetch learning path / progress
        try {
          const progRes = await fetch(`/api/student/profile?studentId=${json.student.id}`);
          if (progRes.ok) {
            const progJson = await progRes.json();
            if (progJson.learningPath) {
              setProgress(progJson.learningPath);
            }
          }
        } catch {}

        router.push('/network/student');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToStudentLogin = () => {
    const el = document.getElementById('student-login-box');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      const input = document.getElementById('student-username-input');
      if (input) input.focus();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-3 sm:p-6 relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/3 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-40 left-1/3 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="w-full max-w-6xl flex items-center justify-between py-3 mb-6 border-b border-slate-800/80 relative z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center shadow-md shadow-indigo-600/30">
            <Globe2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-base tracking-tight">VOCAB JOURNEY</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-black text-[10px] border border-indigo-500/30 uppercase tracking-wider">
                Lite
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">สำหรับโรงเรียนเครือข่ายและพันธมิตร</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push('/')}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all border border-slate-800 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>หน้าระบบหลัก (Full Mode)</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-6xl relative z-10 space-y-10 pb-16">
        
        {/* HERO SECTION */}
        <section className="text-center space-y-4 pt-2 pb-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-black tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>VOCAB JOURNEY • สำหรับโรงเรียนเครือข่าย</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto">
            ยกระดับคลังคำศัพท์ภาษาอังกฤษ O-NET
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-300 to-sky-300 mt-1">
              สู่นวัตกรรมแห่งความเท่าเทียมทางการศึกษา
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-3xl mx-auto leading-relaxed">
            นวัตกรรมการเรียนรู้เชิงรุก (Active Learning) 100 ด่านคำศัพท์ ปรับระบบให้ลื่นไหล รวดเร็ว ใช้งานง่าย
            <br className="hidden sm:inline" />
            นักเรียน <strong className="text-emerald-300">รับ Username และ Password จากคุณครู</strong> เพื่อเริ่มต้นการผจญภัยได้ทันที
          </p>
        </section>

        {/* 3 DISTINCT ACTION PATHWAYS */}
        <section className="space-y-4">
          <div className="text-center">
            <h2 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-1">
              Select Your Gateway • เลือกช่องทางเข้าใช้งาน
            </h2>
            <p className="text-sm text-slate-400">เข้าสู่ระบบหรือสมัครใช้งานตามบทบาทของคุณเพื่อความสะดวกรวดเร็ว</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            
            {/* 1. Student Login Action Card */}
            <div className="glass-card bg-gradient-to-b from-emerald-950/40 via-slate-900/80 to-slate-950 border border-emerald-500/30 rounded-3xl p-6 flex flex-col justify-between hover:border-emerald-500/60 transition-all shadow-xl shadow-emerald-950/20">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-black text-emerald-400 tracking-wider uppercase">สำหรับผู้เรียน</span>
                  <h3 className="text-xl font-black text-white mt-0.5">เข้าสู่ระบบนักเรียน</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  สำหรับนักเรียนที่มีบัญชีที่ครูแจกให้ เข้าทำ Pre-test และฝึกคำศัพท์ 100 ด่าน พร้อมปุ่มฟังเสียงอ่าน
                </p>
                <div className="space-y-1.5 pt-2 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>คำถามแบบ 4 ตัวเลือก เข้าใจง่าย</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>มีปุ่มฟังเสียงอ่านคำศัพท์ (🔊 Audio)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>ไม่ต้องสมัครสมาชิกเอง</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={scrollToStudentLogin}
                className="mt-6 w-full min-h-12 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>เข้าสู่ระบบนักเรียน ↓</span>
              </button>
            </div>

            {/* 2. Teacher Login Action Card */}
            <div className="glass-card bg-gradient-to-b from-indigo-950/40 via-slate-900/80 to-slate-950 border border-indigo-500/30 rounded-3xl p-6 flex flex-col justify-between hover:border-indigo-500/60 transition-all shadow-xl shadow-indigo-950/20">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                  <School className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-black text-indigo-400 tracking-wider uppercase">สำหรับคุณครู</span>
                  <h3 className="text-xl font-black text-white mt-0.5">เข้าสู่ระบบคุณครู</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  จัดการห้องเรียน สร้างและแจกบัญชีนักเรียน ติดตามความก้าวหน้ารายบุคคล และส่งออกรายงาน
                </p>
                <div className="space-y-1.5 pt-2 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 text-indigo-300">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>แดชบอร์ดติดตามผล Real-time</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-indigo-300">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>สร้างบัญชีนักเรียนอัตโนมัติ 1 คลิก</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-indigo-300">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>ส่งออกข้อมูลผลคะแนน (Export CSV)</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push('/network/teacher?mode=login')}
                className="mt-6 w-full min-h-12 py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>เข้าสู่ระบบคุณครู &rarr;</span>
              </button>
            </div>

            {/* 3. Teacher Register Action Card */}
            <div className="glass-card bg-gradient-to-b from-amber-950/40 via-slate-900/80 to-slate-950 border border-amber-500/30 rounded-3xl p-6 flex flex-col justify-between hover:border-amber-500/60 transition-all shadow-xl shadow-amber-950/20">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-black text-amber-400 tracking-wider uppercase">ครูใหม่ / ยังไม่มีบัญชี</span>
                  <h3 className="text-xl font-black text-white mt-0.5">สมัครสมาชิกครูใหม่</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  เปิดใช้งานห้องเรียนสำหรับโรงเรียนของคุณได้ใน 1 นาที ฟรี ไม่มีค่าใช้จ่ายตลอดการใช้งาน
                </p>
                <div className="space-y-1.5 pt-2 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>สมัครฟรี ไม่ต้องรออนุมัติ</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>รองรับได้ทุกโรงเรียนในประเทศไทย</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>ไม่จำกัดจำนวนนักเรียนในห้อง</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push('/network/teacher?mode=register')}
                className="mt-6 w-full min-h-12 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>สมัครสมาชิกครูใหม่ (ฟรี) &rarr;</span>
              </button>
            </div>

          </div>
        </section>

        {/* DIRECT STUDENT LOGIN FORM SECTION */}
        <section id="student-login-box" className="scroll-mt-6 max-w-xl mx-auto w-full">
          <div className="glass-card bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-bold border border-emerald-500/20">
                <LogIn className="w-3.5 h-3.5" />
                <span>ช่องทางเข้าสู่ระบบนักเรียน</span>
              </div>
              <h2 className="text-2xl font-black text-white">ลงชื่อเข้านักเรียน (Student Login)</h2>
              <p className="text-xs text-slate-400">
                กรอก Username และ Password ที่ได้รับจากคุณครู
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs font-medium leading-relaxed">
                {error}
              </div>
            )}

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-300 space-y-1">
              <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                <span>🔑 คำแนะนำการเข้าสู่ระบบ:</span>
              </p>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                นักเรียนไม่ต้องสมัครสมาชิกเอง ให้กรอก <strong>Username</strong> (เช่น <code className="text-emerald-300 font-mono">st01</code>) และ <strong>Password</strong> ที่คุณครูผู้สอนแจกให้
              </p>
            </div>

            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" /> ชื่อผู้ใช้ (Username)
                </label>
                <input
                  id="student-username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="เช่น st01 หรือชื่อผู้ใช้ที่ครูให้"
                  disabled={isLoading}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" /> รหัสผ่าน (Password)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>เข้าสู่ระบบและเริ่มฝึกคำศัพท์ 🚀</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-3 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={() => router.push('/network/teacher')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold inline-flex items-center gap-1"
              >
                <School className="w-3.5 h-3.5" />
                <span>เข้าสู่ระบบหรือสมัครใช้งานสำหรับคุณครู &rarr;</span>
              </button>
            </div>
          </div>
        </section>

        {/* USER MANUALS: STUDENT & TEACHER */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-indigo-400 text-xs font-black uppercase tracking-widest mb-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>คู่มือการใช้งานระบบ VJ Lite</span>
              </div>
              <h2 className="text-2xl font-black text-white">ขั้นตอนและคู่มือการใช้งาน</h2>
            </div>

            {/* Toggle Tabs */}
            <div className="flex bg-slate-900 border border-slate-800 rounded-2xl p-1 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('student')}
                className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'student'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>วิธีใช้งานสำหรับนักเรียน</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('teacher')}
                className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'teacher'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <School className="w-3.5 h-3.5" />
                <span>วิธีใช้งานสำหรับคุณครู</span>
              </button>
            </div>
          </div>

          {/* Student Manual Tab Content */}
          {activeTab === 'student' && (
            <div className="glass-card bg-slate-900/60 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black">
                  🎒
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">วิธีใช้งานสำหรับนักเรียน (Student Journey Guide)</h3>
                  <p className="text-xs text-slate-400">6 ขั้นตอนสู่การเป็นผู้พิชิตคำศัพท์ภาษาอังกฤษ O-NET</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-300 font-black text-xs flex items-center justify-center">1</div>
                  <h4 className="font-bold text-white text-sm">รับบัญชีจากคุณครู</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    กรอก Username และ Password ที่ได้รับจากคุณครู ในช่องเข้าสู่ระบบด้านบน (ไม่ต้องสมัครสมาชิกเอง)
                  </p>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-300 font-black text-xs flex items-center justify-center">2</div>
                  <h4 className="font-bold text-white text-sm">ทำแบบทดสอบก่อนเรียน</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    ครั้งแรกที่เข้าสู่ระบบ ให้ทำแบบทดสอบก่อนเรียน (Pre-test) จำนวน 20 ข้อ เพื่อวัดระดับความรู้เบื้องต้น
                  </p>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-300 font-black text-xs flex items-center justify-center">3</div>
                  <h4 className="font-bold text-white text-sm">ฝึก 100 ด่านคำศัพท์</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    ฝึกคำศัพท์ตามลำดับด่าน โดยเริ่มจากด่านที่ 1 ผ่านด่านแบบไม่มีสะดุด ไม่ต้องรอนาน
                  </p>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-300 font-black text-xs flex items-center justify-center">4</div>
                  <h4 className="font-bold text-white text-sm">กดปุ่ม 🔊 เพื่อฟังเสียงอ่าน</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    แต่ละคำศัพท์สามารถกดปุ่มฟังเสียง เพื่อฟังการออกเสียงที่ถูกต้องตามหลักสัทศาสตร์สากล
                  </p>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-300 font-black text-xs flex items-center justify-center">5</div>
                  <h4 className="font-bold text-white text-sm">คำถามแบบ 4 ตัวเลือก</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    แต่ละข้อให้เลือกคำตอบที่ถูกต้องจากคำถามแบบ 4 ตัวเลือก สะสมดาวและผ่านด่านให้ครบ 100 ด่าน
                  </p>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-300 font-black text-xs flex items-center justify-center">6</div>
                  <h4 className="font-bold text-white text-sm">ทำแบบทดสอบหลังเรียน</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    เมื่อจบด่าน 100 ให้ทำแบบทดสอบหลังเรียน (Post-test) เพื่อวัดผลสัมฤทธิ์และดูพัฒนาการที่เพิ่มขึ้น
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Teacher Manual Tab Content */}
          {activeTab === 'teacher' && (
            <div className="glass-card bg-slate-900/60 border border-indigo-500/20 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-black">
                  👨‍🏫
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">วิธีใช้งานสำหรับคุณครู (Teacher Workflow Guide)</h3>
                  <p className="text-xs text-slate-400">4 ขั้นตอนการจัดการชั้นเรียนและประเมินผลผู้เรียน</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-300 font-black text-xs flex items-center justify-center">1</div>
                  <h4 className="font-bold text-white text-sm">สมัครสมาชิกครู</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    สมัครบัญชีครูโรงเรียนเครือข่าย กรอกชื่อ-นามสกุล โรงเรียน และ Username/Password เปิดใช้งานทันที
                  </p>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-300 font-black text-xs flex items-center justify-center">2</div>
                  <h4 className="font-bold text-white text-sm">สร้างห้องเรียน</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    สร้างห้องเรียนตามระดับชั้น เช่น ม.1/1, ป.6/1 สามารถสร้างได้ไม่จำกัดจำนวนห้อง
                  </p>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-300 font-black text-xs flex items-center justify-center">3</div>
                  <h4 className="font-bold text-white text-sm">สร้างบัญชีนักเรียน (ชุด)</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    ใช้ระบบสร้างบัญชีชุด 1 คลิก ระบุจำนวนนักเรียน ระบบจะสร้าง Username และ Password อัตโนมัติพร้อมแจก
                  </p>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-300 font-black text-xs flex items-center justify-center">4</div>
                  <h4 className="font-bold text-white text-sm">ติดตามผล & ส่งออก</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    ดูความก้าวหน้ารายคน ด่านปัจจุบัน คะแนน Pre-test / Post-test และส่งออกข้อมูลเป็น CSV ได้ตลอดเวลา
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => router.push('/network/teacher')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <span>เข้าสู่ระบบแดชบอร์ดคุณครู &rarr;</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* INNOVATOR PROFILE (ล้อมาจาก VJ หลัก) */}
        <section className="bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-slate-950 border border-indigo-500/25 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-black tracking-widest uppercase">
            👨‍🏫 ประวัติและข้อมูลผู้จัดทำนวัตกรรม
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">Innovator Profile</p>
                <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">นายณัฐภัทร พรมปรุ</h3>
                <p className="text-slate-400 text-sm mt-0.5 font-medium">Mr. Nattapat Prompru</p>
              </div>
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-xs sm:text-sm text-emerald-200 font-bold self-start">
                ตำแหน่ง: ครู
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/80 text-sm text-slate-300 leading-relaxed">
              <span className="font-bold text-white">สถานที่ทำงาน:</span> โรงเรียนบ้านโคกยาง สังกัดสำนักงานเขตพื้นที่การศึกษาประถมศึกษาบุรีรัมย์ เขต 3
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-indigo-300 font-black text-sm">
                <GraduationCap className="w-4 h-4 text-indigo-400" />
                <span>🎓 ประวัติการศึกษา (Education)</span>
              </div>
              <div className="space-y-2.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <p><span className="font-bold text-indigo-300">ปริญญาโท:</span> ศึกษาศาสตรมหาบัณฑิต สาขาวิชาการบริหารการศึกษา มหาวิทยาลัยวงษ์ชวลิตกุล</p>
                <p><span className="font-bold text-indigo-300">ปริญญาโท:</span> ศิลปศาสตรมหาบัณฑิต สาขาวิชาภาษาอังกฤษ มหาวิทยาลัยราชภัฏบุรีรัมย์</p>
                <p><span className="font-bold text-indigo-300">ปริญญาตรี:</span> ครุศาสตรบัณฑิต สาขาวิชาภาษาอังกฤษ มหาวิทยาลัยราชภัฏบุรีรัมย์</p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-300 font-black text-sm">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>📌 บทบาทและหน้าที่รับผิดชอบ</span>
              </div>
              <div className="space-y-2.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <p><span className="font-bold text-emerald-300">ด้านการจัดการเรียนรู้:</span> ผู้สอนกลุ่มสาระการเรียนรู้ภาษาต่างประเทศ (ภาษาอังกฤษ) และผู้รับผิดชอบการออกแบบแผนขับเคลื่อนเพื่อยกระดับผลสัมฤทธิ์ทางการทดสอบระดับชาติ (O-NET) สำหรับนักเรียนระดับชั้นมัธยมศึกษาตอนต้น</p>
                <p><span className="font-bold text-emerald-300">ด้านการบริหารจัดการ:</span> ปฏิบัติหน้าที่หัวหน้างานบริหารงานบุคคล (Head of Personnel Administration) โรงเรียนบ้านโคกยาง</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="font-black text-white text-sm flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-sky-400" />
              <span>💡 ความสนใจทางวิชาการและแนวคิดต่อยอดสู่ VJ Lite</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
              <div className="rounded-xl bg-slate-900/80 border border-slate-800/80 p-3.5 leading-relaxed">
                <strong className="text-white block mb-1">Active Learning:</strong>
                การออกแบบการจัดการเรียนรู้เชิงรุก และการจัดการเรียนรู้โดยใช้โครงงานเป็นฐาน (Project-Based Learning - PBL)
              </div>
              <div className="rounded-xl bg-slate-900/80 border border-slate-800/80 p-3.5 leading-relaxed">
                <strong className="text-white block mb-1">Gamification & EdTech:</strong>
                การประยุกต์ใช้จิตวิทยาการศึกษาและเทคโนโลยีเกมมิฟิเคชันเพื่อกระตุ้นแรงจูงใจภายในและผลสัมฤทธิ์
              </div>
              <div className="rounded-xl bg-slate-900/80 border border-slate-800/80 p-3.5 leading-relaxed">
                <strong className="text-white block mb-1">PDCA & Equity:</strong>
                การบริหารการศึกษาด้วยวงจรคุณภาพ และการขยายโอกาสทางการศึกษาอย่างเท่าเทียมสู่โรงเรียนเครือข่าย
              </div>
            </div>
          </div>
        </section>

        {/* PEDAGOGICAL & COLOR THEORY FOUNDATIONS */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-black tracking-widest uppercase">
              <Palette className="w-3.5 h-3.5" />
              <span>หลักการและทฤษฎีการออกแบบสีและตัวอักษร</span>
            </div>
            <h2 className="text-2xl font-black text-white">Pedagogical Design & Educational Color Theory</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
              ตัวหนังสือและชุดสีของ VJ Lite ถูกออกแบบอย่างเคร่งครัดตามหลักจิตวิทยาการรู้คิดและการออกแบบสื่อการศึกษา
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Principle 1: Cognitive Load Theory */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-black text-xs">
                1
              </div>
              <h3 className="font-black text-white text-sm">ลดภาระทางปัญญา (Cognitive Load)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                ใช้พื้นหลัง Slate-950 Dark Canvas คู่กับตัวอักษรสีขาวและ Slate-200 ที่มีอัตราส่วนคอนทราสต์สูงกว่า 12:1 ตามมาตรฐาน WCAG 2.1 AAA เพื่อลดความล้าของสายตาและเพิ่มสมาธิ
              </p>
            </div>

            {/* Principle 2: Dual Coding Theory */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs">
                2
              </div>
              <h3 className="font-black text-white text-sm">การเข้ารหัสสองทาง (Dual Coding)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                ผสานการมองเห็นตัวหนังสือ (Visual Code) เข้ากับปุ่มฟังเสียงอ่านเจ้าของภาษา (Acoustic Code) ช่วยให้สมองเก็บคำศัพท์ในหน่วยความจำระยะยาวได้มีประสิทธิภาพยิ่งขึ้น
              </p>
            </div>

            {/* Principle 3: Color Psychology */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-xs">
                3
              </div>
              <h3 className="font-black text-white text-sm">จิตวิทยาสีเชิงการศึกษา</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                <span className="text-emerald-400 font-bold">สีเขียวมรกต</span> สื่อถึงการเรียนรู้และความสำเร็จ, <span className="text-indigo-400 font-bold">สีน้ำเงินคราม</span> สื่อถึงการบริหารและความน่าเชื่อถือ, <span className="text-amber-400 font-bold">สีอำพัน</span> สื่อถึงการต้อนรับที่อบอุ่น
              </p>
            </div>

            {/* Principle 4: Zone of Proximal Development */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xs">
                4
              </div>
              <h3 className="font-black text-white text-sm">พื้นที่รอยต่อการเรียนรู้ (ZPD)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                การไต่ระดับ 100 ด่านคำศัพท์ O-NET อย่างเป็นขั้นเป็นตอน ไม่ง่ายจนน่าเบื่อและไม่ยากจนท้อแท้ พร้อมระบบเสริมแรงทันที (Immediate Feedback)
              </p>
            </div>

          </div>
        </section>

        {/* FOOTER CTA */}
        <section className="text-center py-6 border-t border-slate-800/80 space-y-3">
          <p className="text-xs text-slate-400">
            Vocab Journey Lite • นวัตกรรมการจัดการเรียนรู้ภาษาอังกฤษเพื่อโรงเรียนเครือข่ายและพันธมิตร
          </p>
          <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-500">
            <span>รร.บ้านโคกยาง</span>
            <span>•</span>
            <span>สพป.บุรีรัมย์ เขต 3</span>
            <span>•</span>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-indigo-400 hover:underline"
            >
              กลับหน้าระบบหลัก
            </button>
          </div>
        </section>

      </main>
    </div>
  );
}
