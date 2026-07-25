'use client';
import { useState } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import { useAppStore } from '@/store/useAppStore';

export default function StudentVerificationModal() {
  const { student, setStudent } = useAppStore();
  const [loading, setLoading] = useState(false);

  // Only show if logged in as student and not yet verified, and not a demo account
  if (!student || student.is_verified || student.is_demo_account) return null;

  const handleVerify = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('student_verify_account', {
        p_student_id: student.id
      });
      
      if (error) throw error;
      
      // Update local state so the modal disappears
      setStudent({ ...student, is_verified: true });
    } catch (err) {
      console.error('Failed to verify account:', err);
      alert('เกิดข้อผิดพลาดในการยืนยันตัวตน กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <div className="max-w-md w-full bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
        
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500"></div>

        <div className="mx-auto w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 border border-amber-500/30">
          <AlertTriangle className="w-10 h-10 text-amber-500" />
        </div>

        <h2 className="text-2xl font-black text-white mb-2">ยืนยันตัวตนของคุณ</h2>
        
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-6 text-left">
          <p className="text-sm text-slate-300 mb-2">
            พบว่ามีบัญชีนักเรียนซ้ำซ้อนในระบบเป็นจำนวนมาก เพื่อป้องกันการลบข้อมูลผิดพลาด กรุณายืนยันว่านี่คือบัญชีที่คุณใช้เรียนจริง
          </p>
          <p className="text-xs text-rose-400 font-bold">
            *คำเตือน: บัญชีที่ไม่มีการยืนยันตัวตน จะถูกพิจารณาว่าเป็นบัญชีขยะและจะถูกลบออกจากระบบโดยคุณครูในภายหลัง
          </p>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6">
          <p className="text-slate-400 text-sm mb-1">ข้อมูลบัญชีปัจจุบัน:</p>
          <p className="text-white font-bold text-lg">{student.student_name}</p>
          <p className="text-indigo-400 text-sm">Username: {student.username}</p>
        </div>

        <button 
          onClick={handleVerify}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white rounded-xl font-black text-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <CheckCircle className="w-6 h-6" /> ยืนยันว่านี่คือบัญชีหลักของฉัน
            </>
          )}
        </button>
      </div>
    </div>
  );
}
