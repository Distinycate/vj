'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, LogIn } from 'lucide-react';
import CardManagementDashboard from '@/components/admin/CardManagementDashboard';

export default function CardTeacherDashboardPage() {
  const [teacher, setTeacher] = useState<any>(undefined);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vocab_journey_card_teacher');
      const parsed = saved ? JSON.parse(saved) : null;
      setTeacher(
        parsed && ['CARD_TEACHER', 'TEACHER', 'ADMIN'].includes(parsed.role)
          ? parsed
          : null,
      );
    } catch {
      setTeacher(null);
    }
  }, []);

  if (teacher === undefined) {
    return <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">กำลังตรวจสอบสิทธิ์ระบบการ์ด...</div>;
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center">
          <h1 className="text-2xl font-black">ยังไม่ได้เข้าสู่ระบบการ์ด</h1>
          <p className="text-slate-400 mt-2">บัญชีครูการ์ดแยกจากระบบแอดมินและระบบวิเคราะห์การเรียน</p>
          <button onClick={() => window.location.href = '/card-teacher'} className="w-full mt-6 py-3 bg-fuchsia-500 rounded-xl font-bold flex items-center justify-center gap-2">
            <LogIn className="w-5 h-5" /> สมัครหรือเข้าสู่ระบบการ์ด
          </button>
          <button onClick={() => window.location.href = '/'} className="w-full mt-2 py-3 bg-slate-800 rounded-xl font-bold flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> กลับหน้าเข้าใช้งานหลัก
          </button>
        </div>
      </div>
    );
  }

  return <CardManagementDashboard teacher={teacher} />;
}
