'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Globe2, Loader2, LogIn, School } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import { saveStudentSession } from '@/utils/studentSession';

const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const generateExternalStudentId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'EXT-';
  for (let i = 0; i < 8; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function NetworkRegisterPage() {
  const router = useRouter();
  const { setStudent, setProgress } = useAppStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Register State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('ม.1');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('vj_saved_guest');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.username) setLoginUsername(parsed.username);
        if (parsed.password) setLoginPassword(parsed.password);
        setRememberMe(true);
      } catch (e) {}
    }
  }, []);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setError('กรุณากรอก Username และ Password');
      return;
    }
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('username', loginUsername.trim())
        .eq('password', loginPassword.trim())
        .eq('user_type', 'EXTERNAL')
        .maybeSingle();

      if (studentError || !studentData) {
        throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือไม่ใช่บัญชีเครือข่ายภายนอก');
      }

      if (rememberMe) {
        localStorage.setItem('vj_saved_guest', JSON.stringify({ username: loginUsername.trim(), password: loginPassword.trim() }));
      } else {
        localStorage.removeItem('vj_saved_guest');
      }

      const { data: progressData } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('student_id', studentData.id)
        .single();

      const guestProgress = {
        ...progressData,
        pretest_date: new Date().toISOString(),
      };

      setStudent(studentData);
      setProgress(guestProgress);
      saveStudentSession(studentData);
      setMessage('เข้าสู่ระบบสำเร็จ กำลังเข้าสู่ Dashboard...');
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !schoolName.trim() || !username.trim() || !password.trim()) {
      setError('กรุณากรอกชื่อ โรงเรียน Username และ Password ให้ครบถ้วน');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const normalizedUsername = username.trim();
      const { data: existingUser } = await supabase
        .from('students')
        .select('id')
        .eq('username', normalizedUsername)
        .maybeSingle();

      if (existingUser) {
        throw new Error('Username นี้ถูกใช้งานแล้ว กรุณาใช้ชื่ออื่น');
      }

      const newStudentUuid = generateUUID();
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      let studentData = null;
      let lastError: any = null;

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        const candidateStudentId = generateExternalStudentId();
        const { data: insertedStudent, error: insertError } = await supabase
          .from('students')
          .insert([{
            id: newStudentUuid,
            student_id: candidateStudentId,
            student_name: fullName,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            grade_level: gradeLevel,
            room_number: null,
            username: normalizedUsername,
            password: password.trim(),
            classroom_id: null,
            academic_year: new Date().getFullYear().toString(),
            user_type: 'EXTERNAL',
            school_name: schoolName.trim(),
            is_verified: true,
            is_active: true,
          }])
          .select()
          .single();

        if (!insertError && insertedStudent) {
          studentData = insertedStudent;
          break;
        }

        lastError = insertError;
        if (insertError?.code === '23505' && insertError.message.includes('student_id')) {
          continue;
        }
        if (insertError?.code === '23505' && insertError.message.includes('username')) {
          throw new Error('Username นี้ถูกใช้งานแล้ว กรุณาใช้ชื่ออื่น');
        }
        throw insertError;
      }

      if (!studentData) {
        throw lastError || new Error('ไม่สามารถสร้างบัญชีเครือข่ายภายนอกได้ กรุณาลองใหม่');
      }

      const { data: progressData, error: progressError } = await supabase
        .from('learning_paths')
        .insert([{
          student_id: studentData.id,
          current_rank: 1,
          current_stage: 1,
          coins: 0,
          exp: 0,
          total_exp: 0,
          free_pull_tickets: 0,
        }])
        .select()
        .single();

      if (progressError) throw progressError;

      await supabase.from('analytics_summary').upsert({
        student_id: studentData.id,
        pretest_score: 0,
        posttest_score: 0,
        learning_gain: 0,
        normalized_gain: 0,
        success_rate: 0,
        attempt_count: 0,
        total_time_on_task_sec: 0,
      }, { onConflict: 'student_id' });

      const guestProgress = {
        ...progressData,
        pretest_date: new Date().toISOString(),
      };

      if (rememberMe) {
        localStorage.setItem('vj_saved_guest', JSON.stringify({ username: normalizedUsername, password: password.trim() }));
      }

      setStudent(studentData);
      setProgress(guestProgress);
      saveStudentSession(studentData);
      setMessage('สมัครเครือข่ายภายนอกสำเร็จ กำลังเข้าสู่ Dashboard...');
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'สมัครใช้งานไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 safe-bottom">
      <div className="max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="min-h-11 inline-flex items-center gap-2 text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 font-bold text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> กลับหน้าเข้าใช้งาน
        </button>

        <div className="mt-6 bg-slate-900/70 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
              <Globe2 className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-black tracking-widest text-cyan-300 uppercase">External School Network</p>
              <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">สมัครใช้งานสำหรับโรงเรียนเครือข่าย</h1>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                บัญชีนี้เป็น Guest สำหรับเผยแพร่นวัตกรรม ใช้ฝึกด่าน 1–100 และดูสถิติส่วนตัว โดยไม่เข้าร่วม Team Battle, Leaderboard, Event หรือระบบการ์ดของโรงเรียนบ้านโคกยาง
              </p>
            </div>
          </div>

          <div className="flex bg-slate-950/80 border border-slate-800 rounded-2xl p-1 mb-6">
            <button 
              onClick={() => { setMode('login'); setError(''); setMessage(''); }}
              className={`flex-1 min-h-11 py-2.5 rounded-xl font-bold transition-all ${mode === 'login' ? 'bg-cyan-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              เข้าสู่ระบบ Guest
            </button>
            <button 
              onClick={() => { setMode('register'); setError(''); setMessage(''); }}
              className={`flex-1 min-h-11 py-2.5 rounded-xl font-bold transition-all ${mode === 'register' ? 'bg-cyan-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              สมัครสมาชิกใหม่
            </button>
          </div>

          {error && <div className="mb-5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl p-4 text-sm">{error}</div>}
          {message && <div className="mb-5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-2xl p-4 text-sm">{message}</div>}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-300 block mb-1.5">Username</label>
                <input value={loginUsername} onChange={(event) => setLoginUsername(event.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white" placeholder="สำหรับเข้าสู่ระบบ" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-300 block mb-1.5">Password</label>
                <input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white" placeholder="รหัสผ่าน" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900" />
                <span className="text-slate-400 text-sm font-medium hover:text-white transition-colors">จดจำรหัสผ่าน</span>
              </label>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-12 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                เข้าสู่ระบบ Guest
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold text-slate-300 block mb-1.5">ชื่อจริง</label>
                <input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white" placeholder="ชื่อ" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-300 block mb-1.5">นามสกุล</label>
                <input value={lastName} onChange={(event) => setLastName(event.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white" placeholder="นามสกุล" />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-300 block mb-1.5">ชื่อโรงเรียน</label>
              <div className="relative">
                <School className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                <input value={schoolName} onChange={(event) => setSchoolName(event.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white" placeholder="เช่น โรงเรียนเครือข่าย..." />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-300 block mb-1.5">ระดับชั้น</label>
              <select value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white">
                {['ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'].map((grade) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold text-slate-300 block mb-1.5">Username</label>
                <input value={username} onChange={(event) => setUsername(event.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white" placeholder="สำหรับเข้าสู่ระบบ" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-300 block mb-1.5">Password</label>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white" placeholder="รหัสผ่าน" />
              </div>
            </div>

              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900" />
                <span className="text-slate-400 text-sm font-medium hover:text-white transition-colors">จดจำรหัสผ่านเข้าสู่ระบบในครั้งหน้า</span>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-12 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                สมัครและเข้าสู่ระบบ Guest
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
