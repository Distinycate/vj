'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, CheckCircle, Clock, Play, Sparkles, Star, Trophy } from 'lucide-react';
import { ONET_YEARS_SUMMARY, NATIONAL_BENCHMARKS } from '@/data/onet/onetData';

export default function OnetLobbyPage() {
  const [history, setHistory] = useState<Record<string, any>>({});

  useEffect(() => {
    // Load student past attempts from localStorage
    try {
      const saved = localStorage.getItem('vj_onet_records');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load onet history:', e);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors py-2 px-3 rounded-xl bg-slate-900 border border-slate-800"
          >
            <ArrowLeft className="w-4 h-4" /> กลับ Event Center
          </Link>
          <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" /> ข้อสอบจริง สทศ. Clean B&W
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

            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-300">
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

        {/* Year Cards Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" /> เลือกลุยข้อสอบแต่ละปี
            </h2>
            <span className="text-xs text-slate-500 font-bold">10 ชุดข้อสอบ</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ONET_YEARS_SUMMARY.map((item) => {
              const record = history[String(item.year)];
              const isPassed = record && record.score100 >= 50;

              return (
                <div
                  key={item.year}
                  className={`rounded-2xl p-5 border transition-all flex flex-col justify-between relative overflow-hidden ${
                    item.available
                      ? 'bg-slate-900/80 border-indigo-500/40 hover:border-indigo-400 shadow-lg shadow-indigo-950/20 hover:-translate-y-1'
                      : 'bg-slate-900/40 border-slate-800/80 opacity-75'
                  }`}
                >
                  {/* Top status */}
                  <div className="flex items-start justify-between">
                    <span className="text-2xl font-black text-indigo-400 font-mono tracking-tight">
                      ปี {item.year}
                    </span>
                    <div>
                      {item.available ? (
                        record ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> ทำแล้ว ({record.score100}%)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse">
                            🔥 พร้อมลุย
                          </span>
                        )
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-500">
                          ชุดถัดไป
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
                      {item.available ? '🎟️ ผ่านครึ่งรับ 5 ตั๋วสุ่ม' : 'เปิดให้ฝึกเร็วๆ นี้'}
                    </span>

                    {item.available ? (
                      <Link
                        href={`/challenge/onet/${item.year}`}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-xs rounded-xl inline-flex items-center gap-1.5 shadow-md transition-transform active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        {record ? 'ทำใหม่อีกครั้ง' : 'เริ่มทำข้อสอบ'}
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="px-3 py-1.5 bg-slate-800 text-slate-600 rounded-xl font-bold text-xs cursor-not-allowed"
                      >
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

