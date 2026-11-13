'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Star, Lock, Sparkles, Trophy, ChevronRight } from 'lucide-react';
import { PUZZLE_TOTAL_STAGES } from '@/lib/puzzle/puzzleEngine';

const WORLDS = [
  { world: 1, name: 'World 1: The Gateway', stages: [1, 10] },
  { world: 2, name: 'World 2: Emerald Forest', stages: [11, 20] },
  { world: 3, name: 'World 3: Crystal Caves', stages: [21, 30] },
  { world: 4, name: 'World 4: Sunken Citadel', stages: [31, 40] },
  { world: 5, name: 'World 5: Ember Peaks', stages: [41, 50] },
  { world: 6, name: 'World 6: Whispering Winds', stages: [51, 60] },
  { world: 7, name: 'World 7: Twilight Haven', stages: [61, 70] },
  { world: 8, name: 'World 8: Astral Nexus', stages: [71, 80] },
  { world: 9, name: 'World 9: Abyssal Rift', stages: [81, 90] },
  { world: 10, name: 'World 10: Grandmaster Spire', stages: [91, 100] },
];

export default function PuzzleMapPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [unlockedStage, setUnlockedStage] = useState<number>(1);
  const [stageStars, setStageStars] = useState<Record<number, number>>({});
  const [totalStars, setTotalStars] = useState<number>(0);
  const [selectedWorld, setSelectedWorld] = useState<number>(1);

  useEffect(() => {
    async function loadProgress() {
      try {
        const res = await fetch('/api/game/puzzle/progression');
        const json = await res.json();
        if (json.success) {
          setUnlockedStage(json.unlockedStage || 1);
          setStageStars(json.stageStars || {});
          setTotalStars(json.totalStars || 0);

          // Auto-select the world of the current unlocked stage
          const currentStage = json.unlockedStage || 1;
          const currentWorld = Math.min(10, Math.ceil(currentStage / 10));
          setSelectedWorld(currentWorld);
        }
      } catch (e) {
        console.error('Failed to load puzzle progress:', e);
      } finally {
        setLoading(false);
      }
    }
    loadProgress();
  }, []);

  const activeWorldInfo = WORLDS.find((w) => w.world === selectedWorld) || WORLDS[0];
  const [startStage, endStage] = activeWorldInfo.stages;
  const worldStages = Array.from(
    { length: endStage - startStage + 1 },
    (_, i) => startStage + i
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-12">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            หน้าแรก
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-extrabold text-xs">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{totalStars} / 300 ดาว</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-extrabold text-xs">
              <Trophy className="w-3.5 h-3.5" />
              <span>ด่าน {unlockedStage} / 100</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 pt-4 flex-1">
        {/* Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-indigo-900/60 via-purple-950/50 to-slate-900 border border-indigo-500/30 p-5 mb-5 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500 text-white">
              WORD CONNECT PUZZLE • 100 STAGES
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              🧩 ปริศนาอักษรไขว้ 100 ด่าน
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              ลากนิ้วเชื่อมตัวอักษรบนวงล้อ เติมคำศัพท์ A2 ให้เต็มตารางไขว้ ปลดล็อกทีละด่านเพื่อรับดาวและเหรียญรางวัล!
            </p>
          </div>
        </div>

        {/* World Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
          {WORLDS.map((w) => {
            const isSelected = selectedWorld === w.world;
            const worldUnlocked = unlockedStage >= w.stages[0];
            return (
              <button
                key={w.world}
                type="button"
                onClick={() => setSelectedWorld(w.world)}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : worldUnlocked
                    ? 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                    : 'bg-slate-900/40 border border-slate-800/40 text-slate-600'
                }`}
              >
                {!worldUnlocked && <Lock className="w-3 h-3 text-slate-600" />}
                W{w.world}
              </button>
            );
          })}
        </div>

        {/* World Title Bar */}
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-extrabold text-slate-200">
            {activeWorldInfo.name} (ด่าน {startStage}–{endStage})
          </h2>
        </div>

        {/* Stage Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {worldStages.map((stageNum) => {
            const isUnlocked = stageNum <= unlockedStage;
            const isCurrent = stageNum === unlockedStage;
            const stars = stageStars[stageNum] || 0;

            if (!isUnlocked) {
              return (
                <div
                  key={stageNum}
                  className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/40 flex flex-col items-center justify-center opacity-60"
                >
                  <Lock className="w-6 h-6 text-slate-600 mb-1" />
                  <span className="text-xs font-bold text-slate-600">ด่าน {stageNum}</span>
                </div>
              );
            }

            return (
              <button
                key={stageNum}
                type="button"
                onClick={() => router.push(`/challenge/puzzle/${stageNum}`)}
                className={`p-4 rounded-2xl border transition-all text-center flex flex-col items-center justify-between cursor-pointer active:scale-95 ${
                  isCurrent
                    ? 'bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-900 border-amber-400 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/50'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-mono font-bold text-slate-400">STAGE</span>
                  {isCurrent && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                </div>

                <div className="text-2xl font-black text-white my-1">{stageNum}</div>

                {/* Stars display */}
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3].map((starIdx) => (
                    <Star
                      key={starIdx}
                      className={`w-3.5 h-3.5 ${
                        starIdx <= stars
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-slate-800 text-slate-800'
                      }`}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

