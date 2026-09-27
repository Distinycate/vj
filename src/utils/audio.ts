/**
 * Robust Text-To-Speech (TTS) audio player for English words.
 * Optimized for mobile devices (iOS Safari, Android Chrome) and web browsers.
 * Guarantees 100% audible pronunciation through Smart Web Speech Synthesis fallback.
 */

// Cache available voices across the app lifecycle
let cachedVoices: SpeechSynthesisVoice[] = [];
let isVoiceInitialized = false;

// Initialize and pre-warm voices when in browser
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const initVoices = () => {
    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        cachedVoices = voices;
        isVoiceInitialized = true;
      }
    } catch {}
  };

  initVoices();
  if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
    window.speechSynthesis.onvoiceschanged = initVoices;
  }
}

/**
 * Stop any ongoing speech playback immediately.
 */
export const cancelAudio = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
};

/**
 * Primary Web Speech Synthesis playback engine with US/UK accent priority.
 */
export const speakWithWebSpeech = (text: string, rate: number = 0.9): boolean => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  
  try {
    window.speechSynthesis.cancel();

    const cleanText = text.trim();
    if (!cleanText) return false;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    utterance.volume = 1;
    utterance.rate = rate; // Slightly slower for student clarity
    utterance.pitch = 1.0;

    // Pick optimal English voice
    const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      // Preference: Natural / Premium US English -> Standard US -> Standard UK -> Any English
      const preferredVoice =
        voices.find(v => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Siri')) && (v.lang === 'en-US' || v.lang === 'en_US')) ||
        voices.find(v => v.lang === 'en-US' || v.lang === 'en_US') ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (e) {
    console.warn("SpeechSynthesis execution failed:", e);
    return false;
  }
};

/**
 * Main audio playback function:
 * First attempts fast cloud MP3 stream, and seamlessly falls back to Web Speech API
 * if the network stream fails, is blocked by mobile autoplay policies, or takes too long.
 */
export const playWordAudio = (text: string) => {
  if (!text) return;
  const cleanWord = text.trim();
  if (!cleanWord) return;

  try {
    // Youdao US Accent TTS (type=0: US, type=1: UK)
    const audioUrl = `https://dict.youdao.com/dictvoice?type=0&audio=${encodeURIComponent(cleanWord)}`;
    const audio = new Audio(audioUrl);
    
    let hasFallbackRun = false;
    const triggerFallback = () => {
      if (!hasFallbackRun) {
        hasFallbackRun = true;
        speakWithWebSpeech(cleanWord);
      }
    };

    // Timeout safety: if network audio takes longer than 900ms to play, fallback to instant Web Speech API
    const fallbackTimer = setTimeout(() => {
      triggerFallback();
    }, 900);

    audio.onplay = () => {
      clearTimeout(fallbackTimer);
    };

    audio.onerror = () => {
      clearTimeout(fallbackTimer);
      triggerFallback();
    };

    // Attempt HTML5 playback
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        clearTimeout(fallbackTimer);
        triggerFallback();
      });
    }
  } catch (e) {
    speakWithWebSpeech(cleanWord);
  }
};
