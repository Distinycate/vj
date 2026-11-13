'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCw, Lightbulb, Delete } from 'lucide-react';
import { puzzleAudio } from '@/lib/puzzle/puzzleAudio';

interface LetterWheelProps {
  letters: string[]; // e.g. ['H', 'E', 'A', 'R', 'T']
  onWordSubmit: (word: string) => boolean; // returns true if accepted
  onShuffle: () => void;
  onHint: () => void;
  coins: number;
}

export default function LetterWheel({
  letters,
  onWordSubmit,
  onShuffle,
  onHint,
  coins,
}: LetterWheelProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [currentWord, setCurrentWord] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);

  const wheelRef = useRef<HTMLDivElement | null>(null);
  const letterNodesRef = useRef<(HTMLDivElement | null)[]>([]);

  // Update currentWord when selectedIndices change
  useEffect(() => {
    const word = selectedIndices.map((idx) => letters[idx] || '').join('');
    setCurrentWord(word);
  }, [selectedIndices, letters]);

  // Compute circular coordinates for each letter
  const radius = 80; // px
  const center = 110; // px
  const positions = letters.map((_, idx) => {
    const angle = (idx / letters.length) * 2 * Math.PI - Math.PI / 2;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  });

  const checkPointerCollision = useCallback(
    (clientX: number, clientY: number) => {
      if (!wheelRef.current) return;
      const rect = wheelRef.current.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      setPointerPos({ x: localX, y: localY });

      // Hit radius for each letter circle is 32px
      const hitRadius = 32;
      for (let i = 0; i < positions.length; i++) {
        const p = positions[i];
        const dist = Math.hypot(localX - p.x, localY - p.y);
        if (dist <= hitRadius) {
          setSelectedIndices((prev) => {
            // Cannot pick same index twice
            if (prev.includes(i)) return prev;
            puzzleAudio.playSelect();
            return [...prev, i];
          });
          break;
        }
      }
    },
    [positions]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    checkPointerCollision(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    checkPointerCollision(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setPointerPos(null);

    if (currentWord.length >= 2) {
      const accepted = onWordSubmit(currentWord.toLowerCase());
      if (accepted) {
        puzzleAudio.playWordSuccess();
      } else {
        puzzleAudio.playWrong();
      }
    }
    setSelectedIndices([]);
  };

  return (
    <div className="w-full flex flex-col items-center select-none touch-none">
      {/* Current Assembled Word Preview */}
      <div className="h-10 flex items-center justify-center mb-1">
        {currentWord ? (
          <div className="px-5 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 text-slate-950 font-black text-lg tracking-widest shadow-lg shadow-amber-500/30 animate-pulse">
            {currentWord}
          </div>
        ) : (
          <div className="text-xs text-slate-500 font-bold tracking-wider">
            👆 ลากนิ้วเชื่อมตัวอักษรเพื่อตอบ
          </div>
        )}
      </div>

      {/* Wheel Area with Controls on Left and Right */}
      <div className="flex items-center justify-center gap-4">
        {/* Shuffle Button */}
        <button
          type="button"
          onClick={() => {
            puzzleAudio.playSelect();
            onShuffle();
          }}
          className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700/80 hover:border-amber-400 text-slate-300 hover:text-amber-300 flex flex-col items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer"
          title="สลับตำแหน่งอักษร"
        >
          <RotateCw className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-0.5">สลับ</span>
        </button>

        {/* Circular Letter Wheel */}
        <div
          ref={wheelRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-[220px] h-[220px] rounded-full bg-slate-900/90 border-2 border-indigo-500/40 shadow-2xl shadow-indigo-950/60 overflow-visible backdrop-blur-md"
        >
          {/* Connecting SVG Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            {selectedIndices.map((idx, i) => {
              if (i === 0) return null;
              const prev = positions[selectedIndices[i - 1]];
              const curr = positions[idx];
              return (
                <line
                  key={`line-${i}`}
                  x1={prev.x}
                  y1={prev.y}
                  x2={curr.x}
                  y2={curr.y}
                  stroke="#fbbf24"
                  strokeWidth="6"
                  strokeLinecap="round"
                  className="filter drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                />
              );
            })}
            {/* Trailing line to finger */}
            {isDragging && selectedIndices.length > 0 && pointerPos && (
              <line
                x1={positions[selectedIndices[selectedIndices.length - 1]].x}
                y1={positions[selectedIndices[selectedIndices.length - 1]].y}
                x2={pointerPos.x}
                y2={pointerPos.y}
                stroke="#f59e0b"
                strokeWidth="4"
                strokeDasharray="4 4"
                strokeLinecap="round"
                opacity="0.8"
              />
            )}
          </svg>

          {/* Letter Circles */}
          {letters.map((letter, idx) => {
            const pos = positions[idx];
            const isSelected = selectedIndices.includes(idx);
            return (
              <div
                key={`${letter}-${idx}`}
                ref={(el) => {
                  letterNodesRef.current[idx] = el;
                }}
                style={{
                  left: `${pos.x - 22}px`,
                  top: `${pos.y - 22}px`,
                }}
                className={`absolute w-11 h-11 rounded-full flex items-center justify-center font-black text-lg sm:text-xl font-mono cursor-pointer transition-transform z-20 shadow-md ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 scale-110 shadow-lg shadow-amber-400/50 ring-4 ring-amber-300'
                    : 'bg-gradient-to-b from-slate-800 to-slate-900 text-slate-100 border border-slate-700 hover:border-amber-400/60'
                }`}
              >
                {letter}
              </div>
            );
          })}
        </div>

        {/* Hint Button */}
        <button
          type="button"
          onClick={onHint}
          className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700/80 hover:border-amber-400 text-amber-300 flex flex-col items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer"
          title="เปิดคำใบ้ 1 อักษร (ใช้ 20 เหรียญ)"
        >
          <Lightbulb className="w-5 h-5 text-amber-400" />
          <span className="text-[9px] font-bold mt-0.5 text-amber-400/90">20 🪙</span>
        </button>
      </div>
    </div>
  );
}

