import { create } from 'zustand';

interface AppState {
  student: any;
  progress: any;
  currentScreen: 'dashboard' | 'study' | 'game';
  currentCategory: any;
  inventory: any[];
  recommendations: any[];
  isReviewMode: boolean;
  setStudent: (student: any) => void;
  setProgress: (progress: any) => void;
  setScreen: (screen: 'dashboard' | 'study' | 'game') => void;
  setCurrentCategory: (category: any) => void;
  setInventory: (inventory: any[]) => void;
  setRecommendations: (recommendations: any[]) => void;
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
