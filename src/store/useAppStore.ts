import { create } from 'zustand';
import { clearStudentSession } from '@/utils/studentSession';

interface AppState {
  student: any;
  progress: any;
  currentScreen: 'dashboard' | 'study' | 'game';
  missionLevel: number;
  currentCategory: any;
  inventory: any[];
  recommendations: any[];
  isReviewMode: boolean;
  setStudent: (student: any) => void;
  setProgress: (progress: any) => void;
  setScreen: (screen: 'dashboard' | 'study' | 'game') => void;
  setMissionLevel: (level: number) => void;
  setCurrentCategory: (category: any) => void;
  setInventory: (inventory: any[]) => void;
  setRecommendations: (recommendations: any[]) => void;
  setReviewMode: (isReview: boolean) => void;
  hasStudiedCurrentStage: boolean;
  setStudiedCurrentStage: (studied: boolean) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  student: null,
  progress: null,
  currentScreen: 'dashboard',
  missionLevel: 1,
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
  setCurrentCategory: (currentCategory) => set({ currentCategory }),
  setInventory: (inventory) => set({ inventory }),
  setRecommendations: (recommendations) => set({ recommendations }),
  setReviewMode: (isReviewMode) => set({ isReviewMode }),
  setStudiedCurrentStage: (hasStudiedCurrentStage) => set({ hasStudiedCurrentStage }),
  logout: () => {
    clearStudentSession();
    set({
    student: null, 
    progress: null, 
    currentScreen: 'dashboard',
    currentCategory: null,
    inventory: [],
    recommendations: [],
    isReviewMode: false,
    hasStudiedCurrentStage: false
    });
  },
}));
