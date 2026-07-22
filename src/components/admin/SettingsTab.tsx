'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Settings, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function SettingsTab({ teacher }: { teacher: any }) {
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadSettings() {
      // Fetch the first school in the system to manage global settings
      const { data, error } = await supabase.from('schools').select('id, is_registration_open').limit(1).single();
      
      if (data) {
        setSchoolId(data.id);
        setIsRegistrationOpen(data.is_registration_open !== false); // default true
      }
    }
    loadSettings();
  }, []);

  const handleToggleRegistration = async () => {
    if (!schoolId) return;
    setIsSaving(true);
    setMessage('');
    
    try {
      const newValue = !isRegistrationOpen;
      const { error } = await supabase
        .from('schools')
        .update({ is_registration_open: newValue })
        .eq('id', schoolId);
        
      if (error) throw error;
      
      setIsRegistrationOpen(newValue);
      setMessage(newValue ? 'เปิดระบบลงทะเบียนเรียบร้อยแล้ว' : 'ปิดระบบลงทะเบียนเรียบร้อยแล้ว');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
          <div className="bg-indigo-500/20 p-2.5 rounded-xl">
            <Settings className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">ตั้งค่าระบบ (System Settings)</h2>
            <p className="text-sm text-slate-400">จัดการการตั้งค่าต่างๆ ของระบบ Vocab Journey</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Registration Setting */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-bold flex items-center gap-2">
                สถานะการลงทะเบียนนักเรียนใหม่
                {isRegistrationOpen ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">เปิดใช้งาน</span>
                ) : (
                  <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/30">ปิดการใช้งาน</span>
                )}
              </h3>
              <p className="text-slate-400 text-sm mt-1">
                หากเปิดระบบ นักเรียนจะสามารถเข้าสู่หน้าลงทะเบียนและสร้างบัญชีใหม่ได้เอง หากมีปัญหา ID ขยะให้ปิดไว้
              </p>
            </div>
            
            <button
              onClick={handleToggleRegistration}
              disabled={isSaving || !schoolId}
              className={`px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition-all min-w-[140px] ${
                isRegistrationOpen 
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20' 
                  : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/20'
              } disabled:opacity-50`}
            >
              {isSaving ? 'กำลังบันทึก...' : isRegistrationOpen ? 'ปิดรับลงทะเบียน' : 'เปิดรับลงทะเบียน'}
            </button>
          </div>
          
          {message && (
            <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 ${
              message.includes('ข้อผิดพลาด') ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              {message.includes('ข้อผิดพลาด') ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
