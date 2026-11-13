'use client';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface FeaturedEventBannersProps {
  isExternalUser?: boolean;
}

export default function FeaturedEventBanners({ isExternalUser = false }: FeaturedEventBannersProps) {
  if (isExternalUser) return null;

  return (
    <>
      {/* Word Puzzle Mode 100 Stages Banner */}
      <div className="rounded-3xl border border-purple-500/40 bg-gradient-to-r from-purple-950/90 via-slate-900/90 to-indigo-950/90 p-5 shadow-2xl mb-6 relative overflow-hidden group hover:border-purple-400/60 transition-all">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-lg shadow-purple-500/25">
              🧩
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full bg-purple-400 text-slate-950 shadow-sm">
                  NEW PUZZLE MODE
                </span>
                <span className="text-xs font-bold text-amber-300">
                  ⭐ ปริศนาอักษรไขว้ 100 ด่าน • วงล้อลากคำศัพท์สะกดคำ
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                Word Connect Puzzle (ปริศนาอักษรไขว้ 100 ด่าน)
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                ลากนิ้วเชื่อมตัวอักษรบนวงล้อ เติมคำศัพท์ A2 ให้เต็มตารางไขว้ ปลดล็อกทีละด่าน รับเหรียญและดาวสะสม!
              </p>
            </div>
          </div>
          <Link
            href="/challenge/puzzle"
            className="w-full md:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-400 to-indigo-500 hover:from-purple-300 hover:to-indigo-400 text-slate-950 font-black text-sm text-center shadow-lg shadow-purple-500/30 transition-all hover:scale-105 active:scale-95 shrink-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>เล่น Puzzle 100 ด่าน</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Oxford 3000 Worksheets Banner (สพป.บุรีรัมย์ เขต 3) */}
      <div className="rounded-3xl border border-violet-500/40 bg-gradient-to-r from-violet-950/90 via-slate-900/90 to-purple-950/90 p-5 shadow-2xl mb-6 relative overflow-hidden group hover:border-violet-400/60 transition-all">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-500/15 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-400 to-purple-600 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-lg shadow-violet-500/25">
              📖
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full bg-violet-400 text-slate-950 shadow-sm">
                  สพป.บุรีรัมย์ เขต 3
                </span>
                <span className="text-xs font-bold text-amber-300">
                  📝 แบบฝึกหัด ม.1 - ม.3 • ระบบชิปแตะเติมคำ (Tap-to-Fill)
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                A2 Vocabulary Worksheets (แบบฝึกหัดคำศัพท์ ม.1 - ม.3)
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                ฝึกทำแบบฝึกหัดคำศัพท์ตามมาตรฐานหลักสูตร แตะชิปคำศัพท์เติมคำสะดวก ไม่ต้องพิมพ์ ปลดล็อกรายบทโดยคุณครู
              </p>
            </div>
          </div>
          <Link
            href="/challenge/worksheets"
            className="w-full md:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-400 to-purple-500 hover:from-violet-300 hover:to-purple-400 text-slate-950 font-black text-sm text-center shadow-lg shadow-violet-500/30 transition-all hover:scale-105 active:scale-95 shrink-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>เข้าทำแบบฝึกหัด</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* O-NET English Challenge Featured Banner */}
      <div className="rounded-3xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/90 via-slate-900/90 to-indigo-950/90 p-5 shadow-2xl mb-6 relative overflow-hidden group hover:border-cyan-400/60 transition-all">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-lg shadow-cyan-500/25">
              🎯
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 shadow-sm">
                  NEW EVENT
                </span>
                <span className="text-xs font-bold text-amber-300">
                  🎁 สอบได้ &ge; 50% รับทันที 5 ตั๋วสุ่มการ์ดฟรี! 🎟️
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                O-NET English Challenge (ม.3 ย้อนหลัง 10 ปี)
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                ฝึกทำข้อสอบจริง 2559 - 2568 พร้อมกระดาษคำตอบดิจิทัล ตรวจคำตอบทันที และเทียบเกณฑ์ประเทศ สทศ.
              </p>
            </div>
          </div>
          <Link
            href="/challenge/onet"
            className="w-full md:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-sm text-center shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 active:scale-95 shrink-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>เริ่มทำข้อสอบ O-NET</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </>
  );
}

