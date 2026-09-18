'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Trophy, Star, LogOut, Award, Compass, Store,
  Bookmark, Eye, CheckCircle2, BookOpen, Volume2, User, ChevronDown, ChevronUp, BookMarked, Activity, Shuffle, RefreshCw, Mail, CheckSquare
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/utils/supabase/client';
import { playWordAudio } from '@/utils/audio';
import { useDemoStore } from '@/store/useDemoStore';
import { STORY_WORLDS, ADAPTIVE_RANK_CONFIG, getWorldForStage } from '@/utils/adaptiveConfig';
import AvatarDisplay from '@/components/AvatarDisplay';
import dynamic from 'next/dynamic';
import { autoAssignTeamForStudent, calculateTeamScore } from '@/utils/teamBattleEngine';
import { Users, Target, Zap, BrainCircuit } from 'lucide-react';
import StudentHero from '@/components/StudentHero';
import StudentTeamCard from '@/components/StudentTeamCard';
import TeamLeaderboard from '@/components/TeamLeaderboard';

const StudentVerificationModal = dynamic(() => import('@/components/StudentVerificationModal'));
const ShopModal = dynamic(() => import('@/components/ShopModal'));
const CardCenterModal = dynamic(() => import('@/components/CardCenterModal'));
import ProgressStats from '@/components/dashboard/ProgressStats';
import QuestList from '@/components/dashboard/QuestList';

const CARD_RARITY_RANK: Record<string, number> = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 };

function getRareCardStatus(inventory: any) {
  const rows = Array.isArray(inventory) ? inventory : [];
  const rareCards = rows
    .filter((row) => (row.quantity || 0) > 0 && CARD_RARITY_RANK[row.cards?.rarity] >= 2)
    .sort((a, b) => CARD_RARITY_RANK[b.cards?.rarity] - CARD_RARITY_RANK[a.cards?.rarity]);
  const best = rareCards[0]?.cards;
  if (!best) return null;
  if (best.rarity === 'UR') return { rarity: 'UR', icon: '👑', label: 'ผู้ครอบครอง UR' };
  if (best.rarity === 'SSR') return { rarity: 'SSR', icon: '✨', label: 'ผู้ครอบครอง SSR' };
  return { rarity: 'SR', icon: '🛡️', label: 'ผู้ครอบครอง SR' };
}

import { getMockQuests } from '@/utils/questUtils';

export default function Dashboard() {
  const { student, progress, logout, setScreen, setProgress, setStudiedCurrentStage, setMissionLevel, setSelectedStageNumber } = useAppStore();
  const [reviewWords, setReviewWords] = useState<any[]>([]);
  const [wordCollection, setWordCollection] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ xp: 0, level: 1 });
  const [activeTab, setActiveTab] = useState<'roadmap' | 'review' | 'stats' | 'collection' | 'profile' | 'teams' | 'inbox' | 'quests'>('roadmap');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [expandedWorld, setExpandedWorld] = useState<number | null>(1);
  const [aiTeacherMessage, setAiTeacherMessage] = useState('');
  const [showShop, setShowShop] = useState(false);
  const [showCardCenter, setShowCardCenter] = useState(false);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [teamScores, setTeamScores] = useState<Record<string, any>>({});
  const [teamError, setTeamError] = useState('');
  const [stageStars, setStageStars] = useState<Record<number, number>>({});
  const [realAccuracy, setRealAccuracy] = useState<number | null>(null);

  // V3 Progression Authority State
  const [v3Progression, setV3Progression] = useState<{
    authority: 'V3' | 'LEGACY' | null;
    unlockedStages: Set<number>;
    completedStages: Map<number, { bestStars: number; completed: boolean; stageType: string }>;
    campaignCompleted: boolean;
    loading: boolean;
    error: string | null;
  }>({
    authority: null,
    unlockedStages: new Set(),
    completedStages: new Map(),
    campaignCompleted: false,
    loading: true,
    error: null,
  });

  // Inbox & Quests States
  const [messages, setMessages] = useState<any[]>([]);
  const [showMessages, setShowMessages] = useState(false);
  const [dailyQuests, setDailyQuests] = useState<any[]>([]);
  const [showQuests, setShowQuests] = useState(false);
  const [claimingQuests, setClaimingQuests] = useState<Set<string>>(new Set());

  // Classroom stats calculations
  const [classroomStats, setClassroomStats] = useState({
    totalCoins: 0,
    averageStage: 1,
    highestLevel: 1,
  });

  // Loading states for on-demand tabs
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [questsLoading, setQuestsLoading] = useState(false);

  // Tab cache timestamps for dynamic invalidation (TTL: 60s for dynamic tabs)
  const tabLoadTimestamps = useRef<Record<string, number>>({});
  const TAB_CACHE_TTL_MS = 60 * 1000;


  // 1. Core Initial Dashboard Load (Critical Profile + Progression + Due Review Words + Card Decay)
  const loadDashboardData = useCallback(async () => {
    if (!student) return;

    // Load V3 progression authority first
    try {
      const progRes = await fetch('/api/student/progression');
      if (progRes.ok) {
        const progData = await progRes.json();
        const unlocked = new Set<number>(progData.unlockedStages || []);
        const completed = new Map<number, { bestStars: number; completed: boolean; stageType: string }>();
        const starsByStage: Record<number, number> = {};
        for (const s of progData.completedStages || []) {
          completed.set(s.stageNumber, {
            bestStars: s.bestStars ?? 0,
            completed: s.completed ?? false,
            stageType: s.stageType ?? 'STANDARD',
          });
          if (s.completed && s.bestStars > 0) {
            starsByStage[s.stageNumber] = s.bestStars;
          }
        }
        setV3Progression({
          authority: progData.authority,
          unlockedStages: unlocked,
          completedStages: completed,
          campaignCompleted: progData.campaignCompleted ?? false,
          loading: false,
          error: null,
        });
        setStageStars(prev => ({ ...prev, ...starsByStage }));
        setRealAccuracy(progData.globalAccuracy ?? null);
      } else if (progRes.status === 503) {
        setV3Progression(prev => ({
          ...prev,
          loading: false,
          error: 'Progression service temporarily unavailable',
        }));
      } else {
        setV3Progression(prev => ({
          ...prev,
          loading: false,
          error: progRes.status === 401 ? null : 'Could not load progression data',
        }));
      }
    } catch (e) {
      console.warn('V3 progression load failed:', e);
      setV3Progression(prev => ({
        ...prev,
        loading: false,
        error: 'Network error loading progression',
      }));
    }

    // Demo Mode Handler
    if (student.is_demo_account || useDemoStore.getState().isDemoMode) {
      const demoStore = useDemoStore.getState();
      const demoExp = demoStore.demoProgress?.total_exp || 3400;
      setReviewWords([
        { id: 1, english_word: 'Demonstrate', thai_meaning: 'สาธิต', part_of_speech: 'v.' },
        { id: 2, english_word: 'Evaluation', thai_meaning: 'การประเมิน', part_of_speech: 'n.' }
      ]);
      setWordCollection([
        { mastery_level: 4, vocabulary: { english_word: 'Example', thai_meaning: 'ตัวอย่าง', part_of_speech: 'n.' } },
        { mastery_level: 2, vocabulary: { english_word: 'Mock', thai_meaning: 'จำลอง', part_of_speech: 'adj.' } }
      ]);
      setStats({ xp: demoExp, level: Math.floor(demoExp / 100) + 1 });
      setLeaderboard([
        { 
          id: student.id, 
          name: student.student_name, 
          avatar_seed: student.id, 
          avatar_style: 'adventurer', 
          coins: demoStore.demoProgress?.coins || 1250, 
          exp: demoExp, 
          stage: demoStore.demoProgress?.current_stage || 35, 
          rareCardStatus: { rarity: 'SSR', icon: '✨', label: 'ผู้ครอบครอง SSR' }, 
          isSelf: true 
        },
        { id: 'mock2', name: 'เด็กชาย ขยันเรียน', avatar_seed: 'mock2', avatar_style: 'avataaars', coins: 950, exp: 2800, stage: 28, rareCardStatus: { rarity: 'SR', icon: '🛡️', label: 'ผู้ครอบครอง SR' }, isSelf: false },
        { id: 'mock3', name: 'เด็กหญิง ตั้งใจ', avatar_seed: 'mock3', avatar_style: 'bottts', coins: 450, exp: 1500, stage: 15, isSelf: false }
      ]);
      setClassroomStats({
        totalCoins: (demoStore.demoProgress?.coins || 1250) + 950 + 450,
        averageStage: Math.round(((demoStore.demoProgress?.current_stage || 35) + 28 + 15) / 3),
        highestLevel: Math.floor(demoExp / 100) + 1,
      });
      setMyTeams([]);
      setTeamScores({});
      return;
    }

    // 1. Fetch Spaced Repetition Due Words (Preserves reviewWords and reviewWords.length)
    try {
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
    } catch (e) {
      console.warn('Failed to fetch review words:', e);
    }

    // 2. Fetch Learning Path with Avatar properties
    let pathData: any = null;
    try {
      const profileRes = await fetch('/api/student/profile');
      if (profileRes.ok) {
        const profileJson = await profileRes.json();
        pathData = profileJson.learningPath;
      }
    } catch (e) {
      console.error("Failed to fetch student profile", e);
    }
    
    if (pathData) {

      if (!pathData.avatar_seed) pathData.avatar_seed = student.id;
      setProgress(pathData);
      const level = Math.floor((pathData.total_exp || pathData.exp || 0) / 100) + 1;
      setStats({ xp: pathData.total_exp || pathData.exp || 0, level });
    }
  }, [student, setProgress]);

  // 2. On-Demand Tab Loaders with Invalidation Strategy
  const loadCollectionData = useCallback(async (force = false) => {
    if (!student || student.is_demo_account || useDemoStore.getState().isDemoMode) return;
    const lastLoaded = tabLoadTimestamps.current['collection'] || 0;
    if (!force && lastLoaded > 0) return;

    setCollectionLoading(true);
    try {
      const { data: collectionData } = await supabase
        .from('user_review_words')
        .select('*, vocabulary:word_id(*)')
        .eq('user_id', student.id)
        .order('mastery_level', { ascending: false });

      if (collectionData) {
        setWordCollection(collectionData.filter(c => c.vocabulary));
        tabLoadTimestamps.current['collection'] = Date.now();
      }
    } catch (e) {
      console.error("Failed to fetch word collection", e);
    } finally {
      setCollectionLoading(false);
    }
  }, [student]);

  const loadLeaderboardData = useCallback(async (force = false) => {
    if (!student || student.is_demo_account || useDemoStore.getState().isDemoMode) return;
    const lastLoaded = tabLoadTimestamps.current['stats'] || 0;
    if (!force && lastLoaded > 0 && Date.now() - lastLoaded < TAB_CACHE_TTL_MS) return;

    setLeaderboardLoading(true);
    try {
      let leadData: any[] = [];
      const lbRes = await fetch('/api/student/leaderboard');
      if (lbRes.ok) {
        const lbJson = await lbRes.json();
        leadData = lbJson.leaderboard || [];
      }

      if (leadData && leadData.length > 0) {
        const cardsByStudent = new Map<string, any[]>();
        for (const row of leadData) {
          cardsByStudent.set(row.id, row.cards || []);
        }

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
              rareCardStatus: getRareCardStatus(cardsByStudent.get(s.id)),
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
        tabLoadTimestamps.current['stats'] = Date.now();
      }
    } catch (e) {
      console.error("Failed to fetch leaderboard", e);
    } finally {
      setLeaderboardLoading(false);
    }
  }, [student]);

  const loadTeamsData = useCallback(async (force = false) => {
    if (!student || student.user_type === 'EXTERNAL' || student.is_demo_account || useDemoStore.getState().isDemoMode) {
      setMyTeams([]);
      setTeamScores({});
      setTeamError('');
      return;
    }
    const lastLoaded = tabLoadTimestamps.current['teams'] || 0;
    if (!force && lastLoaded > 0 && Date.now() - lastLoaded < TAB_CACHE_TTL_MS) return;

    setTeamsLoading(true);
    setTeamError('');
    try {
      await autoAssignTeamForStudent(student.id);
      const { data: teamsData, error: teamsError } = await supabase
        .from('team_members')
        .select('team_id, teams(*)')
        .eq('user_id', student.id)
        .eq('is_active', true);
      if (teamsError) throw teamsError;

      if (teamsData) {
        const tList = teamsData.map((d: any) => d.teams).filter(Boolean);
        const seenTeamIds = new Set<string>();
        const uniqueTeams = tList.filter((team: any) => {
          if (!team || seenTeamIds.has(team.id)) return false;
          seenTeamIds.add(team.id);
          return true;
        });
        setMyTeams(uniqueTeams);

        const scoreEntries = await Promise.all(uniqueTeams.map(async (team: any) => [
          team.id,
          await calculateTeamScore(team.id),
        ] as const));
        setTeamScores(Object.fromEntries(scoreEntries));
        tabLoadTimestamps.current['teams'] = Date.now();
      }
    } catch (error) {
      console.error('Team Battle load failed:', error);
      setTeamError(error instanceof Error ? error.message : 'โหลดระบบทีมไม่สำเร็จ');
    } finally {
      setTeamsLoading(false);
    }
  }, [student]);

  const loadMessagesData = useCallback(async (force = false) => {
    if (!student || student.is_demo_account || useDemoStore.getState().isDemoMode) return;
    const lastLoaded = tabLoadTimestamps.current['inbox'] || 0;
    if (!force && lastLoaded > 0 && Date.now() - lastLoaded < TAB_CACHE_TTL_MS) return;

    setMessagesLoading(true);
    try {
      const { data: messagesData } = await supabase
        .from('student_messages')
        .select('*')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false });
      
      if (messagesData) {
        setMessages(messagesData);
        tabLoadTimestamps.current['inbox'] = Date.now();
      }
    } catch (e) {
      console.error("Failed to fetch messages", e);
    } finally {
      setMessagesLoading(false);
    }
  }, [student]);

  const loadQuestsData = useCallback(async (force = false) => {
    if (!student || student.is_demo_account || useDemoStore.getState().isDemoMode) return;
    const lastLoaded = tabLoadTimestamps.current['quests'] || 0;
    if (!force && lastLoaded > 0 && Date.now() - lastLoaded < TAB_CACHE_TTL_MS) return;

    setQuestsLoading(true);
    try {
      const { data: questData, error: questError } = await supabase
        .from('student_daily_quests')
        .select('*, daily_quests(*)')
        .eq('student_id', student.id)
        .eq('quest_date', new Date().toISOString().split('T')[0]);
      
      if (questError) throw questError;

      if (questData && questData.length > 0) {
        setDailyQuests(questData.map(q => ({
          id: q.id,
          title: q.daily_quests.title,
          target_value: q.daily_quests.target_value,
          reward_coins: q.daily_quests.reward_coins,
          reward_tickets: q.daily_quests.reward_tickets,
          progress: q.progress,
          claimed: q.is_claimed
        })));
        tabLoadTimestamps.current['quests'] = Date.now();
      } else {
        setDailyQuests(getMockQuests(student.id));
      }
    } catch (e) {
      console.warn("Daily quests table might not exist yet, using mock data", e);
      setDailyQuests(getMockQuests(student.id));
    } finally {
      setQuestsLoading(false);
    }
  }, [student]);

  // Initial mount trigger
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // On-demand tab activation trigger
  useEffect(() => {
    if (activeTab === 'collection') {
      loadCollectionData();
    } else if (activeTab === 'stats') {
      loadLeaderboardData();
    } else if (activeTab === 'teams') {
      loadTeamsData();
    } else if (activeTab === 'inbox') {
      loadMessagesData();
    } else if (activeTab === 'quests') {
      loadQuestsData();
    }
  }, [activeTab, loadCollectionData, loadLeaderboardData, loadTeamsData, loadMessagesData, loadQuestsData]);

  // Reset studied stage state when advancing to a new stage
  useEffect(() => {
    if (progress?.current_stage) {
      setStudiedCurrentStage(false);
    }
  }, [progress?.current_stage, setStudiedCurrentStage]);

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

      const patchRes = await fetch('/api/student/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarSeed: newSeed, avatarStyle: randomStyle }),
      });
      if (!patchRes.ok) throw new Error('Failed to update avatar');

      setProgress({ ...progress, avatar_seed: newSeed, avatar_style: randomStyle });
    } catch (e) {
      console.error("Error randomizing avatar:", e);
    }
  };

  const currentStage = progress?.current_stage || 1;
  const currentRank = progress?.current_rank || 1;
  const rankConfig = ADAPTIVE_RANK_CONFIG[currentRank] || ADAPTIVE_RANK_CONFIG[1];
  const currentWorld = getWorldForStage(currentStage);
  const isExternalUser = student?.user_type === 'EXTERNAL';

  const markMessagesAsRead = async () => {
    const unreadMessages = messages.filter(m => !m.is_read);
    if (unreadMessages.length === 0) return;
    
    try {
      await supabase
        .from('student_messages')
        .update({ is_read: true })
        .in('id', unreadMessages.map(m => m.id));
      
      setMessages(messages.map(m => ({ ...m, is_read: true })));
    } catch (e) {
      console.error("Error marking messages as read:", e);
    }
  };

  const handleClaimQuest = async (questId: string) => {
    if (claimingQuests.has(questId)) return;
    setClaimingQuests(prev => new Set(prev).add(questId));

    try {
      // 1. Update DB (if table exists)
      const { error } = await supabase
        .from('student_daily_quests')
        .update({ is_claimed: true })
        .eq('id', questId);
      
      // If error (e.g. demo mode / mock data), we just ignore
      
      const questToClaim = dailyQuests.find(q => q.id === questId);
      const currentProgress = useAppStore.getState().progress;
      
      if (questToClaim && currentProgress) {
        const rewardCoins = questToClaim.reward_coins || 0;
        const rewardTickets = questToClaim.reward_tickets || 0;

        let updatedCoins = currentProgress.coins || 0;
        let updatedTickets = currentProgress.free_pull_tickets || 0;
        let claimSuccess = false;

        // Secure RPC call instead of client-side DB update
        const { data: rpcData, error: rpcError } = await supabase.rpc('claim_mock_quest_reward', {
          p_student_id: student.id,
          p_quest_id: questId,
          p_reward_coins: rewardCoins,
          p_reward_tickets: rewardTickets
        });

        if (rpcError) {
          console.error("Failed to claim quest via RPC:", rpcError);
          const rewardRes = await fetch('/api/events/reward', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source: 'DAILY_QUEST',
              referenceId: `quest-${questId}-${new Date().toISOString().slice(0, 10)}`,
              coinsDelta: rewardCoins,
              ticketsDelta: rewardTickets,
            }),
          });
          if (rewardRes.ok) {
            updatedCoins += rewardCoins;
            updatedTickets += rewardTickets;
            claimSuccess = true;
          } else {
            alert("เกิดข้อผิดพลาดในการรับรางวัล กรุณาลองใหม่อีกครั้ง");
            return;
          }
        } else {
          updatedCoins = rpcData.new_coins;
          updatedTickets = rpcData.new_tickets;
          claimSuccess = true;
        }

        if (claimSuccess) {
          // Update Zustand
          setProgress({ 
            ...currentProgress, 
            coins: updatedCoins, 
            free_pull_tickets: updatedTickets 
          });

          // Update local state
          setDailyQuests(prev => {
            const next = prev.map(q => q.id === questId ? { ...q, claimed: true } : q);
            // Save to localStorage if it's a mock quest
            if (['1', '2', '3'].includes(questId) && typeof window !== 'undefined') {
              const today = new Date().toISOString().split('T')[0];
              localStorage.setItem(`mock_quests_${student.id}_${today}`, JSON.stringify(next));
            }
            return next;
          });

          // Trigger confetti (using existing window.confetti if available)
          if (typeof window !== 'undefined' && (window as any).confetti) {
            (window as any).confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });
          }
        }
      }
    } catch (e) {
      console.error("Error claiming quest:", e);
    } finally {
      setClaimingQuests(prev => {
        const next = new Set(prev);
        next.delete(questId);
        return next;
      });
    }
  };

  const handleManualRefresh = useCallback(async () => {
    tabLoadTimestamps.current = {};
    await loadDashboardData();
    if (activeTab === 'collection') loadCollectionData(true);
    else if (activeTab === 'stats') loadLeaderboardData(true);
    else if (activeTab === 'teams') loadTeamsData(true);
    else if (activeTab === 'inbox') loadMessagesData(true);
    else if (activeTab === 'quests') loadQuestsData(true);
  }, [loadDashboardData, activeTab, loadCollectionData, loadLeaderboardData, loadTeamsData, loadMessagesData, loadQuestsData]);

  return (
    <div data-demo-guide="student-dashboard" className="min-h-screen bg-transparent text-slate-100 font-sans p-3 sm:p-4 md:p-8 safe-bottom relative">
      {/* Ambient backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 glow-orb"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-secondary/20 glow-orb"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <StudentHero 
            student={student} 
            progress={progress} 
            stats={stats} 
            rankConfig={rankConfig} 
            setShowShop={setShowShop} 
            setShowCardCenter={setShowCardCenter}
            logout={logout} 
          />
        </motion.div>

        {/* AI Mascot Bubble */}
        <div className="glass-card p-4 rounded-2xl flex items-center gap-3.5 mb-6 hover-lift bg-gradient-to-r from-emerald-500/10 to-transparent">
          <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center text-xl shrink-0">
            🤖
          </div>
          <div className="text-left">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-0.5">ครูพี่โอม AI Teacher</span>
            <p className="text-sm text-slate-200 font-medium leading-relaxed">{aiTeacherMessage}</p>
          </div>
        </div>

        {/* Quick Stats */}
        <ProgressStats 
          realAccuracy={realAccuracy}
          level={stats.level}
          xp={stats.xp}
          reviewWordsCount={reviewWords.length}
        />

        {/* Team Card (if assigned) */}
        {teamError && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-sm">
            ระบบทีมยังไม่พร้อม: {teamError}
          </div>
        )}
        {myTeams.length > 0 && !isExternalUser && (
          <div className="mb-6">
            <StudentTeamCard team={myTeams[0]} scoreData={teamScores[myTeams[0].id]} />
          </div>
        )}

        {/* Mini Leaderboard on top if in roadmap */}
        {activeTab === 'roadmap' && !isExternalUser && (
          <div data-demo-guide="leaderboard" className="mb-8">
            <TeamLeaderboard scope="class" classroomId={student?.classroom_id} />
          </div>
        )}

        {/* Tab Links */}
        <div className="flex flex-col min-[420px]:flex-row min-[420px]:justify-between min-[420px]:items-end gap-2 mb-2">
          <div className="text-slate-400 text-sm font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>เมนูการเดินทาง</span>
          </div>
          <button onClick={handleManualRefresh} className="min-h-10 flex items-center justify-center gap-1.5 text-xs text-indigo-300 hover:text-indigo-200 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 px-3.5 py-1.5 rounded-full transition-all cursor-pointer shadow-sm">
            <RefreshCw className="w-3 h-3" /> รีเฟรชข้อมูล
          </button>
        </div>
        <div className="grid grid-cols-3 min-[420px]:grid-cols-4 md:grid-cols-8 glass-card rounded-2xl p-1.5 mb-8 gap-1.5 border border-slate-800/80 bg-slate-950/50 backdrop-blur-xl shadow-xl">
          <button 
            onClick={() => setActiveTab('roadmap')} 
            className={`min-h-14 py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'roadmap' ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 scale-[1.02]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Compass className="w-5 h-5 shrink-0" />
            <span className="text-[10px] sm:text-xs font-black">ผจญภัย</span>
          </button>
          <button 
            onClick={() => setActiveTab('review')} 
            className={`min-h-14 py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'review' ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 scale-[1.02]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Bookmark className="w-5 h-5 shrink-0" />
            <span className="text-[10px] sm:text-xs font-black">ทบทวน ({reviewWords.length})</span>
          </button>
          <button 
            onClick={() => setActiveTab('collection')} 
            className={`min-h-14 py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'collection' ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 scale-[1.02]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <BookMarked className="w-5 h-5 shrink-0" />
            <span className="text-[10px] sm:text-xs font-black">คลังศัพท์</span>
          </button>
          <button 
            onClick={() => setActiveTab('quests')} 
            className={`min-h-14 py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 transition-all relative cursor-pointer ${
              activeTab === 'quests' ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 scale-[1.02]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <CheckSquare className="w-5 h-5 shrink-0" />
            <span className="text-[10px] sm:text-xs font-black">ภารกิจ</span>
            {dailyQuests.some(q => q.progress >= q.target_value && !q.claimed) && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
            )}
            {dailyQuests.some(q => q.progress >= q.target_value && !q.claimed) && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('stats')} 
            className={`min-h-14 py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'stats' ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 scale-[1.02]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Trophy className="w-5 h-5 shrink-0" />
            <span className="text-[10px] sm:text-xs font-black">แรงกิ้ง</span>
          </button>
          {!isExternalUser && (
            <button 
              onClick={() => setActiveTab('teams')} 
              className={`min-h-14 py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'teams' ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 scale-[1.02]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Users className="w-5 h-5 shrink-0" />
              <span className="text-[10px] sm:text-xs font-black">ทีมของฉัน</span>
            </button>
          )}
          <button 
            onClick={() => { setActiveTab('inbox'); markMessagesAsRead(); }} 
            className={`min-h-14 py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 transition-all relative cursor-pointer ${
              activeTab === 'inbox' ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 scale-[1.02]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Mail className="w-5 h-5 shrink-0" />
            <span className="text-[10px] sm:text-xs font-black">จดหมาย</span>
            {messages.filter(m => !m.is_read).length > 0 && (
              <div className="absolute top-2 right-2 flex items-center justify-center w-4 h-4 bg-rose-500 text-white text-[10px] font-black rounded-full shadow-lg">
                {messages.filter(m => !m.is_read).length}
              </div>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('profile')} 
            className={`min-h-14 py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'profile' ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 scale-[1.02]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <User className="w-5 h-5 shrink-0" />
            <span className="text-[10px] sm:text-xs font-black">โปรไฟล์</span>
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
              {/* V3 Progression Error Banner (fail-closed) */}
              {v3Progression.error && (
                <div className="glass-card border-amber-500/50 p-4 mb-4 text-center">
                  <p className="text-amber-400 text-sm font-bold">
                    ⚠️ {v3Progression.error}
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    ไม่สามารถโหลดข้อมูลความคืบหน้าได้ กรุณารีเฟรชหน้า
                  </p>
                </div>
              )}

              {/* Weakness Boss Mode Banner */}
              {reviewWords.length >= 5 && (
                <div className="glass-card border-rose-500/50 p-5 sm:p-6 mb-6 shadow-[0_0_30px_rgba(225,29,72,0.2)] flex flex-col sm:flex-row items-center gap-6 justify-between animate-in zoom-in-95 duration-500 bg-gradient-to-r from-rose-950/40 to-transparent">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-rose-500/20 rounded-2xl flex items-center justify-center text-4xl shrink-0 animate-bounce">
                      👹
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-rose-300">บอสล้างตา (Weakness Boss Mode)</h3>
                      <p className="text-sm text-rose-200/80 mt-1">
                        พบคำศัพท์ที่น้องยังจำไม่ได้ {reviewWords.length} คำ! ท้าทายบอสเพื่อทบทวนคำศัพท์เหล่านี้และรับโบนัส EXP พิเศษ
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      // Navigate to game with Boss Mode & Review Mode active
                      useAppStore.getState().setBossMode(true);
                      useAppStore.getState().setReviewMode(true);
                      useAppStore.getState().setSelectedStageNumber(null);
                      setScreen('game');
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-rose-500 hover:bg-rose-400 text-white rounded-xl font-black shadow-lg shadow-rose-500/30 transition-all hover:scale-105 whitespace-nowrap shrink-0"
                  >
                    ⚔️ ท้าทายบอส
                  </button>
                </div>
              )}

              {/* World roadmap navigation */}
              <div data-demo-guide="stage-map" className="space-y-4">
                {STORY_WORLDS.map((world) => {
                  const worldFirstStage = world.stageRange[0];
                  const worldLastStage = world.stageRange[1];

                  // V3 authority: world unlock based on whether any stage in this world is unlocked
                  const isUnlockedWorld = v3Progression.authority
                    ? Array.from({ length: 10 }, (_, i) => worldFirstStage + i).some(s => v3Progression.unlockedStages.has(s))
                    : currentStage >= worldFirstStage;
                  const isCompletedWorld = v3Progression.authority
                    ? Array.from({ length: 10 }, (_, i) => worldFirstStage + i).every(s => v3Progression.completedStages.get(s)?.completed ?? false)
                    : currentStage > worldLastStage;
                  const isCurrentWorld = isUnlockedWorld && !isCompletedWorld;
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
                        className="w-full p-4 sm:p-5 flex flex-col min-[420px]:flex-row min-[420px]:justify-between min-[420px]:items-center gap-3 text-left hover:bg-slate-900/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl p-2 bg-slate-950 rounded-xl border border-slate-800 shrink-0">{world.icon}</span>
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-widest">WORLD {world.worldNumber}</span>
                            <h3 className="text-lg font-black text-white">{world.title}</h3>
                          </div>
                        </div>

                        <div className="flex items-center justify-between min-[420px]:justify-end gap-3 w-full min-[420px]:w-auto">
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
                              const isBossStage = stageNum % 10 === 0;
                              const isFinalBossStage = stageNum === 100;
                              const isMini = stageNum % 10 === 5;

                              // V3 authority: use server-computed unlock/complete state
                              const v3Entry = v3Progression.completedStages.get(stageNum);
                              const isCompletedStage = v3Progression.authority
                                ? (v3Entry?.completed ?? false)
                                : stageNum < currentStage;
                              const isUnlocked = v3Progression.authority
                                ? v3Progression.unlockedStages.has(stageNum)
                                : stageNum <= currentStage;
                              const isCurrentStage = !isCompletedStage && isUnlocked;

                              let stageState = 'locked';
                              if (isCompletedStage) stageState = 'completed';
                              else if (isCurrentStage) stageState = 'current';

                              const canPlayStage = stageState === 'completed' || stageState === 'current';
                              const stageActionLabel = stageState === 'completed' ? 'เล่นซ้ำ' : stageState === 'current' ? 'เล่นเลย' : 'ล็อก';

                              const handleStageClick = () => {
                                if (!canPlayStage) return;
                                setMissionLevel(1);
                                // Set boss mode for boss stages (5, 10, 15, 20, ... 100)
                                const shouldBeBoss = stageNum % 5 === 0;
                                useAppStore.getState().setBossMode(shouldBeBoss);
                                setSelectedStageNumber(stageState === 'current' ? null : stageNum);
                                setScreen('game');
                              };

                              return (
                                <button
                                  type="button"
                                  key={stageNum}
                                  data-demo-guide={isFinalBossStage ? 'final-boss' : (stageState === 'completed' && stageNum === currentStage - 1 ? 'replay-stage' : undefined)}
                                  disabled={!canPlayStage}
                                  onClick={handleStageClick}
                                  className={`w-full text-left p-3.5 rounded-2xl flex items-center justify-between border transition-all ${
                                    stageState === 'completed' ? 'bg-slate-900/40 border-slate-850 text-slate-300' :
                                    stageState === 'current' ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border-emerald-500/30 text-emerald-400 font-extrabold shadow-inner' :
                                    'bg-slate-950/60 border-slate-950 text-slate-600 opacity-60'
                                  } ${canPlayStage ? 'hover:border-emerald-500/40 hover:bg-slate-900/70 hover:scale-[1.01] cursor-pointer' : 'cursor-not-allowed'}`}
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
                                      <span className="text-xs font-bold text-white flex flex-col sm:flex-row sm:items-center gap-1">
                                        ด่านที่ {stageNum}
                                        {stageState === 'completed' && (
                                          <span className="flex">
                                            {Array.from({ length: 3 }).map((_, i) => (
                                              <Star 
                                                key={i} 
                                                className={`w-3 h-3 ${i < (stageStars[stageNum] || (v3Entry?.bestStars ?? 1)) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} 
                                              />
                                            ))}
                                          </span>
                                        )}
                                      </span>
                                      <span className="text-[10px] text-slate-500 tracking-wider">
                                        {isFinalBossStage ? '👑 Final Boss ผู้พิชิต O-NET' : isBossStage ? '👹 ด่านบอสประจำโลก' : isMini ? '⚔️ Mini Boss' : '🧭 โจทย์ระดับปกติ'}
                                      </span>
                                    </div>
                                  </div>

                                  <div>
                                    {stageState === 'completed' && (
                                      <span className="text-emerald-400 text-xs font-black bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                                        {stageActionLabel}
                                      </span>
                                    )}
                                    {stageState === 'current' && <span className="text-amber-400 text-sm animate-bounce">🎯</span>}
                                    {stageState === 'locked' && <span className="text-slate-600 text-sm">🔒</span>}
                                  </div>
                                </button>
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
                    ธีมปัจจุบัน: <strong className="text-white">{currentWorld.title}</strong> • การตั้งค่า: 10 ข้อ • เวลา {rankConfig.timeLimit} วินาที
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
                    onClick={() => {
                      setMissionLevel(1);
                      setSelectedStageNumber(currentStage);
                      setScreen('game');
                    }}
                    className="w-full sm:w-auto px-8 py-4 font-black rounded-2xl flex items-center justify-center gap-2 transition-all text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 hover:scale-[1.02]"
                  >
                    <Play className="w-4 h-4 fill-slate-950" /> เริ่มเกมท้าทาย ➡️
                  </button>
                </div>
              </div>

              {/* Post-Test CTA — shows when student has played enough stages */}
              {currentStage >= 20 && !isExternalUser && (
                <div className="bg-gradient-to-tr from-indigo-950/60 to-slate-950 border border-indigo-500/20 rounded-3xl p-6 flex flex-col md:flex-row gap-5 justify-between items-center shadow-xl">
                  <div className="text-center md:text-left w-full md:w-auto">
                    <span className="text-xs bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20 font-bold uppercase tracking-widest">แบบทดสอบหลังเรียน</span>
                    <h3 className="text-xl font-black text-white mt-3">📝 Post-Test พร้อมแล้ว!</h3>
                    <p className="text-slate-400 text-sm mt-1">
                      ทำแบบทดสอบหลังเรียนเพื่อวัดพัฒนาการ เปรียบเทียบกับ Pre-test
                    </p>
                  </div>
                  <button 
                    onClick={() => setScreen('posttest')}
                    className="w-full md:w-auto px-8 py-4 font-black rounded-2xl flex items-center justify-center gap-2 transition-all text-sm bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.02]"
                  >
                    📝 เริ่มทำ Post-Test
                  </button>
                </div>
              )}
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

              <div data-demo-guide="review-stage" className="glass-card p-6 sm:p-8 rounded-3xl">
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
                  {collectionLoading ? (
                    <div className="col-span-full text-center py-12 text-slate-400">
                      <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm">กำลังโหลดสมุดคำศัพท์สะสม...</p>
                    </div>
                  ) : wordCollection.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-slate-500 italic text-sm">
                      คุณยังไม่มีคำศัพท์ในสมุดสะสม เริ่มต้นลุยด่านผจญภัยเพื่อเปิดพจนานุกรมคำแรกกันเลย!
                    </div>
                  ) : (
                    wordCollection.map((item) => {
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
                    })
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
              <div className="glass-card p-5 sm:p-7 rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                      <Trophy className="w-6 h-6 text-amber-400" /> ตารางเพื่อนร่วมผจญภัยในชั้นเรียน (Leaderboard)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">แข่งขันเก็บเลเวลและเหรียญทองร่วมกับเพื่อนในห้อง</p>
                  </div>
                  {leaderboard.length > 0 && (
                    <span className="self-start sm:self-auto text-xs font-bold text-slate-400 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl">
                      ผู้เล่นทั้งหมด {leaderboard.length} คน
                    </span>
                  )}
                </div>
                
                <div className="bg-slate-950/60 rounded-2xl overflow-hidden border border-slate-800/80 shadow-inner">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 text-xs uppercase tracking-wider font-extrabold">
                          <th className="p-4 text-center w-16">อันดับ</th>
                          <th className="p-4">นักผจญภัย</th>
                          <th className="p-4 text-center">ระดับ</th>
                          <th className="p-4 text-center">เหรียญสะสม</th>
                          <th className="p-4 text-center">ด่านล่าสุด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-sm">
                        {leaderboard.map((user, idx) => {
                          const rankIcons = ['🥇', '🥈', '🥉'];
                          const isTop3 = idx < 3;
                          
                          let podiumClass = 'hover:bg-slate-900/40';
                          if (user.isSelf) {
                            podiumClass = 'bg-emerald-500/15 hover:bg-emerald-500/20 font-black text-emerald-300 border-l-4 border-emerald-400 shadow-md';
                          } else if (idx === 0) {
                            podiumClass = 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent text-amber-200 hover:bg-amber-500/15 border-l-4 border-amber-400';
                          } else if (idx === 1) {
                            podiumClass = 'bg-gradient-to-r from-slate-400/10 via-slate-400/5 to-transparent text-slate-200 hover:bg-slate-400/15 border-l-4 border-slate-400';
                          } else if (idx === 2) {
                            podiumClass = 'bg-gradient-to-r from-amber-700/10 via-amber-700/5 to-transparent text-amber-300 hover:bg-amber-700/15 border-l-4 border-amber-600';
                          }

                          return (
                            <tr 
                              key={user.id} 
                              className={`transition-all ${podiumClass}`}
                            >
                              <td className="p-4 text-center text-lg font-black">
                                {isTop3 ? (
                                  <span className="inline-block transform hover:scale-125 transition-transform select-none">
                                    {rankIcons[idx]}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 font-mono text-xs">{idx + 1}</span>
                                )}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <AvatarDisplay 
                                    seed={user.avatar_seed} 
                                    style={user.avatar_style} 
                                    size="sm" 
                                    className="shrink-0 ring-1 ring-slate-700 rounded-full"
                                  />
                                  <span className="truncate font-bold">{user.name}</span>
                                  {user.rareCardStatus && (
                                    <span
                                      title={user.rareCardStatus.label}
                                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                        user.rareCardStatus.rarity === 'UR'
                                          ? 'bg-amber-400/15 text-amber-300 border-amber-400/40 shadow-[0_0_14px_rgba(251,191,36,0.35)]'
                                          : user.rareCardStatus.rarity === 'SSR'
                                            ? 'bg-fuchsia-400/15 text-fuchsia-300 border-fuchsia-400/40'
                                            : 'bg-sky-400/15 text-sky-300 border-sky-400/40'
                                      }`}
                                    >
                                      {user.rareCardStatus.icon} {user.rareCardStatus.rarity}
                                    </span>
                                  )}
                                  {user.isSelf && (
                                    <span className="text-[10px] bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm">
                                      คุณ
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-center font-bold text-indigo-400">
                                Lvl {Math.floor((user.exp || 0) / 100) + 1}
                              </td>
                              <td className="p-4 text-center font-semibold text-amber-300">
                                🪙 {user.coins.toLocaleString()}
                              </td>
                              <td className="p-4 text-center text-slate-400">
                                ด่าน {user.stage}
                              </td>
                            </tr>
                          );
                        })}
                        {leaderboardLoading ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400">
                              <div className="w-6 h-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto mb-2" />
                              กำลังโหลดอันดับห้องเรียน...
                            </td>
                          </tr>
                        ) : leaderboard.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-500 italic">
                              ไม่มีข้อมูลอันดับในห้องเรียนนี้
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: TEAMS (CROSS-CLASS BATTLE) */}
          {activeTab === 'teams' as any && !isExternalUser && (
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
                
                {teamsLoading ? (
                  <div className="text-center py-10">
                    <div className="w-8 h-8 border-2 border-fuchsia-500/20 border-t-fuchsia-500 rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">กำลังโหลดและคำนวณคะแนนทีม...</p>
                  </div>
                ) : myTeams.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-slate-400">กำลังค้นหาทีมของคุณ...</p>
                  </div>
                ) : null}
              </div>

              {/* Show Leaderboard in Teams tab */}
              <div className="mt-8">
                <TeamLeaderboard scope="school" />
              </div>
            </motion.div>
          )}

          {/* TAB: INBOX */}
          {activeTab === 'inbox' && (
            <motion.div 
              key="inbox" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-left"
            >
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Mail className="w-6 h-6 text-indigo-400" />
                  <h3 className="text-xl font-black text-white">กล่องจดหมาย (Teacher's Note)</h3>
                </div>
                
                <div className="space-y-4">
                  {messagesLoading ? (
                    <div className="text-center py-12 text-slate-400">
                      <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-sm">กำลังโหลดจดหมาย...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <Mail className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>ยังไม่มีจดหมายจากคุณครูครับ</p>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div key={msg.id} className="bg-slate-950/80 border border-indigo-500/20 rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                            <span className="text-xl">👩‍🏫</span>
                          </div>
                          <div>
                            <div className="text-xs text-indigo-300 font-bold mb-1">จาก: {msg.sender_name} <span className="text-slate-500 ml-2 font-normal">{new Date(msg.created_at).toLocaleDateString('th-TH')}</span></div>
                            <p className="text-white whitespace-pre-wrap">{msg.message}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: QUESTS */}
          {activeTab === 'quests' && (
            <motion.div 
              key="quests" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-left"
            >
              {questsLoading ? (
                <div className="glass-card p-12 text-center text-slate-400 rounded-3xl">
                  <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm">กำลังโหลดภารกิจประจำวัน...</p>
                </div>
              ) : (
                <QuestList 
                  dailyQuests={dailyQuests}
                  claimingQuests={claimingQuests}
                  onClaimQuest={handleClaimQuest}
                />
              )}
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
                  <p className="text-emerald-400 font-bold mb-8">
                    Level {stats.level} • {currentRank === 1 ? '🥉' : currentRank === 2 ? '🥈' : currentRank === 3 ? '🥇' : currentRank === 4 ? '💎' : currentRank === 5 ? '👑' : '🛡️'} {rankConfig.skillTitle}
                  </p>
                  
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
      <StudentVerificationModal />
      {showShop && !isExternalUser && <ShopModal onClose={() => setShowShop(false)} />}
      {showCardCenter && !isExternalUser && <CardCenterModal onClose={() => setShowCardCenter(false)} />}


    </div>
  );
}
