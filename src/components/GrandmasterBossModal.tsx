'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Flame,
  ShieldAlert,
  Timer,
  CheckCircle2,
  XCircle,
  Trophy,
  Sparkles,
  Keyboard,
  X,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { normalizeAnswer } from '@/lib/quizUtils';

interface GrandmasterQuestion {
  index: number;
  phase: 1 | 2 | 3 | 4 | 5;
  worldNumber: number;
  id: string;
  word_id: string;
  meaning_th: string;
  part_of_speech: string;
  prompt: string;
  promptType: 'TYPING_MEANING' | 'TYPING_CLOZE';
  firstLetterMask: string;
  letterCount: number;
  timeLimitSeconds: number;
}

interface GrandmasterBossModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessRefresh: () => void;
}

const PHASE_NAMES: Record<number, { title: string; subtitle: string }> = {
  1: { title: 'เฟส 1: ปราการด่านที่ 1–20', subtitle: 'คำศัพท์จาก World 1 และ World 2 (ข้อ 1–10)' },
  2: { title: 'เฟส 2: ปราการด่านที่ 21–40', subtitle: 'คำศัพท์จาก World 3 และ World 4 (ข้อ 11–20)' },
  3: { title: 'เฟส 3: ปราการด่านที่ 41–60', subtitle: 'คำศัพท์จาก World 5 และ World 6 (ข้อ 21–30)' },
  4: { title: 'เฟส 4: ปราการด่านที่ 61–80', subtitle: 'คำศัพท์จาก World 7 และ World 8 (ข้อ 31–40)' },
  5: { title: 'เฟส 5: ปราการสุดท้าย ด่านที่ 81–100', subtitle: 'คำศัพท์จาก World 9 และ World 10 (ข้อ 41–50)' },
};

export default function GrandmasterBossModal({
  isOpen,
  onClose,
  onSuccessRefresh,
}: GrandmasterBossModalProps) {
  const [step, setStep] = useState<'intro' | 'loading' | 'phase_break' | 'play' | 'submitting' | 'results'>('intro');
  const [errorMsg, setErrorMsg] = useState('');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<GrandmasterQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(10);
  const [phaseBreakSeconds, setPhaseBreakSeconds] = useState(4);
  const [blurWarning, setBlurWarning] = useState<string | null>(null);
  const [resultReport, setResultReport] = useState<any>(null);

  const answersRef = useRef<Array<{ wordId: string; answer: string; responseTime: number }>>([]);
  const questionStartRef = useRef<number>(Date.now());
  const isAdvancingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('intro');
      setErrorMsg('');
      setAttemptId(null);
      setQuestions([]);
      setCurrentIdx(0);
      setTypedAnswer('');
      setResultReport(null);
      answersRef.current = [];
      isAdvancingRef.current = false;
    }
  }, [isOpen]);

  const startBossChallenge = async () => {
    setStep('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/game/grandmaster/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !Array.isArray(data.questions) || data.questions.length === 0) {
        setErrorMsg(data.error || 'ไม่สามารถเริ่มด่าน Grandmaster Boss ได้');
        setStep('intro');
        return;
      }

      setAttemptId(data.attemptId);
      setQuestions(data.questions);
      setCurrentIdx(0);
      answersRef.current = [];
      setTypedAnswer('');
      setTimeLeft(data.questions[0].timeLimitSeconds || 10);
      questionStartRef.current = Date.now();
      isAdvancingRef.current = false;
      setStep('play');
    } catch {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      setStep('intro');
    }
  };

  const finishAndSubmit = useCallback(
    async (finalAnswers: Array<{ wordId: string; answer: string; responseTime: number }>) => {
      if (!attemptId) return;
      setStep('submitting');
      try {
        const res = await fetch('/api/game/grandmaster/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId,
            answers: finalAnswers,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          setErrorMsg(data.error || 'ไม่สามารถส่งผลคะแนนได้ กรุณาลองใหม่');
          setStep('intro');
          return;
        }
        setResultReport(data);
        setStep('results');
        onSuccessRefresh();
      } catch {
        setErrorMsg('เกิดข้อผิดพลาดในการส่งคำตอบ');
        setStep('intro');
      }
    },
    [attemptId, onSuccessRefresh]
  );

  const handleCommitAnswer = useCallback(
    (submittedText: string) => {
      if (isAdvancingRef.current || step !== 'play') return;
      const currentQ = questions[currentIdx];
      if (!currentQ) return;

      isAdvancingRef.current = true;
      const elapsedMs = Math.max(300, Date.now() - questionStartRef.current);
      const updated = [
        ...answersRef.current,
        {
          wordId: currentQ.id,
          answer: normalizeAnswer(submittedText),
          responseTime: elapsedMs,
        },
      ];
      answersRef.current = updated;

      const nextIdx = currentIdx + 1;
      if (nextIdx >= questions.length) {
        finishAndSubmit(updated);
        return;
      }

      const nextQ = questions[nextIdx];
      setCurrentIdx(nextIdx);
      setTypedAnswer('');

      // If transitioning to a new 10-question phase (index 10, 20, 30, 40), give a 4s breather
      if (nextIdx % 10 === 0) {
        setPhaseBreakSeconds(4);
        setStep('phase_break');
        isAdvancingRef.current = false;
      } else {
        setTimeLeft(nextQ.timeLimitSeconds || 10);
        questionStartRef.current = Date.now();
        isAdvancingRef.current = false;
        setTimeout(() => inputRef.current?.focus(), 30);
      }
    },
    [currentIdx, finishAndSubmit, questions, step]
  );

  // Per-question countdown timer
  useEffect(() => {
    if (step !== 'play') return;
    if (timeLeft <= 0) {
      handleCommitAnswer(typedAnswer);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, timeLeft, typedAnswer, handleCommitAnswer]);

  // Phase break countdown timer
  useEffect(() => {
    if (step !== 'phase_break') return;
    if (phaseBreakSeconds <= 0) {
      const nextQ = questions[currentIdx];
      setTimeLeft(nextQ?.timeLimitSeconds || 10);
      questionStartRef.current = Date.now();
      setStep('play');
      setTimeout(() => inputRef.current?.focus(), 40);
      return;
    }
    const timer = setTimeout(() => setPhaseBreakSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, phaseBreakSeconds, currentIdx, questions]);

  // Anti-cheat: detect window blur / tab switch during active question
  useEffect(() => {
    if (step !== 'play') return;
    const onBlurOrHide = () => {
      setBlurWarning('ตรวจพบการสลับหน้าจอ! ระบบข้ามข้อนี้ทันทีเพื่อป้องกันการเปิดดูโพย');
      setTimeout(() => setBlurWarning(null), 3500);
      handleCommitAnswer('');
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        onBlurOrHide();
      }
    };
    window.addEventListener('blur', onBlurOrHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', onBlurOrHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [step, handleCommitAnswer]);

  if (!isOpen) return null;

  const currentQ = questions[currentIdx];
  const currentPhase = currentQ?.phase || 1;
  const phaseMeta = PHASE_NAMES[currentPhase] || PHASE_NAMES[1];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="relative w-full max-w-2xl rounded-3xl border border-amber-500/40 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-5 sm:p-8 shadow-[0_0_60px_rgba(245,158,11,0.2)] text-slate-100"
        >
          {/* STEP 1: INTRO */}
          {step === 'intro' && (
            <div className="space-y-6 text-left">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-600 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/30 shrink-0">
                    👑
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      MYTHIC ENDGAME TRIAL • 300 STARS
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                      Grandmaster Typing Boss (50 ข้อ)
                    </h2>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {errorMsg && (
                <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-sm font-bold">
                  ⚠️ {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <div className="flex items-center gap-2 text-amber-400 font-black text-sm mb-1">
                    <Keyboard className="w-4 h-4" /> พิมพ์สะกดคำล้วน 100% (50 ข้อ)
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    สุ่มคำศัพท์จากทั้ง 100 ด่าน (World 1–10 World ละ 5 คำ) ไม่มีตัวเลือก ก-ข-ค-ง ต้องพิมพ์สะกดคำภาษาอังกฤษให้ถูกต้องเท่านั้น
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <div className="flex items-center gap-2 text-rose-400 font-black text-sm mb-1">
                    <Timer className="w-4 h-4" /> เวลาสั้น 8–12 วินาที & ห้ามสลับจอ
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    มีใบ้ตัวอักษรตัวแรกและจำนวนตัวอักษรเพื่อกันคำพ้องความหมาย แต่บล็อกการวางข้อความ (Paste) และห้ามสลับหน้าจอเด็ดขาด
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-amber-300">เกณฑ์การพิชิตบอสราชันย์</div>
                  <div className="text-lg font-black text-white">
                    สะกดถูกอย่างน้อย 40 / 50 ข้อ (80% ขึ้นไป)
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">รางวัลเคลียร์ครั้งแรก</div>
                  <div className="text-sm font-black text-emerald-400">🪙 +500 Coins • ✨ +300 EXP</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-sm"
                >
                  ไว้ทีหลัง
                </button>
                <button
                  onClick={startBossChallenge}
                  className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Flame className="w-5 h-5 fill-slate-950" />
                  <span>เริ่มท้าทาย Grandmaster Boss (50 ข้อ)</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: LOADING / SUBMITTING */}
          {(step === 'loading' || step === 'submitting') && (
            <div className="py-16 text-center space-y-4">
              <div className="w-14 h-14 border-4 border-amber-500/30 border-t-amber-400 rounded-full animate-spin mx-auto" />
              <h3 className="text-xl font-black text-white">
                {step === 'loading'
                  ? 'กำลังสุ่มคำศัพท์จากทั้ง 100 ด่าน (10 Worlds)...'
                  : 'กำลังตรวจคำตอบทั้ง 50 ข้อจากเซิร์ฟเวอร์...'}
              </h3>
            </div>
          )}

          {/* STEP 3: PHASE BREAK (4 SECONDS BREATHER BETWEEN 10-QUESTION SHIELDS) */}
          {step === 'phase_break' && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-3xl mx-auto animate-bounce">
                🛡️
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                ทำลายโล่บอสสำเร็จ! เตรียมเข้าสู่เฟสถัดไป
              </span>
              <h3 className="text-2xl font-black text-white">{phaseMeta.title}</h3>
              <p className="text-sm text-slate-400">{phaseMeta.subtitle}</p>
              <div className="text-4xl font-black text-emerald-400 pt-2">
                เริ่มใน {phaseBreakSeconds} วินาที...
              </div>
            </div>
          )}

          {/* STEP 4: ACTIVE PLAY */}
          {step === 'play' && currentQ && (
            <div className="space-y-5 text-left">
              {blurWarning && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500 text-rose-200 text-xs font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{blurWarning}</span>
                </div>
              )}

              {/* Top HUD */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider">
                    {phaseMeta.title} • World {currentQ.worldNumber}
                  </span>
                  <div className="text-lg font-black text-white">
                    ข้อที่ {currentIdx + 1} / {questions.length}
                  </div>
                </div>

                <div
                  className={`px-4 py-2 rounded-2xl border font-black flex items-center gap-2 text-lg ${
                    timeLeft <= 3
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
                      : 'bg-slate-900 border-slate-700 text-amber-300'
                  }`}
                >
                  <Timer className="w-5 h-5" />
                  <span>{timeLeft}s</span>
                </div>
              </div>

              {/* 50-question progress bar */}
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-300"
                  style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* Prompt Card */}
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 text-center">
                <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  {currentQ.promptType === 'TYPING_CLOZE'
                    ? '📝 เติมคำศัพท์ในประโยค (Contextual Cloze)'
                    : '⚡ พิมพ์คำศัพท์จากความหมาย (Speed Recall)'}{' '}
                  • ชนิดคำ: {currentQ.part_of_speech}
                </span>

                <div className="text-xl sm:text-2xl font-black text-white leading-snug py-2">
                  {currentQ.prompt}
                </div>

                {/* First-letter + length mask */}
                <div className="inline-flex flex-col items-center px-4 py-2 rounded-xl bg-slate-950 border border-amber-500/30">
                  <span className="text-[11px] text-slate-400">
                    ใบ้ตัวอักษรแรก ({currentQ.letterCount} ตัวอักษร)
                  </span>
                  <span className="font-mono text-lg sm:text-xl font-black tracking-widest text-amber-300 mt-0.5">
                    {currentQ.firstLetterMask}
                  </span>
                </div>
              </div>

              {/* Typing Input (Anti-Paste / Anti-AutoComplete) */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCommitAnswer(typedAnswer);
                }}
                className="space-y-3"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  onPaste={(e) => e.preventDefault()}
                  onCopy={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  autoFocus
                  placeholder="พิมพ์คำศัพท์ภาษาอังกฤษที่นี่ แล้วกด Enter..."
                  className="w-full px-5 py-4 rounded-2xl bg-slate-950 border-2 border-amber-400/50 focus:border-amber-400 focus:outline-none text-white text-xl font-black text-center tracking-wide"
                />

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-base shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>ส่งคำตอบ (Enter)</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            </div>
          )}

          {/* STEP 5: RESULTS */}
          {step === 'results' && resultReport && (
            <div className="space-y-6 text-left">
              <div className="text-center space-y-2">
                <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-5xl bg-slate-900 border border-slate-800 shadow-xl">
                  {resultReport.passed ? '👑' : '⚔️'}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  {resultReport.passed
                    ? 'ขอแสดงความยินดี! คุณพิชิต Grandmaster Boss สำเร็จ!'
                    : 'เกือบสำเร็จแล้ว! ฝึกทบทวนคำที่สะกดผิดแล้วมาท้าทายใหม่'}
                </h2>
                <p className="text-sm text-slate-400">
                  คะแนนของคุณ:{' '}
                  <strong className="text-white">
                    {resultReport.score} / {resultReport.totalQuestions}
                  </strong>{' '}
                  ({resultReport.accuracy}%) • เกณฑ์ผ่าน 40/50 (80%)
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="text-xs text-slate-400">ความแม่นยำ</div>
                  <div
                    className={`text-xl font-black ${
                      resultReport.passed ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {resultReport.accuracy}%
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="text-xs text-slate-400">เหรียญที่ได้</div>
                  <div className="text-xl font-black text-amber-300">
                    +{resultReport.earnedCoins} 🪙
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="text-xs text-slate-400">EXP ที่ได้</div>
                  <div className="text-xl font-black text-cyan-300">
                    +{resultReport.earnedExp} ✨
                  </div>
                </div>
              </div>

              {/* Wrong words review list */}
              {Array.isArray(resultReport.wrongWords) && resultReport.wrongWords.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-wider text-rose-300">
                    คำศัพท์ที่สะกดผิดหรือหมดเวลา ({resultReport.wrongWords.length} คำ — บันทึกเข้าคลังทบทวนแล้ว)
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {resultReport.wrongWords.map((w: any, idx: number) => (
                      <div
                        key={`${w.wordId}-${idx}`}
                        className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <span className="font-black text-emerald-400 text-sm">{w.word}</span>{' '}
                          <span className="text-slate-300">— {w.meaningTh}</span>
                          <div className="text-slate-500 mt-0.5">
                            World {w.worldNumber} • คำตอบที่พิมพ์:{' '}
                            <span className="text-rose-400 font-mono">{w.submitted}</span>
                          </div>
                        </div>
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                <button
                  onClick={startBossChallenge}
                  className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>ท้าทายใหม่อีกครั้ง</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm cursor-pointer"
                >
                  กลับสู่หน้าแผนที่
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

