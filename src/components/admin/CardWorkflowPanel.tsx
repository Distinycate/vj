'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Clock, Gift, Megaphone, RefreshCw, XCircle } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import { announceCardAction, resolveCardAction } from '@/utils/cardBattle';

export default function CardWorkflowPanel({ teacher, classroomId }: { teacher: any; classroomId: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [resultText, setResultText] = useState<Record<string, string>>({});
  const [ticketAmount, setTicketAmount] = useState(1);
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');

  const loadData = useCallback(async () => {
    if (!classroomId) return;
    const { data: studentData } = await supabase
      .from('students')
      .select('id, student_name')
      .eq('classroom_id', classroomId)
      .eq('is_active', true)
      .order('student_name');
    setStudents(studentData || []);
    const ids = (studentData || []).map((student) => student.id);
    if (ids.length === 0) {
      setLogs([]);
      return;
    }
    const { data } = await supabase
      .from('card_logs')
      .select('*, attacker:attacker_id(student_name), target:target_id(student_name), played_card:played_card_id(*), counter_card:counter_card_id(*)')
      .or(`attacker_id.in.(${ids.join(',')}),target_id.in.(${ids.join(',')})`)
      .in('status', ['PENDING', 'COUNTER_PHASE'])
      .order('created_at', { ascending: true });
    setLogs(data || []);
  }, [classroomId]);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel(`teacher-card-workflow-${classroomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'card_logs' }, loadData)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [classroomId, loadData]);

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

  async function awardTickets() {
    if (selectedStudents.length === 0) return setMessage('กรุณาเลือกนักเรียนอย่างน้อย 1 คน');
    const { data, error } = await supabase.rpc('award_free_pull_tickets', {
      p_teacher_id: teacher.id,
      p_student_ids: selectedStudents,
      p_amount: ticketAmount,
      p_reason: 'รางวัลความดีจากครู',
    });
    setMessage(error ? error.message : `มอบตั๋วสำเร็จ ${data} คน`);
    if (!error) setSelectedStudents([]);
  }

  return (
    <div className="space-y-6">
      {message && <div className="p-3 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-xl">{message}</div>}

      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <Gift className="text-fuchsia-400" /> แจกตั๋วสุ่มฟรี
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
          {students.map((student) => (
            <label key={student.id} className="flex gap-2 items-center p-3 bg-slate-950 rounded-xl text-sm text-slate-300">
              <input
                type="checkbox"
                checked={selectedStudents.includes(student.id)}
                onChange={(event) => setSelectedStudents((current) =>
                  event.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id)
                )}
              />
              {student.student_name}
            </label>
          ))}
        </div>
        <div className="flex gap-3 mt-4">
          <input
            type="number"
            min={1}
            max={100}
            value={ticketAmount}
            onChange={(event) => setTicketAmount(Number(event.target.value))}
            className="w-24 bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"
          />
          <button onClick={awardTickets} className="px-5 bg-fuchsia-500 hover:bg-fuchsia-400 rounded-xl text-white font-bold">
            มอบตั๋ว
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-white">รายการรอครูดำเนินการ</h2>
        <button onClick={loadData} className="p-2 bg-slate-800 rounded-xl text-slate-300"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {logs.map((log) => (
        <div key={log.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <div className="font-black text-white">
                {log.attacker?.student_name} → {log.target?.student_name || 'ตัวเอง'}
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
