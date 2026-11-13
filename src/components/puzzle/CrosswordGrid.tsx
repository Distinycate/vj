'use client';

import { useMemo } from 'react';
import type { StagePuzzleData, PuzzleWordItem } from '@/data/puzzles/stagePuzzlesData';

interface CrosswordGridProps {
  puzzle: StagePuzzleData;
  solvedWords: Set<string>;
  activeWordIndex: number;
  revealedLetters: Record<string, string>; // 'r,c' -> letter
  onSelectWord: (index: number) => void;
}

export default function CrosswordGrid({
  puzzle,
  solvedWords,
  activeWordIndex,
  revealedLetters,
  onSelectWord,
}: CrosswordGridProps) {
  const activeWord = puzzle.words.find((w) => w.index === activeWordIndex) || puzzle.words[0];

  // Map each grid cell to what it contains
  const cellMap = useMemo(() => {
    const map = new Map<
      string,
      {
        char: string;
        wordIndices: number[];
        isSolved: boolean;
        isActive: boolean;
        revealedChar?: string;
      }
    >();

    for (const w of puzzle.words) {
      const isWordSolved = solvedWords.has(w.word.toLowerCase());
      const isWordActive = w.index === activeWordIndex;

      for (let i = 0; i < w.word.length; i++) {
        const r = w.direction === 'down' ? w.row + i : w.row;
        const c = w.direction === 'down' ? w.col : w.col + i;
        const key = `${r},${c}`;
        const char = w.word[i].toUpperCase();

        const existing = map.get(key);
        if (existing) {
          existing.wordIndices.push(w.index);
          if (isWordSolved) existing.isSolved = true;
          if (isWordActive) existing.isActive = true;
        } else {
          map.set(key, {
            char,
            wordIndices: [w.index],
            isSolved: isWordSolved,
            isActive: isWordActive,
            revealedChar: revealedLetters[key],
          });
        }
      }
    }
    return map;
  }, [puzzle, solvedWords, activeWordIndex, revealedLetters]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Grid Container */}
      <div className="relative p-2.5 sm:p-4 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-2xl backdrop-blur-md overflow-x-auto max-w-full">
        <div
          className="grid gap-1 sm:gap-1.5 mx-auto select-none"
          style={{
            gridTemplateRows: `repeat(${puzzle.rows}, minmax(0, 1fr))`,
            gridTemplateColumns: `repeat(${puzzle.cols}, minmax(0, 1fr))`,
            width: `${Math.min(360, puzzle.cols * 32)}px`,
            maxWidth: '100%',
          }}
        >
          {Array.from({ length: puzzle.rows }).map((_, r) =>
            Array.from({ length: puzzle.cols }).map((_, c) => {
              const key = `${r},${c}`;
              const cell = cellMap.get(key);

              if (!cell) {
                return <div key={key} className="w-7 h-7 sm:w-8 sm:h-8" />;
              }

              const isCompleted = cell.isSolved;
              const isSelected = cell.isActive && !isCompleted;
              const displayChar = isCompleted
                ? cell.char
                : cell.revealedChar || '';

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    const nextIdx = cell.wordIndices.find((idx) => idx === activeWordIndex) || cell.wordIndices[0];
                    onSelectWord(nextIdx);
                  }}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-black text-xs sm:text-sm font-mono transition-all transform active:scale-95 ${
                    isCompleted
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 border border-emerald-400/50'
                      : isSelected
                      ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/40 ring-2 ring-amber-300 scale-105 z-10'
                      : 'bg-slate-800/90 text-amber-200 border border-slate-700/80 hover:border-slate-500'
                  }`}
                >
                  {displayChar}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Active Word Clue Bar */}
      {activeWord && (
        <div className="mt-3 w-full max-w-sm px-4 py-2.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/30 text-center shadow-lg flex items-center justify-between gap-2">
          <div className="text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              คำที่ {activeWord.index} ({activeWord.direction === 'across' ? 'แนวนอน' : 'แนวตั้ง'} • {activeWord.word.length} อักษร)
            </span>
            <div className="text-sm font-extrabold text-amber-300 mt-0.5">
              💡 {activeWord.meaningTh}
            </div>
          </div>
          {solvedWords.has(activeWord.word.toLowerCase()) && (
            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
              ✓ สำเร็จ
            </span>
          )}
        </div>
      )}
    </div>
  );
}

