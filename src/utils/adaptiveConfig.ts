// ADAPTIVE DIFFICULTY PARAMETERS AND CONFIGURATION
// This file separates configuration parameters from the game and engine logic.

export interface RankConfig {
  skillTitle: string;
  difficultyMix: {
    easy: number;
    normal: number;
    hard: number;
    expert: number;
  };
  questionTypes: string[];
  questionCount: number;
  timeLimit: number; // in seconds per question
  passScore: number; // percentage correct required to pass (e.g. 75)
  hintMode: 'unlimited' | 'limited' | 'none';
}

export const ADAPTIVE_RANK_CONFIG: Record<number, RankConfig> = {
  1: {
    skillTitle: 'Novice Explorer (ผู้เริ่มต้นฝึกฝน)',
    difficultyMix: { easy: 80, normal: 20, hard: 0, expert: 0 },
    questionTypes: ['meaning_mc', 'word_mc'],
    questionCount: 10,
    timeLimit: 25,
    passScore: 60,
    hintMode: 'unlimited'
  },
  2: {
    skillTitle: 'Vanguard Scholar (นักคิดบุกเบิก)',
    difficultyMix: { easy: 60, normal: 35, hard: 5, expert: 0 },
    questionTypes: ['meaning_mc', 'word_mc', 'listening_mc'],
    questionCount: 12,
    timeLimit: 22,
    passScore: 70,
    hintMode: 'limited'
  },
  3: {
    skillTitle: 'Elite Quester (นักผจญภัยระดับยอดฝีมือ)',
    difficultyMix: { easy: 35, normal: 45, hard: 20, expert: 0 },
    questionTypes: ['meaning_mc', 'word_mc', 'listening_mc', 'context_mc'],
    questionCount: 15,
    timeLimit: 18,
    passScore: 75,
    hintMode: 'limited'
  },
  4: {
    skillTitle: 'Grand Archmage (จอมเวทย์ภาษาอังกฤษ)',
    difficultyMix: { easy: 15, normal: 50, hard: 35, expert: 0 },
    questionTypes: ['meaning_mc', 'word_mc', 'listening_mc', 'context_mc', 'spelling'],
    questionCount: 18,
    timeLimit: 15,
    passScore: 80,
    hintMode: 'limited'
  },
  5: {
    skillTitle: 'Mythic Overlord (ตำนานผู้ไร้พ่าย)',
    difficultyMix: { easy: 0, normal: 20, hard: 50, expert: 30 },
    questionTypes: ['meaning_mc', 'word_mc', 'listening_mc', 'context_mc', 'spelling', 'mixed_challenge'],
    questionCount: 20,
    timeLimit: 12,
    passScore: 90,
    hintMode: 'none'
  }
};

// 10 Worlds & Theme definitions for Story Mode
export interface WorldInfo {
  worldNumber: number;
  theme: string;
  title: string;
  icon: string;
  stageRange: [number, number];
}

export const STORY_WORLDS: WorldInfo[] = [
  { worldNumber: 1, theme: 'Animals', title: '🦁 อาณาจักรสัตว์ป่า', icon: '🦁', stageRange: [1, 10] },
  { worldNumber: 2, theme: 'School', title: '🏫 ชีวิตในโรงเรียน', icon: '🏫', stageRange: [11, 20] },
  { worldNumber: 3, theme: 'Travel', title: '✈️ นักเดินทางรอบโลก', icon: '✈️', stageRange: [21, 30] },
  { worldNumber: 4, theme: 'Food', title: '🍔 มื้ออาหารแสนอร่อย', icon: '🍔', stageRange: [31, 40] },
  { worldNumber: 5, theme: 'Sports', title: '⚽ กีฬาและสุขภาพ', icon: '⚽', stageRange: [41, 50] },
  { worldNumber: 6, theme: 'Nature', title: '🌲 ธรรมชาติและฤดูกาล', icon: '🌲', stageRange: [51, 60] },
  { worldNumber: 7, theme: 'Transport', title: '🚗 การขนส่งและคมนาคม', icon: '🚗', stageRange: [61, 70] },
  { worldNumber: 8, theme: 'Tech', title: '🔬 เทคโนโลยีและวิทยาศาสตร์', icon: '🔬', stageRange: [71, 80] },
  { worldNumber: 9, theme: 'Cosmos', title: '🌌 ห้วงอวกาศลี้ลับ', icon: '🌌', stageRange: [81, 90] },
  { worldNumber: 10, theme: 'Careers', title: '💼 อาชีพในอนาคต', icon: '💼', stageRange: [91, 100] }
];

// Helper to determine which world a stage belongs to
export function getWorldForStage(stageNumber: number): WorldInfo {
  const world = STORY_WORLDS.find(w => stageNumber >= w.stageRange[0] && stageNumber <= w.stageRange[1]);
  return world || STORY_WORLDS[0];
}
