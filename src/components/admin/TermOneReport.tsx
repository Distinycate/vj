'use client';

import { useEffect, useMemo, useState } from 'react';
import SchoolTermWrongWords from './SchoolTermWrongWords';

type Row = { id: string; studentCode: string | null; name: string | null; classroomId: string | null; grade: string | null; room: string | null; prePercent: number | null; preCount: number; postPercent: number | null; gain: number | null };
const number = (n: number | null) => n === null ? 'ไม่มีข้อมูล' : `${n.toFixed(1)}%`;

export default function TermOneReport({ classrooms }: { classrooms: any[] }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [room, setRoom] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/term-one-report', { signal: controller.signal }).then(async r => {
      if (!r.ok) throw new Error('โหลดข้อมูลสำรองไม่สำเร็จ');
      const json = await r.json(); setRows(json.students || []);
    }).catch(e => { if (e.name !== 'AbortError') setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const filtered = useMemo(() => rows.filter(s => (!room || s.classroomId === room) && `${s.name || ''} ${s.studentCode || ''}`.toLowerCase().includes(search.trim().toLowerCase())), [rows, room, search]);
  const average = (field: 'prePercent' | 'postPercent' | 'gain') => {
    const values = filtered.map(s => s[field]).filter((v): v is number => v !== null);
    return values.length ? number(values.reduce((a, b) => a + b, 0) / values.length) : 'ไม่มีข้อมูล';
  };
  const className = (row: Row) => classrooms.find(c => c.id === row.classroomId)?.class_name || [row.grade, row.room].filter(Boolean).join('/') || 'ไม่ระบุห้อง';
  return <section className="space-y-4" aria-label="รายงานภาคเรียนที่ 1 ปี 2569">
    <div className="rounded-2xl border border-indigo-500/30 bg-slate-900 p-5 space-y-2">
      <h2 className="text-xl font-bold text-white">ผลการเรียนภาคเรียนที่ 1/2569</h2>
      <p className="text-sm text-slate-300">ข้อมูลจากสำรองวันที่ 3 ตุลาคม 2569 · Pre-test เฉลี่ยไม่เกิน 5 ครั้งล่าสุด · Post-test ครั้งล่าสุด · Learning Gain ตามสูตร Hake</p>
      <p className="text-sm text-slate-400">คำศัพท์ผิดระดับโรงเรียนอ่านจากประวัติรายครั้งที่บันทึกในฐานข้อมูล</p>
    </div>
    <div className="flex flex-wrap gap-3"><label className="text-sm text-slate-200">ค้นหานักเรียน <input value={search} onChange={e => setSearch(e.target.value)} className="ml-2 rounded-lg bg-slate-950 border border-slate-600 p-2 text-white" /></label><label className="text-sm text-slate-200">ห้อง <select value={room} onChange={e => setRoom(e.target.value)} className="ml-2 rounded-lg bg-slate-950 border border-slate-600 p-2 text-white"><option value="">ทุกห้อง</option>{classrooms.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}</select></label></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[['นักเรียน', `${filtered.length} คน`], ['Pre-test เฉลี่ย', average('prePercent')], ['Post-test เฉลี่ย', average('postPercent')], ['Learning Gain เฉลี่ย', average('gain')]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-700 bg-slate-900 p-4"><p className="text-sm text-slate-300">{label}</p><p className="mt-1 text-xl font-bold text-white">{value}</p></div>)}</div>
    {loading ? <p className="text-slate-300">กำลังโหลดรายงาน…</p> : error ? <p role="alert" className="text-rose-300">{error}</p> : <div className="overflow-x-auto rounded-xl border border-slate-700"><table className="w-full text-sm text-left text-slate-200"><thead className="bg-slate-950"><tr><th className="p-3">นักเรียน</th><th className="p-3">ห้อง</th><th className="p-3">Pre-test</th><th className="p-3">Post-test</th><th className="p-3">Learning Gain</th><th className="p-3">รายละเอียด</th></tr></thead><tbody>{filtered.map(s => <tr key={s.id} className="border-t border-slate-800"><td className="p-3">{s.name} <span className="text-slate-400">{s.studentCode}</span></td><td className="p-3">{className(s)}</td><td className="p-3">{number(s.prePercent)}</td><td className="p-3">{number(s.postPercent)}</td><td className="p-3">{number(s.gain)}</td><td className="p-3"><button onClick={() => setSelected(s)} className="rounded-lg bg-indigo-600 px-3 py-2 text-white">ดูข้อมูล</button></td></tr>)}</tbody></table>{!filtered.length && <p className="p-5 text-slate-300">ไม่พบนักเรียนตามเงื่อนไข</p>}</div>}
    <SchoolTermWrongWords term="1" />
    {selected && <div role="dialog" aria-modal="true" aria-label="ผลรายบุคคล" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-lg rounded-2xl bg-slate-900 p-6 text-white space-y-3"><h3 className="text-lg font-bold">{selected.name}</h3><p>ห้อง {className(selected)} · รหัส {selected.studentCode}</p><p>Pre-test: {number(selected.prePercent)} ({selected.preCount}/5 ครั้ง)</p><p>Post-test: {number(selected.postPercent)}</p><p>Learning Gain: {number(selected.gain)}</p><p className="text-amber-300">คำผิดรายบุคคลยังไม่แสดงในรายงานนี้</p><button onClick={() => setSelected(null)} className="rounded-lg bg-slate-700 px-4 py-2">ปิด</button></div></div>}
  </section>;
}
