'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Trophy, Plus, CheckCircle, Clock } from 'lucide-react';

export default function SeasonManager() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState('');
  const teacher = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('vocab_journey_teacher') || 'null')
    : null;

  useEffect(() => {
    loadSeasons();
  }, []);

  async function loadSeasons() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/seasons');
      const data = await res.json();
      if (data?.seasons) setSeasons(data.seasons);
    } catch (err) {
      console.error('Failed to load seasons', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSeason(e: React.FormEvent) {
    e.preventDefault();
    if (!newSeasonName.trim() || isCreating) return;

    setIsCreating(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', seasonName: newSeasonName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'สร้างฤดูกาลไม่สำเร็จ');

      setNewSeasonName('');
      setMessage(`สร้างฤดูกาล "${data.season?.season_name}" เรียบร้อยแล้ว`);
      await loadSeasons();
    } catch (err) {
      console.error('Failed to create season', err);
      setMessage(err instanceof Error ? err.message : 'สร้างฤดูกาลไม่สำเร็จ');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCloseAndReward(seasonId: string) {
    if (!window.confirm('ยืนยันปิดฤดูกาล?\n- แจกตั๋วสุ่มฟรีให้ทีม Top 3 (10, 7, 5 ใบ)\n- ทำโทษทีม 3 อันดับสุดท้ายด้วยการลบการ์ด (3, 2, 1 ใบ)\nการทำรายการนี้ไม่สามารถย้อนกลับได้')) return;
    setMessage('');
    try {
      const res = await fetch('/api/admin/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close_and_reward', seasonId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ปิดฤดูกาลไม่สำเร็จ');

      const rewardSummary = (data.rewards || []).map((r: any) => `อันดับ ${r.rank}: ทีม ${r.teamName} (${r.ticketsAwarded} ใบ)`).join(', ');
      const penaltySummary = (data.penalties || []).map((p: any) => `ทีม ${p.teamName} (ริบ ${p.penaltyCardsPerMember} ใบ)`).join(', ');

      setMessage(`🎉 ปิดฤดูกาลสำเร็จ!\n🏆 ทีมชนะ: ${rewardSummary || '-'}\n⚠️ ทำโทษทีมท้าย: ${penaltySummary || '-'}`);
      await loadSeasons();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'ปิดฤดูกาลไม่สำเร็จ');
    }
  }

  if (loading) {
    return <div className="text-slate-400 p-8 text-center bg-slate-900/40 rounded-3xl animate-pulse">กำลังโหลดข้อมูลฤดูกาล...</div>;
  }

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/30">
          <Trophy className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">ระบบจัดการฤดูกาลแข่งขัน (Team Battle Seasons)</h2>
          <p className="text-slate-400 mt-1">เริ่มต้นฤดูกาลใหม่เพื่อรีเซ็ตคะแนนและจัดการแข่งขันรอบใหม่</p>
        </div>
      </div>

      {/* Rules Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 flex items-start gap-3">
          <div className="text-2xl">🏆</div>
          <div>
            <h4 className="font-bold text-emerald-300 text-sm">รางวัลสำหรับ 3 อันดับแรก (Top 3)</h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              • <strong>อันดับ 1:</strong> สมาชิกในทีมรับตั๋วสุ่มฟรีคนละ <strong>10 ใบ</strong><br />
              • <strong>อันดับ 2:</strong> สมาชิกในทีมรับตั๋วสุ่มฟรีคนละ <strong>7 ใบ</strong><br />
              • <strong>อันดับ 3:</strong> สมาชิกในทีมรับตั๋วสุ่มฟรีคนละ <strong>5 ใบ</strong>
            </p>
          </div>
        </div>

        <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-3">
          <div className="text-2xl">⚠️</div>
          <div>
            <h4 className="font-bold text-rose-300 text-sm">บทลงโทษสำหรับ 3 อันดับสุดท้าย (Bottom 3)</h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              • <strong>อันดับสุดท้าย (บ๊วย):</strong> ทำโทษด้วยการริบการ์ดสมาชิกคนละ <strong>3 ใบ</strong><br />
              • <strong>อันดับรองบ๊วย:</strong> ทำโทษด้วยการริบการ์ดสมาชิกคนละ <strong>2 ใบ</strong><br />
              • <strong>อันดับ 3 จากท้าย:</strong> ทำโทษด้วยการริบการ์ดสมาชิกคนละ <strong>1 ใบ</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {message && (
          <div className="lg:col-span-3 p-4 bg-indigo-500/10 text-indigo-200 border border-indigo-500/30 rounded-xl whitespace-pre-line text-sm">
            {message}
          </div>
        )}
        {/* New Season Form */}
        <div className="lg:col-span-1">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              เปิดฤดูกาลใหม่
            </h3>
            <form onSubmit={handleCreateSeason}>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">ชื่อฤดูกาล</label>
                <input 
                  type="text" 
                  value={newSeasonName}
                  onChange={e => setNewSeasonName(e.target.value)}
                  placeholder="เช่น ฤดูกาลสอบปลายภาค ปี 67"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>
              <p className="text-xs text-rose-400 mb-4 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20 leading-relaxed">
                *การเปิดฤดูกาลใหม่จะทำการปิดฤดูกาลปัจจุบันทันที คะแนนของฤดูกาลใหม่จะเริ่มนับจาก 0
              </p>
              <button 
                type="submit" 
                disabled={isCreating || !newSeasonName.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg"
              >
                {isCreating ? 'กำลังสร้าง...' : 'สร้างฤดูกาลใหม่'}
              </button>
            </form>
          </div>
        </div>

        {/* Seasons List */}
        <div className="lg:col-span-2">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            ประวัติฤดูกาล
          </h3>
          <div className="space-y-3">
            {seasons.map((season) => (
              <div 
                key={season.id} 
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  season.is_active 
                    ? 'bg-indigo-500/10 border-indigo-500/30' 
                    : 'bg-slate-950 border-slate-800 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className={`font-bold ${season.is_active ? 'text-indigo-400' : 'text-slate-300'}`}>
                      {season.season_name}
                    </h4>
                    {season.is_active && (
                      <span className="px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-bold uppercase rounded-full tracking-wider">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    สร้างเมื่อ: {new Date(season.created_at).toLocaleDateString('th-TH')}
                  </p>
                </div>
                {season.is_active ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-indigo-400" />
                    <button
                      onClick={() => handleCloseAndReward(season.id)}
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-lg"
                    >
                      ปิดฤดูกาล + แจกรางวัล
                    </button>
                  </div>
                ) : (
                  <div className="text-xs font-bold text-slate-500 bg-slate-900 px-3 py-1 rounded-lg">จบฤดูกาลแล้ว</div>
                )}
              </div>
            ))}
            
            {seasons.length === 0 && (
              <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl text-slate-500">
                ยังไม่มีการสร้างฤดูกาล
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
