'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Globe2, 
  LogIn, 
  Lock, 
  User, 
  ArrowRight, 
  ArrowLeft, 
  School, 
  HelpCircle, 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  Volume2 
} from 'lucide-react';
import { saveStudentSession } from '@/utils/studentSession';
import { useAppStore } from '@/store/useAppStore';

export default function NetworkStudentLoginPage() {
  const router = useRouter();
  const { setStudent, setProgress } = useAppStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showStudentGuide, setShowStudentGuide] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Harmonized ambient background glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-4">
        {/* Harmonized Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black mb-3">
            <Globe2 className="w-3.5 h-3.5" />
            <span>VOCAB JOURNEY • สำหรับโรงเรียนเครือข่าย</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">เข้าสู่ระบบนักเรียน</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            รับ Username และ Password จากคุณครู แล้วเข้าสู่ระบบเพื่อฝึกคำศัพท์
          </p>
        </div>

        {/* Quick Help Callout */}
        <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-2xl p-3.5 text-xs text-slate-300 space-y-2">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-indigo-200">นักเรียน:</strong> รับ Username และ Password จากคุณครู แล้วเข้าสู่ระบบเพื่อทำ Pre-test และฝึกคำศัพท์ 100 ด่าน
            </div>
          </div>
          <div className="flex items-start gap-2 pt-2 border-t border-indigo-500/10">
            <School className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed flex-1">
              <strong className="text-indigo-300">คุณครู:</strong> สมัครใช้งาน → สร้างห้องเรียน → สร้างบัญชีนักเรียน → ติดตามผล
            </div>
            <button
              type="button"
              onClick={() => router.push('/network/teacher')}
              className="text-indigo-400 hover:text-indigo-300 font-bold underline shrink-0"
            >
              สำหรับคุณครู &rarr;
            </button>
          </div>
        </div>

        {/* Harmonized Login Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium leading-relaxed">
              {error}
            </div>
          )}

          {/* Direct explanation inside login card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-300 space-y-1">
            <p className="font-bold text-indigo-300 flex items-center gap-1.5">
              <span>🔑 คำแนะนำการเข้าสู่ระบบ:</span>
            </p>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              นักเรียนไม่ต้องสมัครสมาชิกเอง ให้กรอก <strong>Username</strong> (เช่น <code className="text-indigo-300">st01</code>) และ <strong>Password</strong> ที่คุณครูแจกให้
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" /> ชื่อผู้ใช้ (Username)
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="เช่น st01 หรือชื่อผู้ใช้ที่ครูให้"
                disabled={isLoading}
                autoFocus
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" /> รหัสผ่าน (Password)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[52px] bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50 text-base"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>เข้าสู่ระบบนักเรียน (VJ Lite)</span>
                </>
              )}
            </button>
          </form>

          {/* Student Help Accordion Toggle */}
          <div className="pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowStudentGuide(!showStudentGuide)}
              className="w-full py-2 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-indigo-300 text-xs font-bold transition-all flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                <span>วิธีใช้งานสำหรับนักเรียน</span>
              </span>
              <span className="text-[11px] text-slate-400">
                {showStudentGuide ? '▲ ซ่อน' : '▼ ดูคำแนะนำ'}
              </span>
            </button>

            {showStudentGuide && (
              <div className="mt-3 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 space-y-2.5">
                <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>ขั้นตอนการเรียนรู้:</span>
                </div>
                <ol className="space-y-2 text-slate-300 list-none pl-0">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>กรอก Username และ Password ที่ได้รับจากคุณครู</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>ครั้งแรกที่เข้าสู่ระบบ ให้ทำแบบทดสอบก่อนเรียน (Pre-test)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>ฝึกคำศัพท์ตามลำดับด่าน โดยเริ่มจากด่านที่ 1 (กดปุ่ม 🔊 เพื่อฟังเสียงอ่านได้)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                    <span>แต่ละข้อให้เลือกคำตอบที่ถูกต้องจากคำถามแบบ 4 ตัวเลือก</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">5</span>
                    <span>สะสมดาวและผ่านด่านให้ครบ 100 ด่าน</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">6</span>
                    <span>เมื่อจบด่าน 100 ให้ทำแบบทดสอบหลังเรียน (Post-test) เพื่อดูผลพัฒนาการ</span>
                  </li>
                </ol>
              </div>
            )}
          </div>

          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => router.push('/network')}
              className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>หน้าหลัก VJ Lite</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/network/teacher')}
              className="py-2.5 px-3 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 hover:text-white border border-indigo-500/30 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <School className="w-3.5 h-3.5 text-indigo-400" />
              <span>สำหรับคุณครู &rarr;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
