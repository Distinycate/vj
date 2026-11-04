'use client';
import { useEffect, useState } from 'react';

type Word = { word: string; meaning: string; count: number };

export default function SchoolTermWrongWords({ term }: { term: '1' | '2' }) {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setWords([]);
    fetch(`/api/admin/school-term-words?term=${term}`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('โหลดประวัติคำศัพท์ไม่สำเร็จ'); const data = await response.json(); setWords(data.words || []); })
      .catch(err => { if (err.name !== 'AbortError') setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [term]);
  return <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 space-y-4">
    <div><h3 className="text-base font-black text-white">คำศัพท์ที่ตอบผิดบ่อย · เทอม {term}/2569</h3><p className="text-sm text-slate-400">จากประวัติการตอบรายครั้งของนักเรียนภายในโรงเรียน</p></div>
    <p className="text-xs text-slate-400">{term === '1' ? '1 พ.ค. – 31 ต.ค. 2569' : '1 พ.ย. 2569 – 30 เม.ย. 2570'} · แสดงเฉพาะประวัติรายครั้งที่ระบบบันทึกไว้ ข้อมูลก่อนเริ่มบันทึกอาจไม่ครบ</p>
    {loading ? <p className="text-slate-300">กำลังโหลดคำศัพท์…</p> : error ? <p role="alert" className="text-rose-300">{error}</p> : words.length ? <ol className="grid gap-3 md:grid-cols-2">{words.map((item, index) => <li key={item.word} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex justify-between gap-3"><div><span className="text-slate-400 mr-2">{index + 1}.</span><strong className="text-white">{item.word}</strong><p className="text-sm text-slate-400">{item.meaning || 'ไม่มีคำแปล'}</p></div><span className="text-rose-300 font-bold">{item.count} ครั้ง</span></li>)}</ol> : <p className="text-slate-400">ไม่พบประวัติคำตอบผิดในภาคเรียนนี้ หรือยังไม่มีการบันทึกประวัติรายครั้ง</p>}
  </section>;
}
