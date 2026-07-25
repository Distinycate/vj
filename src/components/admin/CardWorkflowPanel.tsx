'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Clock, Megaphone, RefreshCw, XCircle } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import { announceCardAction, resolveCardAction } from '@/utils/cardBattle';

export default function CardWorkflowPanel({ teacher }: { teacher: any; classroomId?: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [resultText, setResultText] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');

  const loadData = useCallback(async () => {
    const { data } = await supabase
      .from('card_logs')
      .select('*, attacker:attacker_id(student_name, classroom_id, classrooms(class_name)), target:target_id(student_name, classroom_id, classrooms(class_name)), played_card:played_card_id(*), counter_card:counter_card_id(*)')
      .in('status', ['PENDING', 'COUNTER_PHASE'])
      .order('created_at', { ascending: true });
    setLogs(data || []);
  }, []);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel(`teacher-card-workflow-schoolwide`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'card_logs' }, loadData)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  async function run(logId: string, action: 'announce' | 'approve' | 'reject') {
    setBusyId(logId);
    setMessage('');
    try {
      if (action === 'announce') await announceCardAction(logId, teacher.id);
      else await resolveCardAction(logId, teacher.id, action === 'approve', resultText[logId] || '');
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ');
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="space-y-6">
      {message && <div className="p-3 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-xl">{message}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">รายการรอครูดำเนินการทั้งโรงเรียน</h2>
          <p className="text-xs text-slate-500 mt-1">นักเรียนใช้การ์ดข้ามห้องได้ แต่ทุกคำขอต้องผ่านครูประกาศและอนุมัติผลก่อนมีผลจริง</p>
        </div>
        <button onClick={loadData} className="p-2 bg-slate-800 rounded-xl text-slate-300"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {logs.map((log) => (
        <div key={log.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <div className="font-black text-white">
                {log.attacker?.student_name}
                <span className="text-xs text-slate-500 font-normal ml-1">
                  ({Array.isArray(log.attacker?.classrooms) ? log.attacker.classrooms[0]?.class_name : log.attacker?.classrooms?.class_name || 'ไม่ทราบห้อง'})
                </span>
                {' → '}
                {log.target?.student_name || 'ตัวเอง'}
                {log.target && (
                  <span className="text-xs text-slate-500 font-normal ml-1">
                    ({Array.isArray(log.target?.classrooms) ? log.target.classrooms[0]?.class_name : log.target?.classrooms?.class_name || 'ไม่ทราบห้อง'})
                  </span>
                )}
                {log.metadata?.additionalTargets && log.metadata.additionalTargets.length > 0 && (
                  <span className="text-sm text-slate-400 font-normal ml-2">
                    (และ {log.metadata.additionalTargets.map((t: any) => `${t.name}${t.classroom ? ` ${t.classroom}` : ''}`).join(', ')})
                  </span>
                )}
              </div>
              <div className="text-fuchsia-300 mt-1">
                {log.played_card?.image_url} {log.played_card?.name}
              </div>
              {log.counter_card && (
                <div className="text-sky-300 mt-1">สวนกลับด้วย {log.counter_card.image_url} {log.counter_card.name}</div>
              )}
            </div>
            <span className={`h-fit px-3 py-1 rounded-full text-xs font-bold ${
              log.status === 'PENDING' ? 'bg-amber-500/10 text-amber-300' : 'bg-rose-500/10 text-rose-300'
            }`}>
              {log.status === 'PENDING' ? 'รอประกาศ' : 'ช่วงสวนกลับ'}
            </span>
          </div>

          <input
            value={resultText[log.id] || ''}
            onChange={(event) => setResultText((current) => ({ ...current, [log.id]: event.target.value }))}
            placeholder="ข้อความสรุปผลสำหรับรายงาน"
            className="w-full mt-4 bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"
          />
          <div className="flex flex-wrap gap-2 mt-4">
            {log.status === 'PENDING' && (
              <button disabled={busyId === log.id} onClick={() => run(log.id, 'announce')} className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl font-bold flex gap-2">
                <Megaphone className="w-4 h-4" /> ประกาศและเริ่ม 30 นาที
              </button>
            )}
            {log.status === 'COUNTER_PHASE' && (
              <span className="px-3 py-2 text-sm text-slate-400 flex gap-2"><Clock className="w-4 h-4" /> ครูสามารถยืนยันได้ตลอดเวลา</span>
            )}
            {log.status === 'COUNTER_PHASE' && (
              <button disabled={busyId === log.id} onClick={() => run(log.id, 'approve')} className="px-4 py-2 bg-emerald-500 text-slate-950 rounded-xl font-bold flex gap-2">
                <CheckCircle className="w-4 h-4" /> อนุมัติผล
              </button>
            )}
            <button disabled={busyId === log.id} onClick={() => run(log.id, 'reject')} className="px-4 py-2 bg-rose-500/15 text-rose-300 rounded-xl font-bold flex gap-2">
              <XCircle className="w-4 h-4" /> ตีกลับและคืนการ์ด
            </button>
          </div>
        </div>
      ))}

      {logs.length === 0 && (
        <div className="text-center p-12 border border-dashed border-slate-800 rounded-3xl text-slate-500">
          ไม่มีรายการการ์ดที่รอดำเนินการ
        </div>
      )}
    </div>
  );
}
