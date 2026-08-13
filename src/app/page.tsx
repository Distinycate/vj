'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import Dashboard from '@/components/Dashboard';
import StudyCamp from '@/components/StudyCamp';
import Game from '@/components/Game';
import PreTest from '@/components/PreTest';
import PostTest from '@/components/PostTest';
import { saveStudentSession } from '@/utils/studentSession';
import { useDemoStore } from '@/store/useDemoStore';

const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const generateRandomStudentId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ST-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const fetchRegistrationOpen = async () => {
  const { data, error } = await supabase
    .from('schools')
    .select('is_registration_open')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('Unable to read registration status:', error.message);
    return true;
  }

  return data?.is_registration_open !== false;
};

export default function Home() {
  const router = useRouter();
  const { student, progress, setStudent, setProgress, currentScreen } = useAppStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        },
        (err) => {
          console.log('ServiceWorker registration failed: ', err);
        }
      );
    }
  }, []);

  // Login State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // Register State
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regGrade, setRegGrade] = useState('ม.1');
  const [regRoom, setRegRoom] = useState('1');
  const [regStudentId, setRegStudentId] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regYear, setRegYear] = useState(new Date().getFullYear().toString());

  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);

  useEffect(() => {
    async function checkRegistration() {
      const isOpen = await fetchRegistrationOpen();
      setIsRegistrationOpen(isOpen);
    }
    checkRegistration();

    const savedUser = localStorage.getItem('vj_saved_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.username) setLoginUsername(parsed.username);
        if (parsed.password) setLoginPassword(parsed.password);
        if (parsed.role) setLoginRole(parsed.role);
        setRememberMe(true);
      } catch (e) {}
    }
  }, []);
  const [loginRole, setLoginRole] = useState<'student' | 'teacher' | 'executive'>('student');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) return setError('กรุณากรอก Username และ Password');
    setIsLoading(true);
    setError('');

    try {
      if (loginRole === 'student') {
        // Intercept demo.judge
        if (loginUsername.trim().toLowerCase() === 'demo.judge') {
          useDemoStore.getState().startDemo();
          const demoStore = useDemoStore.getState();
          setStudent(demoStore.demoStudent);
          saveStudentSession(demoStore.demoStudent);
          setProgress(demoStore.demoProgress);
          return;
        }

        // 1. Authenticate student by querying the students table directly
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('username', loginUsername.trim())
          .eq('password', loginPassword.trim())
          .maybeSingle();

        if (studentError || !studentData) {
          throw new Error('ชื่อผู้ใช้หรือรหัสผ่านนักเรียนไม่ถูกต้อง');
        }

        // 2. Fetch learning path progression
        const { data: progressData } = await supabase
          .from('learning_paths')
          .select('*')
          .eq('student_id', studentData.id)
          .single();

        // 3. Fetch pre-test record count and latest attempt date
        const { data: pretestList, count: pretestCount } = await supabase
          .from('pre_tests')
          .select('created_at', { count: 'exact' })
          .eq('student_id', studentData.id)
          .order('created_at', { ascending: false });

        const hasCompleted5Pretests = pretestCount !== null && pretestCount >= 5;
        const pretestDate = studentData.user_type === 'EXTERNAL'
          ? new Date().toISOString()
          : hasCompleted5Pretests && pretestList && pretestList.length > 0 ? pretestList[0].created_at : null;

        if (rememberMe) {
          localStorage.setItem('vj_saved_user', JSON.stringify({ username: loginUsername.trim(), password: loginPassword.trim(), role: loginRole }));
        } else {
          localStorage.removeItem('vj_saved_user');
        }

        setStudent(studentData);
        saveStudentSession(studentData);
        setProgress({ 
          ...progressData, 
          pretest_date: pretestDate 
        });
      } else {
        // Authenticate teacher/executive directly
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select('*')
          .ilike('username', loginUsername.trim())
          .eq('password', loginPassword.trim())
          .limit(1)
          .maybeSingle();

        if (teacherError || !teacherData) {
          throw new Error('ชื่อผู้ใช้หรือรหัสผ่านเจ้าหน้าที่ไม่ถูกต้อง');
        }

        if (loginRole === 'teacher') {
          if (rememberMe) {
            localStorage.setItem('vj_saved_user', JSON.stringify({ username: loginUsername.trim(), password: loginPassword.trim(), role: loginRole }));
          } else {
            localStorage.removeItem('vj_saved_user');
          }
          if (teacherData.role === 'CARD_TEACHER') {
            localStorage.setItem('vocab_journey_card_teacher', JSON.stringify(teacherData));
            window.location.href = '/card-teacher/dashboard';
            return;
          }
          if (teacherData.role !== 'TEACHER' && teacherData.role !== 'ADMIN') {
            throw new Error('บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานระบบครูผู้สอน');
          }
          localStorage.setItem('vocab_journey_teacher', JSON.stringify(teacherData));
          window.location.href = '/admin';
        } else if (loginRole === 'executive') {
          if (rememberMe) {
            localStorage.setItem('vj_saved_user', JSON.stringify({ username: loginUsername.trim(), password: loginPassword.trim(), role: loginRole }));
          } else {
            localStorage.removeItem('vj_saved_user');
          }
          if (teacherData.role !== 'EXECUTIVE' && teacherData.role !== 'ADMIN') {
            throw new Error('บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานระบบผู้บริหาร');
          }
          localStorage.setItem('vocab_journey_executive', JSON.stringify(teacherData));
          window.location.href = '/executive';
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!isRegistrationOpen) return setError('ระบบปิดรับลงทะเบียนชั่วคราว กรุณาติดต่อคุณครู');
    if (!regFirstName || !regLastName || !regGrade || !regRoom || !regUsername || !regPassword) {
      return setError('กรุณากรอกข้อมูลให้ครบถ้วน');
    }
    setIsLoading(true);
    setError('');
    
    const fullName = `${regFirstName.trim()} ${regLastName.trim()}`;

    try {
      const latestRegistrationOpen = await fetchRegistrationOpen();
      setIsRegistrationOpen(latestRegistrationOpen);
      if (!latestRegistrationOpen) {
        throw new Error('ระบบปิดรับลงทะเบียนชั่วคราว กรุณาติดต่อคุณครู');
      }

      // 0. Check for duplicate username first to give a friendly error
      const { data: existingUser } = await supabase
        .from('students')
        .select('id')
        .eq('username', regUsername.trim())
        .maybeSingle();

      if (existingUser) {
        throw new Error('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาใช้ชื่ออื่น');
      }

      // 1. Resolve Classroom dynamically
      const gradeStr = regGrade.trim();
      const roomStr = regRoom.trim();
      const className = `${gradeStr}/${roomStr}`;
      let classroomId = null;

      const { data: existingClass } = await supabase
        .from('classrooms')
        .select('id')
        .eq('class_name', className)
        .maybeSingle();

      if (existingClass) {
        classroomId = existingClass.id;
      } else {
        const { data: newClass, error: classError } = await supabase
          .from('classrooms')
          .insert([{ class_name: className, grade_level: gradeStr, room_number: roomStr }])
          .select()
          .single();
        if (classError) throw classError;
        if (newClass) classroomId = newClass.id;
      }

      // 2. Insert Student with Retry Logic for Unique Constraints
      const newStudentUuid = generateUUID();
      let studentData = null;
      let isRegistered = false;
      let lastError = null;

      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          const candidateStudentId = generateRandomStudentId();
          
          const { data: insertedStudent, error: studentError } = await supabase
            .from('students')
            .insert([{ 
              id: newStudentUuid,
              student_id: candidateStudentId,
              student_name: fullName,
              first_name: regFirstName.trim(),
              last_name: regLastName.trim(),
              grade_level: gradeStr,
              room_number: roomStr,
              username: regUsername.trim(),
              password: regPassword.trim(),
              classroom_id: classroomId,
              academic_year: regYear.trim()
            }])
            .select()
            .single();

          if (studentError) {
            // Check if it's a unique constraint violation (code 23505)
            if (studentError.code === '23505' || studentError.message.includes('duplicate key')) {
              // If the duplicate is on username, break immediately because a random student_id won't fix it
              if (studentError.message.includes('username')) {
                throw new Error('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาใช้ชื่ออื่น');
              }
              lastError = studentError;
              continue; // Try next iteration with new random ID
            }
            throw studentError; // Other errors, break loop and fail
          }

          studentData = insertedStudent;
          isRegistered = true;
          break; // Success! Exit loop

        } catch (err: any) {
          if (err.message === 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาใช้ชื่ออื่น') throw err;
          lastError = err;
          // If it's not a known unique constraint error, we probably shouldn't retry
          if (err.code !== '23505') throw err;
        }
      }

      if (!isRegistered || !studentData) {
        throw new Error('ไม่สามารถสร้างบัญชีได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
      }

      // 3. Initialize Learning Path with basic stats
      const { data: progressData, error: progressError } = await supabase
        .from('learning_paths')
        .insert([{
          student_id: studentData.id,
          current_rank: 1,
          current_stage: 1,
          coins: 0,
          exp: 0
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

      // Auto-login after register
      setStudent(studentData);
      saveStudentSession(studentData);
      setProgress(progressData);
      
    } catch (err: any) {
      console.error(err);
      
      // Log error to registration_logs if possible (don't block UI if this fails)
      supabase.from('registration_logs').insert([{
        username: regUsername.trim(),
        error_code: err.code || 'UNKNOWN',
        error_message: err.message,
        device_info: navigator.userAgent
      }]).then(() => {}, () => {});

      setError(err.message || 'ข้อมูลนี้มีอยู่ในระบบแล้ว หรือเกิดข้อผิดพลาด');
    } finally {
      setIsLoading(false);
    }
  };

  // If user is authenticated, redirect to App
  if (student) {
    if (!progress?.pretest_date) return <PreTest />;
    if (currentScreen === 'dashboard') return <Dashboard />;
    if (currentScreen === 'study') return <StudyCamp />;
    if (currentScreen === 'game') return <Game />;
    if (currentScreen === 'posttest') return <PostTest />;
    return <Dashboard />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-start xl:items-center justify-center p-3 sm:p-4 safe-bottom relative overflow-x-hidden overflow-y-auto">


      {/* Ambient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full mix-blend-screen filter blur-[128px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full mix-blend-screen filter blur-[128px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-7xl grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-4 sm:gap-6 items-start">
        <motion.section
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          className="order-2 xl:order-1 glass-card p-4 sm:p-8 rounded-3xl shadow-2xl border border-emerald-500/10 xl:max-h-[95vh] xl:overflow-y-auto mobile-scroll-panel"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-black tracking-widest uppercase mb-5">
            🌟 Active Learning Innovation
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4 break-words">
            Vocab Journey: ก้าวข้ามขีดจำกัดการท่องจำ
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-300 to-blue-300">
              สู่นวัตกรรมการเรียนรู้แห่งศตวรรษที่ 21
            </span>
          </h1>
          <div className="space-y-4 text-slate-300 leading-relaxed text-sm sm:text-base">
            <p>
              ภาษาอังกฤษคือหน้าต่างสู่โอกาสที่ไร้ขีดจำกัด แต่อุปสรรคสำคัญที่ทำให้นักเรียนหลายคนไปไม่ถึงเป้าหมาย
              คือข้อจำกัดด้าน “คลังคำศัพท์” การท่องจำจากหน้ากระดาษแบบเดิมมักทำให้เกิดความเบื่อหน่ายและลืมเลือนอย่างรวดเร็ว
            </p>
            <p>
              <strong className="text-white">Vocab Journey</strong> จึงไม่ได้เป็นเพียงแพลตฟอร์มเกมออนไลน์ แต่คือ
              <strong className="text-emerald-300"> นวัตกรรมการจัดการเรียนรู้เชิงรุก (Active Learning)</strong>
              ที่สร้างขึ้นเพื่อยกระดับทักษะภาษาอังกฤษของนักเรียนโรงเรียนบ้านโคกยาง และเตรียมความพร้อมสู่การทดสอบระดับชาติ (O-NET)
              อย่างเป็นระบบ
            </p>
            <p>
              ทุกฟังก์ชันถูกออกแบบบนฐานจิตวิทยาการศึกษาและทฤษฎีการเรียนรู้ เพื่อให้ “ทุกนาทีแห่งความสนุก”
              เป็นทุกนาทีแห่งการพัฒนาศักยภาพอย่างแท้จริง
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-7">
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-lg font-black text-white mb-2">🎯 เรียนรู้ในจังหวะของตัวเอง</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                ระบบ Adaptive Rank อิงแนวคิด ZPD ช่วยปรับความยากให้พอดีกับผู้เรียน ไม่ยากจนท้อ และไม่ง่ายจนน่าเบื่อ
                เพื่อพาเข้าสู่สภาวะ Flow State ที่พร้อมเรียนรู้อย่างมีสมาธิ
              </p>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-lg font-black text-white mb-2">🧠 จำระยะยาวด้วย SRS</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                คำที่ตอบผิดไม่ใช่ความล้มเหลว แต่คือข้อมูลเรียนรู้ ระบบจะบันทึกคำที่ควรทบทวน
                และดึงกลับมาในจังหวะที่เหมาะสมตามแนวคิด Ebbinghaus Forgetting Curve
              </p>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-lg font-black text-white mb-2">🌍 ทักษะแห่งศตวรรษที่ 21</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Context MC ฝึก Critical Thinking, Team Battle ฝึก Collaboration และ Dashboard ช่วยสะท้อนข้อมูลให้ผู้เรียนกำกับตนเอง
                แบบ Self-Directed Learning
              </p>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-lg font-black text-white mb-2">⚔️ เปลี่ยนการท่องจำเป็นการผจญภัย</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                คลังคำศัพท์ มินิเกม ด่านบอส ระบบดาว ทีม และการ์ดเวทมนตร์ ช่วยเปลี่ยนการฝึกคำศัพท์ O-NET
                ให้เป็นประสบการณ์ที่สนุก วัดผลได้ และต่อเนื่อง
              </p>
            </div>
          </div>

          <div className="mt-7 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-4 sm:p-5">
            <h2 className="text-xl font-black text-white mb-3">👨‍🏫 ประวัติและข้อมูลผู้จัดทำนวัตกรรม</h2>
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <p className="text-xs font-black text-indigo-300 uppercase tracking-widest">Innovator Profile</p>
                  <h3 className="text-2xl font-black text-white mt-2">นายณัฐภัทร พรมปรุ</h3>
                  <p className="text-slate-400 text-sm mt-1">Mr. Nattapat Prompru</p>
                </div>
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-200 font-bold">
                  ตำแหน่ง: ครู
                </div>
              </div>
              <div className="mt-4 text-sm text-slate-300 leading-relaxed">
                <span className="font-bold text-white">สถานที่ทำงาน:</span> โรงเรียนบ้านโคกยาง สังกัดสำนักงานเขตพื้นที่การศึกษาประถมศึกษาบุรีรัมย์ เขต 3
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
                <h3 className="font-black text-white mb-3">🎓 ประวัติการศึกษา (Education)</h3>
                <div className="space-y-3 text-sm text-slate-400 leading-relaxed">
                  <p><span className="font-bold text-indigo-300">ปริญญาโท:</span> ศึกษาศาสตรมหาบัณฑิต สาขาวิชาการบริหารการศึกษา มหาวิทยาลัยวงษ์ชวลิตกุล</p>
                  <p><span className="font-bold text-indigo-300">ปริญญาโท:</span> ศิลปศาสตรมหาบัณฑิต สาขาวิชาภาษาอังกฤษ มหาวิทยาลัยราชภัฏบุรีรัมย์</p>
                  <p><span className="font-bold text-indigo-300">ปริญญาตรี:</span> ครุศาสตรบัณฑิต สาขาวิชาภาษาอังกฤษ มหาวิทยาลัยราชภัฏบุรีรัมย์</p>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
                <h3 className="font-black text-white mb-3">📌 บทบาทและหน้าที่รับผิดชอบ</h3>
                <div className="space-y-3 text-sm text-slate-400 leading-relaxed">
                  <p><span className="font-bold text-emerald-300">ด้านการจัดการเรียนรู้:</span> ผู้สอนกลุ่มสาระการเรียนรู้ภาษาต่างประเทศ (ภาษาอังกฤษ) และผู้รับผิดชอบการออกแบบแผนขับเคลื่อนเพื่อยกระดับผลสัมฤทธิ์ทางการทดสอบระดับชาติ (O-NET) สำหรับนักเรียนระดับชั้นมัธยมศึกษาตอนต้น</p>
                  <p><span className="font-bold text-emerald-300">ด้านการบริหารจัดการ:</span> ปฏิบัติหน้าที่หัวหน้างานบริหารงานบุคคล (Head of Personnel Administration) โรงเรียนบ้านโคกยาง</p>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
              <h3 className="font-black text-white mb-3">💡 ความสนใจทางวิชาการ (Academic Interests)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 text-slate-400 leading-relaxed">
                  การออกแบบการจัดการเรียนรู้เชิงรุก (Active Learning) และการจัดการเรียนรู้โดยใช้โครงงานเป็นฐาน (Project-Based Learning - PBL)
                </div>
                <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 text-slate-400 leading-relaxed">
                  การประยุกต์ใช้จิตวิทยาการศึกษาและเทคโนโลยีเกมมิฟิเคชัน (Gamification & EdTech) เพื่อพัฒนาผลสัมฤทธิ์ของผู้เรียน
                </div>
                <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 text-slate-400 leading-relaxed">
                  การบริหารการศึกษาและการขับเคลื่อนคุณภาพสถานศึกษาด้วยวงจรคุณภาพ (PDCA)
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7 text-center bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-3xl p-5">
            <p className="text-white font-black text-lg">พร้อมหรือยัง... ที่จะเปลี่ยนการท่องจำให้เป็นการผจญภัย?</p>
            <p className="text-slate-400 text-sm mt-2">
              คลิกปุ่ม “สมัครสมาชิก/เข้าสู่ระบบ” ด้านบนเพื่อเริ่มต้นการเดินทาง และก้าวสู่การเป็นผู้พิชิตโอเน็ต (O-NET Conqueror) ไปด้วยกัน
            </p>
            <button 
              onClick={() => {
                const loginPanel = document.getElementById('login-panel');
                if (loginPanel) {
                  loginPanel.scrollIntoView({ behavior: 'smooth' });
                } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="mt-5 xl:hidden inline-block w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-black py-4 rounded-xl shadow-lg transition-all transform active:scale-95"
            >
              ขึ้นไปเข้าสู่ระบบ / สมัครสมาชิก 🚀
            </button>
          </div>
        </motion.section>

      <motion.div 
        id="login-panel"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="order-1 xl:order-2 glass-card p-4 sm:p-8 rounded-3xl w-full max-w-md shadow-2xl xl:max-h-[95vh] xl:overflow-y-auto xl:sticky xl:top-4 justify-self-center mobile-scroll-panel"
      >
        <div className="text-center mb-6">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 mb-2">
            Vocab Journey
          </h1>
          <p className="text-slate-400 font-medium">ระบบประเมินและฝึกทักษะคำศัพท์อัจฉริยะ</p>
          <p className="mt-2 text-xs font-bold text-emerald-300 xl:hidden">
            เข้าสู่ระบบหรือสมัครสมาชิกได้จากกล่องนี้
          </p>
        </div>

        <div className="flex bg-slate-950/80 border border-slate-800 rounded-2xl p-1 mb-6">
          <button 
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 min-h-11 py-2.5 rounded-xl font-bold transition-all ${mode === 'login' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            เข้าสู่ระบบ
          </button>
          <button 
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 min-h-11 py-2.5 rounded-xl font-bold transition-all ${mode === 'register' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            สมัครสมาชิก
          </button>
        </div>

        {error && <div className="error-state mb-6 text-sm">{error}</div>}

        {mode === 'login' && (
          <div className="grid grid-cols-1 min-[390px]:grid-cols-3 gap-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-1 mb-6">
            <button 
              type="button"
              onClick={() => { setLoginRole('student'); setError(''); }}
              className={`min-h-11 py-2 rounded-xl text-xs font-bold transition-all ${loginRole === 'student' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-white border border-transparent'}`}
            >
              👩‍🎓 นักเรียน
            </button>
            <button 
              type="button"
              onClick={() => { setLoginRole('teacher'); setError(''); }}
              className={`min-h-11 py-2 rounded-xl text-xs font-bold transition-all ${loginRole === 'teacher' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-white border border-transparent'}`}
            >
              👨‍🏫 ครูผู้สอน
            </button>
            <button 
              type="button"
              onClick={() => { setLoginRole('executive'); setError(''); }}
              className={`min-h-11 py-2 rounded-xl text-xs font-bold transition-all ${loginRole === 'executive' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-white border border-transparent'}`}
            >
              📊 ผู้บริหาร
            </button>
          </div>
        )}

        {mode === 'login' ? (
          <div className="flex flex-col gap-4" onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(e); }}>
            <div>
              <label className="text-slate-300 text-sm font-bold block mb-1.5">Username</label>
              <input type="text" autoComplete="off" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors glass-input" placeholder="กรอกชื่อผู้ใช้งาน" />
            </div>
            <div>
              <label className="text-slate-300 text-sm font-bold block mb-1.5">Password</label>
              <input type="password" autoComplete="new-password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-all transform active:scale-95" placeholder="กรอกรหัสผ่าน" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900" />
              <span className="text-slate-400 text-sm font-medium hover:text-white transition-colors">จดจำรหัสผ่าน</span>
            </label>
            <button type="button" onClick={handleLogin} disabled={isLoading} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-black py-4 rounded-xl shadow-lg mt-4 disabled:opacity-50 transition-all transform active:scale-95">
              {isLoading ? 'กำลังโหลด...' : 
               loginRole === 'student' ? 'เข้าสู่ระบบผจญภัย 🚀' : 
               loginRole === 'teacher' ? 'เข้าสู่ระบบจัดการเรียนรู้ 👨‍🏫' : 
               'เข้าสู่ระบบรายงานผู้บริหาร 📊'}
            </button>
            <button 
              type="button" 
              onClick={() => router.push('/demo')} 
              className="w-full bg-slate-800/50 hover:bg-purple-600/20 text-purple-300 border border-purple-500/30 font-bold py-3 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2"
            >
              👑 เข้าสู่โหมดกรรมการ (Demo)
            </button>
          </div>
        ) : mode === 'register' && !isRegistrationOpen ? (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-6 rounded-2xl text-center mb-4">
            <h3 className="font-bold text-lg mb-2">ปิดรับลงทะเบียน</h3>
            <p className="text-sm">ระบบถูกปิดรับการลงทะเบียนชั่วคราว<br/>กรุณาติดต่อคุณครูผู้สอนครับ</p>
          </div>
        ) : mode === 'register' ? (
          <div className="flex flex-col gap-4" onKeyDown={(e) => { if (e.key === 'Enter') handleRegister(e); }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 text-sm font-bold block mb-1.5">ชื่อจริง</label>
                <input type="text" value={regFirstName} onChange={(e) => setRegFirstName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" placeholder="สมชาย" />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-bold block mb-1.5">นามสกุล</label>
                <input type="text" value={regLastName} onChange={(e) => setRegLastName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" placeholder="ใจดี" />
              </div>
            </div>
            <div className="grid grid-cols-1 min-[390px]:grid-cols-3 gap-4">
              <div>
                <label className="text-slate-300 text-sm font-bold block mb-1.5">ระดับชั้น</label>
                <select value={regGrade} onChange={(e) => setRegGrade(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input">
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
                <label className="text-slate-300 text-sm font-bold block mb-1.5">ห้อง</label>
                <input type="text" value={regRoom} onChange={(e) => setRegRoom(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" placeholder="1" />
              </div>
              <div>
                <label className="text-slate-300 text-sm font-bold block mb-1.5">เลขที่</label>
                <input type="text" value={regStudentId} onChange={(e) => setRegStudentId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" placeholder="15" />
              </div>
            </div>
            
            <hr className="border-slate-800 my-2" />
            
            <div>
              <label className="text-slate-300 text-sm font-bold block mb-1.5">ตั้ง Username</label>
              <input type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" placeholder="สำหรับเข้าใช้งาน" />
            </div>
            <div>
              <label className="text-slate-300 text-sm font-bold block mb-1.5">ตั้ง Password</label>
              <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm glass-input" placeholder="รหัสผ่านเข้าสู่ระบบ" />
            </div>
 
            <button type="button" onClick={handleRegister} disabled={isLoading} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-black py-4 rounded-xl shadow-lg mt-4 disabled:opacity-50 transition-all transform active:scale-95">
              {isLoading ? 'กำลังโหลด...' : 'ลงทะเบียนและเริ่มผจญภัย 🎉'}
            </button>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => window.location.href = '/card-teacher'}
          className="w-full mt-5 py-3 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/20 text-fuchsia-300 rounded-xl font-bold text-sm"
        >
          🃏 ระบบการ์ดสำหรับคุณครู (สมัคร/เข้าใช้)
        </button>
        <button
          type="button"
          onClick={() => router.push('/register/network')}
          className="w-full mt-3 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 rounded-xl font-bold text-sm"
        >
          🌐 สมัครใช้งานโรงเรียนเครือข่าย (Guest)
        </button>
      </motion.div>
      </div>
    </div>
  );
}
