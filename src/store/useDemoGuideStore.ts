import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEMO_GUIDE_STEPS, DemoGuideStep } from '@/content/demo-guide.th.ts';

interface DemoGuideState {
  isActive: boolean;
  currentStepIndex: number;
  hasSeenWelcome: boolean;
  
  // Actions
  startTour: () => void;
  stopTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  setHasSeenWelcome: (value: boolean) => void;
  resetTour: () => void;
}

export const useDemoGuideStore = create<DemoGuideState>()(
  persist(
    (set, get) => ({
      isActive: false,
      currentStepIndex: 0,
      hasSeenWelcome: false,

      startTour: () => set({ isActive: true }),
      
      stopTour: () => set({ isActive: false }),
      
      nextStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex < DEMO_GUIDE_STEPS.length - 1) {
          set({ currentStepIndex: currentStepIndex + 1 });
        } else {
          set({ isActive: false }); // End of tour
        }
      },
      
      prevStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex > 0) {
          set({ currentStepIndex: currentStepIndex - 1 });
        }
      },
      
      goToStep: (index: number) => {
        if (index >= 0 && index < DEMO_GUIDE_STEPS.length) {
          set({ currentStepIndex: index, isActive: true });
        }
      },
      
      setHasSeenWelcome: (value: boolean) => set({ hasSeenWelcome: value }),
      
      resetTour: () => set({ currentStepIndex: 0, isActive: false }),
    }),
    {
      name: 'demo-guide-storage',
    }
  )
);
