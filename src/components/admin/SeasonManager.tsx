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
    const { data } = await supabase
      .from('team_battle_seasons')
      .select('*')
      .eq('scope', 'school')
      .order('created_at', { ascending: false });
    
    if (data) setSeasons(data);
    setLoading(false);
  }

  async function handleCreateSeason(e: React.FormEvent) {
    e.preventDefault();
    if (!newSeasonName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      // 1. Deactivate all current school seasons
      await supabase
        .from('team_battle_seasons')
        .update({ is_active: false })
        .eq('scope', 'school');

      // 2. Create new season
      await supabase
        .from('team_battle_seasons')
        .insert([{
          season_name: newSeasonName,
          scope: 'school',
          is_active: true
        }]);

      setNewSeasonName('');
      await loadSeasons();
    } catch (err) {
      console.error('Failed to create season', err);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCloseAndReward(seasonId: string) {
    if (!teacher?.id || !window.confirm('ยืนยันปิดฤดูกาลและแจกตั๋วให้สมาชิกทีมที่ชนะ? การทำรายการนี้ซ้ำไม่ได้')) return;
    setMessage('');
    const { data, error } = await supabase.rpc('close_and_reward_team_season', {
      p_season_id: seasonId,
      p_teacher_id: teacher.id,
    });
    if (error) setMessage(error.message);
    else {
      setMessage(`ทีม ${data.winner_team_name} ชนะ แจกตั๋วแล้ว ${data.rewarded_members} คน`);
      await loadSeasons();
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {message && (
          <div className="lg:col-span-3 p-3 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-xl">
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
