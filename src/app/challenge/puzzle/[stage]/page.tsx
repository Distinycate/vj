'use client';

import { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Star, Sparkles, Trophy, Lightbulb, RotateCw, CheckCircle2 } from 'lucide-react';
import { getStagePuzzle, StagePuzzleData } from '@/data/puzzles/stagePuzzlesData';
import { scrambleWordLetters, PUZZLE_HINT_COIN_COST } from '@/lib/puzzle/puzzleEngine';
import { puzzleAudio } from '@/lib/puzzle/puzzleAudio';
import CrosswordGrid from '@/components/puzzle/CrosswordGrid';
import LetterWheel from '@/components/puzzle/LetterWheel';

interface PageProps {
  params: Promise<{ stage: string }>;
}

export default function PuzzleGameRoomPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const stageNum = Number(resolvedParams.stage);

  const puzzle = useMemo(() => getStagePuzzle(stageNum), [stageNum]);

  // States
  const [solvedWords, setSolvedWords] = useState<Set<string>>(new Set());
  const [activeWordIndex, setActiveWordIndex] = useState<number>(1);
  const [revealedLetters, setRevealedLetters] = useState<Record<string, string>>({});
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [coins, setCoins] = useState<number>(100);
  const [wheelLetters, setWheelLetters] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [completedResult, setCompletedResult] = useState<{
    stars: number;
    earnedCoins: number;
    earnedExp: number;
    nextStage: number;
  } | null>(null);

  // Active target word
  const activeWord = useMemo(() => {
    if (!puzzle) return null;
    return puzzle.words.find((w) => w.index === activeWordIndex) || puzzle.words[0];
  }, [puzzle, activeWordIndex]);

  // Update wheel letters when activeWord changes or stage loads
  useEffect(() => {
    if (!activeWord) return;
    const scrambled = scrambleWordLetters(activeWord.word);
    setWheelLetters(scrambled);
  }, [activeWord]);

  // Check stage unlock & load user profile/coins on mount
  useEffect(() => {
    async function init() {
      try {
        const [progRes, profileRes] = await Promise.all([
          fetch('/api/game/puzzle/progression'),
          fetch('/api/student/profile'),
        ]);

        const progJson = await progRes.json();
        if (progJson.success && stageNum > progJson.unlockedStage) {
          router.replace('/challenge/puzzle');
          return;
        }

        const profJson = await profileRes.json();
        if (profJson.success && profJson.profile?.coins !== undefined) {
          setCoins(Number(profJson.profile.coins));
        }
      } catch (e) {
        console.error('Failed to init puzzle room:', e);
      }
    }
    init();
  }, [stageNum, router]);

  if (!puzzle) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-xl font-black mb-2">ไม่พบข้อมูลปริศนาสำหรับด่าน {stageNum}</h1>
        <Link href="/challenge/puzzle" className="px-5 py-2.5 bg-indigo-600 rounded-xl font-bold text-xs">
          กลับหน้ารวมด่าน
        </Link>
      </div>
    );
  }

  // Handle word submit from the Letter Wheel
  const handleWordSubmit = (submittedWord: string): boolean => {
    const cleanSubmitted = submittedWord.toLowerCase().trim();

    // Find if cleanSubmitted matches any word in the stage puzzle
    const matched = puzzle.words.find(
      (w) => w.word.toLowerCase() === cleanSubmitted && !solvedWords.has(cleanSubmitted)
    );

    if (matched) {
      const nextSolved = new Set(solvedWords);
      nextSolved.add(cleanSubmitted);
      setSolvedWords(nextSolved);

      // Check if all words are solved!
      if (nextSolved.size === puzzle.words.length) {
        handleStageCleared();
      } else {
        // Automatically switch activeWord to the next unsolved word
        const nextUnsolved = puzzle.words.find((w) => !nextSolved.has(w.word.toLowerCase()));
        if (nextUnsolved) {
          setActiveWordIndex(nextUnsolved.index);
        }
      }
      return true;
    }

    return false;
  };

  const handleShuffle = () => {
    if (!activeWord) return;
    setWheelLetters((prev) => {
      const copy = [...prev];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    });
  };

  const handleHint = () => {
    if (!activeWord) return;
    if (coins < PUZZLE_HINT_COIN_COST) {
      alert('เหรียญ Coins ไม่เพียงพอ (ต้องการ 20 เหรียญ)');
      return;
    }

    // Find unrevealed cells in active word
    const unrevealedCells: Array<{ key: string; char: string }> = [];
    for (let i = 0; i < activeWord.word.length; i++) {
      const r = activeWord.direction === 'down' ? activeWord.row + i : activeWord.row;
      const c = activeWord.direction === 'down' ? activeWord.col : activeWord.col + i;
      const key = `${r},${c}`;
      if (!revealedLetters[key]) {
        unrevealedCells.push({ key, char: activeWord.word[i].toUpperCase() });
      }
    }

    if (unrevealedCells.length === 0) return;

    // Pick first unrevealed cell
    const target = unrevealedCells[0];
    setRevealedLetters((prev) => ({ ...prev, [target.key]: target.char }));
    setHintsUsed((prev) => prev + 1);
    setCoins((prev) => Math.max(0, prev - PUZZLE_HINT_COIN_COST));
    puzzleAudio.playSelect();
  };

  const handleStageCleared = async () => {
    setIsCompleted(true);
    puzzleAudio.playStageClear();

    try {
      const res = await fetch('/api/game/puzzle/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageNumber: stageNum,
          hintsUsed,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCompletedResult({
          stars: data.stars,
          earnedCoins: data.earnedCoins,
          earnedExp: data.earnedExp,
          nextStage: data.nextStage,
        });
      }
    } catch (e) {
      console.error('Failed to record puzzle completion:', e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden select-none">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link
            href="/challenge/puzzle"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            ด่านทั้งหมด
          </Link>

          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">STAGE</span>
            <div className="text-base font-black text-white leading-none">{stageNum}</div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-extrabold text-xs">
              <span>🪙 {coins}</span>
            </div>
            <div className="text-xs font-bold text-slate-400">
              {solvedWords.size} / {puzzle.words.length} คำ
            </div>
          </div>
        </div>
      </div>

      {/* Main Play Area */}
      <div className="flex-1 max-w-md mx-auto w-full px-3 py-2 flex flex-col justify-between items-center">
        {/* Crossword Grid */}
        <div className="w-full flex-1 flex flex-col items-center justify-center my-auto">
          <CrosswordGrid
            puzzle={puzzle}
            solvedWords={solvedWords}
            activeWordIndex={activeWordIndex}
            revealedLetters={revealedLetters}
            onSelectWord={(index) => setActiveWordIndex(index)}
          />
        </div>

        {/* Letter Wheel Area (Sticky in Thumb Zone) */}
        <div className="w-full pb-6 pt-2 shrink-0">
          <LetterWheel
            letters={wheelLetters}
            onWordSubmit={handleWordSubmit}
            onShuffle={handleShuffle}
            onHint={handleHint}
            coins={coins}
          />
        </div>
      </div>

      {/* Victory Celebration Modal */}
      {isCompleted && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
          <div className="max-w-sm w-full rounded-3xl bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 border-2 border-amber-400/60 p-6 text-center shadow-2xl relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-400/30">
              <Trophy className="w-8 h-8 text-amber-300" />
            </div>

            <h2 className="text-2xl font-black text-white">ยอดเยี่ยมมาก!</h2>
            <p className="text-xs text-slate-300 mt-1">
              คุณแก้ปริศนาคำศัพท์ในด่าน {stageNum} ครบทั้ง {puzzle.words.length} คำสำเร็จ!
            </p>

            {/* Stars */}
            <div className="flex items-center justify-center gap-2 my-4">
              {[1, 2, 3].map((starIdx) => (
                <Star
                  key={starIdx}
                  className={`w-8 h-8 ${
                    completedResult && starIdx <= completedResult.stars
                      ? 'fill-amber-400 text-amber-400 animate-bounce'
                      : 'fill-slate-800 text-slate-800'
                  }`}
                  style={{ animationDelay: `${starIdx * 150}ms` }}
                />
              ))}
            </div>

            {/* Rewards */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-black text-sm">
                🪙 +{completedResult?.earnedCoins || 25} Coins
              </div>
              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-black text-sm">
                ⚡ +{completedResult?.earnedExp || 40} EXP
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {stageNum < 100 && (
                <button
                  type="button"
                  onClick={() => {
                    const next = completedResult?.nextStage || stageNum + 1;
                    router.push(`/challenge/puzzle/${next}`);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/30 transition-all cursor-pointer"
                >
                  🚀 เล่นด่านถัดไป (ด่าน {stageNum + 1})
                </button>
              )}

              <Link
                href="/challenge/puzzle"
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs block transition-all"
              >
                กลับหน้ารวมด่าน
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
