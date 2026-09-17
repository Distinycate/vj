'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import dynamic from 'next/dynamic';

const Dashboard = dynamic(() => import('@/components/Dashboard'));
const StudyCamp = dynamic(() => import('@/components/StudyCamp'));
const Game = dynamic(() => import('@/components/Game'));
const PreTest = dynamic(() => import('@/components/PreTest'));
const PostTest = dynamic(() => import('@/components/PostTest'));
import { Globe2, School, User, Lock, Sparkles, LogIn, UserPlus, ArrowRight } from 'lucide-react';
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
  const [loginRole, setLoginRole] = useState<'student' | 'teacher' | 'executive'>('student');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
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

    // Rehydrate session from server on mount (F5 reload protection)
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.authenticated && data.role === 'STUDENT' && data.user) {
          setStudent(data.user);
          saveStudentSession(data.user);
          if (data.progress) setProgress(data.progress);
        }
      })
      .catch(() => {});

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
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword.trim(),
          role: loginRole.toUpperCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }

      if (data.requires_password_change) {
        window.location.href = '/force-password-change';
        return;
      }

      if (rememberMe) {
        localStorage.setItem(
          'vj_saved_user',
          JSON.stringify({ username: loginUsername.trim(), password: loginPassword.trim(), role: loginRole })
        );
      } else {
        localStorage.removeItem('vj_saved_user');
      }

      if (data.role === 'STUDENT') {
        const { data: pretestList, count: pretestCount } = await supabase
          .from('pre_tests')
          .select('created_at', { count: 'exact' })
          .eq('student_id', data.user.id)
          .order('created_at', { ascending: false });

        const hasCompleted5Pretests = pretestCount !== null && pretestCount >= 5;
        const pretestDate = data.user.user_type === 'EXTERNAL'
          ? new Date().toISOString()
          : hasCompleted5Pretests && pretestList && pretestList.length > 0 ? pretestList[0].created_at : null;

        setStudent(data.user);
        saveStudentSession(data.user);
        setProgress({
          ...data.progress,
          pretest_date: pretestDate,
        });
      } else if (data.role === 'CARD_TEACHER' || data.role === 'TEACHER') {
        localStorage.setItem('vocab_journey_card_teacher', JSON.stringify(data.user));
        window.location.href = '/card-teacher/dashboard';
      } else if (data.role === 'ADMIN') {
        localStorage.setItem('vocab_journey_teacher', JSON.stringify(data.user));
        window.location.href = '/admin';
      } else if (data.role === 'EXECUTIVE') {
        localStorage.setItem('vocab_journey_executive', JSON.stringify(data.user));
        window.location.href = '/executive';
      }
    } catch (err: any) {
      console.error('Login failure:', err);
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

      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: regFirstName.trim(),
          lastName: regLastName.trim(),
          gradeLevel: regGrade.trim(),
          roomNumber: regRoom.trim(),
          username: regUsername.trim(),
          password: regPassword.trim(),
          userType: 'INTERNAL',
        }),
      });

      const regJson = await regRes.json();
      if (!regRes.ok) {
        throw new Error(regJson.error || 'ไม่สามารถลงทะเบียนได้');
      }

      const studentData = regJson.student;
      const initialProgress = {
        current_rank: 1,
        current_stage: 1,
        coins: 0,
        exp: 0,
      };

      // Auto-login after register
      setStudent(studentData);
      saveStudentSession(studentData);
      setProgress(initialProgress);
      
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
    <div className="min-h-screen bg-transparent flex items-start xl:items-center justify-center p-3 sm:p-4 safe-bottom relative overflow-x-hidden overflow-y-auto">


      {/* Ambient orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/20 glow-orb"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-sky-500/20 glow-orb"></div>

      <div className="relative z-10 w-full max-w-7xl grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-4 sm:gap-6 items-start">
        <motion.section
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          className="order-2 xl:order-1 glass-card p-5 sm:p-8 xl:max-h-[95vh] xl:overflow-y-auto mobile-scroll-panel"
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
            <div className="glass-card p-5 hover-lift border-2 border-emerald-500/30 hover:border-emerald-400/60 transition-all bg-gradient-to-br from-emerald-950/20 via-slate-900/40 to-slate-950/60 shadow-lg">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-black mb-2.5">
                Vygotsky's ZPD • Flow Theory
              </div>
              <h2 className="text-lg font-black text-emerald-300 mb-2">🎯 เรียนรู้ในจังหวะของตัวเอง</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                ระบบ Adaptive Rank อิงแนวคิด ZPD ช่วยปรับความยากให้พอดีกับผู้เรียน ไม่ยากจนท้อ และไม่ง่ายจนน่าเบื่อ
                เพื่อพาเข้าสู่สภาวะ Flow State ที่พร้อมเรียนรู้อย่างมีสมาธิ
              </p>
            </div>
            <div className="glass-card p-5 hover-lift border-2 border-blue-500/30 hover:border-blue-400/60 transition-all bg-gradient-to-br from-blue-950/20 via-slate-900/40 to-slate-950/60 shadow-lg">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[11px] font-black mb-2.5">
                Ebbinghaus SRS Memory Curve
              </div>
              <h2 className="text-lg font-black text-blue-300 mb-2">🧠 จำระยะยาวด้วย SRS</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                คำที่ตอบผิดไม่ใช่ความล้มเหลว แต่คือข้อมูลเรียนรู้ ระบบจะบันทึกคำที่ควรทบทวน
                และดึงกลับมาในจังหวะที่เหมาะสมตามแนวคิด Ebbinghaus Forgetting Curve
              </p>
            </div>
            <div className="glass-card p-5 hover-lift border-2 border-purple-500/30 hover:border-purple-400/60 transition-all bg-gradient-to-br from-purple-950/20 via-slate-900/40 to-slate-950/60 shadow-lg">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[11px] font-black mb-2.5">
                21st Century Skills • 4Cs Framework
              </div>
              <h2 className="text-lg font-black text-purple-300 mb-2">🌍 ทักษะแห่งศตวรรษที่ 21</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Context MC ฝึก Critical Thinking, Team Battle ฝึก Collaboration และ Dashboard ช่วยสะท้อนข้อมูลให้ผู้เรียนกำกับตนเอง
                แบบ Self-Directed Learning
              </p>
            </div>
            <div className="glass-card p-5 hover-lift border-2 border-amber-500/30 hover:border-amber-400/60 transition-all bg-gradient-to-br from-amber-950/20 via-slate-900/40 to-slate-950/60 shadow-lg">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-black mb-2.5">
                Gamification • Self-Determination Theory (SDT)
              </div>
              <h2 className="text-lg font-black text-amber-300 mb-2">⚔️ เปลี่ยนการท่องจำเป็นการผจญภัย</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
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
              className="mt-5 xl:hidden inline-flex items-center justify-center gap-2.5 w-full min-h-[58px] rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-base transition-all shadow-2xl shadow-emerald-500/35 py-4 border-2 border-emerald-200/50 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>ขึ้นไปเข้าสู่ระบบ / สมัครสมาชิก 🚀</span>
              <ArrowRight className="w-5 h-5 shrink-0" />
            </button>
          </div>
        </motion.section>

      <motion.div 
        id="login-panel"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="order-1 xl:order-2 glass-card p-5 sm:p-8 w-full max-w-md xl:max-h-[95vh] xl:overflow-y-auto xl:sticky xl:top-4 justify-self-center mobile-scroll-panel border-2 border-slate-800/90 shadow-2xl"
      >
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-xl shadow-emerald-500/35 text-slate-950 font-black text-2xl border-2 border-emerald-300/40">
            VJ
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-300 mb-1">
            Vocab Journey
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-medium">ระบบประเมินและฝึกทักษะคำศัพท์อัจฉริยะ</p>
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold mt-2.5 shadow-sm">
            🏫 โรงเรียนบ้านโคกยาง • Full Mode
          </div>
        </div>

        {/* Prominent Mode Switcher Pill */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950/95 border-2 border-slate-800 rounded-2xl p-1.5 mb-5 shadow-inner">
          <button 
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className={`min-h-[50px] py-3 px-3 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 border-2 ${
              mode === 'login' 
                ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 text-slate-950 border-emerald-300 shadow-xl shadow-emerald-500/35 scale-[1.02]' 
                : 'text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border-slate-800/80 hover:border-emerald-500/40'
            }`}
          >
            <LogIn className="w-4 h-4 shrink-0" />
            <span>เข้าสู่ระบบ</span>
          </button>
          <button 
            type="button"
            onClick={() => { setMode('register'); setError(''); }}
            className={`min-h-[50px] py-3 px-3 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 border-2 ${
              mode === 'register' 
                ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 text-slate-950 border-emerald-300 shadow-xl shadow-emerald-500/35 scale-[1.02]' 
                : 'text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border-slate-800/80 hover:border-emerald-500/40'
            }`}
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span>สมัครสมาชิก</span>
          </button>
        </div>

        {error && (
          <div className="error-state mb-5 text-xs sm:text-sm p-4 rounded-xl bg-rose-500/15 border-2 border-rose-500/40 text-rose-300 font-bold flex items-center gap-2 shadow-lg">
            <span>⚠️ {error}</span>
          </div>
        )}

        {mode === 'login' && (
          <div className="grid grid-cols-1 min-[390px]:grid-cols-3 gap-2.5 bg-slate-950/90 border-2 border-slate-800/90 rounded-2xl p-2 mb-5">
            <button 
              type="button"
              onClick={() => { setLoginRole('student'); setError(''); }}
              className={`min-h-[54px] py-2 px-1 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 border-2 ${
                loginRole === 'student' 
                  ? 'bg-gradient-to-br from-emerald-500/30 via-teal-500/25 to-emerald-600/30 text-emerald-200 border-emerald-400 shadow-lg shadow-emerald-500/30 scale-[1.03]' 
                  : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-900/80 border-slate-800/80'
              }`}
            >
              <span className="text-xs sm:text-sm font-black">👩‍🎓 นักเรียน</span>
              <span className="text-[10px] text-emerald-400/90 font-bold">ผู้เรียนรู้</span>
            </button>
            <button 
              type="button"
              onClick={() => { setLoginRole('teacher'); setError(''); }}
              className={`min-h-[54px] py-2 px-1 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 border-2 ${
                loginRole === 'teacher' 
                  ? 'bg-gradient-to-br from-indigo-500/30 via-blue-500/25 to-indigo-600/30 text-indigo-200 border-indigo-400 shadow-lg shadow-indigo-500/30 scale-[1.03]' 
                  : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-900/80 border-slate-800/80'
              }`}
            >
              <span className="text-xs sm:text-sm font-black">👨‍🏫 ครูผู้สอน</span>
              <span className="text-[10px] text-indigo-400/90 font-bold">จัดการเรียนรู้</span>
            </button>
            <button 
              type="button"
              onClick={() => { setLoginRole('executive'); setError(''); }}
              className={`min-h-[54px] py-2 px-1 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 border-2 ${
                loginRole === 'executive' 
                  ? 'bg-gradient-to-br from-purple-500/30 via-fuchsia-500/25 to-purple-600/30 text-purple-200 border-purple-400 shadow-lg shadow-purple-500/30 scale-[1.03]' 
                  : 'text-slate-400 hover:text-purple-300 hover:bg-slate-900/80 border-slate-800/80'
              }`}
            >
              <span className="text-xs sm:text-sm font-black">📊 ผู้บริหาร</span>
              <span className="text-[10px] text-purple-400/90 font-bold">สรุปรายงาน</span>
            </button>
          </div>
        )}

        {mode === 'login' ? (
          <div className="flex flex-col gap-4" onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(e); }}>
            <div className="space-y-1.5">
              <label className="text-slate-200 text-xs sm:text-sm font-black flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-400" />
                <span>Username</span>
              </label>
              <input 
                type="text" 
                autoComplete="off" 
                value={loginUsername} 
                onChange={(e) => setLoginUsername(e.target.value)} 
                className="w-full bg-slate-950/90 border-2 border-slate-800 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/25 rounded-2xl px-4 py-3.5 text-white text-sm outline-none transition-all placeholder:text-slate-500 shadow-inner" 
                placeholder="กรอกชื่อผู้ใช้งาน" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-200 text-xs sm:text-sm font-black flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Password</span>
              </label>
              <input 
                type="password" 
                autoComplete="new-password" 
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)} 
                className="w-full bg-slate-950/90 border-2 border-slate-800 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/25 rounded-2xl px-4 py-3.5 text-white text-sm outline-none transition-all placeholder:text-slate-500 shadow-inner" 
                placeholder="กรอกรหัสผ่าน" 
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900" />
              <span className="text-slate-300 text-xs sm:text-sm font-medium hover:text-white transition-colors">จดจำรหัสผ่าน</span>
            </label>

            {/* Primary Action Button */}
            <button 
              type="button" 
              onClick={handleLogin} 
              disabled={isLoading} 
              className="w-full min-h-[62px] py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 hover:from-emerald-300 hover:to-teal-200 text-slate-950 font-black text-base sm:text-lg transition-all shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-400/60 flex items-center justify-center gap-3 mt-2 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] border-2 border-emerald-200/50"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {loginRole === 'student' ? 'เข้าสู่ระบบผจญภัย 🚀' : 
                     loginRole === 'teacher' ? 'เข้าสู่ระบบจัดการเรียนรู้ 👨‍🏫' : 
                     'เข้าสู่ระบบรายงานผู้บริหาร 📊'}
                  </span>
                  <ArrowRight className="w-5 h-5 shrink-0" />
                </>
              )}
            </button>

            {/* Prominent Card Teacher System Button */}
            <button 
              type="button" 
              onClick={() => window.location.href = '/card-teacher'} 
              className="w-full min-h-[58px] py-4 px-5 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-black text-sm sm:text-base transition-all shadow-2xl shadow-fuchsia-600/40 hover:shadow-fuchsia-500/60 flex items-center justify-center gap-2.5 border-2 border-fuchsia-300/60 mt-1 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-5 h-5 text-yellow-300 shrink-0 animate-pulse" />
              <span>🃏 ระบบการ์ดคำศัพท์สำหรับคุณครู (สมัคร/เข้าใช้) &rarr;</span>
            </button>
          </div>
        ) : mode === 'register' && !isRegistrationOpen ? (
          <div className="bg-rose-500/10 border-2 border-rose-500/30 text-rose-300 p-6 rounded-2xl text-center mb-4 shadow-lg">
            <h3 className="font-black text-lg mb-2">ปิดรับลงทะเบียน</h3>
            <p className="text-sm">ระบบถูกปิดรับการลงทะเบียนชั่วคราว<br/>กรุณาติดต่อคุณครูผู้สอนครับ</p>
          </div>
        ) : mode === 'register' ? (
          <div className="flex flex-col gap-4" onKeyDown={(e) => { if (e.key === 'Enter') handleRegister(e); }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-200 text-xs sm:text-sm font-black block mb-1.5">ชื่อจริง</label>
                <input type="text" value={regFirstName} onChange={(e) => setRegFirstName(e.target.value)} className="w-full bg-slate-950/90 border-2 border-slate-800 focus:border-emerald-400 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="สมชาย" />
              </div>
              <div>
                <label className="text-slate-200 text-xs sm:text-sm font-black block mb-1.5">นามสกุล</label>
                <input type="text" value={regLastName} onChange={(e) => setRegLastName(e.target.value)} className="w-full bg-slate-950/90 border-2 border-slate-800 focus:border-emerald-400 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="ใจดี" />
              </div>
            </div>
            <div className="grid grid-cols-1 min-[390px]:grid-cols-3 gap-4">
              <div>
                <label className="text-slate-200 text-xs sm:text-sm font-black block mb-1.5">ระดับชั้น</label>
                <select value={regGrade} onChange={(e) => setRegGrade(e.target.value)} className="w-full bg-slate-950/90 border-2 border-slate-800 focus:border-emerald-400 rounded-xl px-4 py-3 text-white text-sm outline-none">
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
                <label className="text-slate-200 text-xs sm:text-sm font-black block mb-1.5">ห้อง</label>
                <input type="text" value={regRoom} onChange={(e) => setRegRoom(e.target.value)} className="w-full bg-slate-950/90 border-2 border-slate-800 focus:border-emerald-400 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="1" />
              </div>
              <div>
                <label className="text-slate-200 text-xs sm:text-sm font-black block mb-1.5">เลขที่</label>
                <input type="text" value={regStudentId} onChange={(e) => setRegStudentId(e.target.value)} className="w-full bg-slate-950/90 border-2 border-slate-800 focus:border-emerald-400 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="15" />
              </div>
            </div>
            
            <hr className="border-slate-800 my-1" />
            
            <div>
              <label className="text-slate-200 text-xs sm:text-sm font-black block mb-1.5">ตั้ง Username</label>
              <input type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} className="w-full bg-slate-950/90 border-2 border-slate-800 focus:border-emerald-400 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="สำหรับเข้าใช้งาน" />
            </div>
            <div>
              <label className="text-slate-200 text-xs sm:text-sm font-black block mb-1.5">ตั้ง Password</label>
              <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="w-full bg-slate-950/90 border-2 border-slate-800 focus:border-emerald-400 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="รหัสผ่านเข้าสู่ระบบ" />
            </div>
 
            {/* Prominent Register Submit Button */}
            <button 
              type="button" 
              onClick={handleRegister} 
              disabled={isLoading} 
              className="w-full min-h-[62px] py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 hover:from-emerald-300 hover:to-teal-200 text-slate-950 font-black text-base sm:text-lg transition-all shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-400/60 flex items-center justify-center gap-3 mt-2 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] border-2 border-emerald-200/50"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <>
                  <span>ลงทะเบียนและเริ่มผจญภัย 🎉</span>
                  <ArrowRight className="w-5 h-5 shrink-0" />
                </>
              )}
            </button>
          </div>
        ) : null}

        {/* Single Navigation Entry to VJ Lite Homepage */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-gradient-to-br from-indigo-950/90 via-slate-900/95 to-sky-950/80 border-2 border-indigo-500/50 hover:border-sky-400/70 rounded-3xl p-5 text-center space-y-3.5 shadow-2xl shadow-indigo-950/60 transition-all">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-xs font-black shadow-sm">
              <Globe2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>โรงเรียนเครือข่ายและพันธมิตร (VJ Lite)</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
              สำหรับนักเรียนโรงเรียนเครือข่าย และ ครูโรงเรียนเครือข่าย เข้าสู่ระบบเพื่อฝึกคำศัพท์หรือจัดการห้องเรียน
            </p>
            <button
              type="button"
              onClick={() => router.push('/network')}
              className="w-full min-h-[62px] py-4 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-black text-base sm:text-lg transition-all shadow-2xl shadow-indigo-600/50 hover:shadow-cyan-500/50 flex items-center justify-center gap-3 border-2 border-cyan-300/50 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Globe2 className="w-5 h-5 shrink-0 text-cyan-200" />
              <span>🌐 เข้าสู่หน้าหลัก VJ Lite (โรงเรียนเครือข่าย) &rarr;</span>
            </button>
          </div>
        </div>

        {/* Refined and prominent Demo Button at the bottom */}
        <div className="mt-5 pt-3 border-t border-slate-800/60 text-center">
          <button 
            type="button" 
            onClick={() => router.push('/demo')} 
            className="text-xs sm:text-sm text-amber-300 hover:text-amber-200 py-2.5 px-5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border-2 border-amber-500/40 hover:border-amber-400/70 transition-all inline-flex items-center gap-2 font-black shadow-lg shadow-amber-500/15 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>👑 เข้าสู่โหมดกรรมการ (Demo Mode)</span>
          </button>
        </div>
      </motion.div>
      </div>
    </div>
  );
}
