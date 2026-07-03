import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Sparkles, Users, Play, Pause, Wrench } from 'lucide-react';

export default function EventAnalyticsTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupBusy, setSetupBusy] = useState(false);
  const [error, setError] = useState('');

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
                 <button 
                   onClick={() => toggleEventStatus(event.id, event.status)}
                   className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                     event.status === 'active' 
                      ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30' 
                      : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                   }`}
                 >
                   {event.status === 'active' ? <><Pause className="w-4 h-4"/> ปิดกิจกรรม</> : <><Play className="w-4 h-4"/> เปิดกิจกรรม</>}
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
      
    </div>
  );
}
