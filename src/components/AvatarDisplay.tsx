'use client';
import { useState } from 'react';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
type AvatarStyle = 'adventurer' | 'fun-emoji' | 'bottts' | 'avataaars' | 'micah';

interface AvatarDisplayProps {
  seed: string;
  style?: AvatarStyle | string;
  size?: AvatarSize;
  className?: string;
}

export default function AvatarDisplay({ seed, style = 'adventurer', size = 'md', className = '' }: AvatarDisplayProps) {
  const [error, setError] = useState(false);

  // Map sizes to pixel values
  const sizeMap = {
    sm: 32,
    md: 48,
    lg: 80,
    xl: 120,
  };

  const pxSize = sizeMap[size] || sizeMap.md;
  
  // Clean style input (fallback to adventurer if unknown)
  const validStyles = ['adventurer', 'fun-emoji', 'bottts', 'avataaars', 'micah', 'thumbs'];
  const safeStyle = validStyles.includes(style) ? style : 'adventurer';
  
  // Generate DiceBear URL (API v9)
  const avatarUrl = `https://api.dicebear.com/9.x/${safeStyle}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`;

  const baseClasses = `rounded-full flex items-center justify-center bg-slate-800 border-2 border-slate-700 overflow-hidden select-none shrink-0`;
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20 border-4',
    xl: 'w-32 h-32 border-4',
  };

  if (error || !seed) {
    // Fallback emoji
    return (
      <div className={`${baseClasses} ${sizeClasses[size]} ${className}`}>
        <span className="text-xl" style={{ fontSize: `${pxSize * 0.5}px` }}>
          🦸‍♂️
        </span>
      </div>
    );
  }

  return (
    <div className={`${baseClasses} ${sizeClasses[size]} ${className}`}>
      <img
        src={avatarUrl}
        alt={`Avatar for ${seed}`}
        width={pxSize}
        height={pxSize}
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
}
