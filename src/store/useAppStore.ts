import { create } from 'zustand';

interface AppState {
  student: any | null;
  progress: any | null;
  currentScreen: 'dashboard' | 'study' | 'game';
  setStudent: (student: any) => void;
  setProgress: (progress: any) => void;
  setScreen: (screen: 'dashboard' | 'study' | 'game') => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  student: null,
  progress: null,
  currentScreen: 'dashboard',
  setStudent: (student) => set({ student }),
  setProgress: (progress) => set({ progress }),
  setScreen: (screen) => set({ currentScreen: screen }),
  logout: () => set({ student: null, progress: null, currentScreen: 'dashboard' }),
}));
