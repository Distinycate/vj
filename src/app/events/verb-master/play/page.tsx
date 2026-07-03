'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { actionStartAttempt, actionGetNextQuestion, actionSubmitAnswer, actionFinishAttempt } from '../actions';
import { getStudentSession, StudentSession } from '@/utils/studentSession';

export default function VerbMasterPlayer() {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState<any>(null);
  const [questionNo, setQuestionNo] = useState(1);
  const [attemptNo, setAttemptNo] = useState(1);
  const [inputValue, setInputValue] = useState('');
  const [hearts, setHearts] = useState(3);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning' | null, message: string }>({ type: null, message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [finalResult, setFinalResult] = useState<any>(null);
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
    actionStartAttempt(session.id).then(async (res) => {
      if (res.success && res.attemptId) {
        setAttemptId(res.attemptId);
        const questionResult = await actionGetNextQuestion(session.id);
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
    const res = await actionGetNextQuestion(studentId);
    if (res.success && res.question) {
      setCurrentQ(res.question);
      setAttemptNo(1);
      setInputValue('');
      setFeedback({ type: null, message: '' });
    } else {
      // Maybe no more questions or error
      await finishGame();
    }
    setLoading(false);
  };

  useEffect(() => {
    if (inputRef.current && !isGameOver && !loading) {
      inputRef.current.focus();
    }
  }, [currentQ, isGameOver, loading]);

  const finishGame = async (currentAttemptId: string | null = attemptId, studentId: string | undefined = student?.id) => {
    if (!currentAttemptId || !studentId) return;
    setIsGameOver(true);
    setLoading(true);
    const res = await actionFinishAttempt(currentAttemptId, studentId);
    if (res.success) {
      setFinalResult(res.result);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSubmitting || !attemptId || !currentQ || !student) return;

    setIsSubmitting(true);
    const res = await actionSubmitAnswer(
      attemptId,
      currentQ.verbId,
      currentQ.questionType,
      inputValue,
      attemptNo,
      hearts,
      student.id,
    );

    if (res.success && res.result) {
      const { isCorrect, isNearMiss, message, scoreEarned, heartsRemaining } = res.result;
      
      setHearts(heartsRemaining);
      
      if (isCorrect) {
        setFeedback({ type: 'success', message });
        setScore(s => s + scoreEarned);
        setTimeout(() => {
          setQuestionNo(q => q + 1);
          if (questionNo >= 20) { // Let's say 20 is max for now
            finishGame(attemptId, student.id);
          } else {
            loadNextQuestion(student.id);
          }
          setIsSubmitting(false);
        }, 1500);
      } else if (isNearMiss) {
        setFeedback({ type: 'warning', message });
        setAttemptNo(a => a + 1);
        setIsSubmitting(false);
      } else {
        setFeedback({ type: 'error', message });
        setAttemptNo(a => a + 1);
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

  if (errorMsg) {
    return <div className="min-h-screen bg-slate-900 text-white p-6 flex items-center justify-center">{errorMsg}</div>;
  }

  if (isGameOver) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex flex-col items-center justify-center">
        <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl text-center max-w-md w-full">
          <h1 className="text-4xl font-bold text-white mb-4">
            {hearts <= 0 ? 'Game Over!' : 'Challenge Complete!'}
          </h1>
          <p className="text-slate-400 mb-2">คุณทำคะแนนได้: <span className="text-emerald-400 font-bold text-xl">{score}</span></p>
          {finalResult && (
            <div className="mb-6">
               <p className="text-slate-400">ความแม่นยำ: <span className="text-blue-400">{finalResult.accuracy}%</span></p>
               <p className="text-slate-400">เหรียญที่ได้: <span className="text-yellow-400">+{finalResult.coinsEarned}</span></p>
               <p className="text-slate-400">EXP ที่ได้: <span className="text-purple-400">+{finalResult.expEarned}</span></p>
            </div>
          )}
          <Link 
            href="/events/verb-master"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-colors w-full"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !currentQ) {
    return <div className="min-h-screen bg-slate-900 text-white p-6 flex items-center justify-center">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6 font-sans flex flex-col">
      {/* Header Bar */}
      <header className="flex justify-between items-center bg-slate-800/80 p-4 rounded-2xl border border-slate-700 mb-8 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link href="/events/verb-master" className="text-slate-400 hover:text-white transition-colors">
            ✕ ออก
          </Link>
          <div className="text-sm font-bold text-slate-300">
            ข้อที่ <span className="text-white">{questionNo}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">Score</span>
            <span className="text-emerald-400 font-bold font-mono text-lg">{score}</span>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map(h => (
              <svg key={h} className={`w-6 h-6 ${h <= hearts ? 'text-red-500' : 'text-slate-700'}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            ))}
          </div>
        </div>
      </header>

      {/* Main Play Area */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
        <div className="bg-slate-800 p-8 md:p-12 rounded-3xl border border-slate-700 shadow-2xl w-full text-center relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-purple-600/10 blur-3xl rounded-full pointer-events-none"></div>

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-10 leading-tight">
            {currentQ.prompt}
          </h2>

          {currentQ.speechText && (
            <button
              type="button"
              onClick={() => {
                speechSynthesis.cancel();
                speechSynthesis.speak(new SpeechSynthesisUtterance(currentQ.speechText));
              }}
              className="mb-6 rounded-full bg-indigo-600 px-6 py-3 font-bold text-white hover:bg-indigo-500"
            >
              🔊 ฟังเสียงอีกครั้ง
            </button>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col items-center w-full relative z-10">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isSubmitting || feedback.type === 'success'}
              placeholder={currentQ.answerCount === 2 ? 'พิมพ์คำตอบ 2 คำ คั่นด้วยจุลภาค' : 'พิมพ์คำตอบของคุณ...'}
              className={`w-full max-w-md bg-slate-900 border-2 rounded-2xl px-6 py-4 text-2xl text-center text-white font-bold outline-none transition-colors mb-6
                ${feedback.type === 'error' ? 'border-red-500 focus:border-red-500' : 
                  feedback.type === 'success' ? 'border-emerald-500 focus:border-emerald-500' :
                  feedback.type === 'warning' ? 'border-amber-500 focus:border-amber-500' :
                  'border-slate-600 focus:border-blue-500'}`
              }
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />

            {feedback.message && (
              <div className={`mb-6 font-bold text-lg ${
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
              className="bg-gradient-to-r from-blue-600 to-purple-600 disabled:from-slate-600 disabled:to-slate-700 disabled:text-slate-400 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 px-12 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 text-xl w-full max-w-md"
            >
              ส่งคำตอบ
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
