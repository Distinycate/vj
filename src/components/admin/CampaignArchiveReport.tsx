'use client';
import { useState } from 'react';

interface Scores { count: number; preScore: number | null; postScore: number | null; gain: number | null; stage: number | null }
interface Row { id: string; name: string; classroom: string; capturedAt: string; before: Scores; current: Scores }
const score = (value: number | null) => value === null ? 'ยังไม่สอบ' : value.toLocaleString('th-TH', { maximumFractionDigits: 2 });

export default function CampaignArchiveReport() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [room, setRoom] = useState('');
  const [search, setSearch] = useState('');
  async function load() {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/campaign-archive', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'โหลดไม่สำเร็จ');
      setRows(result.students);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'โหลดไม่สำเร็จ'); }
    finally { setLoading(false); }
  }
  const shown = (rows || []).filter(row => (!room || row.classroom === room) && row.name.includes(search.trim()));
  return <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-6 space-y-4" aria-busy={loading}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h3 className="font-bold text-lg text-white">ประวัติก่อนเปิดรอบใหม่ 2/2569</h3>
        <p className="text-sm text-slate-400 mt-1">เปรียบเทียบผลสอบก่อนรีเซ็ตกับรอบปัจจุบัน แยกจากรายงานเทอม 1</p></div>
      <button onClick={load} disabled={loading} className="min-h-12 rounded-xl bg-indigo-600 px-4 font-bold text-white disabled:opacity-50">{loading ? 'กำลังโหลด…' : rows ? 'อัปเดตข้อมูล' : 'ดูข้อมูลเปรียบเทียบ'}</button>
    </div>
    {error && <p role="alert" className="text-rose-300">{error}</p>}
    {rows?.length === 0 && <p className="text-slate-300">ยังไม่ได้เปิดรอบใหม่ จึงยังไม่มี snapshot ก่อนรีเซ็ต</p>}
    {!!rows?.length && <>
      <p className="text-sm text-slate-400">เก็บข้อมูลเมื่อ {new Date(rows[0].capturedAt).toLocaleString('th-TH')} • คะแนนเทียบฐาน 25 คะแนน • จำนวนรอบแสดงสถานะการทำ Pre-test</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <label className="text-slate-300 text-sm">ห้องเรียน<select value={room} onChange={e => setRoom(e.target.value)} className="block min-h-12 mt-1 rounded-lg bg-slate-800 px-3 w-full"><option value="">ทุกห้อง</option>{[...new Set(rows.map(row => row.classroom))].sort().map(name => <option key={name}>{name}</option>)}</select></label>
        <label className="text-slate-300 text-sm flex-1">ค้นหาชื่อ<input value={search} onChange={e => setSearch(e.target.value)} className="block min-h-12 mt-1 rounded-lg bg-slate-800 px-3 w-full" /></label>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left text-slate-200">
        <caption className="text-left py-2 text-slate-400">{shown.length} คน — เครื่องหมาย “ยังไม่สอบ” ไม่ใช่คะแนนศูนย์</caption>
        <thead><tr className="border-b border-slate-700"><th className="p-3">นักเรียน / ห้อง</th><th className="p-3">ก่อนรีเซ็ต</th><th className="p-3">รอบปัจจุบัน</th></tr></thead>
        <tbody>{shown.map(row => <tr key={row.id} className="border-b border-slate-800 align-top"><th scope="row" className="p-3 min-w-40 font-medium">{row.name}<span className="block text-slate-400">{row.classroom}</span></th>{(['before', 'current'] as const).map(key => <td key={key} className="p-3 min-w-44"><p>Pre-test: {score(row[key].preScore)} ({row[key].count}/5 รอบ)</p><p>Post-test: {score(row[key].postScore)}</p><p>Learning gain: {row[key].gain === null ? '—' : score(row[key].gain) + '%'}</p><p className="text-slate-400">ด่าน {row[key].stage ?? '—'}</p></td>)}</tr>)}</tbody>
      </table></div>
    </>}
  </section>;
}
