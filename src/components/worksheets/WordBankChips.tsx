'use client';

import { useState } from 'react';
import { Check, Volume2, VolumeX } from 'lucide-react';
import { playWordAudio } from '@/utils/audio';

interface WordBankChipsProps {
  words: string[];
  usedWords: Set<string>;
  onSelectWord: (word: string) => void;
}

export default function WordBankChips({
  words,
  usedWords,
  onSelectWord,
}: WordBankChipsProps) {
  const [speakOnTap, setSpeakOnTap] = useState(true);

  const handleWordClick = (word: string) => {
    if (speakOnTap) {
      playWordAudio(word);
    }
    onSelectWord(word);
  };

  return (
    <div className="w-full p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
          คลังคำศัพท์ (WORD BANK)
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSpeakOnTap((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
              speakOnTap
                ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {speakOnTap ? (
              <>
                <Volume2 className="w-3 h-3" />
                <span>เสียงอ่าน: เปิด</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3 h-3" />
                <span>เสียงอ่าน: ปิด</span>
              </>
            )}
          </button>
          <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">
            แตะคำเพื่อนำไปใส่ในช่องว่าง
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1 select-none">
        {words.map((word) => {
          const isUsed = usedWords.has(word.toLowerCase());
          return (
            <button
              key={word}
              type="button"
              onClick={() => handleWordClick(word)}
              className={`px-3 py-2 rounded-xl font-black text-xs sm:text-sm font-mono transition-all transform active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                isUsed
                  ? 'bg-slate-800/50 text-slate-500 border border-slate-700/40 opacity-50 line-through'
                  : 'bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              }`}
            >
              {word}
              {isUsed && <Check className="w-3.5 h-3.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
