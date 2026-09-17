'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CheckCircle, XCircle, Trophy, Timer, Volume2, 
  Heart, Sparkles, AlertTriangle, Star, Flame
} from 'lucide-react';
import { playWordAudio } from '@/utils/audio';
import { normalizeAnswer, parseAcceptableAnswers, QuizChoice } from '@/lib/quizUtils';
import { useGameEngine } from '@/hooks/useGameEngine';
import BossHpBar from '@/components/BossHpBar';

type GameStep = 'play' | 'reflection' | 'results';

export default function Game() {
  const {
    student, progress, isBossMode,
    words, currentIndex, loading, loadError, gameState,
    score, showScorePopup, shakeScreen, lives, timeLeft, isAnswered, selectedAnswer,
    comboCount, maxCombo, wrongWords, assistedWords, usedHintsCount,
    difficultyConfig, qType, choices, fillAnswer, setFillAnswer, showHint,
    inventory, usedItemsThisStage,
    refWordsLearned, setRefWordsLearned, refHardestWord, setRefHardestWord, refFeeling, setRefFeeling,
    previousAttempts, passReport, cheatWarning, cheatDetected,
    submitAnswer, applyPowerup, handleFinishGame
  } = useGameEngine();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400">กำลังดาวน์โหลดชุดคำศัพท์ระบบ Adaptive...</p>
      </div>
    );
  }

  if (loadError || words.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card border-rose-500/20 p-8 w-full max-w-md text-center"
        >
          <AlertTriangle className="w-14 h-14 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">ยังเริ่มด่านไม่ได้</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">{loadError}</p>
          <button
            onClick={handleFinishGame}
            className="w-full py-3.5 premium-btn bg-slate-800 hover:bg-slate-700 font-bold"
          >
            กลับหน้าแผนที่
          </button>
        </motion.div>
      </div>
    );
  }

  // CHEAT DETECTED SCREEN
  if (cheatDetected) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 text-center">
        <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-3xl font-black text-white mb-4">ยุติการทดสอบ (Invalid Run)</h2>
        <p className="text-slate-400 max-w-md mb-8">
          {cheatDetected === 'BLUR_MAX_WARNINGS' 
            ? 'ระบบตรวจพบการสลับหน้าจอ (พับแท็บ) เกิน 3 ครั้ง ซึ่งถือเป็นการผิดกฎการทดสอบในโหมดนี้'
            : 'ระบบตรวจพบการทำเวลาที่ผิดปกติ (Speed Hack) เวลาที่ใช้ในการทำข้อสอบน้อยเกินกว่าจะเป็นไปได้'}
        </p>
        <button onClick={handleFinishGame} className="px-8 py-4 premium-btn bg-slate-800 hover:bg-slate-700 font-bold">
          กลับสู่หน้าหลัก
        </button>
      </div>
    );
  }

  // PROCESSING SCREEN
  if (gameState === 'reflection') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 relative overflow-hidden">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-black text-white mb-2">กำลังประมวลผลด่านความยาก...</h2>
        <p className="text-slate-400 text-sm">Adaptive Engine กำลังคำนวณและปรับลด-เพิ่มความยากสำหรับคุณ</p>
      </div>
    );
  }

  // STEP 2: RESULTS SCREEN
  if (gameState === 'results') {
    const passed = passReport?.passed || false;
    const accuracyVal = passReport?.accuracy ?? Math.round((score / words.length) * 100);
    const isPerfect = accuracyVal === 100;
    const earnedStars = passReport?.stars ?? 0;
    const primaryReason = passReport?.primaryReason ?? null;
    const bonusFlags: string[] = passReport?.bonusFlags ?? [];
    const campaignCompleted = passReport?.campaignCompleted ?? false;

    // Server-authoritative boss result (presentation-only client HP is discarded here)
    const serverBossDefeated = passReport?.bossDefeated ?? false;
    const serverBossDamage = passReport?.bossDamage ?? 0;
    const serverBossRemainingHp = passReport?.bossRemainingHp ?? 100;

    const BONUS_FLAG_LABELS: Record<string, { icon: string; label: string; color: string }> = {
      BOSS_FIRST_CLEAR: { icon: '⚔️', label: 'Boss First Clear ×2', color: 'rose' },
      WORLD_CLEAR: { icon: '🌍', label: 'World Complete!', color: 'cyan' },
      FINAL_BOSS_CLEAR: { icon: '👑', label: 'Campaign Victory!', color: 'amber' },
    };

    const REASON_LABELS: Record<string, string> = {
      FIRST_CLEAR: '🏆 ผ่านครั้งแรก!',
      STAR_UPGRADE: '⬆️ เลื่อนระดับดาว!',
      PRACTICE_REPLAY: '🔄 ฝึกซ้อม',
    };

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Campaign Completion Celebration */}
        {campaignCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6, type: 'spring' }}
            className="absolute inset-0 flex items-center justify-center z-50 bg-slate-950/90 backdrop-blur-sm"
          >
            <div className="text-center p-12 max-w-lg">
              <motion.div 
                initial={{ rotateY: 180, opacity: 0 }} 
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="text-8xl mb-6"
              >
                👑
              </motion.div>
              <h1 className="text-5xl font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent mb-4">
                CAMPAIGN COMPLETE!
              </h1>
              <p className="text-slate-300 text-lg mb-8">
                ยินดีด้วย! คุณพิชิต Vocab Journey ทั้ง 100 ด่านสำเร็จแล้ว!
              </p>
              <button
                onClick={handleFinishGame}
                className="px-8 py-4 premium-btn bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-lg shadow-lg shadow-amber-500/30"
              >
                🎉 กลับสู่แผนที่ผจญภัย
              </button>
            </div>
          </motion.div>
        )}

        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          className="text-center glass-card p-8 sm:p-12 max-w-lg w-full shadow-2xl relative z-10"
        >
          {/* Boss Result Header (server-authoritative) */}
          {isBossMode && passReport && (
            <div className="mb-6">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-black text-sm mb-4 ${
                serverBossDefeated 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {serverBossDefeated ? '⚔️ BOSS DEFEATED!' : '💀 BOSS SURVIVED'}
              </div>
              {/* HP Bar (shows server-authoritative final state) */}
              <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden mb-2">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: `${serverBossRemainingHp}%` }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                  className={`h-full rounded-full ${
                    serverBossRemainingHp > 60 ? 'bg-emerald-500' :
                    serverBossRemainingHp > 30 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Damage: {serverBossDamage}</span>
                <span>HP: {serverBossRemainingHp}/100</span>
              </div>
            </div>
          )}

          {/* Pass/Fail Icon */}
          {passed ? (
            <Trophy className="w-20 h-20 text-amber-400 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(245,158,11,0.2)]" />
          ) : (
            <XCircle className="w-20 h-20 text-rose-500 mx-auto mb-4" />
          )}

          {/* Star Display (0–3 stars from V3) */}
          {passed && (
            <div className="flex justify-center gap-2 mb-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: i < earnedStars ? 1 : 0.6, rotate: 0 }}
                  transition={{ delay: 0.3 + i * 0.2, type: 'spring', stiffness: 200 }}
                >
                  <Star
                    className={`w-10 h-10 ${
                      i < earnedStars
                        ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]'
                        : 'text-slate-700'
                    }`}
                  />
                </motion.div>
              ))}
            </div>
          )}

          <h2 className="text-3xl font-black mb-1">{passed ? 'ภารกิจสำเร็จ! 🎉' : 'ไม่ผ่านเกณฑ์ 💔'}</h2>

          {/* Primary Reason Label */}
          {primaryReason && REASON_LABELS[primaryReason] && (
            <p className="text-slate-400 text-sm mb-4">{REASON_LABELS[primaryReason]}</p>
          )}

          {/* Bonus Flags */}
          {bonusFlags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {bonusFlags.map((flag) => {
                const cfg = BONUS_FLAG_LABELS[flag];
                if (!cfg) return null;
                return (
                  <motion.span
                    key={flag}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.5 }}
                    className={`flex items-center gap-1 text-[10px] bg-${cfg.color}-500/20 text-${cfg.color}-400 font-extrabold px-3 py-1.5 rounded-full border border-${cfg.color}-500/30`}
                  >
                    {cfg.icon} {cfg.label}
                  </motion.span>
                );
              })}
            </div>
          )}

          {/* Score Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="glass-input p-4 border-none shadow-none">
              <span className="text-[10px] text-slate-500 block">คะแนนสะสม</span>
              <strong className="text-xl text-white">{passReport?.score ?? score} / {words.length}</strong>
            </div>
            <div className="glass-input p-4 border-none shadow-none">
              <span className="text-[10px] text-slate-500 block">คอมโบสูงสุด</span>
              <strong className="text-xl text-emerald-400">{maxCombo} Combo</strong>
            </div>
            <div className="glass-input p-4 border-none shadow-none">
              <span className="text-[10px] text-slate-500 block">ความถูกต้อง</span>
              <strong className={`text-xl font-bold ${passed ? 'text-emerald-400' : 'text-rose-400'}`}>{accuracyVal}%</strong>
            </div>
          </div>

          {/* Economy Rewards */}
          {passed && (passReport?.earnedCoins > 0 || passReport?.earnedExp > 0) && (
            <div className="flex justify-center gap-4 mb-4">
              {passReport.earnedCoins > 0 && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-4 py-2 rounded-xl border border-amber-500/20 font-bold text-sm"
                >
                  🪙 +{passReport.earnedCoins} Coins
                </motion.div>
              )}
              {passReport.earnedExp > 0 && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 px-4 py-2 rounded-xl border border-indigo-500/20 font-bold text-sm"
                >
                  ✨ +{passReport.earnedExp} EXP
                </motion.div>
              )}
            </div>
          )}

          {/* Previous attempts for this stage */}
          {previousAttempts.length > 0 && (
            <div className="mt-2 mb-4 border-t border-slate-850 pt-4 text-left">
              <p className="text-slate-400 text-xs font-bold mb-2">📜 ประวัติความแม่นยำในการผจญภัยด่านนี้:</p>
              <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto pr-1">
                {previousAttempts.slice(-4).map((att, idx) => (
                  <div key={att.id || idx} className="bg-slate-950 border border-slate-900 px-3 py-1.5 rounded-xl flex justify-between items-center text-xs">
                    <span className="text-slate-500">รอบที่ {idx + 1}:</span>
                    <span className={att.passed ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                      {att.accuracy}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button 
            onClick={handleFinishGame} 
            className="w-full py-4 premium-btn bg-primary hover:bg-emerald-400 text-slate-950 font-black shadow-lg text-lg"
          >
            กลับสู่แผนที่ผจญภัย 🧭
          </button>
        </motion.div>
      </div>
    );
  }

  // STEP 3: ACTIVE PLAYING GAMEPLAY SCREEN
  const currentWord = words[currentIndex];

  return (
    <div 
      className={`min-h-[calc(100vh-var(--demo-bottom-nav-space,0px))] ${isBossMode ? 'bg-gradient-to-b from-rose-950/40 to-transparent' : 'bg-transparent'} text-slate-100 p-4 md:p-8 flex flex-col items-center relative overflow-hidden select-none transition-transform duration-100 ${shakeScreen ? 'animate-shake' : ''}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px) rotate(-1deg); }
          50% { transform: translateX(10px) rotate(1deg); }
          75% { transform: translateX(-10px) rotate(-1deg); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}} />

      {/* Header Panel */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-6 relative z-10">
        <div className="flex gap-2 items-center">
          <div className="flex gap-1 glass-card px-3 py-2 rounded-xl border-none">
            {Array(3).fill(0).map((_, i) => (
              <Heart key={i} className={`w-5 h-5 ${i < lives ? 'fill-rose-500 text-rose-500' : 'text-slate-850'}`} />
            ))}
          </div>
          
          <div className="relative">
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-bold text-sm transition-all ${
              showScorePopup ? 'bg-primary/20 border-primary text-emerald-400' : 'glass-card border-none text-slate-300'
            }`}>
              <Star className={`w-4 h-4 ${showScorePopup ? 'animate-spin' : ''}`} />
              <span>{score}</span>
            </div>
            {showScorePopup && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-emerald-400 font-black text-lg pointer-events-none drop-shadow-lg animate-bounce">
                +1
              </div>
            )}
          </div>
        </div>

        {/* Combo Multiplier indicator */}
        {comboCount > 0 && (
          <motion.div 
            key={comboCount}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 rounded-full font-black text-xs shadow-md animate-bounce"
          >
            ⚡ {comboCount} COMBO
          </motion.div>
        )}

        {isBossMode && (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/20 text-rose-400 rounded-full font-black text-sm border border-rose-500/50 shadow-[0_0_15px_rgba(225,29,72,0.3)] animate-pulse"
          >
            👹 BOSS MODE
          </motion.div>
        )}
        
        <div className="flex items-center gap-2 glass-card px-4 py-2.5 rounded-full border-none">
          <Timer className={timeLeft <= 5 ? "text-rose-500 animate-pulse" : "text-emerald-400"} />
          <span className={`text-lg font-bold font-mono ${timeLeft <= 5 ? "text-rose-500" : "text-slate-100"}`}>{timeLeft}s</span>
        </div>

        <button 
          onClick={handleFinishGame} 
          className="px-3.5 py-2 premium-btn bg-slate-900 hover:bg-slate-850 text-white flex items-center gap-1.5 text-xs font-bold"
        >
          <X className="w-4 h-4 text-rose-400" /> ยอมแพ้
        </button>
      </div>

      {/* Boss HP Bar — provisional client presentation, NOT authority */}
      {isBossMode && (
        <BossHpBar
          stageNumber={progress?.current_stage ?? 1}
          correctCount={score}
          totalQuestions={words.length}
          currentQuestionIndex={currentIndex}
        />
      )}

      {/* Item powerups inventory dock */}
      <div className="w-full max-w-2xl flex flex-wrap justify-center gap-2 mb-6 relative z-10">
        {inventory.map((invItem) => {
          const itemCode = invItem.items.item_code;
          const isUsed = usedItemsThisStage.includes(itemCode);
          
          return (
            <button 
              key={invItem.id} 
              onClick={() => applyPowerup(itemCode)} 
              disabled={isUsed}
              data-demo-guide={itemCode === 'HINT' ? 'hint-button' : undefined}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all ${
                isUsed 
                  ? 'opacity-40 glass-input text-slate-600 border-none' 
                  : 'glass-card hover-lift text-slate-200 border-none'
              }`}
            >
              <span className="text-base">{invItem.items.image_url}</span>
              <span>{invItem.items.name} ({invItem.quantity})</span>
            </button>
          );
        })}
        {inventory.length === 0 && (
          <p className="text-slate-600 text-xs italic">ไม่มีไอเทมใช้งานในด่านนี้</p>
        )}
      </div>

      {/* Stage Progress line */}
      <div className="w-full max-w-2xl h-2 bg-slate-900 border border-slate-850 rounded-full mb-8 overflow-hidden relative z-10">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
          style={{ width: `${(currentIndex / words.length) * 100}%` }}
        />
      </div>

      {/* Main Game Interface Card */}
      <div className="flex-1 w-full max-w-2xl flex flex-col justify-center relative z-10">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentIndex} 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }} 
            className="text-center mb-8"
          >
            {qType === 'MEANING_MC' && (
              <div className="glass-card p-6 sm:p-8 shadow-xl w-full break-words border-none">
                <span className="text-[10px] text-slate-500 tracking-widest uppercase block mb-3">แปลศัพท์สเปกตรัม</span>
                <h2 
                  className="text-4xl sm:text-5xl font-black text-white mb-2 notranslate break-all pointer-events-none select-none" 
                  translate="no"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {currentWord.word.split('').map((char: string, i: number) => (
                    <span key={i}>{char}&#8203;</span>
                  ))}
                </h2>
                <p className="text-slate-400 text-base sm:text-lg">แปลว่าอะไรในภาษาไทย?</p>
              </div>
            )}

            {qType === 'WORD_MC' && (
              <div className="glass-card p-6 sm:p-8 shadow-xl w-full break-words border-none">
                <span className="text-[10px] text-slate-500 tracking-widest uppercase block mb-3">ความหมายภาษาไทย</span>
                <h2 className="text-2xl sm:text-4xl font-black text-emerald-400 mb-2 break-words">{currentWord.prompt}</h2>
                <p className="text-slate-400 text-base sm:text-lg">ตรงกับคำศัพท์ภาษาอังกฤษคำใด?</p>
              </div>
            )}

            {qType === 'LISTENING_MC' && (
              <div className="glass-card p-8 shadow-xl w-full border-none">
                <span className="text-[10px] text-slate-500 tracking-widest uppercase block mb-6">ฟังและเลือกสะกด</span>
                <button 
                  onClick={() => playWordAudio(currentWord.word)}
                  className="w-20 h-20 premium-btn bg-primary/10 hover:bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg border-primary/20"
                >
                  <Volume2 className="w-10 h-10" />
                </button>
                <p className="text-slate-400 text-base">เสียงสะกดเป็นคำศัพท์ภาษาอังกฤษข้อใด?</p>
              </div>
            )}

            {qType === 'FILL_BLANK' && (
              <div className="glass-card p-6 sm:p-8 shadow-xl w-full break-words border-none">
                <span className="text-[10px] text-slate-500 tracking-widest uppercase block mb-3">พิมพ์สะกด / เติมประโยค (Contextual Puzzle)</span>
                
                {(currentWord.prompt?.includes('________') || currentWord.prompt?.includes('_____')) ? (
                  <div className="glass-input p-4 sm:p-6 mb-6 italic text-slate-200 text-lg sm:text-xl font-medium leading-relaxed notranslate break-words border-none shadow-inner" translate="no">
                    &ldquo;{currentWord.prompt}&rdquo;
                  </div>
                ) : (
                  <h2 className="text-2xl sm:text-4xl font-black text-emerald-400 mb-6 break-words">
                    {normalizeAnswer(currentWord.prompt) === normalizeAnswer(currentWord.word) && (currentWord.meaning || currentWord.meaning_th)
                      ? (currentWord.meaning || currentWord.meaning_th)
                      : currentWord.prompt}
                  </h2>
                )}
                
                <form 
                  onSubmit={(e) => { e.preventDefault(); submitAnswer(fillAnswer); }}
                  className="w-full max-w-sm mx-auto"
                >
                  <input 
                    type="text" 
                    value={fillAnswer}
                    onChange={e => setFillAnswer(e.target.value)}
                    disabled={isAnswered}
                    autoFocus
                    placeholder="พิมพ์สะกดคำศัพท์..."
                    className="w-full text-center px-4 py-4 glass-input text-xl font-bold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-white placeholder-slate-650 mb-3"
                  />
                  {!isAnswered && (
                    <button type="submit" className="w-full py-3.5 premium-btn bg-primary hover:bg-emerald-400 text-slate-950 font-bold shadow-md">
                      ยืนยันคำตอบ ➡️
                    </button>
                  )}
                </form>
                {showHint && (
                  <p className="text-slate-400 text-xs mt-3 italic">
                    คำใบ้: ขึ้นต้นด้วยตัว <strong className="text-emerald-400 uppercase">{currentWord.word.charAt(0)}</strong> (คำนี้สะกดด้วย {currentWord.word.length} ตัวอักษร)
                  </p>
                )}
              </div>
            )}

            {qType === 'CONTEXT_MC' && (
              <div className="glass-card p-6 sm:p-8 shadow-xl w-full break-words border-none">
                <span className="text-[10px] text-slate-500 tracking-widest uppercase block mb-4">การเติมประโยคในบริบท</span>
                <div className="glass-input p-4 sm:p-6 mb-4 italic text-slate-200 text-lg sm:text-xl font-medium leading-relaxed notranslate break-words border-none" translate="no">
                  &ldquo;{currentWord.prompt}&rdquo;
                </div>
                <p className="text-slate-400 text-base sm:text-lg">เติมตัวเลือกข้อใดในช่องว่างจึงจะสมบูรณ์ที่สุด?</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Options grid for multiple choices quiz types */}
        {qType.includes('_MC') && (
          <div data-demo-guide="feedback-result" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {choices.map((choice, idx) => {
              if (!choice || choice.hidden) return <div key={`hidden-${idx}`} className="opacity-0 pointer-events-none"></div>;

              let btnClass = "glass-input text-slate-350 hover-lift hover:border-primary/50 hover:text-primary";
              let icon: React.ReactNode = null;

              if (isAnswered) {
                const normChoice = normalizeAnswer(choice.text);
                const normCorrect = normalizeAnswer(currentWord.correct_answer);
                const normWord = normalizeAnswer(currentWord.word);
                const normMeaning = normalizeAnswer(currentWord.meaning_th || currentWord.meaning);
                const targetWordId = currentWord.correct_word_id || currentWord.id || currentWord.word_id;

                const isThisChoiceCorrect = choice.is_correct === true || 
                  (Boolean(targetWordId) && choice.word_id === targetWordId) ||
                  (Boolean(normCorrect) && normChoice === normCorrect) ||
                  (Boolean(normWord) && normChoice === normWord) ||
                  (Boolean(normMeaning) && normChoice === normMeaning) ||
                  parseAcceptableAnswers(currentWord.correct_answer).includes(normChoice) ||
                  parseAcceptableAnswers(currentWord.meaning_th || currentWord.meaning).includes(normChoice);

                const isSelected = selectedAnswer !== null && typeof selectedAnswer === 'object' && 
                  (selectedAnswer.word_id === choice.word_id || normalizeAnswer(selectedAnswer.text) === normChoice);

                if (isThisChoiceCorrect) {
                  btnClass = "bg-primary/20 border border-primary text-emerald-300 font-extrabold shadow-lg shadow-primary/10";
                  icon = <CheckCircle className="w-5 h-5 text-emerald-400" />;
                } else if (isSelected) {
                  btnClass = "bg-secondary/20 border border-secondary text-rose-300 font-extrabold shadow-lg";
                  icon = <XCircle className="w-5 h-5 text-rose-400" />;
                } else {
                  btnClass = "glass-input opacity-40 text-slate-650 border-none shadow-none";
                }
              }

              return (
                <button 
                  key={`${choice.word_id}-${idx}`}
                  onClick={() => submitAnswer(choice)}
                  disabled={isAnswered}
                  className={`p-4 sm:p-5 text-base sm:text-lg font-bold flex justify-between items-center transition-all ${btnClass} break-words cursor-pointer`}
                >
                  <span className="flex-1 text-center notranslate break-words" translate="no">{choice.text}</span>
                  {icon}
                </button>
              );
            })}
          </div>
        )}

        {/* Feedback block for spelling input mode */}
        {isAnswered && (qType === 'FILL_BLANK' || typeof selectedAnswer === 'string') && (
          <div data-demo-guide="feedback-result" className="text-center mt-6">
            {typeof selectedAnswer === 'string' && (
              normalizeAnswer(selectedAnswer) === normalizeAnswer(currentWord.correct_answer) ||
              normalizeAnswer(selectedAnswer) === normalizeAnswer(currentWord.word) ||
              normalizeAnswer(selectedAnswer) === normalizeAnswer(currentWord.blank_answer) ||
              parseAcceptableAnswers(currentWord.correct_answer).includes(normalizeAnswer(selectedAnswer)) ||
              parseAcceptableAnswers(currentWord.word).includes(normalizeAnswer(selectedAnswer))
            ) ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-lg">
                <CheckCircle className="w-5 h-5" /> ถูกต้องสมบูรณ์แบบ!
              </div>
            ) : (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 py-4 rounded-xl flex flex-col items-center gap-1.5 font-bold text-lg">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5" /> พิมพ์สะกดไม่ถูกต้อง
                </div>
                <span className="text-slate-400 text-sm">ตัวสะกดที่ถูกต้องคือ: <strong className="text-slate-200 font-extrabold text-base">{currentWord.word || currentWord.correct_answer}</strong></span>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
