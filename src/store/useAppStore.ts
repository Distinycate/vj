import { create } from 'zustand';
import { clearStudentSession } from '@/utils/studentSession';

interface AppState {
  student: any;
  progress: any;
  currentScreen: 'dashboard' | 'study' | 'game' | 'posttest';
  missionLevel: number;
  selectedStageNumber: number | null;
  currentCategory: any;
  inventory: any[];
  recommendations: any[];
  isReviewMode: boolean;
  setStudent: (student: any) => void;
  setProgress: (progress: any) => void;
  setScreen: (screen: 'dashboard' | 'study' | 'game' | 'posttest') => void;
  setMissionLevel: (level: number) => void;
  setSelectedStageNumber: (stageNumber: number | null) => void;
  setCurrentCategory: (category: any) => void;
  setInventory: (inventory: any[]) => void;
  setRecommendations: (recommendations: any[]) => void;
  setReviewMode: (isReview: boolean) => void;
  isBossMode: boolean;
  setBossMode: (isBoss: boolean) => void;
  hasStudiedCurrentStage: boolean;
  setStudiedCurrentStage: (studied: boolean) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  student: null,
  progress: null,
  currentScreen: 'dashboard',
  missionLevel: 1,
  selectedStageNumber: null,
  currentCategory: null,
  inventory: [],
  recommendations: [],
  isReviewMode: false,
  hasStudiedCurrentStage: false,
  setStudent: (student) => set({ student }),
  setProgress: (newProgress) => set((state) => ({ 
    progress: state.progress && newProgress ? { ...state.progress, ...newProgress } : newProgress 
  })),
  setScreen: (screen) => set({ currentScreen: screen }),
  setMissionLevel: (missionLevel) => set({ missionLevel }),
  setSelectedStageNumber: (selectedStageNumber) => set({ selectedStageNumber }),
  setCurrentCategory: (currentCategory) => set({ currentCategory }),
  setInventory: (inventory) => set({ inventory }),
  setRecommendations: (recommendations) => set({ recommendations }),
  setReviewMode: (isReviewMode) => set({ isReviewMode }),
  isBossMode: false,
  setBossMode: (isBossMode) => set({ isBossMode }),
  setStudiedCurrentStage: (hasStudiedCurrentStage) => set({ hasStudiedCurrentStage }),
  logout: () => {
    clearStudentSession();
    set({
    student: null, 
    progress: null, 
    currentScreen: 'dashboard',
    selectedStageNumber: null,
    currentCategory: null,
    inventory: [],
    recommendations: [],
    isReviewMode: false,
    hasStudiedCurrentStage: false
    });
  },
}));
