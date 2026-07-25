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

    const registerWarning = () => {
      setWarnings((prev) => {
        const newWarnings = prev + 1;
        if (newWarnings >= 3) {
          onCheatDetected('BLUR_MAX_WARNINGS');
        } else {
          onWarning(newWarnings);
        }
        return newWarnings;
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        registerWarning();
      }
    };

    const handleRestrictedInteraction = (event: Event) => {
      event.preventDefault();
      registerWarning();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', handleRestrictedInteraction);
    document.addEventListener('cut', handleRestrictedInteraction);
    document.addEventListener('paste', handleRestrictedInteraction);
    document.addEventListener('contextmenu', handleRestrictedInteraction);

    const previousHtmlTranslate = document.documentElement.getAttribute('translate');
    const previousBodyTranslate = document.body.getAttribute('translate');
    document.documentElement.setAttribute('translate', 'no');
    document.body.setAttribute('translate', 'no');
    document.body.classList.add('notranslate');

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', handleRestrictedInteraction);
      document.removeEventListener('cut', handleRestrictedInteraction);
      document.removeEventListener('paste', handleRestrictedInteraction);
      document.removeEventListener('contextmenu', handleRestrictedInteraction);
      if (previousHtmlTranslate === null) document.documentElement.removeAttribute('translate');
      else document.documentElement.setAttribute('translate', previousHtmlTranslate);
      if (previousBodyTranslate === null) document.body.removeAttribute('translate');
      else document.body.setAttribute('translate', previousBodyTranslate);
      document.body.classList.remove('notranslate');
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
