'use client';

import { useState } from 'react';
import { X, Volume2, Lightbulb, CheckCircle2, XCircle } from 'lucide-react';
import type { WorksheetQuestion } from '@/data/worksheets/types';
import { speakWithWebSpeech, playWordAudio } from '@/utils/audio';

export interface QuestionReviewResult {
  questionId: string;
  submitted: string;
  expected: string;
  isCorrect: boolean;
  thaiMeaning?: string;
  explanationTh?: string;
}

interface WorksheetQuestionCardProps {
  question: WorksheetQuestion;
  index: number;
  value: string;
  isActive: boolean;
  showAllHints?: boolean;
  reviewResult?: QuestionReviewResult;
  onFocus: () => void;
  onClear: () => void;
  onSelectChoice?: (choice: string) => void;
}

export default function WorksheetQuestionCard({
  question,
  index,
  value,
  isActive,
  showAllHints = false,
  reviewResult,
  onFocus,
  onClear,
  onSelectChoice,
}: WorksheetQuestionCardProps) {
  const [localHintOpen, setLocalHintOpen] = useState(false);
  const isFilled = Boolean(value);
  const isHintVisible = showAllHints || localHintOpen || Boolean(reviewResult);

  const handleSpeakSentence = (e: React.MouseEvent) => {
    e.stopPropagation();
    const fillWord = reviewResult?.expected || value || '...';
    const cleanSentence = question.prompt
      .replace(/_{2,}|\.{3,}/g, fillWord)
      .replace(/\s+/g, ' ')
      .trim();
    speakWithWebSpeech(cleanSentence);
  };

  const handleSpeakAnswer = (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    playWordAudio(word);
  };

  const renderHeader = (badgeActiveClass: string, badgeInactiveClass: string) => (
    <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
      <div className="flex items-center gap-2">
        <span
          className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg ${
            isActive ? badgeActiveClass : badgeInactiveClass
          }`}
        >
          ข้อที่ {index + 1}
        </span>

        <button
          type="button"
          onClick={handleSpeakSentence}
          title="ฟังเสียงอ่านประโยค"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>ฟังประโยค</span>
        </button>

        {reviewResult && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-lg ${
              reviewResult.isCorrect
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}
          >
            {reviewResult.isCorrect ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> ถูกต้อง
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5" /> เฉลย: {reviewResult.expected}
              </>
            )}
          </span>
        )}
      </div>

      {question.thaiMeaning && (
        <div>
          {isHintVisible ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!showAllHints && !reviewResult) setLocalHintOpen(false);
              }}
              className="text-xs text-amber-300/95 font-medium bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1"
            >
              <span>💡 {question.thaiMeaning}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLocalHintOpen(true);
              }}
              className="text-[11px] text-amber-300/80 hover:text-amber-200 bg-slate-800/90 hover:bg-slate-800 border border-amber-500/30 px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1 font-bold transition-all cursor-pointer"
            >
              <Lightbulb className="w-3 h-3 text-amber-400" />
              <span>ดูคำใบ้ (Hint)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderReviewExplanation = () => {
    if (!reviewResult) return null;
    return (
      <div
        className={`mt-3 p-3 rounded-2xl border text-xs leading-relaxed ${
          reviewResult.isCorrect
            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-100'
            : 'bg-rose-950/30 border-rose-500/30 text-rose-100'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-black text-amber-300">
            📌 เฉลย: <span className="font-mono underline">{reviewResult.expected}</span>
          </span>
          <button
            type="button"
            onClick={(e) => handleSpeakAnswer(e, reviewResult.expected)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/80 hover:bg-slate-800 text-sky-300 border border-slate-700 text-[11px] font-bold cursor-pointer"
          >
            <Volume2 className="w-3 h-3" />
            <span>ฟังคำศัพท์</span>
          </button>
        </div>
        {reviewResult.explanationTh && (
          <p className="text-slate-200 mt-1">{reviewResult.explanationTh}</p>
        )}
      </div>
    );
  };

  // If question has choices (Multiple Choice format)
  if (question.choices && question.choices.length > 0) {
    return (
      <div
        className={`p-4 rounded-3xl border transition-all ${
          reviewResult
            ? reviewResult.isCorrect
              ? 'bg-slate-900/90 border-emerald-500/60'
              : 'bg-slate-900/90 border-rose-500/60'
            : isActive
            ? 'bg-slate-900 border-indigo-500/80 shadow-xl ring-2 ring-indigo-500/30'
            : 'bg-slate-900/60 border-slate-800'
        }`}
      >
        {renderHeader(
          'bg-indigo-500/20 text-indigo-300',
          'bg-slate-800 text-slate-400'
        )}

        <p className="text-base font-bold text-white mb-3 leading-relaxed">
          {question.prompt}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {question.choices.map((choice) => {
            const isSelected = value.toLowerCase() === choice.toLowerCase();
            const isExpected =
              reviewResult &&
              reviewResult.expected.toLowerCase() === choice.toLowerCase();
            return (
              <div key={choice} className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={Boolean(reviewResult)}
                  onClick={() => onSelectChoice?.(choice)}
                  className={`flex-1 px-4 py-3 rounded-2xl font-black text-sm font-mono text-center transition-all cursor-pointer active:scale-95 ${
                    isExpected
                      ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300'
                      : isSelected
                      ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 shadow-lg shadow-amber-500/30 ring-2 ring-amber-300'
                      : 'bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700'
                  }`}
                >
                  {choice}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSpeakAnswer(e, choice)}
                  title={`ฟังเสียงคำว่า ${choice}`}
                  className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-sky-300 border border-slate-700 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        {renderReviewExplanation()}
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
        reviewResult
          ? reviewResult.isCorrect
            ? 'bg-slate-900/90 border-emerald-500/60'
            : 'bg-slate-900/90 border-rose-500/60'
          : isActive
          ? 'bg-slate-900 border-amber-400 shadow-xl shadow-amber-500/10 ring-2 ring-amber-400/40'
          : isFilled
          ? 'bg-slate-900/80 border-slate-700'
          : 'bg-slate-900/40 border-slate-800/80'
      }`}
    >
      {renderHeader('bg-amber-400 text-slate-950', 'bg-slate-800 text-slate-400')}

      <div className="text-base sm:text-lg font-bold text-white leading-loose flex flex-wrap items-center gap-1.5">
        {promptParts.map((part, pIdx) => (
          <span key={pIdx}>
            {part}
            {pIdx < promptParts.length - 1 && (
              <span className="inline-block mx-1">
                {isFilled ? (
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-white font-mono font-black text-sm shadow-md animate-in zoom-in-90 ${
                      reviewResult
                        ? reviewResult.isCorrect
                          ? 'bg-emerald-600'
                          : 'bg-rose-600 line-through'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-600'
                    }`}
                  >
                    <span>{value}</span>
                    {!reviewResult && (
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
                    )}
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

      {renderReviewExplanation()}
    </div>
  );
}
