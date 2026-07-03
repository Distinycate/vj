'use client';

import { useEffect, useState } from 'react';
import { Home, LogIn } from 'lucide-react';
import CardManagementDashboard from '@/components/admin/CardManagementDashboard';

export default function CardAdminPage() {
  const [teacher, setTeacher] = useState<any>(undefined);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vocab_journey_teacher');
      setTeacher(saved ? JSON.parse(saved) : null);
    } catch {
      setTeacher(null);
    }
  }, []);

  if (teacher === undefined) {
    return <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">กำลังเปิดระบบจัดการการ์ด...</div>;
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center">
          <h1 className="text-2xl font-black">กรุณาเข้าใช้งานในฐานะครู</h1>
          <p className="text-slate-400 mt-2">เข้าสู่ระบบจากหน้าแรก แล้วเลือกบทบาทครูผู้สอน</p>
          <button onClick={() => window.location.href = '/'} className="w-full mt-6 py-3 bg-indigo-500 rounded-xl font-bold flex items-center justify-center gap-2">
            <LogIn className="w-5 h-5" /> ไปหน้าเข้าใช้งาน
          </button>
          <button onClick={() => window.location.href = '/'} className="w-full mt-2 py-3 bg-slate-800 rounded-xl font-bold flex items-center justify-center gap-2">
            <Home className="w-5 h-5" /> หน้าแรก
          </button>
        </div>
      </div>
    );
  }

  return <CardManagementDashboard teacher={teacher} />;
}
