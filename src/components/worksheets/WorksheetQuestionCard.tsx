'use client';

import { X } from 'lucide-react';
import type { WorksheetQuestion } from '@/data/worksheets/types';

interface WorksheetQuestionCardProps {
  question: WorksheetQuestion;
  index: number;
  value: string;
  isActive: boolean;
  onFocus: () => void;
  onClear: () => void;
  onSelectChoice?: (choice: string) => void;
}

export default function WorksheetQuestionCard({
  question,
  index,
  value,
  isActive,
  onFocus,
  onClear,
  onSelectChoice,
}: WorksheetQuestionCardProps) {
  const isFilled = Boolean(value);

  // If question has choices (Multiple Choice format)
  if (question.choices && question.choices.length > 0) {
    return (
      <div
        className={`p-4 rounded-3xl border transition-all ${
          isActive
            ? 'bg-slate-900 border-indigo-500/80 shadow-xl ring-2 ring-indigo-500/30'
            : 'bg-slate-900/60 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
            ข้อที่ {index + 1}
          </span>
          {question.thaiMeaning && (
            <span className="text-xs text-amber-300/90 font-medium">
              💡 {question.thaiMeaning}
            </span>
          )}
        </div>

        <p className="text-base font-bold text-white mb-3 leading-relaxed">
          {question.prompt}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {question.choices.map((choice) => {
            const isSelected = value.toLowerCase() === choice.toLowerCase();
            return (
              <button
                key={choice}
                type="button"
                onClick={() => onSelectChoice?.(choice)}
                className={`px-4 py-3 rounded-2xl font-black text-sm font-mono text-center transition-all cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 shadow-lg shadow-amber-500/30 ring-2 ring-amber-300'
                    : 'bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700'
                }`}
              >
                {choice}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Cloze / Fill in the blank format
  // Split prompt by blank line: '________' or '........'
  const promptParts = question.prompt.split(/_{3,}|\.{3,}/);

  return (
    <div
      onClick={onFocus}
      className={`p-4 rounded-3xl border transition-all cursor-pointer ${
        isActive
          ? 'bg-slate-900 border-amber-400 shadow-xl shadow-amber-500/10 ring-2 ring-amber-400/40'
          : isFilled
          ? 'bg-slate-900/80 border-slate-700'
          : 'bg-slate-900/40 border-slate-800/80'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
            isActive
              ? 'bg-amber-400 text-slate-950'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          ข้อที่ {index + 1}
        </span>
        {question.thaiMeaning && (
          <span className="text-xs text-amber-300/80 font-medium">
            💡 {question.thaiMeaning}
          </span>
        )}
      </div>

      <div className="text-base sm:text-lg font-bold text-white leading-loose flex flex-wrap items-center gap-1.5">
        {promptParts.map((part, pIdx) => (
          <span key={pIdx}>
            {part}
            {pIdx < promptParts.length - 1 && (
              <span className="inline-block mx-1">
                {isFilled ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-mono font-black text-sm shadow-md animate-in zoom-in-90">
                    <span>{value}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClear();
                      }}
                      className="hover:opacity-75"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ) : (
                  <span
                    className={`inline-block px-4 py-1 rounded-xl border-2 border-dashed text-xs font-mono font-bold transition-all ${
                      isActive
                        ? 'border-amber-400 bg-amber-400/10 text-amber-300 animate-pulse'
                        : 'border-slate-600 bg-slate-800/50 text-slate-400'
                    }`}
                  >
                    [ แตะเพื่อเติม ]
                  </span>
                )}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

