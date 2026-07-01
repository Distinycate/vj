'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Store, Trophy, Star, LogOut, Award, Compass, 
  Bookmark, Eye, CheckCircle2, BookOpen, Volume2, User, ChevronDown, ChevronUp, BookMarked, Activity
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/utils/supabase/client';
import ShopModal from '@/components/ShopModal';
import { playWordAudio } from '@/utils/audio';
import { STORY_WORLDS, ADAPTIVE_RANK_CONFIG, getWorldForStage, WorldInfo } from '@/utils/adaptiveConfig';

const AVATARS = ['🦸‍♂️', '🧙‍♂️', '🥷', '👩‍🚀', '🕵️‍♂️', '🧜‍♂️', '🧑‍🎨', '🧚‍♀️', '🦁', '🦉'];

export default function Dashboard() {
  const { student, progress, logout, setScreen, setProgress } = useAppStore();
  const [showShop, setShowShop] = useState(false);
  const [badges, setBadges] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [reviewWords, setReviewWords] = useState<any[]>([]);
  const [wordCollection, setWordCollection] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ xp: 0, level: 1 });
  const [activeTab, setActiveTab] = useState<'roadmap' | 'review' | 'stats' | 'collection'>('roadmap');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [expandedWorld, setExpandedWorld] = useState<number | null>(1);
  const [aiTeacherMessage, setAiTeacherMessage] = useState('');

  // Classroom stats calculations
  const [classroomStats, setClassroomStats] = useState({
    totalCoins: 0,
    averageStage: 1,
    highestLevel: 1,
  });

  useEffect(() => {
    if (!student) return;
    
    async function loadDashboardData() {
      // 1. Fetch Earned Badges
      const { data: badgeData } = await supabase.from('student_badges').select('*, badges(*)').eq('student_id', student.id);
      if (badgeData) setBadges(badgeData.map(b => b.badges).filter(Boolean));

      // 2. Fetch Earned Achievements
      const { data: achData } = await supabase.from('student_achievements').select('*, achievements(*)').eq('student_id', student.id);
      if (achData) setAchievements(achData.map(a => a.achievements).filter(Boolean));

      // 3. Fetch Spaced Repetition Due Words from user_review_words (Due now or past)
      const { data: repData } = await supabase
        .from('user_review_words')
        .select('*, vocabulary:word_id(*)')
        .eq('user_id', student.id)
        .lt('mastery_level', 4) // ignore fully mastered words
        .lte('next_review_at', new Date().toISOString())
        .order('next_review_at', { ascending: true });
      
      if (repData) {
        setReviewWords(repData.map(r => r.vocabulary).filter(Boolean));
      }

      // 4. Fetch All Words Ever Encountered (Collection)
      const { data: collectionData } = await supabase
        .from('user_review_words')
        .select('*, vocabulary:word_id(*)')
        .eq('user_id', student.id)
        .order('mastery_level', { ascending: false });

      if (collectionData) {
        setWordCollection(collectionData.filter(c => c.vocabulary));
      }

      // 5. Fetch Learning Path
      const { data: pathData } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('student_id', student.id)
        .single();
      
      if (pathData) {
        setProgress(pathData);
        // Calculate dynamic level: 1 level per 100 EXP
        const level = Math.floor((pathData.total_exp || pathData.exp || 0) / 100) + 1;
        setStats({ xp: pathData.total_exp || pathData.exp || 0, level });
      }

      // 6. Fetch Leaderboard for Classroom
      const { data: leadData } = await supabase
        .from('students')
        .select('id, student_name, learning_paths(coins, exp, total_exp, current_stage, avatar_url)')
        .eq('classroom_id', student.classroom_id);
      
      if (leadData) {
        let totalCoins = 0;
        let totalStage = 0;
        let maxLevel = 1;

        const sorted = leadData
          .map(s => {
            const lp = Array.isArray(s.learning_paths) ? s.learning_paths[0] : s.learning_paths;
            totalCoins += lp?.coins || 0;
            totalStage += lp?.current_stage || 1;
            const lvl = Math.floor((lp?.total_exp || lp?.exp || 0) / 100) + 1;
            if (lvl > maxLevel) maxLevel = lvl;

            return {
              id: s.id,
              name: s.student_name,
              avatar: lp?.avatar_url || '🦸‍♂️',
              coins: lp?.coins || 0,
              exp: lp?.total_exp || lp?.exp || 0,
              stage: lp?.current_stage || 1,
              isSelf: s.id === student.id
            };
          })
          .sort((a, b) => b.exp - a.exp || b.coins - a.coins || b.stage - a.stage);

        setLeaderboard(sorted);
        setClassroomStats({
          totalCoins,
          averageStage: Math.round(totalStage / leadData.length),
          highestLevel: maxLevel,
        });
      }
    }

    loadDashboardData();
  }, [student, setProgress]);

  // AI Teacher Speech Generator
  useEffect(() => {
    if (!student || !progress) return;
    const currentStage = progress.current_stage || 1;
    const currentRank = progress.current_rank || 1;
    const streak = progress.streak_days || 0;
    const reviewCount = reviewWords.length;
    const rankName = ADAPTIVE_RANK_CONFIG[currentRank]?.skillTitle || 'ผู้สำรวจ';

    let speech = '';
    if (reviewCount > 0) {
      speech = `สวัสดีครับคุณครูพี่โอมตรวจพบคำศัพท์คงค้าง ${reviewCount} คำในระบบทบทวน สละเวลาสักนิดมาทำให้ความเชี่ยวชาญเพิ่มขึ้นกันเถอะนะ! 📚`;
    } else if (streak >= 3) {
      speech = `สุดยอดไปเลย! น้องลุยทบทวนคำศัพท์ต่อเนื่องมา ${streak} วันติดกันแล้วครับ รักษาสถิติความตั้งใจนี้ไว้นะ! 🔥`;
    } else if (currentRank === 5) {
      speech = `เก่งมากๆ! ตอนนี้ระดับทักษะของน้องอยู่ที่แรงก์สูงสุด "${rankName}" พร้อมที่จะพิชิตคำศัพท์ในด่านถัดไปหรือยังครับ? 🏆`;
    } else if (currentStage > 50) {
      speech = `ครึ่งทางแล้ว! น้องเดินทางผจญภัยเข้าด่านที่ ${currentStage} สำเร็จแล้วนะ พยายามเข้าอีกนิดจะครบ 100 ด่านแล้วครับ 🗺️`;
    } else {
      speech = `ยินดีต้อนรับสู่ Vocab Journey ครับวันนี้เราพร้อมที่จะไปตะลุยด่านที่ ${currentStage} กันหรือยังครับ? ครูพี่โอมพร้อมช่วยใบ้นะ! 🤖`;
    }
    setAiTeacherMessage(speech);
  }, [student, progress, reviewWords]);

  if (!student) return null;

  // Handle avatar update
  const handleSelectAvatar = async (avatar: string) => {
    try {
      await supabase
        .from('learning_paths')
        .update({ avatar_url: avatar })
        .eq('student_id', student.id);
      
      setProgress({ ...progress, avatar_url: avatar });
      setShowAvatarSelector(false);
    } catch (e) {
      console.error(e);
    }
  };

  const currentStage = progress?.current_stage || 1;
  const currentRank = progress?.current_rank || 1;
  const rankConfig = ADAPTIVE_RANK_CONFIG[currentRank] || ADAPTIVE_RANK_CONFIG[1];
  const currentWorld = getWorldForStage(currentStage);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8 pb-24 relative overflow-hidden">
      {/* Ambient backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full mix-blend-screen filter blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full mix-blend-screen filter blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Header Block */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-slate-900/60 backdrop-blur-md border border-slate-800 p-5 rounded-3xl relative">
          <div className="flex items-center gap-3 sm:gap-4 w-full">
            <button 
              onClick={() => setShowAvatarSelector(!showAvatarSelector)}
              className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-lg transition-transform active:scale-95 relative group"
              title="เปลี่ยนภาพประจำตัว"
            >
              {progress?.avatar_url || '🦸‍♂️'}
              <span className="absolute bottom-0 right-0 text-[10px] bg-emerald-500 text-slate-950 font-black px-1 rounded-full uppercase scale-0 group-hover:scale-100 transition-all">EDIT</span>
            </button>
            
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent truncate flex items-center gap-2">
                {student.student_name}
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="px-2.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 rounded-full text-[10px] sm:text-xs font-black shadow-md shadow-amber-500/20">
                  {rankConfig.skillTitle}
                </span>
                <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-full text-[10px] sm:text-xs font-bold">
                  Rank {currentRank}
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-full text-[10px] sm:text-xs font-bold">
                  Lvl {stats.level}
                </span>
                <span className="px-2.5 py-0.5 bg-slate-800 text-slate-400 rounded-full text-[10px] sm:text-xs font-semibold">
                  🔥 {progress?.streak_days || 0} วันติด
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t border-slate-800/80 pt-3 sm:pt-0 sm:border-0">
            <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 shadow-inner">
              <span className="text-base">🪙</span>
              <span className="text-white font-black text-base">{progress?.coins || 0}</span>
            </div>
            
            <button 
              onClick={logout} 
              className="w-10 h-10 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-center hover:scale-105 transition-all text-slate-400 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Avatar Chooser drop down */}
          <AnimatePresence>
            {showAvatarSelector && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute left-6 top-20 bg-slate-900 border border-slate-850 p-4 rounded-2xl shadow-2xl z-50 max-w-[280px]"
              >
                <p className="text-xs text-slate-400 font-bold mb-2 text-left">เลือกรูปประจำตัวของคุณ:</p>
                <div className="grid grid-cols-5 gap-2">
                  {AVATARS.map((av) => (
                    <button 
                      key={av} 
                      onClick={() => handleSelectAvatar(av)}
                      className="text-2xl p-1 bg-slate-950 hover:bg-slate-800 border border-slate-900 rounded-lg transition-transform active:scale-90"
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* AI Mascot Bubble */}
        <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/15 p-4 rounded-2xl flex items-center gap-3.5 mb-6">
          <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center text-xl shrink-0">
            🤖
          </div>
          <div className="text-left">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-0.5">ครูพี่โอม AI Teacher</span>
            <p className="text-sm text-slate-200 font-medium leading-relaxed">{aiTeacherMessage}</p>
          </div>
        </div>

        {/* Info Adaptive Banner */}
        <div className="bg-slate-900/40 border border-slate-850 text-slate-400 text-xs py-2.5 px-4 rounded-xl text-center mb-6">
          🛡️ <span className="font-bold text-slate-300">ความเสมอภาคการผจญภัย:</span> นักเรียนทุกคนผจญภัยครบ 100 ด่านเท่ากัน แต่ระบบอัจฉริยะจะปรับแต่งความยากของคำศัพท์และชนิดโจทย์ให้เหมาะสมตามศักยภาพของคุณโดยอัตโนมัติ
        </div>

        {/* Tab Links */}
        <div className="grid grid-cols-4 bg-slate-900/60 border border-slate-850 rounded-2xl p-1 mb-8 gap-0.5">
          <button 
            onClick={() => setActiveTab('roadmap')} 
            className={`py-3.5 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
              activeTab === 'roadmap' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="text-[10px] sm:text-sm font-black">ผจญภัย</span>
          </button>
          <button 
            onClick={() => setActiveTab('review')} 
            className={`py-3.5 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
              activeTab === 'review' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bookmark className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="text-[10px] sm:text-sm font-black">ทบทวน ({reviewWords.length})</span>
          </button>
          <button 
            onClick={() => setActiveTab('collection')} 
            className={`py-3.5 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
              activeTab === 'collection' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookMarked className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="text-[10px] sm:text-sm font-black">คลังศัพท์</span>
          </button>
          <button 
            onClick={() => setActiveTab('stats')} 
            className={`py-3.5 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
              activeTab === 'stats' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="text-[10px] sm:text-sm font-black">แรงกิ้ง</span>
          </button>
        </div>

        {/* Panels */}
        <AnimatePresence mode="wait">
          
          {/* TAB 1: ROADMAP (10 WORLDS, 100 STAGES) */}
          {activeTab === 'roadmap' && (
            <motion.div 
              key="roadmap" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-left"
            >
              {/* World roadmap navigation */}
              <div className="space-y-4">
                {STORY_WORLDS.map((world) => {
                  const isCurrentWorld = currentStage >= world.stageRange[0] && currentStage <= world.stageRange[1];
                  const isUnlockedWorld = currentStage >= world.stageRange[0];
                  const isCompletedWorld = currentStage > world.stageRange[1];
                  const isOpen = expandedWorld === world.worldNumber;

                  return (
                    <div 
                      key={world.worldNumber} 
                      className={`bg-slate-900/60 border rounded-3xl overflow-hidden transition-all ${
                        isCurrentWorld ? 'border-emerald-500/30 shadow-lg shadow-emerald-500/5' : 
                        isUnlockedWorld ? 'border-slate-800' : 'border-slate-950 opacity-40'
                      }`}
                    >
                      {/* World Header */}
                      <button 
                        disabled={!isUnlockedWorld}
                        onClick={() => setExpandedWorld(isOpen ? null : world.worldNumber)}
                        className="w-full p-5 flex justify-between items-center text-left hover:bg-slate-900/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl p-2 bg-slate-950 rounded-xl border border-slate-800">{world.icon}</span>
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-widest">WORLD {world.worldNumber}</span>
                            <h3 className="text-lg font-black text-white">{world.title}</h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {isCompletedWorld ? (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-extrabold px-2.5 py-1 rounded-full border border-emerald-500/20">สำเร็จ 🏆</span>
                          ) : isCurrentWorld ? (
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 font-extrabold px-2.5 py-1 rounded-full border border-amber-500/20 animate-pulse">กำลังผจญภัย 🎯</span>
                          ) : (
                            <span className="text-[10px] bg-slate-950 text-slate-500 font-bold px-2.5 py-1 rounded-full border border-slate-900">🔒 ล็อก</span>
                          )}
                          {isOpen ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                        </div>
                      </button>

                      {/* World stages list */}
                      {isOpen && isUnlockedWorld && (
                        <div className="p-5 border-t border-slate-950 bg-slate-950/20 space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Array.from({ length: 10 }).map((_, idx) => {
                              const stageNum = world.stageRange[0] + idx;
                              const isCompletedStage = stageNum < currentStage;
                              const isCurrentStage = stageNum === currentStage;
                              const isBossStage = stageNum % 10 === 0;

                              let stageState = 'locked';
                              if (isCompletedStage) stageState = 'completed';
                              if (isCurrentStage) stageState = 'current';

                              return (
                                <div 
                                  key={stageNum}
                                  className={`p-3.5 rounded-2xl flex items-center justify-between border ${
                                    stageState === 'completed' ? 'bg-slate-900/40 border-slate-850 text-slate-300' :
                                    stageState === 'current' ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border-emerald-500/30 text-emerald-400 font-extrabold shadow-inner' :
                                    'bg-slate-950/60 border-slate-950 text-slate-600 opacity-60'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black border ${
                                      stageState === 'completed' ? 'bg-slate-950 border-slate-800 text-slate-400' :
                                      stageState === 'current' ? 'bg-emerald-500 text-slate-950 border-emerald-400' :
                                      'bg-slate-950 border-slate-900 text-slate-700'
                                    }`}>
                                      {stageNum}
                                    </span>
                                    <div>
                                      <span className="text-xs block font-bold text-white">ด่านที่ {stageNum}</span>
                                      <span className="text-[10px] text-slate-500 tracking-wider">
                                        {isBossStage ? '👹 ด่านบอสข้ามโลก' : '🧭 โจทย์ระดับปกติ'}
                                      </span>
                                    </div>
                                  </div>

                                  <div>
                                    {stageState === 'completed' && <span className="text-emerald-400 text-sm">✅</span>}
                                    {stageState === 'current' && <span className="text-amber-400 text-sm animate-bounce">🎯</span>}
                                    {stageState === 'locked' && <span className="text-slate-600 text-sm">🔒</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Start Game section */}
              <div className="bg-gradient-to-tr from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row gap-5 justify-between items-center shadow-xl">
                <div className="text-center md:text-left w-full md:w-auto">
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 font-bold uppercase tracking-widest">ความก้าวหน้าปัจจุบัน</span>
                  <h3 className="text-2xl font-black text-white mt-3">ด่านผจญภัยที่ {currentStage} / 100</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    ธีมปัจจุบัน: <strong className="text-white">{currentWorld.title}</strong> • การตั้งค่า: {rankConfig.questionCount} ข้อ • เวลา {rankConfig.timeLimit} วินาที
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto mt-2 md:mt-0">
                  <button 
                    onClick={() => setScreen('study')} 
                    className="w-full sm:w-auto px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-700 flex items-center justify-center gap-2 hover:scale-[1.02] transition-all text-sm shadow-md"
                  >
                    <BookOpen className="w-4 h-4 text-emerald-400" /> ท่องศัพท์ด่านนี้
                  </button>
                  <button 
                    onClick={() => setScreen('game')} 
                    className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-all text-sm"
                  >
                    <Play className="w-4 h-4 fill-slate-950" /> เริ่มเกมท้าทาย ➡️
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: SPACED REPETITION / DUE WORDS */}
          {activeTab === 'review' && (
            <motion.div 
              key="review" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-left"
            >
              <div className="glass-card p-6 sm:p-8 rounded-3xl">
                <div className="flex items-center gap-3 mb-6">
                  <Bookmark className="w-8 h-8 text-emerald-400" />
                  <div>
                    <h3 className="text-2xl font-black text-white">ระบบทบทวนศัพท์อัจฉริยะ (Spaced Repetition)</h3>
                    <p className="text-slate-400 text-sm mt-0.5">คัดกรองคำศัพท์ที่มีประวัติตอบผิดบ่อย เพื่อให้ทบทวนซ้ำตามเวลาทิ้งช่วงสมอง</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {reviewWords.map((word) => (
                    <div key={word.id} className="bg-slate-950 border border-slate-900 p-4 sm:p-5 rounded-2xl flex justify-between items-center transition-colors hover:border-slate-800">
                      <div>
                        <h4 className="text-xl font-bold text-white uppercase notranslate" translate="no">{word.word}</h4>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{word.phonetic}</p>
                        <p className="text-slate-200 mt-2 font-semibold">แปลความหมาย: <strong className="text-emerald-400">{word.meaning}</strong></p>
                        <p className="text-xs text-slate-500 italic mt-1 font-mono">"{word.example_sentence || word.example || ''}"</p>
                      </div>
                      
                      <button 
                        onClick={() => playWordAudio(word.word)}
                        className="w-11 h-11 bg-slate-900 border border-slate-800 text-emerald-400 hover:text-emerald-300 rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-md shrink-0"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}

                  {reviewWords.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-900">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      </div>
                      <p className="text-slate-300 font-black">คุณทำยอดเยี่ยมมาก! ไม่มีคำศัพท์สะสมเนื่องทบทวน</p>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">คำศัพท์ที่ตอบผิดจะค่อยๆ บันทึกและปรากฏตรงนี้เมื่อสมองเริ่มพร้อมทบทวนซ้ำ</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: WORD COLLECTION DECK (MASTERY LEVELS) */}
          {activeTab === 'collection' && (
            <motion.div 
              key="collection" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-left"
            >
              <div className="glass-card p-6 sm:p-8 rounded-3xl">
                <div className="flex items-center gap-3 mb-6">
                  <BookMarked className="w-8 h-8 text-indigo-400" />
                  <div>
                    <h3 className="text-2xl font-black text-white">สมุดคำศัพท์สะสม (Word Collection Deck)</h3>
                    <p className="text-slate-400 text-sm mt-0.5">ดัชนีรวมคำศัพท์ทั้งหมดที่คุณเคยพบพร้อมสถานะระดับความเชี่ยวชาญสมบูรณ์</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {wordCollection.map((item) => {
                    const word = item.vocabulary;
                    const stars = Array.from({ length: 4 }).map((_, i) => i < item.mastery_level ? '⭐' : '☆').join('');
                    
                    return (
                      <div key={item.id} className="bg-slate-950/60 border border-slate-900/60 p-4 rounded-xl flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-black text-white uppercase notranslate" translate="no">{word.word}</h4>
                            <span className="text-[9px] px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-md font-mono">{word.difficulty_level || 'normal'}</span>
                          </div>
                          <p className="text-xs text-slate-400 font-bold mt-1 text-emerald-400">{word.meaning}</p>
                          <p className="text-xs text-slate-500 italic font-mono truncate max-w-[200px]">"{word.example_sentence || word.example || ''}"</p>
                        </div>
                        
                        <div className="text-right shrink-0">
                          <span className="text-xs block text-slate-500 font-bold mb-1">ความจำ</span>
                          <span className="text-xs font-mono">{stars}</span>
                        </div>
                      </div>
                    );
                  })}

                  {wordCollection.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-500 italic text-sm">
                      คุณยังไม่มีคำศัพท์ในสมุดสะสม เริ่มต้นลุยด่านผจญภัยเพื่อเปิดพจนานุกรมคำแรกกันเลย!
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: RANKING & CLASSROOM COMPETITION (STATS, LEADERBOARD, HEATMAP) */}
          {activeTab === 'stats' && (
            <motion.div 
              key="stats" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-left"
            >
              {/* Classroom statistics block */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/10 p-5 rounded-2xl">
                  <span className="text-xs text-indigo-400 font-bold block mb-1">เหรียญทองรวมทั้งห้อง</span>
                  <span className="text-3xl font-black text-white">🪙 {classroomStats.totalCoins}</span>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/10 p-5 rounded-2xl">
                  <span className="text-xs text-emerald-400 font-bold block mb-1">ด่านเฉลี่ยห้องเรียน</span>
                  <span className="text-3xl font-black text-white">ด่าน {classroomStats.averageStage} / 100</span>
                </div>
                <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/10 p-5 rounded-2xl">
                  <span className="text-xs text-amber-400 font-bold block mb-1">เลเวลสูงสุดในชั้น</span>
                  <span className="text-3xl font-black text-white">Lvl {classroomStats.highestLevel}</span>
                </div>
              </div>

              {/* Heatmap simulation */}
              <div className="glass-card p-6 sm:p-8 rounded-3xl">
                <h3 className="text-lg font-black text-white flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-emerald-400" /> ตารางการฝึกฝนต่อเนื่อง (Study Streak Frequency)
                </h3>
                <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 bg-slate-950 p-4 rounded-2xl border border-slate-900 shadow-inner">
                  {Array.from({ length: 28 }).map((_, i) => {
                    const isStreakDay = i % 5 === 0 || i % 6 === 0;
                    return (
                      <div 
                        key={i} 
                        className={`aspect-square rounded-md transition-colors ${
                          isStreakDay ? 'bg-emerald-500' : 'bg-slate-900 border border-slate-800'
                        }`} 
                        title={`วันที่ ${i + 1}`}
                      />
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-mono text-center">สีเขียวเข้มหมายถึงวันที่เข้าเรียนและฝึกฝนศัพท์อย่างต่อเนื่อง</p>
              </div>

              {/* Prediction widget */}
              <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 p-5 rounded-2xl">
                <span className="text-xs font-bold text-purple-400 block mb-1">🤖 การทำนายอนาคต (AI Prediction)</span>
                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                  จากการประเมินความเร็วตอบสนอง {rankConfig.timeLimit}s และความแม่นยำเฉลี่ยของคุณ ระบบอัจฉริยะวิเคราะห์ว่าคุณจะสามารถพิชิตบอสด่านสุดท้าย (Stage 100) ได้เสร็จสมบูรณ์ภายใน <strong className="text-purple-400 font-black">12-15 วันการฝึกฝนถัดไป!</strong>
                </p>
              </div>

              {/* Leaderboard */}
              <div className="glass-card p-6 sm:p-8 rounded-3xl">
                <h3 className="text-xl font-black text-white flex items-center gap-2 mb-6">
                  <Trophy className="w-6 h-6 text-amber-400" /> ตารางเพื่อนร่วมผจญภัยในชั้นเรียน (Leaderboard)
                </h3>
                
                <div className="bg-slate-950/40 rounded-2xl overflow-hidden border border-slate-900 shadow-inner">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-slate-900 text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <th className="p-4 text-center">อันดับ</th>
                          <th className="p-4">นักเรียน</th>
                          <th className="p-4 text-center">เลเวล</th>
                          <th className="p-4 text-center">เหรียญ</th>
                          <th className="p-4 text-center">ด่านปัจจุบัน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/60 text-slate-200 text-sm">
                        {leaderboard.map((user, idx) => {
                          const rankIcons = ['🥇', '🥈', '🥉'];
                          const isTop3 = idx < 3;
                          
                          return (
                            <tr 
                              key={user.id} 
                              className={`transition-colors ${
                                user.isSelf 
                                  ? 'bg-emerald-500/10 hover:bg-emerald-500/15 font-extrabold text-emerald-400 border-l-4 border-emerald-500' 
                                  : 'hover:bg-slate-900/20'
                              }`}
                            >
                              <td className="p-4 text-center text-lg font-black">
                                {isTop3 ? rankIcons[idx] : idx + 1}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">{user.avatar || '🦸‍♂️'}</span>
                                  <span className="truncate">{user.name}</span>
                                  {user.isSelf && (
                                    <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                      คุณ
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-center font-bold text-indigo-400">
                                Lvl {Math.floor((user.exp || 0) / 100) + 1}
                              </td>
                              <td className="p-4 text-center font-semibold">
                                🪙 {user.coins}
                              </td>
                              <td className="p-4 text-center text-slate-400">
                                ด่าน {user.stage}
                              </td>
                            </tr>
                          );
                        })}
                        {leaderboard.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-500 italic">
                              ไม่มีข้อมูลอันดับในห้องเรียนนี้
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Store Button */}
        <div className="mt-8 flex justify-center">
          <button 
            onClick={() => setShowShop(true)} 
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-purple-500/20 hover:scale-105 transition-all text-sm uppercase tracking-wider"
          >
            <Store className="w-5 h-5" /> เปิดไอเทมช็อป (Item Shop) 🛒
          </button>
        </div>

      </div>

      {showShop && <ShopModal onClose={() => setShowShop(false)} />}
    </div>
  );
}
