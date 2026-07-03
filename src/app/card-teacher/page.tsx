'use client';

import { useState } from 'react';
import { ArrowLeft, CreditCard, LogIn, UserPlus } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import { registerCardTeacher } from '@/utils/cardBattle';

export default function CardTeacherAccessPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) return setMessage('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
    if (mode === 'register' && !name.trim()) return setMessage('กรุณากรอกชื่อ-นามสกุล');
    setBusy(true);
    setMessage('');
    try {
      let teacher;
      if (mode === 'register') {
        teacher = await registerCardTeacher(name, username, password);
      } else {
        const { data, error } = await supabase
          .from('teachers')
          .select('id, name, username, role, is_active')
          .eq('username', username.trim().toLowerCase())
          .eq('password', password)
          .eq('is_active', true)
          .in('role', ['CARD_TEACHER', 'TEACHER', 'ADMIN'])
          .maybeSingle();
        if (error || !data) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีไม่มีสิทธิ์ระบบการ์ด');
        teacher = data;
      }
      localStorage.setItem('vocab_journey_card_teacher', JSON.stringify(teacher));
      window.location.href = '/admin/cards';
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ไม่สามารถเข้าใช้งานได้');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-fuchsia-500/20 rounded-3xl p-7 shadow-2xl">
        <div className="w-14 h-14 mx-auto bg-fuchsia-500/15 text-fuchsia-300 rounded-2xl flex items-center justify-center">
          <CreditCard className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black text-center mt-4">ระบบการ์ดสำหรับคุณครู</h1>
        <p className="text-sm text-slate-400 text-center mt-2">จัดการเหรียญ ตั๋ว การ์ด และบันทึกคุณลักษณะนักเรียนเท่านั้น</p>

        <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl mt-6">
          <button onClick={() => { setMode('login'); setMessage(''); }} className={`py-2.5 rounded-lg font-bold text-sm ${mode === 'login' ? 'bg-fuchsia-500' : 'text-slate-400'}`}>เข้าใช้งาน</button>
          <button onClick={() => { setMode('register'); setMessage(''); }} className={`py-2.5 rounded-lg font-bold text-sm ${mode === 'register' ? 'bg-fuchsia-500' : 'text-slate-400'}`}>สมัครครูใหม่</button>
        </div>

        {message && <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm">{message}</div>}

        <form onSubmit={submit} className="space-y-4 mt-5">
          {mode === 'register' && (
            <div>
              <label className="text-sm font-bold text-slate-300">ชื่อ-นามสกุลครู</label>
              <input value={name} onChange={(event) => setName(event.target.value)} className="w-full mt-1.5 bg-slate-950 border border-slate-700 rounded-xl p-3" placeholder="ชื่อที่ใช้แสดงในประวัติ" />
            </div>
          )}
          <div>
            <label className="text-sm font-bold text-slate-300">Username</label>
            <input value={username} onChange={(event) => setUsername(event.target.value)} className="w-full mt-1.5 bg-slate-950 border border-slate-700 rounded-xl p-3" />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-300">Password</label>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full mt-1.5 bg-slate-950 border border-slate-700 rounded-xl p-3" />
          </div>
          <button disabled={busy} className="w-full py-3.5 bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-50 rounded-xl font-black flex items-center justify-center gap-2">
            {mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            {busy ? 'กำลังดำเนินการ...' : mode === 'login' ? 'เข้าสู่ระบบการ์ด' : 'สมัครและเข้าสู่ระบบ'}
          </button>
          <button type="button" onClick={() => window.location.href = '/'} className="w-full py-3 bg-slate-800 rounded-xl font-bold text-slate-300 flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> กลับหน้าเข้าใช้งานหลัก
          </button>
        </form>
      </div>
    </div>
  );
}
