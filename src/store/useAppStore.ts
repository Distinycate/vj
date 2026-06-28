import { create } from 'zustand';

interface AppState {
  student: any | null;
  progress: any | null;
  setStudent: (student: any) => void;
  setProgress: (progress: any) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  student: null,
  progress: null,
  setStudent: (student) => set({ student }),
  setProgress: (progress) => set({ progress }),
  logout: () => set({ student: null, progress: null }),
}));
