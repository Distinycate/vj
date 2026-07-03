'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { actionStartChristmasAttempt, actionGetNextChristmasQuestion, actionSubmitChristmasAnswer, actionFinishChristmasAttempt } from '../actions';
import { getStudentSession, StudentSession } from '@/utils/studentSession';

export default function ChristmasPlayer() {
  const router = useRouter();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState<any>(null);
  const [questionNo, setQuestionNo] = useState(1);
  const [attemptNo, setAttemptNo] = useState(1);
  const [inputValue, setInputValue] = useState('');
  const [hearts, setHearts] = useState(3);
  const [score, setScore] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [showComboAnim, setShowComboAnim] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning' | null, message: string }>({ type: null, message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [student, setStudent] = useState<StudentSession | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const session = getStudentSession();
    if (!session) {
      setErrorMsg('กรุณาเข้าสู่ระบบนักเรียนจากหน้าหลักก่อนเข้าร่วมกิจกรรม');
      setLoading(false);
      return;
    }
    setStudent(session);
    actionStartChristmasAttempt(session.id).then(async (res) => {
      if (res.success && res.attemptId) {
        setAttemptId(res.attemptId);
        const questionResult = await actionGetNextChristmasQuestion(session.id);
        if (questionResult.success && questionResult.question) {
          setCurrentQ(questionResult.question);
        } else {
          setErrorMsg(questionResult.error || 'ไม่สามารถโหลดคำถามได้');
        }
        setLoading(false);
      } else {
        setErrorMsg('ไม่สามารถเริ่มกิจกรรมได้: ' + (res.error || 'Unknown error'));
        setLoading(false);
      }
    });
  }, []);

  const loadNextQuestion = async (studentId: string) => {
    setLoading(true);
    const res = await actionGetNextChristmasQuestion(studentId);
    if (res.success && res.question) {
      setCurrentQ(res.question);
      setAttemptNo(1);
      setInputValue('');
      setFeedback({ type: null, message: '' });
    } else {
      // No more questions or limit reached
      await finishGame();
    }
    setLoading(false);
  };

  useEffect(() => {
    if (inputRef.current && !loading) {
      inputRef.current.focus();
    }
  }, [currentQ, loading]);

  const finishGame = async (currentAttemptId: string | null = attemptId, studentId: string | undefined = student?.id) => {
    if (!currentAttemptId || !studentId) return;
    setLoading(true);
    const res = await actionFinishChristmasAttempt(currentAttemptId, studentId);
    if (res.success) {
      router.push(`/events/christmas/result?attemptId=${currentAttemptId}`);
    } else {
      setErrorMsg('เกิดข้อผิดพลาดในการสรุปผล');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSubmitting || !attemptId || !currentQ || !student) return;

    setIsSubmitting(true);
    const res = await actionSubmitChristmasAnswer(
      attemptId,
      currentQ.vocabId,
      currentQ.questionType,
      inputValue,
      attemptNo,
      hearts,
      student.id,
      currentQ.expectedAnswer
    );

    if (res.success && res.result) {
      const { isCorrect, isNearMiss, message, scoreEarned, heartsRemaining } = res.result;
      
      setHearts(heartsRemaining);
      
      if (isCorrect) {
        setFeedback({ type: 'success', message });
        setScore(s => s + scoreEarned);
        
        if (attemptNo === 1) {
          setComboCount(c => c + 1);
          setShowComboAnim(true);
          setTimeout(() => setShowComboAnim(false), 1000);
        } else {
          setComboCount(0);
        }
        
        setTimeout(() => {
          setQuestionNo(q => q + 1);
          if (questionNo >= 20) { // Limit to 20 per attempt as per prompt settings
            finishGame(attemptId, student.id);
          } else {
            loadNextQuestion(student.id);
          }
          setIsSubmitting(false);
        }, 1500);
      } else if (isNearMiss) {
        setFeedback({ type: 'warning', message });
        setAttemptNo(a => a + 1);
        setComboCount(0);
        setIsSubmitting(false);
      } else {
        setFeedback({ type: 'error', message });
        setAttemptNo(a => a + 1);
        setComboCount(0);
        if (heartsRemaining <= 0) {
          setTimeout(() => { finishGame(attemptId, student.id); }, 1500);
        }
        setIsSubmitting(false);
      }
    } else {
      setErrorMsg('เกิดข้อผิดพลาดในการส่งคำตอบ');
      setIsSubmitting(false);
    }
  };

  const playAudio = () => {
    if (currentQ?.speechText) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentQ.speechText);
      utterance.lang = 'en-US';
      speechSynthesis.speak(utterance);
    }
  };

  // Auto-play audio for listening questions
  useEffect(() => {
    if (currentQ?.questionType === 'listening_typing') {
      playAudio();
    }
  }, [currentQ]);

  if (errorMsg) {
    return <div className="min-h-screen bg-slate-900 text-white p-6 flex items-center justify-center">{errorMsg}</div>;
  }

  if (loading || !currentQ) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center">
        <div className="text-6xl animate-bounce mb-4">🎅</div>
        <div className="text-xl font-bold animate-pulse">กำลังเตรียมภารกิจ...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-slate-900 to-slate-950 text-slate-100 p-4 md:p-6 font-sans flex flex-col relative overflow-hidden">
      {/* Snowflakes CSS Animation Background */}
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] animate-pulse"></div>

      {/* Header Bar */}
      <header className="flex justify-between items-center bg-slate-800/80 p-4 rounded-2xl border border-slate-700 mb-8 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-4">
          <Link href="/events/christmas" className="text-slate-400 hover:text-white transition-colors">
            ✕ ยอมแพ้
          </Link>
          <div className="text-sm font-bold text-slate-300">
            ภารกิจที่ <span className="text-white">{questionNo}</span> / 20
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">Score</span>
            <span className="text-emerald-400 font-bold font-mono text-lg">{score}</span>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map(h => (
              <span key={h} className={`text-2xl ${h <= hearts ? 'grayscale-0 opacity-100' : 'grayscale opacity-30'}`}>
                ❤️
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Main Play Area */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full relative z-10">
        <div className="bg-slate-800/90 p-8 md:p-12 rounded-3xl border border-blue-900/50 shadow-[0_0_50px_rgba(30,58,138,0.3)] w-full text-center relative overflow-hidden backdrop-blur-xl">
          
          {/* Combo Animation */}
          {comboCount >= 2 && (
            <div className={`absolute top-4 right-8 pointer-events-none transition-all duration-300 ${showComboAnim ? 'scale-125 opacity-100' : 'scale-100 opacity-90'}`}>
               <p className="text-sm text-yellow-500 font-bold uppercase tracking-widest mb-[-8px]">Combo</p>
               <p className="text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-orange-600 drop-shadow-lg">
                 x{comboCount}!
               </p>
            </div>
          )}

          {/* Mode Indicator */}
          <div className="inline-block bg-blue-900/50 border border-blue-500/30 text-blue-300 px-4 py-1 rounded-full text-sm font-bold mb-8">
            {currentQ.questionType === 'listening_typing' && '🎧 ภารกิจทักษะการฟัง'}
            {currentQ.questionType === 'meaning_match' && '🇹🇭 ภารกิจแปลความหมาย'}
            {currentQ.questionType === 'word_match' && '🔤 ภารกิจจับคู่คำศัพท์'}
            {currentQ.questionType === 'spelling_typing' && '✍️ ภารกิจสะกดคำ'}
            {currentQ.questionType === 'context_typing' && '📖 ภารกิจวิเคราะห์ประโยค'}
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-white mb-10 leading-tight">
            {currentQ.prompt}
          </h2>

          {(currentQ.speechText || currentQ.questionType === 'listening_typing') && (
            <button
              type="button"
              onClick={playAudio}
              className="mb-8 rounded-full bg-indigo-600/30 border border-indigo-500 px-6 py-3 font-bold text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all shadow-lg"
            >
              🔊 ฟังเสียงอีกครั้ง
            </button>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col items-center w-full">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isSubmitting || feedback.type === 'success'}
              placeholder="พิมพ์คำตอบของคุณ..."
              className={`w-full max-w-md bg-slate-900/80 border-2 rounded-2xl px-6 py-4 text-2xl text-center text-white font-bold outline-none transition-colors mb-6 shadow-inner
                ${feedback.type === 'error' ? 'border-red-500 focus:border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 
                  feedback.type === 'success' ? 'border-emerald-500 focus:border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' :
                  feedback.type === 'warning' ? 'border-amber-500 focus:border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' :
                  'border-slate-600 focus:border-blue-500'}`
              }
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />

            {feedback.message && (
              <div className={`mb-6 font-bold text-lg animate-bounce ${
                feedback.type === 'success' ? 'text-emerald-400' :
                feedback.type === 'error' ? 'text-red-400' :
                'text-amber-400'
              }`}>
                {feedback.message}
              </div>
            )}

            <button
              type="submit"
              disabled={!inputValue.trim() || isSubmitting || feedback.type === 'success'}
              className="bg-gradient-to-r from-red-600 to-red-500 disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-4 px-12 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-transform hover:scale-105 active:scale-95 text-xl w-full max-w-md border border-red-400/50"
            >
              ส่งคำตอบ
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
