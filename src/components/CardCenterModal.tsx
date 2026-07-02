'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, Gift, Shield, Sparkles, Sword, Ticket, X } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import {
  BattleCard,
  GACHA_COIN_COST,
  counterCardAction,
  createCardAction,
  pullGachaCard,
} from '@/utils/cardBattle';

interface InventoryRow {
  id: string;
  quantity: number;
  reserved_quantity: number;
  cards: BattleCard;
}

interface CardCenterModalProps {
  onClose: () => void;
}

const rarityStyle: Record<string, string> = {
  N: 'border-slate-600 text-slate-300',
  R: 'border-sky-500/50 text-sky-300',
  SR: 'border-violet-500/50 text-violet-300',
  SSR: 'border-amber-500/50 text-amber-300',
  UR: 'border-rose-500/50 text-rose-300',
};

export default function CardCenterModal({ onClose }: CardCenterModalProps) {
  const { student, progress, setProgress } = useAppStore();
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [classmates, setClassmates] = useState<any[]>([]);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<InventoryRow | null>(null);
  const [selectedTarget, setSelectedTarget] = useState('');
  const [latestPull, setLatestPull] = useState<BattleCard | null>(null);
  const [latestPullWasPity, setLatestPullWasPity] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const loadData = useCallback(async () => {
    if (!student) return;
    const [inventoryResult, classmatesResult, incomingResult, pathResult] = await Promise.all([
      supabase
        .from('card_inventory')
        .select('id, quantity, reserved_quantity, cards(*)')
        .eq('student_id', student.id)
        .gt('quantity', 0),
      supabase
        .from('students')
        .select('id, student_name')
        .eq('classroom_id', student.classroom_id)
        .neq('id', student.id)
        .eq('is_active', true)
        .order('student_name'),
      supabase
        .from('card_logs')
        .select('*, attacker:attacker_id(student_name), played_card:played_card_id(*), counter_card:counter_card_id(*)')
        .eq('target_id', student.id)
        .eq('status', 'COUNTER_PHASE')
        .order('created_at', { ascending: false }),
      supabase
        .from('learning_paths')
        .select('*')
        .eq('student_id', student.id)
        .single(),
    ]);

    if (inventoryResult.data) setInventory(inventoryResult.data as unknown as InventoryRow[]);
    if (classmatesResult.data) setClassmates(classmatesResult.data);
    if (incomingResult.data) setIncoming(incomingResult.data);
    if (pathResult.data) setProgress(pathResult.data);
  }, [setProgress, student]);

  useEffect(() => {
    loadData();
    if (!student) return;
    const channel = supabase
      .channel(`card-center-${student.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'card_logs', filter: `target_id=eq.${student.id}` },
        () => loadData(),
      )
      .subscribe();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [loadData, student]);

  const availableCounterCards = useMemo(
    () => inventory.filter(
      (row) =>
        row.quantity - row.reserved_quantity > 0 &&
        ['DEFENSE', 'REFLECT'].includes(row.cards.effect_type),
    ),
    [inventory],
  );

  async function handlePull() {
    if (!student || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await pullGachaCard(student.id);
      setLatestPull(result.card);
      setLatestPullWasPity(Boolean(result.is_pity));
      setProgress({
        ...progress,
        coins: result.coins,
        free_pull_tickets: result.free_pull_tickets,
        paid_gacha_pulls: result.paid_gacha_pulls,
      });
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'สุ่มการ์ดไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function handleUseCard() {
    if (!student || !selectedCard || busy) return;
    const needsTarget = selectedCard.cards.effect_type === 'ATTACK';
    if (needsTarget && !selectedTarget) {
      setMessage('กรุณาเลือกเพื่อนที่ต้องการใช้การ์ด');
      return;
    }
    setBusy(true);
    try {
      await createCardAction(student.id, selectedCard.cards.id, needsTarget ? selectedTarget : null);
      setMessage('ส่งคำขอแล้ว การ์ดถูกจองไว้จนกว่าครูจะตัดสิน');
      setSelectedCard(null);
      setSelectedTarget('');
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ใช้การ์ดไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function handleCounter(logId: string, cardId: string) {
    if (!student || busy) return;
    setBusy(true);
    try {
      await counterCardAction(logId, student.id, cardId);
      setMessage('ส่งการ์ดสวนกลับแล้ว รอครูยืนยันผล');
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'สวนกลับไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm overflow-y-auto p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl mx-auto my-6 bg-slate-900 border border-fuchsia-500/20 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Sparkles className="text-fuchsia-400" /> ศูนย์การ์ด Vocab Battle
            </h2>
            <div className="flex gap-3 mt-3 text-sm">
              <span className="px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-300">
                🪙 {progress?.coins || 0}
              </span>
              <span className="px-3 py-1.5 rounded-full bg-sky-500/10 text-sky-300">
                🎟️ {progress?.free_pull_tickets || 0}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-xl text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-7">
          {message && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 p-3 rounded-xl text-sm">
              {message}
            </div>
          )}

          {incoming.map((log) => {
            const seconds = log.counter_deadline
              ? Math.max(0, Math.ceil((new Date(log.counter_deadline).getTime() - now) / 1000))
              : 0;
            const canCounter = log.status === 'COUNTER_PHASE' && seconds > 0 && !log.counter_card_id;
            return (
              <div key={log.id} className="bg-rose-500/10 border border-rose-500/30 p-5 rounded-2xl">
                <div className="flex justify-between gap-3">
                  <div>
                    <div className="text-rose-300 font-black">🚨 {log.attacker?.student_name} ใช้การ์ดกับคุณ</div>
                    <div className="text-white mt-1">{log.played_card?.image_url} {log.played_card?.name}</div>
                  </div>
                  <span className="text-2xl font-black text-rose-300">{seconds}s</span>
                </div>
                {canCounter && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {availableCounterCards.map((row) => (
                      <button
                        key={row.id}
                        disabled={busy}
                        onClick={() => handleCounter(log.id, row.cards.id)}
                        className="px-3 py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-xl font-bold text-sm"
                      >
                        {row.cards.image_url} ใช้ {row.cards.name}
                      </button>
                    ))}
                    {availableCounterCards.length === 0 && (
                      <span className="text-sm text-slate-400">ไม่มีการ์ดป้องกันหรือย้อนกลับที่พร้อมใช้</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <section className="grid md:grid-cols-[1fr_1.4fr] gap-5">
            <div className="bg-gradient-to-br from-fuchsia-500/15 to-indigo-500/10 border border-fuchsia-500/20 rounded-2xl p-5 text-center">
              <Gift className="w-12 h-12 text-fuchsia-400 mx-auto mb-3" />
              <h3 className="text-xl font-black text-white">สุ่มการ์ด</h3>
              <p className="text-sm text-slate-400 mt-2">
                ใช้ตั๋วฟรีก่อนเสมอ หากไม่มีตั๋วจึงใช้ {GACHA_COIN_COST} เหรียญ
              </p>
              <p className="text-xs text-fuchsia-300 mt-2">
                Pity {(progress?.paid_gacha_pulls || 0) % 10}/10 — ทุกการสุ่มด้วยเหรียญครั้งที่ 10 จะไม่ออกการ์ดไม่มีอะไรเลย
              </p>
              <button
                disabled={busy || ((progress?.free_pull_tickets || 0) < 1 && (progress?.coins || 0) < GACHA_COIN_COST)}
                onClick={handlePull}
                className="w-full mt-5 py-3 bg-fuchsia-500 hover:bg-fuchsia-400 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-black"
              >
                {(progress?.free_pull_tickets || 0) > 0
                  ? <span className="flex justify-center gap-2"><Ticket /> ใช้ตั๋วสุ่มฟรี</span>
                  : <span className="flex justify-center gap-2"><Coins /> สุ่ม {GACHA_COIN_COST} เหรียญ</span>}
              </button>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-center min-h-48">
              {latestPull ? (
                <div className={`w-full text-center border rounded-2xl p-5 ${rarityStyle[latestPull.rarity]}`}>
                  <div className="text-6xl">{latestPull.image_url}</div>
                  <div className="font-black text-2xl mt-2">{latestPull.name}</div>
                  <div className="text-xs font-bold mt-1">RARITY {latestPull.rarity}</div>
                  {latestPullWasPity && (
                    <div className="inline-block mt-2 px-2 py-1 bg-fuchsia-500/15 text-fuchsia-300 rounded-full text-xs font-black">
                      PITY GUARANTEED
                    </div>
                  )}
                  <p className="text-sm text-slate-400 mt-2">{latestPull.description}</p>
                </div>
              ) : (
                <span className="text-slate-500">การ์ดที่สุ่มได้จะแสดงที่นี่</span>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-black text-white mb-3">คลังการ์ดของฉัน</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {inventory.map((row) => {
                const available = row.quantity - row.reserved_quantity;
                const canStart = row.cards.effect_type !== 'REFLECT';
                return (
                  <button
                    key={row.id}
                    disabled={!canStart || available < 1}
                    onClick={() => setSelectedCard(row)}
                    className={`text-left p-4 bg-slate-950/60 border rounded-2xl disabled:opacity-50 ${rarityStyle[row.cards.rarity]}`}
                  >
                    <div className="flex justify-between">
                      <span className="text-3xl">{row.cards.image_url}</span>
                      <span className="text-xs font-black">{row.cards.rarity}</span>
                    </div>
                    <div className="font-bold text-white mt-2">{row.cards.name}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      พร้อมใช้ {available}/{row.quantity} ใบ
                    </div>
                    {!canStart && <div className="text-xs mt-2">ใช้ได้เมื่อถูกโจมตี</div>}
                    {row.cards.effect_type === 'DEFENSE' && (
                      <div className="text-xs mt-2">ใช้ป้องกันเมื่อถูกโจมตี หรือส่งให้ครูอนุมัติเป็นสิทธิ์กันแบน</div>
                    )}
                  </button>
                );
              })}
              {inventory.length === 0 && (
                <div className="col-span-full text-center text-slate-500 p-8 border border-dashed border-slate-800 rounded-2xl">
                  ยังไม่มีการ์ด ลองสุ่มใบแรกได้เลย
                </div>
              )}
            </div>
          </section>
        </div>
      </motion.div>

      {selectedCard && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              {selectedCard.cards.effect_type === 'ATTACK' ? <Sword /> : <Shield />}
              ใช้ {selectedCard.cards.name}
            </h3>
            <p className="text-slate-400 text-sm mt-2">{selectedCard.cards.description}</p>
            {selectedCard.cards.effect_type === 'ATTACK' && (
              <select
                value={selectedTarget}
                onChange={(event) => setSelectedTarget(event.target.value)}
                className="w-full mt-5 bg-slate-950 border border-slate-700 text-white rounded-xl p-3"
              >
                <option value="">เลือกเพื่อนในห้อง</option>
                {classmates.map((classmate) => (
                  <option key={classmate.id} value={classmate.id}>{classmate.student_name}</option>
                ))}
              </select>
            )}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button onClick={() => setSelectedCard(null)} className="py-3 bg-slate-800 rounded-xl font-bold">
                ยกเลิก
              </button>
              <button disabled={busy} onClick={handleUseCard} className="py-3 bg-fuchsia-500 rounded-xl font-bold text-white">
                ส่งให้ครูอนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
