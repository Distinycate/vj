'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Clock, Check, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import { resolveCardAction, teacherMarkCardExecuted } from '@/utils/cardBattle';

export default function CardWorkflowPanel({ teacher }: { teacher: any; classroomId?: string }) {
  const [actionLogs, setActionLogs] = useState<any[]>([]);
  const [pendingLogs, setPendingLogs] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');

  const loadData = useCallback(async () => {
    const { data } = await supabase
      .from('card_logs')
      .select('*, attacker:attacker_id(student_name, classroom_id, classrooms(class_name)), target:target_id(student_name, classroom_id, classrooms(class_name)), played_card:played_card_id(*)')
      .or('status.eq.PENDING,and(status.eq.RESOLVED,teacher_executed.eq.false)')
      .order('created_at', { ascending: true });

    if (data) {
      setPendingLogs(data.filter(d => d.status === 'PENDING'));
      // Only show attacks in the execution queue
      setActionLogs(data.filter(d => d.status === 'RESOLVED' && d.played_card?.effect_type === 'ATTACK' && !d.teacher_executed));
    }
  }, []);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel(`teacher-card-workflow`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'card_logs' }, loadData)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  async function handlePending(logId: string, approve: boolean) {
    setBusyId(logId);
    setMessage('');
    try {
      await resolveCardAction(logId, teacher.id, approve, approve ? 'อนุมัติการใช้สิทธิ์' : 'ไม่อนุมัติ คืนการ์ดให้นักเรียน');
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ');
    } finally {
      setBusyId('');
    }
  }

  async function handleExecution(logId: string) {
    setBusyId(logId);
    setMessage('');
    try {
      await teacherMarkCardExecuted(teacher.id, logId);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'อัปเดตสถานะไม่สำเร็จ');
    } finally {
      setBusyId('');
    }
  }

  // --- Grouping Action Logs by Target Student ---
  const actionSummary = actionLogs.reduce((acc: any, log: any) => {
    const targetName = log.target?.student_name;
    if (!targetName) return acc;
    if (!acc[targetName]) acc[targetName] = [];
    acc[targetName].push(log);
    return acc;
  }, {});
  
  const groupedActions = Object.entries(actionSummary).sort((a: any, b: any) => b[1].length - a[1].length);

  return (
    <div className="space-y-8">
      {message && <div className="p-3 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-xl">{message}</div>}

      {/* --- Action Queue (RESOLVED BUT UNEXECUTED) --- */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              📋 รายการรอดำเนินการ (Action Required)
            </h2>
            <p className="text-xs text-slate-500 mt-1">สรุปการ์ดโจมตีที่เข้าเป้า คุณครูสามารถทยอยกดยืนยันเมื่อนักเรียนทำโทษเสร็จแล้ว</p>
          </div>
          <button onClick={loadData} className="p-2 bg-slate-800 rounded-xl text-slate-300"><RefreshCw className="w-4 h-4" /></button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupedActions.map(([studentName, logs]: any) => {
            // Group by card inside the student
            const cardCounts = logs.reduce((acc: any, log: any) => {
              const name = log.played_card?.name || 'การ์ดโจมตี';
              if (!acc[name]) acc[name] = { count: 0, logs: [] };
              acc[name].count++;
              acc[name].logs.push(log);
              return acc;
            }, {});

            return (
              <div key={studentName} className="bg-slate-900/60 border border-rose-500/30 rounded-2xl p-5 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                <div className="font-black text-white text-lg flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                  {studentName}
                  <span className="text-sm px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded-full">{logs.length} รายการ</span>
                </div>
                <div className="space-y-4">
                  {Object.entries(cardCounts).map(([cardName, data]: any) => (
                    <div key={cardName}>
                      <div className="flex justify-between text-slate-300 mb-2">
                        <span className="font-bold">{cardName}</span>
                        <span className="text-rose-400 font-black">x{data.count}</span>
                      </div>
                      <button 
                        disabled={busyId !== ''} 
                        onClick={() => handleExecution(data.logs[0].id)} 
                        className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex justify-center items-center gap-2 transition-colors"
                      >
                        <Check className="w-4 h-4 text-emerald-400" /> ทำโทษแล้ว 1 ใบ
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {groupedActions.length === 0 && (
            <div className="col-span-full text-center p-12 border border-dashed border-slate-800 rounded-3xl text-slate-500">
              ไม่มีรายการลงโทษค้างอยู่
            </div>
          )}
        </div>
      </div>

      {/* --- Pending Queue (EARLY_HOME) --- */}
      <div className="pt-6 border-t border-slate-800">
        <h2 className="text-xl font-black text-white mb-1">อนุมัติการ์ดพิเศษ (รอครูอนุญาต)</h2>
        <p className="text-xs text-slate-500 mb-4">คำขอใช้การ์ดกลับบ้านก่อน หรือการ์ดที่ต้องได้รับอนุญาตจากครูโดยตรง</p>
        
        <div className="space-y-3">
          {pendingLogs.map((log) => (
            <div key={log.id} className="bg-slate-900/60 border border-amber-500/30 rounded-2xl p-5 flex flex-col md:flex-row gap-4 justify-between md:items-center">
              <div>
                <div className="font-black text-white text-lg">
                  {log.attacker?.student_name}
                  <span className="text-xs text-slate-500 font-normal ml-2">
                    ({Array.isArray(log.attacker?.classrooms) ? log.attacker.classrooms[0]?.class_name : log.attacker?.classrooms?.class_name || 'ไม่ทราบห้อง'})
                  </span>
                </div>
                <div className="text-amber-300 font-bold mt-1">
                  ขอใช้: {log.played_card?.image_url} {log.played_card?.name}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  เวลาส่งคำขอ: {new Date(log.created_at).toLocaleTimeString('th-TH')}
                </div>
              </div>
              <div className="flex gap-2">
                <button disabled={busyId === log.id} onClick={() => handlePending(log.id, true)} className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> อนุญาต
                </button>
                <button disabled={busyId === log.id} onClick={() => handlePending(log.id, false)} className="px-4 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 rounded-xl font-black flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> ปฏิเสธ
                </button>
              </div>
            </div>
          ))}

          {pendingLogs.length === 0 && (
            <div className="text-center p-8 border border-dashed border-slate-800 rounded-3xl text-slate-500">
              ไม่มีคำขออนุมัติการ์ดค้างอยู่
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
