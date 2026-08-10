import { create } from 'zustand';

interface DemoState {
  isDemoMode: boolean;
  showExplanations: boolean;
  demoStudent: any;
  demoProgress: any;
  demoInventory: any[];
  startDemo: () => void;
  resetDemo: () => void;
  toggleExplanations: () => void;
  updateDemoProgress: (updates: any) => void;
  updateDemoStudent: (updates: any) => void;
}

const initialDemoStudent = {
  id: 'demo-judge-id',
  student_id: 'DEMO-001',
  student_name: 'กรรมการ ตัวอย่าง',
  first_name: 'กรรมการ',
  last_name: 'ตัวอย่าง',
  grade_level: 'ม.2',
  room: '1',
  classroom_id: 'demo-classroom',
  is_demo_account: true,
  is_verified: true,
  role: 'STUDENT'
};

const initialDemoProgress = {
  id: 'demo-progress-id',
  student_id: 'demo-judge-id',
  coins: 1250,
  exp: 3400,
  total_exp: 3400,
  current_stage: 35, // Let's set it to 35 to show some progress in the Stage Map
  stars: 72,
  rank: 3,
  pretest_score: 15,
  pretest_date: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const useDemoStore = create<DemoState>((set) => ({
  isDemoMode: false,
  showExplanations: true,
  demoStudent: null,
  demoProgress: null,
  demoInventory: [],

  startDemo: () => {
    // Also save to sessionStorage to persist across reloads
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('vocab_journey_demo', 'true');
      } catch (e) {}
    }
    set({
      isDemoMode: true,
      showExplanations: true,
      demoStudent: { ...initialDemoStudent },
      demoProgress: { ...initialDemoProgress },
      demoInventory: []
    });
  },

  resetDemo: () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('vocab_journey_demo');
      } catch (e) {}
    }
    set({
      isDemoMode: false,
      showExplanations: false,
      demoStudent: null,
      demoProgress: null,
      demoInventory: []
    });
  },

  toggleExplanations: () => set((state) => ({ showExplanations: !state.showExplanations })),

  updateDemoProgress: (updates: any) => set((state) => {
    const newProgress = { ...state.demoProgress, ...updates };
    return { demoProgress: newProgress };
  }),

  updateDemoStudent: (updates: any) => set((state) => {
    const newStudent = { ...state.demoStudent, ...updates };
    return { demoStudent: newStudent };
  })
}));

// Initialize demo mode on load if sessionStorage flag exists
if (typeof window !== 'undefined') {
  try {
    if (sessionStorage.getItem('vocab_journey_demo') === 'true') {
      useDemoStore.getState().startDemo();
    }
  } catch (e) {
    console.warn("sessionStorage not available", e);
  }
}
