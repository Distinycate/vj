'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { computeBossBattle } from '@/lib/progression/bossEngine';
import { getStageType } from '@/lib/progression/worldHierarchy';
import { ShieldAlert, Zap, Flame, Skull } from 'lucide-react';

/**
 * BossHpBar — RPG Boss Battle Presentation Component
 *
 * Provides:
 * - Floating Boss Monster Avatar with idle breathing animation
 * - Real-time animated glowing Boss HP Bar
 * - Floating Damage Numbers (-20 HP!) when student answers correctly
 * - Boss Counter-Attack lunging animation when student answers incorrectly
 * - Thematic Boss titles and icons based on stage type
 */

interface BossHpBarProps {
  stageNumber: number;
  correctCount: number;
  totalQuestions: number;
  currentQuestionIndex: number;
  isAnswered?: boolean;
  lastAnswerCorrect?: boolean | null;
}

interface BossProfile {
  name: string;
  title: string;
  icon: string;
  avatarBg: string;
  borderColor: string;
}

const getBossProfile = (stageType: string, stageNumber: number): BossProfile => {
  if (stageType === 'FINAL_BOSS') {
    return {
      name: 'ราชันแห่งความมืด (Dark Sovereign)',
      title: '👑 FINAL BOSS OF VOCAB JOURNEY',
      icon: '👑',
      avatarBg: 'from-amber-600/30 via-purple-900/40 to-slate-950',
      borderColor: 'border-amber-500/60',
    };
  }

  if (stageType === 'WORLD_BOSS') {
    const worldNum = Math.ceil(stageNumber / 10);
    const worldBosses = [
      { name: 'จอมราชาอสูร (Fiend Lord)', icon: '👹' },
      { name: 'มังกรเพลิงบรรพกาล (Elder Wyrm)', icon: '🐉' },
      { name: 'โกเลมหินผา (Ancient Golem)', icon: '🗿' },
      { name: 'ไฮดราเก้าเศียร (Nine-Headed Hydra)', icon: '🐍' },
      { name: 'คิเมราแห่งเงา (Shadow Chimera)', icon: '🦁' },
      { name: 'ราชาปีศาจทะเลลึก (Abyssal Leviathan)', icon: '🐙' },
      { name: 'จักรกลเวทมนตร์ (Aether Automaton)', icon: '🤖' },
      { name: 'วิญญาณแห่งพายุ (Tempest Wraith)', icon: '🌪️' },
      { name: 'จอมมารมิติอวกาศ (Void Overlord)', icon: '🌌' },
      { name: 'ราชันมังกรดำ (Obsidian Dragon)', icon: '🐲' },
    ];
    const picked = worldBosses[(worldNum - 1) % worldBosses.length];
    return {
      name: picked.name,
      title: `👹 WORLD BOSS (ด่านที่ ${stageNumber})`,
      icon: picked.icon,
      avatarBg: 'from-rose-600/30 via-rose-950/40 to-slate-950',
      borderColor: 'border-rose-500/50',
    };
  }

  if (stageType === 'MINI_BOSS') {
    return {
      name: 'อัศวินผู้พิทักษ์ (Guardian Knight)',
      title: `⚔️ MINI BOSS (ด่านที่ ${stageNumber})`,
      icon: '🐺',
      avatarBg: 'from-indigo-600/30 via-slate-900/40 to-slate-950',
      borderColor: 'border-indigo-500/40',
    };
  }

  // Default Guardian
  return {
    name: 'อัศวินผู้พิทักษ์ (Guardian Knight)',
    title: `⚔️ MINI BOSS (ด่านที่ ${stageNumber})`,
    icon: '🐺',
    avatarBg: 'from-indigo-600/30 via-slate-900/40 to-slate-950',
    borderColor: 'border-indigo-500/40',
  };
};

export default function BossHpBar({
  stageNumber,
  correctCount,
  totalQuestions,
  currentQuestionIndex,
  isAnswered = false,
  lastAnswerCorrect = null,
}: BossHpBarProps) {
  const stageType = getStageType(stageNumber);
  const boss = getBossProfile(stageType, stageNumber);

  // Provisional HP calculation for UI presentation
  const safeTotalQuestions = Math.max(1, totalQuestions);
  const provisionalAccuracy = Math.round((correctCount / safeTotalQuestions) * 100);
  const battle = computeBossBattle({
    stageType,
    correctCount,
    totalQuestions: safeTotalQuestions,
    accuracy: provisionalAccuracy,
  });
  const hpPercent = battle.remainingHp;

  // HP Color states
  const hpColor =
    hpPercent > 60
      ? 'from-emerald-500 to-teal-400'
      : hpPercent > 30
        ? 'from-amber-500 to-yellow-400'
        : 'from-rose-600 to-red-500';

  const hpGlow =
    hpPercent > 60
      ? 'shadow-[0_0_15px_rgba(16,185,129,0.4)]'
      : hpPercent > 30
        ? 'shadow-[0_0_15px_rgba(245,158,11,0.4)]'
        : 'shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse';

  const isTakingDamage = isAnswered && lastAnswerCorrect === true;
  const isAttacking = isAnswered && lastAnswerCorrect === false;

  return (
    <div className="w-full max-w-2xl mb-4 relative z-10 select-none">
      <div className={`relative overflow-hidden rounded-3xl border bg-slate-950/85 backdrop-blur-xl p-4 shadow-2xl transition-all duration-300 ${boss.borderColor} ${isAttacking ? 'ring-2 ring-rose-500/80 bg-rose-950/30' : ''}`}>
        
        {/* Ambient Top Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-rose-500/20 to-transparent blur-2xl pointer-events-none" />

        {/* Boss Encounter Header */}
        <div className="flex items-center justify-between gap-3 mb-3 relative z-10">
          
          {/* Boss Avatar & Title */}
          <div className="flex items-center gap-3.5">
            <motion.div
              animate={
                isTakingDamage
                  ? { scale: [1, 0.85, 1.1, 1], rotate: [0, -10, 10, 0], filter: ['brightness(1)', 'brightness(2.2)', 'brightness(1)'] }
                  : isAttacking
                    ? { x: [0, -15, 25, 0], scale: [1, 1.25, 1], filter: ['brightness(1)', 'hue-rotate(90deg)', 'brightness(1)'] }
                    : { y: [0, -5, 0] }
              }
              transition={{
                duration: isTakingDamage || isAttacking ? 0.45 : 3.5,
                repeat: isTakingDamage || isAttacking ? 0 : Infinity,
                ease: 'easeInOut',
              }}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border shadow-xl relative bg-gradient-to-br ${boss.avatarBg} ${boss.borderColor}`}
            >
              <span>{boss.icon}</span>

              {/* Status Indicator Pip */}
              {hpPercent <= 30 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-slate-950 animate-ping" />
              )}
            </motion.div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black tracking-widest text-rose-400 uppercase bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-400 animate-pulse" />
                  {boss.title}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 mt-0.5">
                {boss.name}
              </h3>
            </div>
          </div>

          {/* Question Counter Pill */}
          <div className="text-right">
            <span className="text-[11px] font-mono text-slate-400 font-bold px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800">
              ข้อ {currentQuestionIndex + 1}/{totalQuestions}
            </span>
            <div className="text-[10px] text-slate-500 mt-1 font-semibold">
              ดาเมจรวม: <span className="text-rose-400 font-bold">{battle.damage}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Floating Damage Feedback */}
        <AnimatePresence>
          {isTakingDamage && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.5 }}
              animate={{ opacity: 1, y: -20, scale: 1.3 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none font-black text-amber-300 drop-shadow-[0_4px_10px_rgba(245,158,11,0.8)] text-xl flex items-center gap-1"
            >
              <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300 animate-bounce" />
              <span>-10 HP! CRITICAL HIT!</span>
            </motion.div>
          )}

          {isAttacking && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.5 }}
              animate={{ opacity: 1, y: -15, scale: 1.2 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none font-black text-rose-400 drop-shadow-[0_4px_10px_rgba(244,63,94,0.8)] text-base flex items-center gap-1"
            >
              <Skull className="w-5 h-5 text-rose-400" />
              <span>บอสสวนกลับ! (BOSS COUNTER-ATTACK!)</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HP Bar Container */}
        <div className="relative mt-2">
          {/* Outer Track */}
          <div className="w-full bg-slate-900/90 rounded-full h-4 sm:h-5 overflow-hidden border border-slate-800 p-0.5 shadow-inner">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${hpColor} ${hpGlow}`}
              initial={{ width: '100%' }}
              animate={{ width: `${Math.max(0, hpPercent)}%` }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            />
          </div>

          {/* HP Numbers Overlay */}
          <div className="flex justify-between items-center px-1 mt-1.5 text-[11px] font-mono font-bold">
            <span className="text-slate-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
              เกราะบอส: {hpPercent > 0 ? `${hpPercent}%` : 'แตกสลาย!'}
            </span>
            <span className={hpPercent > 30 ? 'text-slate-300' : 'text-rose-400 font-extrabold animate-pulse'}>
              HP: {Math.max(0, hpPercent)} / 100
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
