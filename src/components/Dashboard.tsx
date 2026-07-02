'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Trophy, Star, LogOut, Award, Compass, Store,
  Bookmark, Eye, CheckCircle2, BookOpen, Volume2, User, ChevronDown, ChevronUp, BookMarked, Activity, Shuffle, RefreshCw
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/utils/supabase/client';
import { playWordAudio } from '@/utils/audio';
import { STORY_WORLDS, ADAPTIVE_RANK_CONFIG, getWorldForStage } from '@/utils/adaptiveConfig';
import AvatarDisplay from '@/components/AvatarDisplay';
import ShopModal from '@/components/ShopModal';
import { autoAssignTeamForStudent, calculateTeamScore } from '@/utils/teamBattleEngine';
import { Users, Target, Zap, BrainCircuit } from 'lucide-react';
import StudentHero from '@/components/StudentHero';
import StudentTeamCard from '@/components/StudentTeamCard';
import TeamLeaderboard from '@/components/TeamLeaderboard';

export default function Dashboard() {
  const { student, progress, logout, setScreen, setProgress } = useAppStore();
  const [reviewWords, setReviewWords] = useState<any[]>([]);
  const [wordCollection, setWordCollection] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ xp: 0, level: 1 });
  const [activeTab, setActiveTab] = useState<'roadmap' | 'review' | 'stats' | 'collection' | 'profile' | 'teams'>('roadmap');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [expandedWorld, setExpandedWorld] = useState<number | null>(1);
  const [aiTeacherMessage, setAiTeacherMessage] = useState('');
  const [showShop, setShowShop] = useState(false);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [teamScores, setTeamScores] = useState<Record<string, any>>({});

  // Classroom stats calculations
  const [classroomStats, setClassroomStats] = useState({
    totalCoins: 0,
    averageStage: 1,
    highestLevel: 1,
  });

  useEffect(() => {
    if (!student) return;
    
    async function loadDashboardData() {
      // 1. Fetch Spaced Repetition Due Words
      const { data: repData } = await supabase
        .from('user_review_words')
        .select('*, vocabulary:word_id(*)')
        .eq('user_id', student.id)
        .lt('mastery_level', 4)
        .lte('next_review_at', new Date().toISOString())
        .order('next_review_at', { ascending: true });
      
      if (repData) {
        setReviewWords(repData.map(r => r.vocabulary).filter(Boolean));
      }

      // 2. Fetch All Words Ever Encountered (Collection)
      const { data: collectionData } = await supabase
        .from('user_review_words')
        .select('*, vocabulary:word_id(*)')
        .eq('user_id', student.id)
        .order('mastery_level', { ascending: false });

      if (collectionData) {
        setWordCollection(collectionData.filter(c => c.vocabulary));
      }

      // 3. Fetch Learning Path with new Avatar properties
      const { data: pathData } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('student_id', student.id)
        .single();
      
      if (pathData) {
        // Fallback seed assignment in UI state if DB hasn't populated yet
        if (!pathData.avatar_seed) pathData.avatar_seed = student.id;
        setProgress(pathData);
        const level = Math.floor((pathData.total_exp || pathData.exp || 0) / 100) + 1;
        setStats({ xp: pathData.total_exp || pathData.exp || 0, level });
      }

      // 4. Fetch Leaderboard for Classroom
      const { data: leadData } = await supabase
        .from('students')
        .select('id, student_name, learning_paths(coins, exp, total_exp, current_stage, avatar_seed, avatar_style)')
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
              avatar_seed: lp?.avatar_seed || s.id,
              avatar_style: lp?.avatar_style || 'adventurer',
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

      // 5. Team Battle
      await autoAssignTeamForStudent(student.id);
      const { data: teamsData } = await supabase
        .from('team_members')
        .select('team_id, teams(*)')
        .eq('user_id', student.id)
        .eq('is_active', true);

      if (teamsData) {
        const tList = teamsData.map((d: any) => d.teams).filter(Boolean);
        setMyTeams(tList);
        
        const scores: Record<string, any> = {};
        for (const t of tList) {
          scores[t.id] = await calculateTeamScore(t.id);
        }
        setTeamScores(scores);
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

  // Generate new random Avatar Seed
  const handleRandomizeAvatar = async () => {
    try {
      const newSeed = Math.random().toString(36).substring(2, 10);
      const styles = ['adventurer', 'fun-emoji', 'bottts', 'micah'];
      const randomStyle = styles[Math.floor(Math.random() * styles.length)];

      await supabase
        .from('learning_paths')
        .update({ avatar_seed: newSeed, avatar_style: randomStyle })
        .eq('student_id', student.id);
      
      setProgress({ ...progress, avatar_seed: newSeed, avatar_style: randomStyle });
    } catch (e) {
      console.error("Error randomizing avatar:", e);
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
        <StudentHero 
          student={student} 
          progress={progress} 
          stats={stats} 
          rankConfig={rankConfig} 
          setShowShop={setShowShop} 
          logout={logout} 
        />

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

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
            <Target className="w-6 h-6 text-emerald-400 mb-2" />
            <span className="text-xs text-slate-400 font-bold mb-1">ความแม่นยำ</span>
            <span className="text-xl font-black text-white">{stats.xp > 0 ? '85%' : '-'}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
            <BrainCircuit className="w-6 h-6 text-indigo-400 mb-2" />
            <span className="text-xs text-slate-400 font-bold mb-1">ระดับทักษะ</span>
            <span className="text-xl font-black text-white">Lvl {stats.level}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
            <Zap className="w-6 h-6 text-amber-400 mb-2" />
            <span className="text-xs text-slate-400 font-bold mb-1">EXP สะสม</span>
            <span className="text-xl font-black text-white">{stats.xp}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
            <Bookmark className="w-6 h-6 text-fuchsia-400 mb-2" />
            <span className="text-xs text-slate-400 font-bold mb-1">ต้องทบทวน</span>
            <span className="text-xl font-black text-white">{reviewWords.length} คำ</span>
          </div>
        </div>

        {/* Team Card (if assigned) */}
        {myTeams.length > 0 && (
          <div className="mb-6">
            <StudentTeamCard team={myTeams[0]} scoreData={teamScores[myTeams[0].id]} />
          </div>
        )}

        {/* Mini Leaderboard on top if in roadmap */}
        {activeTab === 'roadmap' && (
          <div className="mb-8">
            <TeamLeaderboard scope="class" classroomId={student?.classroom_id} />
          </div>
        )}

        {/* Tab Links */}
        <div className="flex justify-between items-end mb-2">
          <div className="text-slate-400 text-sm font-bold">เมนูหลัก</div>
          <button onClick={() => window.location.reload()} className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-full transition-all">
            <RefreshCw className="w-3 h-3" /> รีเฟรชข้อมูล
          </button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 bg-slate-900/60 border border-slate-850 rounded-2xl p-1 mb-8 gap-0.5">
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
          <button 
            onClick={() => setActiveTab('teams')} 
            className={`py-3.5 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
              activeTab === 'teams' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="text-[10px] sm:text-sm font-black">ทีมของฉัน</span>
          </button>
          <button 
            onClick={() => setActiveTab('profile')} 
            className={`py-3.5 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
              activeTab === 'profile' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="text-[10px] sm:text-sm font-black">โปรไฟล์</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-indigo-500/10 border border-indigo-500/15 p-5 rounded-2xl">
                  <span className="text-xs text-indigo-300 font-bold">เหรียญรวมทั้งห้อง</span>
                  <strong className="text-2xl text-white block mt-1">🪙 {classroomStats.totalCoins}</strong>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/15 p-5 rounded-2xl">
                  <span className="text-xs text-emerald-300 font-bold">ด่านเฉลี่ยของห้อง</span>
                  <strong className="text-2xl text-white block mt-1">ด่าน {classroomStats.averageStage}</strong>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/15 p-5 rounded-2xl">
                  <span className="text-xs text-amber-300 font-bold">เลเวลสูงสุด</span>
                  <strong className="text-2xl text-white block mt-1">Lvl {classroomStats.highestLevel}</strong>
                </div>
              </div>

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

          {/* TAB 4: RANKING & CLASSROOM COMPETITION */}
          {activeTab === 'stats' && (
            <motion.div 
              key="stats" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-left"
            >
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
                                <div className="flex items-center gap-3">
                                  <AvatarDisplay 
                                    seed={user.avatar_seed} 
                                    style={user.avatar_style} 
                                    size="sm" 
                                    className="shrink-0"
                                  />
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

          {/* TAB: TEAMS (CROSS-CLASS BATTLE) */}
          {activeTab === 'teams' as any && (
            <motion.div 
              key="teams" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-left"
            >
              <div className="glass-card p-6 sm:p-8 rounded-3xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 text-fuchsia-400" />
                    <div>
                      <h3 className="text-2xl font-black text-white">ทีมของฉัน (Team Battle)</h3>
                      <p className="text-slate-400 text-sm mt-0.5">เล่นวันนี้เพื่อช่วยทีมของคุณเก็บคะแนนข้ามห้องเรียน!</p>
                    </div>
                  </div>
                  <button onClick={() => alert('กำลังพัฒนาระบบ Leaderboard เร็วๆ นี้!')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl border border-slate-700 transition-all shadow-md">
                    🏆 ดู Team Leaderboard
                  </button>
                </div>

                {/* Team Goals */}
                <div className="bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 border border-fuchsia-500/20 p-5 rounded-2xl mb-6">
                  <h4 className="text-fuchsia-400 font-bold mb-3 flex items-center gap-2">🎯 เป้าหมายทีมวันนี้</h4>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-center gap-2">✅ ช่วยกันผ่านด่านรวม 20 ด่าน</li>
                    <li className="flex items-center gap-2">✅ ให้สมาชิกกลับมาเล่น (Active) เกิน 70% เพื่อรับโบนัส x1.25!</li>
                  </ul>
                  <p className="text-xs text-slate-400 mt-4 italic">"ถ้าสมาชิกช่วยกันเล่นหลายคน ทีมจะได้โบนัสคะแนนเพิ่มพิเศษ อย่าปล่อยให้เพื่อนแบกคนเดียวนะ!"</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myTeams.map(team => {
                    const ts = teamScores[team.id];
                    return (
                      <div key={team.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-fuchsia-500/30 transition-colors">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 border border-slate-800" style={{ backgroundColor: `${team.team_color}20`, borderColor: `${team.team_color}40` }}>
                            {team.team_icon}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 inline-block" style={{ backgroundColor: `${team.team_color}20`, color: team.team_color }}>
                              {team.team_type === 'school' ? 'ทีมแข่งขันโรงเรียน' : 'ทีมประจำห้อง'}
                            </span>
                            <h4 className="text-xl font-black text-white">{team.team_name}</h4>
                            <p className="text-xs text-slate-400">สมาชิกตื่นตัว: {ts?.activeMembersRate || 0}% ({ts?.activeMembersCount || 0}/{ts?.totalMembers || 0} คน)</p>
                          </div>
                        </div>

                        <div className="bg-slate-950 rounded-xl p-4 flex justify-between items-center border border-slate-900 shadow-inner">
                          <div>
                            <span className="text-xs text-slate-500 font-bold block mb-1">คะแนนรวมทีม</span>
                            <strong className="text-2xl text-white font-black">{ts?.finalScore || 0}</strong>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-slate-500 font-bold block mb-1">ผลงาน (Events)</span>
                            <strong className="text-lg text-fuchsia-400 font-bold">{ts?.eventsCount || 0} ครั้ง</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {myTeams.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-slate-400">กำลังค้นหาทีมของคุณ...</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 5: PROFILE & AVATAR SETTINGS */}
          {activeTab === 'profile' && (
            <motion.div 
              key="profile" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-left"
            >
              <div className="glass-card p-6 sm:p-10 rounded-3xl text-center">
                <h3 className="text-2xl font-black text-white mb-8">รูปประจำตัว (Avatar Profile)</h3>
                
                <div className="flex flex-col items-center justify-center">
                  <div className="relative mb-8">
                    <AvatarDisplay 
                      seed={progress?.avatar_seed || student.id} 
                      style={progress?.avatar_style || 'adventurer'} 
                      size="xl"
                      className="shadow-2xl shadow-emerald-500/20 ring-4 ring-slate-800"
                    />
                  </div>
                  
                  <h4 className="text-3xl font-black text-white mb-2">{student.student_name}</h4>
                  <p className="text-emerald-400 font-bold mb-8">Level {stats.level} • {rankConfig.skillTitle}</p>
                  
                  <button 
                    onClick={handleRandomizeAvatar}
                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 px-8 py-4 rounded-2xl font-black shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all"
                  >
                    <Shuffle className="w-5 h-5" /> สุ่มรูปประจำตัวใหม่ (Randomize)
                  </button>
                  <p className="text-xs text-slate-500 mt-4 max-w-sm">
                    รูปประจำตัวสร้างอัตโนมัติจาก DiceBear API ระบบจะสร้างรูปที่ไม่ซ้ำใครให้กับคุณทุกครั้งที่กดปุ่มสุ่มรูปใหม่!
                  </p>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </div>
      {showShop && <ShopModal onClose={() => setShowShop(false)} />}
    </div>
  );
}
