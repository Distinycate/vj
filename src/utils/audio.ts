/**
 * Robust Text-To-Speech (TTS) audio player for English words.
 * Optimized for mobile devices (iOS, Android) and web browsers.
 */
export const playWordAudio = (text: string) => {
  if (!text) return;
  
  try {
    // Youdao US Accent TTS url (type=0 is US accent, type=1 is UK accent)
    // Fast, reliable, public MP3 streams
    const audioUrl = `https://dict.youdao.com/dictvoice?type=0&audio=${encodeURIComponent(text.trim())}`;
    const audio = new Audio(audioUrl);
    
    // Attempt playback
    audio.play().catch((err) => {
      console.warn("HTML5 Audio play failed, trying fallback Web Speech Synthesis:", err);
      fallbackSpeak(text);
    });
  } catch (e) {
    console.warn("HTML5 Audio creation failed, trying fallback Web Speech Synthesis:", e);
    fallbackSpeak(text);
  }
};

const fallbackSpeak = (text: string) => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.volume = 1;
      utterance.rate = 0.9; // Slightly slower for better clarity
      utterance.pitch = 1;
      
      // Assign English voice if available
      const voices = window.speechSynthesis.getVoices();
      const enVoice = voices.find(v => v.lang.toLowerCase().startsWith('en'));
      if (enVoice) {
        utterance.voice = enVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("SpeechSynthesis error:", e);
    }
  }
};
