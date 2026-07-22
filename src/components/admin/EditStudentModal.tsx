import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, User } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';

export default function EditStudentModal({ 
  student, 
  onClose,
  onSave
}: { 
  student: any, 
  onClose: () => void,
  onSave: (updatedStudent: any) => void
}) {
  const [firstName, setFirstName] = useState(student.first_name || '');
  const [lastName, setLastName] = useState(student.last_name || '');
  const [gradeLevel, setGradeLevel] = useState(student.grade_level || 'ม.1');
  const [roomNumber, setRoomNumber] = useState(student.room_number || '1');
  const [studentId, setStudentId] = useState(student.student_id || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Fallback for older data that doesn't have first/last name
  useEffect(() => {
    if (!student.first_name && student.student_name) {
      const parts = student.student_name.split(' ');
      setFirstName(parts[0]);
      if (parts.length > 1) {
        setLastName(parts.slice(1).join(' '));
      }
    }
    
    // Fallback for grade_level from classroom
    if (!student.grade_level && student.classrooms?.class_name) {
       const cName = student.classrooms.class_name;
       if (cName.includes('/')) {
         const parts = cName.split('/');
         setGradeLevel(parts[0]);
         setRoomNumber(parts[1]);
       }
    }
  }, [student]);

  const handleSave = async () => {
    if (!firstName) return setError('กรุณากรอกชื่อจริง');
    
    setIsSaving(true);
    setError('');
    
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      
      const { data, error: updateError } = await supabase
        .from('students')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          student_name: fullName,
          grade_level: gradeLevel.trim(),
          room_number: roomNumber.trim(),
          student_id: studentId.trim()
        })
        .eq('id', student.id)
        .select()
        .single();
        
      if (updateError) throw updateError;
      
      onSave(data);
    } catch (err: any) {
      setError('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/20 p-2 rounded-xl">
              <User className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-xl font-black text-white">แก้ไขข้อมูลนักเรียน</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm font-bold">{error}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 text-xs font-bold block mb-1">ชื่อจริง</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" placeholder="สมชาย" />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-bold block mb-1">นามสกุล</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" placeholder="ใจดี" />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-slate-400 text-xs font-bold block mb-1">ระดับชั้น</label>
              <select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
                <option value="ป.1">ป.1</option>
                <option value="ป.2">ป.2</option>
                <option value="ป.3">ป.3</option>
                <option value="ป.4">ป.4</option>
                <option value="ป.5">ป.5</option>
                <option value="ป.6">ป.6</option>
                <option value="ม.1">ม.1</option>
                <option value="ม.2">ม.2</option>
                <option value="ม.3">ม.3</option>
                <option value="ม.4">ม.4</option>
                <option value="ม.5">ม.5</option>
                <option value="ม.6">ม.6</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs font-bold block mb-1">ห้อง</label>
              <input type="text" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" placeholder="1" />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-bold block mb-1">เลขที่</label>
              <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" placeholder="15" />
            </div>
          </div>
          
          <div className="pt-4 flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors">
              ยกเลิก
            </button>
            <button onClick={handleSave} disabled={isSaving} className="flex-1 py-3 rounded-xl font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
              <Save className="w-4 h-4" />
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
