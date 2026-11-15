'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Star, Lock, CheckCircle2, ChevronRight, Award, Shield } from 'lucide-react';
import { getWorksheetsByGrade, WorksheetGrade } from '@/data/worksheets/index';

const GRADES: Array<{ key: WorksheetGrade; label: string; sub: string }> = [
  { key: 'M1', label: 'มัธยมศึกษาปีที่ 1', sub: 'ระดับ A2 • 18 บท' },
  { key: 'M2', label: 'มัธยมศึกษาปีที่ 2', sub: 'ระดับ A2 • 19 บท' },
  { key: 'M3', label: 'มัธยมศึกษาปีที่ 3', sub: 'ระดับ A2/B1 • 20 บท' },
];

export default function WorksheetsHubPage() {
  const router = useRouter();
  const [selectedGrade, setSelectedGrade] = useState<WorksheetGrade>('M1');
  const [loading, setLoading] = useState<boolean>(true);
  const [studentClassroom, setStudentClassroom] = useState<string>('');
  const [unitAccess, setUnitAccess] = useState<Record<string, { isOpen: boolean; isAllowed: boolean }>>({});
  const [submissions, setSubmissions] = useState<Record<string, any>>({});

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/worksheets');
        const json = await res.json();
        if (json.success) {
          setStudentClassroom(json.studentClassroom || '');
          setUnitAccess(json.unitAccess || {});
          setSubmissions(json.submissions || {});

          // If student is M.2 or M.3, default to their grade
          if (json.studentClassroom?.includes('ม.2')) setSelectedGrade('M2');
          else if (json.studentClassroom?.includes('ม.3')) setSelectedGrade('M3');
        }
      } catch (e) {
        console.error('Failed to load worksheets hub:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const currentUnits = getWorksheetsByGrade(selectedGrade);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-12">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            หน้าแรก
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-400">
              ห้องเรียน: {studentClassroom || 'ทั่วไป'}
            </span>
            <Link
              href="/challenge/grammar"
              className="text-[11px] font-bold text-sky-300 hover:text-sky-200 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30"
            >
              ⚡ สูตรลัดไวยากรณ์
            </Link>
            <Link
              href="/admin/worksheets"
              className="text-[11px] font-bold text-amber-300 hover:text-amber-200 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30"
            >
              ครูผู้สอน
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 pt-4 flex-1">
        {/* Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-teal-950/80 border border-emerald-500/30 p-5 mb-5 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950">
              OXFORD 3000 A2 • VOCABULARY WORKSHEETS
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              📖 แบบฝึกหัดคำศัพท์ภาษาอังกฤษ
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              ใบงานดิจิทัลฝึกคำศัพท์ตามหลักสูตร ม.1 - ม.3 แตะเติมคำศัพท์สะดวกบนมือถือ ตรวจคำตอบทันทีพร้อมสะสมดาวและเหรียญ
            </p>
          </div>
        </div>

        {/* Grade Tabs */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {GRADES.map((g) => {
            const isSelected = selectedGrade === g.key;
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => setSelectedGrade(g.key)}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/20 font-black'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 font-bold'
                }`}
              >
                <div className="text-sm sm:text-base">{g.label}</div>
                <div className="text-[10px] opacity-80 mt-0.5">{g.sub}</div>
              </button>
            );
          })}
        </div>

        {/* Units List */}
        <div className="space-y-3">
          {currentUnits.map((u) => {
            const access = unitAccess[u.unitId];
            const isAllowed = access?.isAllowed !== false; // default true if not strictly locked
            const sub = submissions[u.unitId];
            const isCompleted = Boolean(sub);

            return (
              <div
                key={u.unitId}
                className={`p-4 rounded-3xl border transition-all ${
                  !isAllowed
                    ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                    : isCompleted
                    ? 'bg-slate-900/90 border-emerald-500/30'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {u.unitId}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                        {u.type === 'cloze'
                          ? 'เติมคำในช่องว่าง'
                          : u.type === 'choice'
                          ? 'ข้อสอบช้อยส์'
                          : 'จับคู่ความหมาย'}
                      </span>
                      {isCompleted && (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3].map((starIdx) => (
                            <Star
                              key={starIdx}
                              className={`w-3.5 h-3.5 ${
                                starIdx <= sub.stars
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'fill-slate-800 text-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <h3 className="text-base font-extrabold text-white">{u.title}</h3>
                    {u.subtitle && (
                      <p className="text-xs text-slate-400">{u.subtitle}</p>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    {isCompleted && (
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {sub.score} / {sub.maxScore} คะแนน
                        </span>
                      </div>
                    )}

                    {!isAllowed ? (
                      <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-500 font-bold text-xs flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        คุณครูยังไม่เปิดบทนี้
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => router.push(`/challenge/worksheets/${u.unitId}`)}
                        className={`px-4 py-2 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                          isCompleted
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20'
                        }`}
                      >
                        <span>{isCompleted ? 'ทำซ้ำ' : 'เริ่มทำ'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

