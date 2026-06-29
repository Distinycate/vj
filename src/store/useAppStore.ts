import { create } from 'zustand';

interface AppState {
  student: Record<string, any> | null;
  progress: Record<string, any> | null;
  currentScreen: 'dashboard' | 'study' | 'game';
  currentCategory: Record<string, any> | null;
  inventory: Record<string, any>[];
  recommendations: Record<string, any>[];
  isReviewMode: boolean;
  setStudent: (student: Record<string, any>) => void;
  setProgress: (progress: Record<string, any>) => void;
  setScreen: (screen: 'dashboard' | 'study' | 'game') => void;
  setCurrentCategory: (category: Record<string, any>) => void;
  setInventory: (inventory: Record<string, any>[]) => void;
  setRecommendations: (recommendations: Record<string, any>[]) => void;
  setReviewMode: (isReview: boolean) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  student: null,
  progress: null,
  currentScreen: 'dashboard',
  currentCategory: null,
  inventory: [],
  recommendations: [],
  isReviewMode: false,
  setStudent: (student) => set({ student }),
  setProgress: (progress) => set({ progress }),
  setScreen: (screen) => set({ currentScreen: screen }),
  setCurrentCategory: (currentCategory) => set({ currentCategory }),
  setInventory: (inventory) => set({ inventory }),
  setRecommendations: (recommendations) => set({ recommendations }),
  setReviewMode: (isReviewMode) => set({ isReviewMode }),
  logout: () => set({ 
    student: null, 
    progress: null, 
    currentScreen: 'dashboard',
    currentCategory: null,
    inventory: [],
    recommendations: [],
    isReviewMode: false
  }),
}));
