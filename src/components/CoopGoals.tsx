'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Building2, Gift, CheckCircle, Sparkles, Trophy, Coins, Ticket, RefreshCw } from 'lucide-react';
import { playCorrectSound, playComboSound } from '@/utils/soundEffects';

interface GoalData {
  target: number;
  current: number;
  percent: number;
  isCompleted: boolean;
  hasClaimed: boolean;
  canClaim: boolean;
  rewardCoins: number;
  rewardExp: number;
  rewardTickets?: number;
}

interface CoopGoalsState {
  weekKey: string;
  className: string;
  classGoal: GoalData;
  schoolGoal: GoalData;
}

export default function CoopGoals({ onRewardClaimed }: { onRewardClaimed?: (newCoins: number, newExp: number) => void } = {}) {
  const [data, setData] = useState<CoopGoalsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<'class' | 'school' | null>(null);
  const [claimSuccessMessage, setClaimSuccessMessage] = useState('');

  const loadGoals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/student/coop-goals');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      }
    } catch (e) {
      console.warn('Failed to load co-op goals:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const handleClaim = async (goalType: 'class' | 'school') => {
    if (claiming) return;

    try {
      setClaiming(goalType);
      const res = await fetch('/api/student/coop-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalType }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        playComboSound(5);
        setClaimSuccessMessage(json.message || 'รับรางวัลสำเร็จ!');
        setTimeout(() => setClaimSuccessMessage(''), 4000);

        if (onRewardClaimed && json.newCoins !== undefined) {
          onRewardClaimed(json.newCoins, json.newTotalExp);
        }
        await loadGoals();
      } else {
        alert(json.error || 'ไม่สามารถรับรางวัลได้ในขณะนี้');
      }
    } catch (e) {
      console.error('Claim error:', e);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setClaiming(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 text-center animate-pulse">
        <div className="w-8 h-8 rounded-full border-2 border-fuchsia-500/20 border-t-fuchsia-500 animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400 font-bold">กำลังโหลดภารกิจรวมพลังประจำสัปดาห์...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      <AnimatePresence>
        {claimSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-lg"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{claimSuccessMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* 1. Classroom Co-op Goal */}
        <div className="relative overflow-hidden rounded-3xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-950/20 via-slate-950/70 to-slate-950 p-5 shadow-xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center text-lg shadow-inner">
                <Users className="w-5 h-5 text-fuchsia-400" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-fuchsia-400 tracking-wider bg-fuchsia-500/10 px-2 py-0.5 rounded-full border border-fuchsia-500/20">
                  {data.className}
                </span>
                <h4 className="text-base font-black text-white mt-0.5">ภารกิจรวมพลังห้องเรียน</h4>
              </div>
            </div>

            <button
              onClick={() => { playCorrectSound(); loadGoals(); }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition-colors"
              title="รีเฟรชยอดคะแนน"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            ช่วยกันตอบคำถามถูกต้องสะสมให้ครบเป้าหมาย เพื่อรับรางวัลรวมพลังทุกคนในห้อง!
          </p>

          {/* Progress Bar */}
          <div className="space-y-1.5 mb-3.5">
            <div className="flex justify-between text-[11px] font-mono font-bold">
              <span className="text-slate-400">ความคืบหน้า</span>
              <span className={data.classGoal.isCompleted ? 'text-fuchsia-400' : 'text-slate-300'}>
                {data.classGoal.current} / {data.classGoal.target} ข้อ ({data.classGoal.percent}%)
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800 p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.classGoal.percent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-400 shadow-[0_0_10px_rgba(217,70,239,0.5)]"
              />
            </div>
          </div>

          {/* Reward Badges & Claim Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-900">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1 text-amber-400">
                <Coins className="w-3.5 h-3.5" /> +{data.classGoal.rewardCoins}
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1 text-teal-400">
                <Sparkles className="w-3.5 h-3.5" /> +{data.classGoal.rewardExp} EXP
              </span>
            </div>

            {data.classGoal.hasClaimed ? (
              <span className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                <CheckCircle className="w-3.5 h-3.5" /> รับรางวัลแล้ว
              </span>
            ) : data.classGoal.canClaim ? (
              <button
                onClick={() => handleClaim('class')}
                disabled={claiming === 'class'}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-400 hover:to-pink-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-fuchsia-500/25 transition-all hover:scale-105 cursor-pointer animate-pulse"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>{claiming === 'class' ? 'กำลังรับรางวัล...' : '🎁 กดรับรางวัลห้องเรียน!'}</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-500 font-bold text-center sm:text-right">
                🔒 ขาดอีก {Math.max(0, data.classGoal.target - data.classGoal.current)} ข้อ
              </span>
            )}
          </div>
        </div>

        {/* 2. School Co-op Goal */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 via-slate-950/70 to-slate-950 p-5 shadow-xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-lg shadow-inner">
                <Building2 className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  บ้านโคกยาง
                </span>
                <h4 className="text-base font-black text-white mt-0.5">ภารกิจเกียรติยศโรงเรียน</h4>
              </div>
            </div>

            <button
              onClick={() => { playCorrectSound(); loadGoals(); }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition-colors"
              title="รีเฟรชยอดคะแนน"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            รวมพลังนักเรียนทุกคนในโรงเรียน ตอบคำถามให้ครบ 2,000 ข้อเพื่อปลดล็อกรางวัลใหญ่!
          </p>

          {/* Progress Bar */}
          <div className="space-y-1.5 mb-3.5">
            <div className="flex justify-between text-[11px] font-mono font-bold">
              <span className="text-slate-400">ความคืบหน้าทั้งโรงเรียน</span>
              <span className={data.schoolGoal.isCompleted ? 'text-amber-400' : 'text-slate-300'}>
                {data.schoolGoal.current} / {data.schoolGoal.target} ข้อ ({data.schoolGoal.percent}%)
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800 p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.schoolGoal.percent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
              />
            </div>
          </div>

          {/* Reward Badges & Claim Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-900">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1 text-amber-400">
                <Coins className="w-3.5 h-3.5" /> +{data.schoolGoal.rewardCoins}
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1 text-teal-400">
                <Sparkles className="w-3.5 h-3.5" /> +{data.schoolGoal.rewardExp}
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1 text-fuchsia-400">
                <Ticket className="w-3.5 h-3.5" /> +1 ตั๋ว
              </span>
            </div>

            {data.schoolGoal.hasClaimed ? (
              <span className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                <CheckCircle className="w-3.5 h-3.5" /> รับรางวัลแล้ว
              </span>
            ) : data.schoolGoal.canClaim ? (
              <button
                onClick={() => handleClaim('school')}
                disabled={claiming === 'school'}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/25 transition-all hover:scale-105 cursor-pointer animate-pulse"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>{claiming === 'school' ? 'กำลังรับรางวัล...' : '🏆 กดรับรางวัลโรงเรียน!'}</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-500 font-bold text-center sm:text-right">
                🔒 ขาดอีก {Math.max(0, data.schoolGoal.target - data.schoolGoal.current)} ข้อ
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
