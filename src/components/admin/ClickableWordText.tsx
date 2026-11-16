'use client';

import React, { useMemo } from 'react';
import { KNOWN_PHRASES } from '@/data/grammar/dictionaryLookup';

interface ClickableWordTextProps {
  text: string;
  onWordClick: (wordOrPhrase: string, e: React.MouseEvent) => void;
  className?: string;
  wordClassName?: string;
}

export default function ClickableWordText({
  text,
  onWordClick,
  className = '',
  wordClassName = '',
}: ClickableWordTextProps) {
  if (!text) return null;

  // Build high-performance regex matching known multi-word phrases first, then blanks, then single words
  const tokenizerRegex = useMemo(() => {
    // Only phrases with 2+ words (contains space or hyphen)
    const multiWordPhrases = KNOWN_PHRASES.filter(
      (p) => p.includes(' ') || p.includes('-'),
    ).sort((a, b) => b.length - a.length);

    const phrasePattern = multiWordPhrases
      .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

    return new RegExp(
      `(_+\\(?\\d*\\)?_+|\\b(?:${phrasePattern})\\b|[a-zA-Z]+(?:'[a-zA-Z]+)?)`,
      'gi',
    );
  }, []);

  const tokens = useMemo(() => {
    return text.split(tokenizerRegex);
  }, [text, tokenizerRegex]);

  return (
    <span className={className}>
      {tokens.map((token, idx) => {
        if (!token) return null;

        // Blank target (e.g., ____(24)____ or _____)
        if (token.startsWith('_')) {
          return (
            <span
              key={idx}
              className="inline-block px-2 py-0.5 mx-1 font-mono font-bold text-amber-300 bg-amber-400/15 border border-amber-400/40 rounded-lg select-none"
            >
              {token}
            </span>
          );
        }

        const clean = token.toLowerCase().trim();

        // 1. Multi-word phrase or phrasal verb match (clean text without cluttered icons/boxes)
        const isPhrase = clean.includes(' ') || clean.includes('-');
        if (isPhrase && /^[a-zA-Z\s-]+$/.test(clean)) {
          return (
            <span
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                onWordClick(token, e);
              }}
              title={`คลิกเพื่อแปลวลี: "${token}"`}
              className={`hover:bg-amber-400/20 hover:text-amber-200 rounded px-0.5 transition-colors cursor-pointer select-text ${wordClassName}`}
            >
              {token}
            </span>
          );
        }

        // 2. Single English word
        const isWord = /^[a-zA-Z]+(?:'[a-zA-Z]+)?$/.test(token);
        if (isWord) {
          return (
            <span
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                onWordClick(token, e);
              }}
              title={`คลิกเพื่อแปลศัพท์: ${token}`}
              className={`hover:bg-amber-400/25 hover:text-amber-200 hover:underline cursor-pointer rounded px-0.5 transition-colors select-text ${wordClassName}`}
            >
              {token}
            </span>
          );
        }

        // Whitespace, punctuation, or other characters
        return <span key={idx}>{token}</span>;
      })}
    </span>
  );
}
