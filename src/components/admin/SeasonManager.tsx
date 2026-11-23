'use client';
import { useState, useEffect } from 'react';
import { Trophy, Plus, CheckCircle, Clock } from 'lucide-react';
import type { TeamStanding } from '@/utils/teamBattleEngine';

export default function SeasonManager() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [classrooms, setClassrooms] = useState<{ id: string; class_name: string }[]>([]);
  const [classroomId, setClassroomId] = useState('');
  const [settlingId, setSettlingId] = useState<string | null>(null);
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
      if (!res.ok) throw new Error(data.error || 'โหลดข้อมูลฤดูกาลไม่สำเร็จ');
      if (data?.seasons) setSeasons(data.seasons);
      if (data?.classrooms) setClassrooms(data.classrooms);
    } catch (err) {
      console.error('Failed to load seasons', err);
      setMessage(err instanceof Error ? err.message : 'โหลดข้อมูลฤดูกาลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSeason(e: React.FormEvent) {
    e.preventDefault();
    if (!newSeasonName.trim() || isCreating || settlingId) return;

    setIsCreating(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', seasonName: newSeasonName.trim(), classroomId: classroomId || undefined }),
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
    if (settlingId || isCreating) return;
    setSettlingId(seasonId);
    setMessage('');
    try {
      async function post(action: 'preview_rewards' | 'close_and_reward', revision?: string) {
        const res = await fetch('/api/admin/seasons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, seasonId, revision }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'ทำรายการฤดูกาลไม่สำเร็จ');
        return data;
      }
      const preview = await post('preview_rewards');
      if (preview.alreadyClosed) {
        setMessage('ฤดูกาลนี้ปิดแล้ว ไม่แจกรางวัลหรือหักการ์ดซ้ำ');
        await loadSeasons();
        return;
      }
      const rows = (preview.teams as (TeamStanding & { tickets: number; penalty: number })[])
        .filter(row => row.tickets > 0 || row.penalty > 0)
        .map(row => `อันดับ ${row.rank} • ${row.team_name} (${row.finalScore} คะแนน): ${row.tickets
          ? `ตั๋ว ${row.tickets} ใบ/คน` : `หักการ์ดได้สูงสุด ${row.penalty} ใบ/คน`}`);
      if (!window.confirm(['ยืนยันปิดฤดูกาลตามผลต่อไปนี้?', ...rows,
        ...(rows.length === 0 ? ['ไม่มีทีมทำคะแนน จึงไม่แจกตั๋วหรือหักการ์ด'] : []),
        'การทำรายการนี้ไม่สามารถย้อนกลับได้'].join('\n'))) return;
      const data = await post('close_and_reward', preview.revision);
      if (data.alreadyClosed) { setMessage('ฤดูกาลนี้ปิดแล้ว ไม่แจกรางวัลหรือหักการ์ดซ้ำ'); return; }

      const rewardSummary = (data.rewards || []).map((r: any) => `อันดับ ${r.rank}: ทีม ${r.teamName} (${r.ticketsAwarded} ใบ)`).join(', ');
      const penaltySummary = (data.penalties || []).map((p: any) => `ทีม ${p.teamName} (ริบ ${p.penaltyCardsPerMember} ใบ)`).join(', ');

      setMessage(`🎉 ปิดฤดูกาลสำเร็จ!\n🏆 ทีมชนะ: ${rewardSummary || '-'}\n⚠️ ทำโทษทีมท้าย: ${penaltySummary || '-'}`);
      await loadSeasons();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'ปิดฤดูกาลไม่สำเร็จ');
    } finally {
      setSettlingId(null);
    }
  }

  async function handleTermReset() {
    if (!window.confirm('ยืนยันเปิดรอบเรียนใหม่ 2/2568? ทำเฉพาะช่วงที่นักเรียนหยุดใช้งาน\n- เก็บประวัติ Pre/Post-test และด่านก่อนรีเซ็ต แอดมินย้อนดูได้\n- เฉพาะนักเรียนภายในที่เปิดใช้งาน: ทำ Pre-test ใหม่ 5 รอบ และเริ่มด่าน 1\n- ยกเลิกเกมที่ยังค้างอยู่ และอาจรับรางวัลผ่านด่านครั้งแรกได้อีก\n- ไม่เปลี่ยนเหรียญ ตั๋ว การ์ด Rank หรือ Team Battle\n- บัญชีเก่าที่ปิดและโรงเรียนเครือข่ายไม่เปลี่ยน\n- เปิดรอบนี้ได้ครั้งเดียว กดซ้ำไม่ล้างข้อมูลใหม่\n\nต้องการดำเนินการหรือไม่?')) return;

    setIsCreating(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/term/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: '2569-T2-restart-1' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'รีเซ็ตไม่สำเร็จ');
      setMessage(`🎉 ${data.message}`);
      await loadSeasons();
    } catch (err: any) {
      setMessage(err.message || 'เกิดข้อผิดพลาดในการรีเซ็ต');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleImportSeasonStudents() {
    if (isCreating || teacher?.role !== 'ADMIN') return;
    setIsCreating(true);
    setMessage('');
    try {
      async function send(payload: { action: 'preview' | 'apply'; revision?: string }) {
        const res = await fetch('/api/admin/students/import-season', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'นำเข้าไม่สำเร็จ');
        return data;
      }
      const { preview } = await send({ action: 'preview' });
      if (preview.conflicts.length) {
        setMessage(`ยังไม่นำเข้า: รหัสชนกันหรือไม่พบห้องที่ชัดเจนในแถว ${preview.conflicts.join(', ')}`);
        return;
      }
      if (!preview.newCount) { setMessage('ไม่พบรายชื่อใหม่ บัญชีและความคืบหน้าเดิมไม่ถูกแก้ไข'); return; }
      if (!window.confirm(`เพิ่มบัญชีใหม่ ${preview.newCount} คน และข้ามบัญชีเดิม ${preview.unchanged} คนหรือไม่?\nระบบจะไม่เปลี่ยนรหัสหรือด่านของบัญชีเดิม`)) return;
      const data = await send({ action: 'apply', revision: preview.revision });
      setMessage(data.message);
    } catch (err: any) {
      setMessage(err.message || 'เกิดข้อผิดพลาดในการนำเข้า');
    } finally {
      setIsCreating(false);
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
              ระดับโรงเรียน: 10 / 7 / 5 ใบต่อคน<br />
              ระดับห้อง: 3 / 2 / 1 ใบต่อคน<br />
              เฉพาะทีมที่มีคะแนนในฤดูกาลนั้น
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
        <div className="lg:col-span-1 space-y-6">
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
              <label className="block text-xs font-bold text-slate-400 mb-2" htmlFor="team-season-classroom">ระดับการแข่งขัน</label>
              <select id="team-season-classroom" value={classroomId} onChange={event => setClassroomId(event.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white mb-4">
                <option value="">ทั้งโรงเรียน</option>
                {classrooms.map(room => <option key={room.id} value={room.id}>{room.class_name}</option>)}
              </select>
              <p className="text-xs text-rose-400 mb-4 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20 leading-relaxed">
                {classroomId ? 'หากห้องนี้มีฤดูกาลอยู่ ต้องปิดก่อนเปิดใหม่' :
                  'การเปิดฤดูกาลโรงเรียนใหม่จะปิดรอบโรงเรียนเดิมโดยไม่แจกรางวัล ไม่กระทบการแข่งขันรายห้อง'}
              </p>
              <button 
                type="submit" 
                disabled={isCreating || !!settlingId || !newSeasonName.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg"
              >
                {isCreating ? 'กำลังสร้าง...' : 'สร้างฤดูกาลใหม่'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-800">
              <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider mb-2">
                🚀 เริ่มต้นภาคเรียนใหม่ (Semester Transition)
              </h4>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                เฉพาะแอดมิน: เก็บประวัติรอบเดิม แล้วให้นักเรียนภายในที่เปิดใช้งานทำ <strong className="text-emerald-300">Pre-test ใหม่และเริ่มด่าน 1</strong> ไม่เปลี่ยนเหรียญ การ์ด หรือ Team Battle
              </p>
              <button
                type="button"
                onClick={handleTermReset}
                disabled={isCreating}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm border border-emerald-400/30"
              >
                <span>เก็บประวัติและเริ่มรอบใหม่ 2/2568</span>
              </button>

              {teacher?.role === 'ADMIN' && <button
                type="button"
                onClick={handleImportSeasonStudents}
                disabled={isCreating}
                className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm border border-indigo-400/30"
              >
                <span>ตรวจรายชื่อและเพิ่มเฉพาะบัญชีใหม่</span>
              </button>}
            </div>
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
                    {season.scope === 'school' ? 'ทั้งโรงเรียน' :
                      classrooms.find(room => room.id === season.classroom_id)?.class_name ?? 'ระดับชั้น'} · {new Date(season.created_at).toLocaleDateString('th-TH')}
                  </p>
                </div>
                {season.is_active ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-indigo-400" />
                    <button
                      onClick={() => handleCloseAndReward(season.id)}
                      disabled={isCreating || !!settlingId}
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black rounded-lg"
                    >
                      {settlingId === season.id ? 'กำลังตรวจผล…' : 'ดูผลก่อนปิดฤดูกาล'}
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
