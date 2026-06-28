'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/utils/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const { student, setStudent, setProgress } = useAppStore();
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) return setError('กรุณากรอกรหัสนักเรียน');
    setIsLoading(true);
    setError('');

    try {
      // Check if student exists
      let { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found

      // Auto-register if not found and name is provided
      if (!data) {
        if (!studentName.trim()) {
           setIsLoading(false);
           return setError('ไม่พบรหัสนักเรียนนี้ หากเป็นนักเรียนใหม่ กรุณากรอกชื่อด้วยครับ');
        }
        
        const { data: newData, error: insertError } = await supabase
          .from('students')
          .insert([{ student_id: studentId, student_name: studentName }])
          .select()
          .single();
          
        if (insertError) throw insertError;
        data = newData;
        
        // Init progress
        await supabase.from('progress_summary').insert([{ student_id: data.id }]);
      }

      // Fetch progress
      const { data: progressData } = await supabase
        .from('progress_summary')
        .select('*')
        .eq('student_id', data.id)
        .single();

      setStudent(data);
      setProgress(progressData || { current_rank: 1, current_stage: 1 });
      
    } catch (err: any) {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsLoading(false);
    }
  };

  if (student) {
    return <Dashboard />;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/20 rounded-full mix-blend-screen filter blur-[128px]"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/20 rounded-full mix-blend-screen filter blur-[128px]"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/10 backdrop-blur-2xl border border-white/20 p-8 rounded-3xl w-full max-w-md shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 mb-2">
            Vocab Journey
          </h1>
          <p className="text-slate-400">เข้าสู่ระบบเพื่อเริ่มการผจญภัย</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-slate-300 text-sm mb-1 block">รหัสนักเรียน</label>
            <input 
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="เช่น 12345"
            />
          </div>
          
          <div>
            <label className="text-slate-300 text-sm mb-1 block">ชื่อ-นามสกุล (สำหรับคนเข้าครั้งแรก)</label>
            <input 
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="กรอกชื่อหากยังไม่มีบัญชี"
            />
          </div>

          {error && <p className="text-rose-400 text-sm text-center">{error}</p>}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold py-4 rounded-xl shadow-lg mt-4 transition-all disabled:opacity-50"
          >
            {isLoading ? 'กำลังโหลด...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
