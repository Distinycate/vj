'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Clock,
  Lock,
  Play,
  RefreshCw,
  Sparkles,
  Star,
  Trophy,
  Users,
} from 'lucide-react';
import { ONET_YEARS_SUMMARY, NATIONAL_BENCHMARKS } from '@/data/onet/onetData';

interface YearAccessInfo {
  isOpen: boolean;
  isAllowed: boolean;
  allowedClassrooms: string[];
}

export default function OnetLobbyPage() {
  const [studentClassroom, setStudentClassroom] = useState<string>('');
  const [yearAccess, setYearAccess] = useState<Record<string, YearAccessInfo>>({});
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/student/onet');
      const data = await res.json();
      if (res.ok && data.success) {
        setStudentClassroom(data.studentClassroom || '');
        setYearAccess(data.yearAccess || {});
        setSubmissions(data.submissions || {});
      }
    } catch (e) {
      console.warn('Failed to load student ONET status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

  const openCount = Object.values(yearAccess).filter((y) => y.isAllowed).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors py-2 px-3 rounded-xl bg-slate-900 border border-slate-800"
          >
            <ArrowLeft className="w-4 h-4" /> กลับ Event Center
          </Link>

          <div className="flex items-center gap-2">
            {studentClassroom && (
              <span className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                <Users className="w-3.5 h-3.5" /> ห้องของน้อง: {studentClassroom}
              </span>
            )}
            <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" /> ข้อสอบจริง สทศ. Clean B&W
            </div>
          </div>
        </div>

        {/* Hero Header */}
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/30 p-6 sm:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 inline-block mb-3">
              Special Training Challenge
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-cyan-300">
              O-NET English Challenge 🎯
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              ฝึกทำข้อสอบ O-NET ภาษาอังกฤษ ม.3 ย้อนหลัง 10 ปี (2559 – 2568) ในรูปแบบข้อสอบคมชัดสูง ไร้ลายน้ำ 
              พร้อมกระดาษคำตอบดิจิทัลและตรวจคะแนนอัตโนมัติ ไม่จำกัดเวลาทำ!
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-300">
              <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <BookOpen className="w-4 h-4 text-cyan-400" /> รวม 10 ปีการศึกษา
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <Trophy className="w-4 h-4 text-amber-400" /> ผ่านครึ่งรับ 🎟️ 5 ตั๋วสุ่ม + Coins/EXP
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <Clock className="w-4 h-4 text-purple-400" /> ไม่จำกัดเวลาต่อข้อ
              </div>
            </div>
          </div>
        </header>

        {/* Access Status Announcement */}
        {!loading && openCount === 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl shrink-0">
              🔒
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-amber-300">
                ยังไม่มีชุดข้อสอบ O-NET ที่เปิดสำหรับห้อง {studentClassroom || 'ของน้อง'} ในขณะนี้
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                คุณครูจะเปิดระบบชุดข้อสอบให้เมื่อถึงคาบเรียน เมื่อคุณครูเปิดระบบแล้ว น้องสามารถเข้าทำข้อสอบได้ทันทีครับ
              </p>
            </div>
          </div>
        )}

        {/* Year Cards Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" /> เลือกลุยข้อสอบแต่ละปี
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold">
                เปิดให้ทำ {openCount} / 10 ชุด
              </span>
              <button
                onClick={fetchStudentData}
                disabled={loading}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="รีเฟรช"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ONET_YEARS_SUMMARY.map((item) => {
              const access = yearAccess[String(item.year)];
              const isAllowed = Boolean(access?.isAllowed);
              const isOpenGeneral = Boolean(access?.isOpen);
              const record = submissions[String(item.year)];

              return (
                <div
                  key={item.year}
                  className={`rounded-2xl p-5 border transition-all flex flex-col justify-between relative overflow-hidden ${
                    isAllowed
                      ? 'bg-slate-900/90 border-cyan-500/50 hover:border-cyan-400 shadow-xl shadow-cyan-950/20 hover:-translate-y-1'
                      : 'bg-slate-900/40 border-slate-800/80 opacity-60'
                  }`}
                >
                  {/* Top status */}
                  <div className="flex items-start justify-between">
                    <span className={`text-2xl font-black font-mono tracking-tight ${isAllowed ? 'text-cyan-400' : 'text-slate-500'}`}>
                      ปี {item.year}
                    </span>
                    <div>
                      {isAllowed ? (
                        record ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> ทำแล้ว ({record.score100}%)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            เปิดสอบแล้ว
                          </span>
                        )
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-500 inline-flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          {isOpenGeneral ? 'เฉพาะห้องอื่น' : 'ยังไม่เปิดสอบ'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body description */}
                  <div className="my-4 space-y-1.5">
                    <h3 className="text-sm font-bold text-white line-clamp-1">{item.title}</h3>
                    <p className="text-xs text-slate-400">
                      จำนวน {item.totalQuestions} ข้อ • คะแนนเต็ม 100
                    </p>

                    {/* Room permission notice if locked */}
                    {!isAllowed && (
                      <div className="text-[11px] text-slate-500 pt-1">
                        {isOpenGeneral ? (
                          <span>คุณครูเปิดสำหรับห้อง: {access?.allowedClassrooms?.join(', ') || 'ไม่มีห้อง'}</span>
                        ) : (
                          <span>รอคุณครูประจำวิชาเปิดระบบสำหรับห้องของน้อง</span>
                        )}
                      </div>
                    )}

                    {record && (
                      <div className="pt-2 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex text-amber-400">
                            {[1, 2, 3].map((star) => (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  star <= (record.stars || 0) ? 'fill-amber-400' : 'text-slate-700'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-black text-cyan-400 font-mono">
                            {record.score100} / 100 คะแนน
                          </span>
                        </div>

                        {/* National Comparison info for student */}
                        {NATIONAL_BENCHMARKS[item.year] && (
                          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                            <span>สทศ. ระดับประเทศ: {NATIONAL_BENCHMARKS[item.year].nationalMean}</span>
                            <span className={record.score100 >= NATIONAL_BENCHMARKS[item.year].nationalMean ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                              {record.score100 >= NATIONAL_BENCHMARKS[item.year].nationalMean
                                ? `+${(record.score100 - NATIONAL_BENCHMARKS[item.year].nationalMean).toFixed(1)} เหนือเกณฑ์`
                                : `${(record.score100 - NATIONAL_BENCHMARKS[item.year].nationalMean).toFixed(1)} ต่ำกว่า`}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom Action */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-amber-400 font-bold">
                      {isAllowed ? '🎟️ ผ่านครึ่งรับ 5 ตั๋วสุ่ม' : 'รอครูเปิดระบบ'}
                    </span>

                    {isAllowed ? (
                      <Link
                        href={`/challenge/onet/${item.year}`}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs rounded-xl inline-flex items-center gap-1.5 shadow-md transition-transform active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        {record ? 'ทำใหม่อีกครั้ง' : 'เริ่มทำข้อสอบ'}
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="px-3 py-1.5 bg-slate-800/80 text-slate-500 rounded-xl font-bold text-xs cursor-not-allowed inline-flex items-center gap-1"
                      >
                        <Lock className="w-3 h-3" />
                        ยังไม่เปิด
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
