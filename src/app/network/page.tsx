'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Globe2, 
  LogIn, 
  User, 
  ArrowRight, 
  School, 
  CheckCircle2, 
  Sparkles, 
  BookOpen, 
  UserPlus, 
  Award, 
  GraduationCap, 
  BrainCircuit, 
  ArrowLeft
} from 'lucide-react';

export default function NetworkHomePage() {
  const router = useRouter();
  
  // UI tab state for manuals
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-3 sm:p-6 relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/3 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-40 left-1/3 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="w-full max-w-6xl flex items-center justify-between py-4 mb-6 border-b border-slate-800/80 relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Globe2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-lg tracking-tight">VOCAB JOURNEY</span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-black text-xs border border-indigo-500/30 uppercase tracking-wider">
                Lite
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">สำหรับโรงเรียนเครือข่ายและพันธมิตร</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push('/')}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-xs sm:text-sm font-bold transition-all border border-slate-700/80 shadow-md flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4 text-indigo-400" />
          <span>กลับสู่หน้าระบบหลัก (Full Mode)</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-6xl relative z-10 space-y-10 pb-16">
        
        {/* HERO SECTION */}
        <section className="text-center space-y-4 pt-2 pb-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs sm:text-sm font-black tracking-wide">
            <Sparkles className="w-4 h-4 text-emerald-400" />
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

        {/* 3 DISTINCT ACTION PATHWAYS (LARGE, CLEAR, COGNITIVELY SOUND BUTTONS) */}
        <section className="space-y-5">
          <div className="text-center">
            <h2 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-1">
              Select Your Gateway • เลือกช่องทางเข้าใช้งาน
            </h2>
            <p className="text-sm sm:text-base text-slate-300 font-medium">
              เข้าสู่ระบบหรือสมัครใช้งานตามบทบาทของคุณเพื่อความสะดวกรวดเร็ว
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            
            {/* 1. Student Login Action Card */}
            <div className="glass-card bg-gradient-to-b from-emerald-950/40 via-slate-900/90 to-slate-950 border-2 border-emerald-500/30 hover:border-emerald-500/60 rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all shadow-xl shadow-emerald-950/20">
              <div className="space-y-3.5">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-md">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-black text-emerald-400 tracking-wider uppercase">สำหรับผู้เรียน</span>
                  <h3 className="text-2xl font-black text-white mt-1">เข้าสู่ระบบนักเรียน</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  สำหรับนักเรียนที่มีบัญชีที่ครูแจกให้ เข้าทำ Pre-test และฝึกคำศัพท์ 100 ด่าน พร้อมปุ่มฟังเสียงอ่าน
                </p>
                <div className="space-y-2 pt-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>คำถามแบบ 4 ตัวเลือก เข้าใจง่าย</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>มีปุ่มฟังเสียงอ่านคำศัพท์ (🔊 Audio)</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>ไม่ต้องสมัครสมาชิกเอง</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push('/network/login')}
                className="mt-7 w-full min-h-[58px] py-4 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2.5 hover:scale-[1.02]"
              >
                <LogIn className="w-5 h-5" />
                <span>เข้าสู่ระบบนักเรียน &rarr;</span>
              </button>
            </div>

            {/* 2. Teacher Login Action Card */}
            <div className="glass-card bg-gradient-to-b from-indigo-950/40 via-slate-900/90 to-slate-950 border-2 border-indigo-500/30 hover:border-indigo-500/60 rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all shadow-xl shadow-indigo-950/20">
              <div className="space-y-3.5">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shadow-md">
                  <School className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-black text-indigo-400 tracking-wider uppercase">สำหรับคุณครู</span>
                  <h3 className="text-2xl font-black text-white mt-1">เข้าสู่ระบบคุณครู</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  จัดการห้องเรียน สร้างและแจกบัญชีนักเรียน ติดตามความก้าวหน้ารายบุคคล และส่งออกรายงาน
                </p>
                <div className="space-y-2 pt-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2 text-indigo-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>แดชบอร์ดติดตามผล Real-time</span>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>สร้างบัญชีนักเรียนอัตโนมัติ 1 คลิก</span>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>ส่งออกข้อมูลผลคะแนน (Export CSV)</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push('/network/teacher?mode=login')}
                className="mt-7 w-full min-h-[58px] py-4 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-base transition-all shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2.5 hover:scale-[1.02]"
              >
                <LogIn className="w-5 h-5" />
                <span>เข้าสู่ระบบคุณครู &rarr;</span>
              </button>
            </div>

            {/* 3. Teacher Register Action Card */}
            <div className="glass-card bg-gradient-to-b from-amber-950/40 via-slate-900/90 to-slate-950 border-2 border-amber-500/30 hover:border-amber-500/60 rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all shadow-xl shadow-amber-950/20">
              <div className="space-y-3.5">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-md">
                  <UserPlus className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-black text-amber-400 tracking-wider uppercase">ครูใหม่ / ยังไม่มีบัญชี</span>
                  <h3 className="text-2xl font-black text-white mt-1">สมัครสมาชิกครูใหม่</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  เปิดใช้งานห้องเรียนสำหรับโรงเรียนของคุณได้ใน 1 นาที ฟรี ไม่มีค่าใช้จ่ายตลอดการใช้งาน
                </p>
                <div className="space-y-2 pt-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2 text-amber-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>สมัครฟรี ไม่ต้องรออนุมัติ</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>รองรับได้ทุกโรงเรียนในประเทศไทย</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>ไม่จำกัดจำนวนนักเรียนในห้อง</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push('/network/teacher?mode=register')}
                className="mt-7 w-full min-h-[58px] py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-base transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2.5 hover:scale-[1.02]"
              >
                <UserPlus className="w-5 h-5" />
                <span>สมัครสมาชิกครูใหม่ (ฟรี) &rarr;</span>
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
              <h2 className="text-2xl sm:text-3xl font-black text-white">ขั้นตอนและคู่มือการใช้งาน</h2>
            </div>

            {/* Toggle Tabs */}
            <div className="flex bg-slate-900 border border-slate-800 rounded-2xl p-1 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('student')}
                className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'student'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-4 h-4" />
                <span>วิธีใช้งานสำหรับนักเรียน</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('teacher')}
                className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'teacher'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <School className="w-4 h-4" />
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
                  <h3 className="text-lg sm:text-xl font-black text-white">วิธีใช้งานสำหรับนักเรียน (Student Journey Guide)</h3>
                  <p className="text-xs sm:text-sm text-slate-400">6 ขั้นตอนสู่การเป็นผู้พิชิตคำศัพท์ภาษาอังกฤษ O-NET</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-300 font-black text-xs flex items-center justify-center">1</div>
                  <h4 className="font-bold text-white text-sm">รับบัญชีจากคุณครู</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    กรอก Username และ Password ที่ได้รับจากคุณครู ในหน้าเข้าสู่ระบบนักเรียน (ไม่ต้องสมัครสมาชิกเอง)
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
                    ฝึกคำศัพท์ตามลำดับด่าน โดยเริ่มจากด่านที่ 1 ผ่านด่านแบบไม่มีสะดุด ประมวลผลไว
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

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => router.push('/network/login')}
                  className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-md flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>ไปที่หน้าเข้าสู่ระบบนักเรียน &rarr;</span>
                </button>
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
                  <h3 className="text-lg sm:text-xl font-black text-white">วิธีใช้งานสำหรับคุณครู (Teacher Workflow Guide)</h3>
                  <p className="text-xs sm:text-sm text-slate-400">4 ขั้นตอนการจัดการชั้นเรียนและประเมินผลผู้เรียน</p>
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
                  className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2"
                >
                  <School className="w-4 h-4" />
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

        {/* FOOTER */}
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
