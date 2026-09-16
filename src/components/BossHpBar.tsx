'use client';
import { motion } from 'framer-motion';
import { computeBossBattle } from '@/lib/progression/bossEngine';
import { getStageType } from '@/lib/progression/worldHierarchy';

/**
 * BossHpBar — Provisional Client-Side HP Presentation
 *
 * AUTHORITY BOUNDARY:
 *   This component shows a PROVISIONAL animated HP bar during gameplay.
 *   It uses computeBossBattle() with the client-side correctCount to derive
 *   an estimated HP/damage for visual feedback.
 *
 *   THIS IS PRESENTATION ONLY. The values shown here are NOT authoritative.
 *   After game completion, the server response fields (bossDefeated, bossDamage,
 *   bossRemainingHp) REPLACE this display entirely in the results screen.
 *
 *   This component must NEVER be used to:
 *   - Determine boss defeat status
 *   - Calculate economy rewards
 *   - Drive unlock decisions
 *   - Persist any state
 */

interface BossHpBarProps {
  stageNumber: number;
  correctCount: number;
  totalQuestions: number;
  currentQuestionIndex: number;
}

const BOSS_NAMES: Record<string, { name: string; icon: string }> = {
  MINI_BOSS: { name: 'Mini Boss', icon: '⚔️' },
  WORLD_BOSS: { name: 'World Boss', icon: '👹' },
  FINAL_BOSS: { name: 'Final Boss', icon: '👑' },
};

export default function BossHpBar({
  stageNumber,
  correctCount,
  totalQuestions,
  currentQuestionIndex,
}: BossHpBarProps) {
  const stageType = getStageType(stageNumber);
  const bossInfo = BOSS_NAMES[stageType] ?? BOSS_NAMES.MINI_BOSS;
  
  // Provisional HP calculation (presentation only, replaced by server on completion)
  const safeTotalQuestions = Math.max(1, totalQuestions);
  const provisionalAccuracy = Math.round((correctCount / safeTotalQuestions) * 100);
  const battle = computeBossBattle({
    stageType,
    correctCount,
    totalQuestions: safeTotalQuestions,
    accuracy: provisionalAccuracy,
  });
  const hpPercent = battle.remainingHp;

  const hpColor =
    hpPercent > 60
      ? 'bg-emerald-500'
      : hpPercent > 30
        ? 'bg-amber-500'
        : 'bg-rose-500';

  const hpGlow =
    hpPercent > 60
      ? 'shadow-emerald-500/20'
      : hpPercent > 30
        ? 'shadow-amber-500/20'
        : 'shadow-rose-500/30';

  return (
    <div className="w-full max-w-2xl mb-4 relative z-10">
      <div className="glass-card p-3 border-rose-500/20 bg-rose-950/20">
        {/* Boss Name and Type */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{bossInfo.icon}</span>
            <span className="text-xs font-black text-rose-300 uppercase tracking-wider">
              {bossInfo.name}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Q{currentQuestionIndex + 1}/{totalQuestions}
          </span>
        </div>

        {/* HP Bar */}
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden shadow-inner">
          <motion.div
            className={`h-full rounded-full ${hpColor} shadow-lg ${hpGlow}`}
            initial={{ width: '100%' }}
            animate={{ width: `${hpPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        {/* HP Text */}
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-slate-500">
            Damage: <span className="text-rose-400 font-bold">{battle.damage}</span>
          </span>
          <span className="text-[10px] text-slate-500">
            HP: <span className={`font-bold ${hpPercent > 30 ? 'text-slate-300' : 'text-rose-400'}`}>
              {hpPercent}/100
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
