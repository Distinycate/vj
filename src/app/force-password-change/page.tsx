'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';

export default function ForcePasswordChange() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if user has the active session requiring change
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated) {
          router.push('/');
        } else if (!data.requires_password_change) {
          router.push('/'); // Already changed or not required
        } else {
          setValidSession(true);
        }
      })
      .catch(() => router.push('/'))
      .finally(() => setChecking(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }
    if (password.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (['1234', '123456'].includes(password)) {
      setError('ไม่สามารถใช้รหัสผ่านที่เดาง่ายได้ กรุณาตั้งรหัสผ่านใหม่');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
      }

      // Success, redirect back to root so they can enter their dashboard properly
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'ระบบขัดข้อง กรุณาลองใหม่');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-fuchsia-500 animate-spin" />
      </div>
    );
  }

  if (!validSession) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-fuchsia-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent"></div>
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-fuchsia-500/20 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-amber-500/50">
            <AlertTriangle size={32} />
          </div>
          <h1 className="text-2xl font-bold text-center">ต้องเปลี่ยนรหัสผ่าน</h1>
          <p className="text-slate-400 text-center text-sm mt-2">
            รหัสผ่านปัจจุบันของคุณไม่ปลอดภัยและเดาง่ายเกินไป เพื่อความปลอดภัยของบัญชี กรุณาตั้งรหัสผ่านใหม่
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300 ml-1">รหัสผ่านใหม่ (New Password)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-slate-500" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition-all outline-none"
                placeholder="อย่างน้อย 6 ตัวอักษร"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300 ml-1">ยืนยันรหัสผ่าน (Confirm Password)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-slate-500" />
              </div>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition-all outline-none"
                placeholder="พิมพ์รหัสผ่านอีกครั้ง"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all shadow-[0_0_20px_rgba(192,38,211,0.3)] hover:shadow-[0_0_30px_rgba(192,38,211,0.5)] flex justify-center items-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                อัปเดตรหัสผ่าน <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
