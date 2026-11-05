'use client';

import { useState, useEffect } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Layers,
  Lock,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Unlock,
  Users,
  AlertTriangle,
} from 'lucide-react';

interface YearConfig {
  isOpen: boolean;
  allowedClassrooms: string[];
}

const ALL_YEARS = [2568, 2567, 2566, 2565, 2564, 2563, 2562, 2561, 2560, 2559];

export default function OnetYearAccessControl({
  classrooms = ['ม.3/1', 'ม.2/1', 'ม.1/1'],
  onUpdated,
}: {
  classrooms?: string[];
  onUpdated?: () => void;
}) {
  const [selectedYear, setSelectedYear] = useState<number>(2568);
  const [openYears, setOpenYears] = useState<Record<string, YearConfig>>({
    '2568': { isOpen: true, allowedClassrooms: ['ม.3/1'] },
  });
  const [availableClassrooms, setAvailableClassrooms] = useState<string[]>(
    classrooms.length > 0 ? classrooms : ['ม.3/1', 'ม.2/1', 'ม.1/1']
  );

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch current access configuration from /api/admin/onet
  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/onet');
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.openYears) setOpenYears(data.openYears);
        if (data.classrooms && data.classrooms.length > 0) {
          setAvailableClassrooms(data.classrooms);
        }
      }
    } catch (e) {
      console.warn('Failed to load O-NET access settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Current year settings
  const currentConfig: YearConfig = openYears[String(selectedYear)] || {
    isOpen: false,
    allowedClassrooms: [],
  };

  // Toggle year open/closed
  const handleToggleOpen = () => {
    const nextIsOpen = !currentConfig.isOpen;
    // If opening and no classrooms selected, default to first classroom (e.g. ม.3/1)
    const nextRooms =
      nextIsOpen && currentConfig.allowedClassrooms.length === 0
        ? ['ม.3/1']
        : currentConfig.allowedClassrooms;

    setOpenYears((prev) => ({
      ...prev,
      [String(selectedYear)]: {
        isOpen: nextIsOpen,
        allowedClassrooms: nextRooms,
      },
    }));
  };

  // Toggle specific classroom
  const handleToggleClassroom = (room: string) => {
    const currentRooms = currentConfig.allowedClassrooms;
    let nextRooms: string[];
    if (currentRooms.includes(room)) {
      nextRooms = currentRooms.filter((r) => r !== room);
    } else {
      nextRooms = [...currentRooms, room];
    }

    setOpenYears((prev) => ({
      ...prev,
      [String(selectedYear)]: {
        isOpen: currentConfig.isOpen,
        allowedClassrooms: nextRooms,
      },
    }));
  };

  // Select all classrooms
  const handleSelectAllRooms = () => {
    setOpenYears((prev) => ({
      ...prev,
      [String(selectedYear)]: {
        isOpen: currentConfig.isOpen,
        allowedClassrooms: [...availableClassrooms],
      },
    }));
  };

  // Clear all classrooms
  const handleClearRooms = () => {
    setOpenYears((prev) => ({
      ...prev,
      [String(selectedYear)]: {
        isOpen: currentConfig.isOpen,
        allowedClassrooms: [],
      },
    }));
  };

  // Save current year settings to server
  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/onet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYear,
          isOpen: currentConfig.isOpen,
          allowedClassrooms: currentConfig.allowedClassrooms,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'บันทึกการตั้งค่าไม่สำเร็จ');
      }

      setMessage({
        type: 'success',
        text: currentConfig.isOpen
          ? `✅ เปิดข้อสอบปี ${selectedYear} สำหรับห้อง [${currentConfig.allowedClassrooms.join(', ') || 'ไม่มีห้อง'}] เรียบร้อยแล้ว`
          : `🔒 ปิดล็อกข้อสอบปี ${selectedYear} เรียบร้อยแล้ว (นักเรียนจะเข้าไม่ได้)`,
      });

      if (onUpdated) onUpdated();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการบันทึก' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border border-indigo-500/30 bg-slate-900/80 p-5 sm:p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-black text-sm">
              🎯
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              ตั้งค่าเปิดห้องสอบ O-NET Challenge (เปิดทีละปี & กำหนดห้องเรียน)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            นักเรียนจะเข้าทำข้อสอบได้เฉพาะปีที่คุณครูกด <span className="text-cyan-300 font-bold">"เปิดระบบ"</span> และต้องเป็นห้องเรียนที่คุณครูกำหนดไว้เท่านั้น
          </p>
        </div>

        <button
          onClick={loadConfig}
          disabled={loading}
          className="self-start md:self-auto px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          รีเฟรชสถานะ
        </button>
      </div>

      {/* Year Selection Pills (10 Years) */}
      <div className="space-y-2">
        <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-cyan-400" /> เลือกปีการศึกษาที่ต้องการจัดการ:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
          {ALL_YEARS.map((y) => {
            const cfg = openYears[String(y)];
            const isOpen = Boolean(cfg?.isOpen);
            const isSelected = selectedYear === y;
            const roomsCount = cfg?.allowedClassrooms?.length || 0;

            return (
              <button
                key={y}
                type="button"
                onClick={() => setSelectedYear(y)}
                className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  isSelected
                    ? 'bg-gradient-to-b from-cyan-500/30 to-indigo-600/30 border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <span className={`text-xs font-black ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                  ปี {y}
                </span>
                {isOpen ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    เปิด ({roomsCount})
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-500 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    ปิด
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail Control Box for Selected Year */}
      <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-850 pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              กำลังจัดการข้อสอบ
            </span>
            <h4 className="text-base sm:text-lg font-black text-white mt-1">
              ข้อสอบ O-NET ภาษาอังกฤษ ม.3 ปีการศึกษา {selectedYear}
            </h4>
            <p className="text-xs text-slate-400">
              สถานะปัจจุบัน:{' '}
              {currentConfig.isOpen ? (
                <strong className="text-emerald-400">🟢 เปิดให้นักเรียนเข้าทำข้อสอบ</strong>
              ) : (
                <strong className="text-rose-400">🔴 ปิดระบบ (นักเรียนถูกล็อก ไม่สามารถเข้าได้)</strong>
              )}
            </p>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            onClick={handleToggleOpen}
            className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
              currentConfig.isOpen
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            {currentConfig.isOpen ? (
              <>
                <Lock className="w-4 h-4" /> ปิดล็อกข้อสอบปีนี้
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" /> 🚀 เปิดข้อสอบปีนี้ให้นักเรียน
              </>
            )}
          </button>
        </div>

        {/* Classroom Selection (Active only when isOpen) */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <label className="text-xs font-black text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-400" />
                กำหนดห้องเรียนที่อนุญาตให้เข้าสอบปี {selectedYear}:
              </label>
              <p className="text-[11px] text-slate-400">
                ติ๊กเลือกเฉพาะห้องที่คุณครูต้องการเปิดให้สอบ (ห้องอื่นที่ไม่ได้ติ๊กจะติดล็อกอัตโนมัติ)
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectAllRooms}
                disabled={!currentConfig.isOpen}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                เลือกทุกห้อง
              </button>
              <button
                type="button"
                onClick={handleClearRooms}
                disabled={!currentConfig.isOpen}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-400 disabled:opacity-40 cursor-pointer"
              >
                ล้างการเลือก
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {availableClassrooms.map((room) => {
              const isChecked = currentConfig.allowedClassrooms.includes(room);
              return (
                <button
                  key={room}
                  type="button"
                  disabled={!currentConfig.isOpen}
                  onClick={() => handleToggleClassroom(room)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    !currentConfig.isOpen
                      ? 'bg-slate-900/40 border-slate-800/40 text-slate-600 cursor-not-allowed'
                      : isChecked
                      ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400/30'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs font-black">{room}</span>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                      isChecked
                        ? 'bg-cyan-400 border-cyan-400 text-slate-950'
                        : 'border-slate-700 bg-slate-950'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>

          {currentConfig.isOpen && currentConfig.allowedClassrooms.length === 0 && (
            <p className="text-xs text-amber-400 font-bold flex items-center gap-1.5 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              คำเตือน: คุณครูยังไม่ได้เลือกห้องเรียน นักเรียนทุกคนจะยังไม่สามารถเข้าสอบได้จนกว่าจะติ๊กเลือกห้อง
            </p>
          )}
        </div>

        {/* Save Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-800/80">
          <div>
            {message && (
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 ${
                  message.type === 'success'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                {message.text}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer disabled:opacity-50 hover:scale-105 active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'กำลังบันทึก...' : `💾 บันทึกการตั้งค่าปี ${selectedYear}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

