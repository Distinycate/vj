'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Store, Trophy, Target, Star, Bug, LogOut, ShieldAlert, Award, Compass, Heart, Bookmark, Eye, CheckCircle2, BookOpen, Volume2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/utils/supabase/client';
import ShopModal from '@/components/ShopModal';
import { playWordAudio } from '@/utils/audio';

export default function Dashboard() {
  const { student, progress, logout, setScreen, setProgress } = useAppStore();
  const [showShop, setShowShop] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [reviewWords, setReviewWords] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ xp: 0, level: 1 });
  const [activeTab, setActiveTab] = useState<'roadmap' | 'stats' | 'review'>('roadmap');


  useEffect(() => {
    if (!student) return;
    
    async function loadDashboardData() {
      // 1. Fetch Categories
      const { data: catData } = await supabase.from('vocabulary_categories').select('*');
      if (catData) setCategories(catData);

      // 2. Fetch Earned Badges
      const { data: badgeData } = await supabase.from('student_badges').select('*, badges(*)').eq('student_id', student.id);
      if (badgeData) setBadges(badgeData.map(b => b.badges));

      // 3. Fetch Earned Achievements
      const { data: achData } = await supabase.from('student_achievements').select('*, achievements(*)').eq('student_id', student.id);
      if (achData) setAchievements(achData.map(a => a.achievements));

      // 4. Fetch Spaced Repetition Due Words
      const { data: repData } = await supabase
        .from('spaced_repetition')
        .select('*, vocabulary(*)')
        .eq('student_id', student.id)
        .order('next_review_at', { ascending: true })
        .limit(5);
      
      if (repData) setReviewWords(repData.map(r => r.vocabulary).filter(Boolean));

      // 5. Fetch Learning Path
      const { data: pathData } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('student_id', student.id)
        .single();
      
      if (pathData) {
        setProgress(pathData);
        // Calculate dynamic level: 1 level per 100 EXP
        const level = Math.floor((pathData.exp || 0) / 100) + 1;
        setStats({ xp: pathData.exp || 0, level });
      }
    }

    loadDashboardData();
  }, [student, setProgress]);

  if (!student) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8 pb-24 relative overflow-hidden">
      
      {/* Premium Gradient Ambient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full mix-blend-screen filter blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full mix-blend-screen filter blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Top Header Row */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-slate-900/50 backdrop-blur-md border border-slate-900 p-5 sm:p-6 rounded-3xl">
          <div className="flex items-center gap-3 sm:gap-4 w-full">
            <div className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-lg shadow-emerald-500/20 text-slate-950">
              {student.student_name ? student.student_name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent truncate">
                {student.student_name}
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 rounded-full text-[10px] sm:text-xs font-black shadow-md shadow-amber-500/20">
                  RANK {progress?.current_rank || 1}
                </span>
                <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] sm:text-xs font-bold">
                  Lvl {stats.level}
                </span>
                <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-slate-800 text-slate-400 rounded-full text-[10px] sm:text-xs font-medium">
                  🔥 {progress?.streak_days || 0} วัน
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t border-slate-800/60 pt-3 sm:pt-0 sm:border-0">
            {/* Coins Display */}
            <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-900 shadow-inner">
              <span className="text-base">🪙</span>
              <span className="text-white font-black text-base">{progress?.coins || 0}</span>
            </div>
            
            {/* Logout button */}
            <button 
              onClick={logout} 
              className="w-10 h-10 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-900 flex items-center justify-center hover:scale-105 transition-all text-slate-400 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Dashboard Tabs Selector */}
        <div className="grid grid-cols-3 bg-slate-900 border border-slate-900 rounded-2xl p-1 mb-8 gap-0.5">
          <button 
            onClick={() => setActiveTab('roadmap')} 
            className={`py-3.5 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2.5 transition-all ${
              activeTab === 'roadmap' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="text-[10px] sm:text-sm font-black">เส้นทาง</span>
          </button>
          <button 
            onClick={() => setActiveTab('review')} 
            className={`py-3.5 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2.5 transition-all ${
              activeTab === 'review' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bookmark className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="text-[10px] sm:text-sm font-black">ทบทวน</span>
          </button>
          <button 
            onClick={() => setActiveTab('stats')} 
            className={`py-3.5 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2.5 transition-all ${
              activeTab === 'stats' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="text-[10px] sm:text-sm font-black">รางวัล</span>
          </button>
        </div>

        {/* Dynamic Screen Panels */}
        <AnimatePresence mode="wait">
          
          {/* TAB 1: ROADMAP */}
          {activeTab === 'roadmap' && (
            <motion.div 
              key="roadmap" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Category Roadmap list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((cat, idx) => {
                  const isUnlocked = idx * 10 < (progress?.current_stage || 1);
                  
                  return (
                    <div 
                      key={cat.id} 
                      className={`glass-card p-6 rounded-3xl relative overflow-hidden transition-all group ${
                        isUnlocked ? 'hover:scale-[1.02] hover:border-emerald-500/20' : 'opacity-40'
                      }`}
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-300"></div>
                      
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl bg-slate-950 p-2.5 rounded-2xl border border-slate-900">{cat.icon || '📚'}</span>
                          <div>
                            <h3 className="text-xl font-extrabold text-white group-hover:text-emerald-400 transition-colors">{cat.display_name_th}</h3>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">{cat.display_name_en}</p>
                          </div>
                        </div>
                        
                        {isUnlocked ? (
                          <span className="text-xs bg-emerald-500/10 text-emerald-400 font-bold px-2.5 py-1 rounded-full border border-emerald-500/10">
                            ปลดล็อกแล้ว
                          </span>
                        ) : (
                          <span className="text-xs bg-slate-950 text-slate-500 font-bold px-2.5 py-1 rounded-full border border-slate-900">
                            🔒 ล็อกอยู่
                          </span>
                        )}
                      </div>
                      
                      {/* Fake Category Completion statistics */}
                      <div className="flex justify-between text-xs text-slate-400 mb-2 mt-4 font-semibold">
                        <span>ความก้าวหน้าการเรียน</span>
                        <span>{isUnlocked ? '30%' : '0%'}</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900 shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                          style={{ width: isUnlocked ? '30%' : '0%' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Play Stage Buttons */}
              <div className="bg-slate-900 border border-slate-900 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg w-full">
                <div className="text-center md:text-left w-full md:w-auto">
                  <h3 className="text-lg font-bold text-white">ด่านผจญภัยถัดไปของคุณคือ</h3>
                  <p className="text-slate-400 text-sm mt-0.5">ด่าน {progress?.current_stage || 1} • เรียนรู้คำศัพท์ชุดที่ {progress?.current_stage || 1}</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto mt-2 md:mt-0">
                  <button 
                    onClick={() => setScreen('study')} 
                    className="w-full sm:w-auto px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700/50 flex items-center justify-center gap-2 hover:scale-[1.02] transition-all text-sm"
                  >
                    <BookOpen className="w-4 h-4 text-emerald-400" /> เข้าค่ายท่องศัพท์
                  </button>
                  <button 
                    onClick={() => setScreen('game')} 
                    className="w-full sm:w-auto px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-all text-sm"
                  >
                    <Play className="w-4 h-4 fill-slate-950" /> ลุยด่านท้าทาย
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: SPACED REPETITION / WRONG WORDS */}
          {activeTab === 'review' && (
            <motion.div 
              key="review" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="glass-card p-8 rounded-3xl">
                <div className="flex items-center gap-3 mb-6">
                  <Bookmark className="w-8 h-8 text-emerald-400" />
                  <div>
                    <h3 className="text-2xl font-black text-white">คำที่ควรทบทวน (Spaced Repetition)</h3>
                    <p className="text-slate-400 text-sm mt-0.5">ระบบจะจัดเรียงคำศัพท์ที่คุณมักจะสะกดผิดบ่อย เพื่อทบทวนการจำใหม่</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {reviewWords.map((word) => (
                    <div key={word.id} className="bg-slate-950/60 border border-slate-900 p-5 rounded-2xl flex justify-between items-center">
                      <div>
                        <h4 className="text-xl font-bold text-white uppercase">{word.word}</h4>
                        <p className="text-sm text-slate-400 font-mono mt-0.5">{word.phonetic}</p>
                        <p className="text-slate-300 mt-2 font-bold text-emerald-300">แปลว่า: {word.meaning}</p>
                      </div>
                      
                      <button 
                        onClick={() => playWordAudio(word.word)}
                        className="w-11 h-11 bg-slate-900 border border-slate-800 text-emerald-400 hover:text-emerald-300 rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-md"
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
                      <p className="text-slate-300 font-bold">ยอดเยี่ยมมาก! ไม่มีคำศัพท์ค้างทบทวน</p>
                      <p className="text-slate-500 text-sm mt-1">คอยผจญภัยต่อไปเพื่อสะสมคำศัพท์ลงความทรงจำ</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: HONOR & QUESTS */}
          {activeTab === 'stats' && (
            <motion.div 
              key="stats" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Badges and Achievements panels */}
              <div className="glass-card p-8 rounded-3xl mb-6">
                <h3 className="text-xl font-black text-white flex items-center gap-2 mb-6">
                  <Award className="w-6 h-6 text-amber-400" /> เหรียญเกียรติยศ (Badges)
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {badges.map((badge, idx) => (
                    <div key={idx} className="bg-slate-950/60 border border-slate-900 p-4 rounded-2xl text-center flex flex-col items-center">
                      <span className="text-4xl block mb-2">🏅</span>
                      <h4 className="text-sm font-bold text-white">{badge.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">{badge.description}</p>
                    </div>
                  ))}
                  {badges.length === 0 && (
                    <div className="col-span-full text-center py-6 text-slate-500 italic text-sm">
                      คุณยังไม่มีเหรียญเกียรติยศ สะสม EXP และเลื่อน Rank เพื่อปลดล็อก
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-card p-8 rounded-3xl">
                <h3 className="text-xl font-black text-white flex items-center gap-2 mb-6">
                  <Trophy className="w-6 h-6 text-purple-400" /> ความสำเร็จสะสม (Achievements)
                </h3>
                
                <div className="space-y-3">
                  {achievements.map((ach, idx) => (
                    <div key={idx} className="bg-slate-950/60 border border-slate-900 p-4 rounded-2xl flex items-center gap-4">
                      <span className="text-3xl">✨</span>
                      <div>
                        <h4 className="text-base font-bold text-white">{ach.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{ach.description}</p>
                      </div>
                    </div>
                  ))}
                  {achievements.length === 0 && (
                    <div className="text-center py-6 text-slate-500 italic text-sm">
                      ทำภารกิจคำศัพท์ในเกมเพื่อปลดล็อกรางวัล
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Quick Menu Shop Button */}
        <div className="mt-8 flex justify-center">
          <button 
            onClick={() => setShowShop(true)} 
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg shadow-purple-500/20 hover:scale-105 transition-all text-sm uppercase tracking-wider"
          >
            <Store className="w-5 h-5" /> เยือนร้านค้าไอเทม
          </button>
        </div>

      </div>

      {/* Modals */}
      {showShop && <ShopModal onClose={() => setShowShop(false)} />}
      
    </div>
  );
}
