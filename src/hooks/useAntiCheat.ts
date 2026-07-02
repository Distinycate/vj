import { useState, useEffect, useRef } from 'react';

export function useAntiCheat(
  isActive: boolean,
  onCheatDetected: (reason: string) => void,
  onWarning: (warnings: number) => void
) {
  const [warnings, setWarnings] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

  // Reset start time when activated
  useEffect(() => {
    if (isActive) {
      startTimeRef.current = Date.now();
      setWarnings(0);
    }
  }, [isActive]);

  // Visibility / Blur detection
  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setWarnings((prev) => {
          const newWarnings = prev + 1;
          if (newWarnings >= 3) {
            onCheatDetected('BLUR_MAX_WARNINGS');
          } else {
            onWarning(newWarnings);
          }
          return newWarnings;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, onCheatDetected, onWarning]);

  // Function to validate time on stage completion
  const validateTime = (totalQuestions: number) => {
    const elapsedMs = Date.now() - startTimeRef.current;
    // If they answered faster than 0.5s per question, it's impossible without cheating
    if (elapsedMs < totalQuestions * 500) {
      onCheatDetected('SPEED_HACK');
      return false;
    }
    return true;
  };

  return { warnings, validateTime };
}
