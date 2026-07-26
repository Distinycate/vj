import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Sparkles, Users, Play, Pause, Wrench, Trophy, X, Gift } from 'lucide-react';
import { adjustStudentCoins, adjustStudentTickets } from '@/utils/cardBattle';

export default function EventAnalyticsTab({ teacher }: { teacher: any }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupBusy, setSetupBusy] = useState(false);
  const [error, setError] = useState('');
  
  // End Event Modal State
  const [endEventModal, setEndEventModal] = useState<any>(null);
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [rewardCoins, setRewardCoins] = useState(1000);
  const [rewardTickets, setRewardTickets] = useState(5);
  const [rewarding, setRewarding] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase.from('events').select('*').order('created_at', { ascending: false });
    if (data) setEvents(data);
    if (loadError) setError(`โหลดกิจกรรมไม่สำเร็จ: ${loadError.message}`);
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const openEndEventModal = async (event: any) => {
    setEndEventModal(event);
    setTopPlayers([]);
    const { data } = await supabase.from('event_attempts')
      .select('user_id, score, accuracy, students(student_name, student_id)')
      .eq('event_id', event.id)
      .eq('status', 'completed')
      .order('score', { ascending: false })
      .limit(3);
    if (data) setTopPlayers(data);
  };

  const confirmEndEvent = async () => {
    if (!endEventModal || rewarding || !teacher) return;
    setRewarding(true);
    try {
      // Give rewards
      for (const player of topPlayers) {
        if (rewardCoins > 0) {
          await adjustStudentCoins(teacher.id, player.user_id, rewardCoins, `ชนะกิจกรรม ${endEventModal.title}`, 'POSITIVE_BEHAVIOR');
        }
        if (rewardTickets > 0) {
          await adjustStudentTickets(teacher.id, player.user_id, rewardTickets, `ชนะกิจกรรม ${endEventModal.title}`, 'POSITIVE_BEHAVIOR');
        }
      }
      
      // Update status
      const { error: updateError } = await supabase.from('events').update({ status: 'completed' }).eq('id', endEventModal.id);
      if (updateError) throw updateError;
      
      setEndEventModal(null);
      await loadEvents();
    } catch (e: any) {
      setError(`เกิดข้อผิดพลาดในการจบกิจกรรม: ${e.message}`);
    } finally {
      setRewarding(false);
    }
  };

  const toggleEventStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'upcoming' : 'active';
    const { error: updateError } = await supabase.from('events').update({ status: newStatus }).eq('id', id);
    if (updateError) {
      setError(`เปลี่ยนสถานะไม่สำเร็จ: ${updateError.message}`);
      return;
    }
    loadEvents();
  };

  const setupVerbMaster = async () => {
    setSetupBusy(true);
    setError('');
    const { actionSetupVerbMasterEvent } = await import('@/app/events/verb-master/actions');
    const result = await actionSetupVerbMasterEvent();
    if (result.success) {
      await loadEvents();
    } else {
      setError(`สร้างหรือซ่อมกิจกรรมไม่สำเร็จ: ${result.error}`);
    }
    setSetupBusy(false);
  };

  if (loading) return <div className="text-white text-center py-10">กำลังโหลดข้อมูล Event...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-900 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2"><Sparkles className="text-amber-400"/> Event Center Management</h2>
          <p className="text-slate-400 text-sm mt-1">จัดการสถานะกิจกรรมพิเศษและดูผลการเรียนรู้ของนักเรียน</p>
        </div>
        <button
          onClick={setupVerbMaster}
          disabled={setupBusy}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-bold py-3 px-5 rounded-xl inline-flex items-center justify-center gap-2"
        >
          <Wrench className="w-5 h-5" />
          {setupBusy ? 'กำลังสร้างข้อมูล...' : 'สร้าง/ซ่อม Verb Master'}
        </button>
      </div>

      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-300">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map(event => (
          <div key={event.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="h-24 bg-gradient-to-r from-indigo-900 to-purple-900 p-4 relative">
              <h3 className="text-lg font-bold text-white mb-1">{event.title}</h3>
              <p className="text-xs text-slate-300">{event.theme}</p>
              
              <div className="absolute top-4 right-4">
                <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                  event.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 
                  'bg-amber-500/20 text-amber-400 border-amber-500/50'
                }`}>
                  {event.status.toUpperCase()}
                </span>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
               <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                 <span className="text-slate-400 flex items-center gap-1"><Users className="w-4 h-4"/> ประเภท</span>
                 <span className="text-white font-bold">{event.event_type}</span>
               </div>
               
               <div className="flex justify-end gap-2 pt-2">
                 {event.status === 'active' && (
                   <button 
                     onClick={() => openEndEventModal(event)}
                     className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30"
                   >
                     <Trophy className="w-4 h-4"/> จบกิจกรรมแจกรางวัล
                   </button>
                 )}
                 <button 
                   onClick={() => toggleEventStatus(event.id, event.status)}
                   className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                     event.status === 'active' 
                      ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30' 
                      : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                   }`}
                 >
                   {event.status === 'active' ? <><Pause className="w-4 h-4"/> ปิดใช้งาน</> : <><Play className="w-4 h-4"/> เปิดใช้งาน</>}
                 </button>
               </div>
            </div>
          </div>
        ))}
      </div>
      
      {events.length === 0 && (
         <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center">
            <p className="text-slate-400">ยังไม่มี Event ในระบบ กด “สร้าง/ซ่อม Verb Master” ด้านบนเพื่อเริ่มต้น</p>
         </div>
      )}
      
      {/* End Event Modal */}
      {endEventModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Trophy className="text-amber-400" /> สรุปผลกิจกรรม: {endEventModal.title}
              </h3>
              <button onClick={() => setEndEventModal(null)} className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Top 3 ผู้ชนะ (Rank)</h4>
                {topPlayers.length === 0 ? (
                  <div className="text-slate-500 text-sm text-center py-4 bg-slate-800/30 rounded-xl">ยังไม่มีผู้เข้าร่วมทำคะแนนจบสมบูรณ์</div>
                ) : (
                  <div className="space-y-2">
                    {topPlayers.map((player, idx) => (
                      <div key={player.user_id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800 border border-slate-700">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 flex items-center justify-center rounded-full font-black text-xs ${idx === 0 ? 'bg-amber-500 text-amber-950' : idx === 1 ? 'bg-slate-300 text-slate-900' : 'bg-amber-700/50 text-amber-100'}`}>
                            {idx + 1}
                          </span>
                          <span className="font-bold text-white text-sm">{player.students?.student_name || 'ไม่ระบุชื่อ'}</span>
                        </div>
                        <span className="text-emerald-400 font-bold text-sm">{player.score} คะแนน</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 p-4 rounded-2xl">
                <h4 className="text-sm font-bold text-fuchsia-300 mb-3 flex items-center gap-2">
                  <Gift className="w-4 h-4" /> ตั้งค่าของรางวัล (สำหรับ Top 3)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">เหรียญ (Coins)</label>
                    <input 
                      type="number" min="0" step="50"
                      value={rewardCoins} onChange={(e) => setRewardCoins(Number(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 text-amber-400 font-bold rounded-xl px-3 py-2 text-sm focus:border-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">ตั๋วสุ่ม (Tickets)</label>
                    <input 
                      type="number" min="0" step="1"
                      value={rewardTickets} onChange={(e) => setRewardTickets(Number(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 text-sky-400 font-bold rounded-xl px-3 py-2 text-sm focus:border-sky-500 outline-none"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-fuchsia-300/60 mt-3 text-center">รางวัลนี้จะถูกแจกเข้ากระเป๋านักเรียนผู้ชนะทั้งหมดโดยอัตโนมัติเมื่อกดจบกิจกรรม</p>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
              <button 
                onClick={() => setEndEventModal(null)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmEndEvent}
                disabled={rewarding}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-amber-950 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {rewarding ? 'กำลังประมวลผล...' : 'ยืนยันจบกิจกรรมแจกรางวัล'}
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
