'use client';

import { useDemoStore } from '@/store/useDemoStore';
import { useRouter, usePathname } from 'next/navigation';
import { Sparkles, XCircle, SkipForward, RefreshCw, MessageCircleOff, MessageCircle, HelpCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useDemoGuideStore } from '@/store/useDemoGuideStore';
import { useState } from 'react';
import DemoGuideMenu from './DemoGuideMenu';

export default function DemoToolbar() {
  const { isDemoMode, showExplanations, toggleExplanations, resetDemo } = useDemoStore();
  const { logout, setScreen } = useAppStore();
  const { startTour, isActive, resetTour, currentStepIndex } = useDemoGuideStore();
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  if (!isDemoMode) return null;

  const handleBackToCenter = () => {
    // If not on demo page, go there
    if (pathname !== '/demo') {
      router.push('/demo');
    }
  };

  const handleExitDemo = () => {
    if (confirm('ต้องการออกจากโหมดทดลองหรือไม่? ข้อมูลจำลองทั้งหมดจะถูกล้าง')) {
      resetDemo();
      logout();
      router.push('/');
    }
  };

  return (
    <div 
      data-demo-guide="demo-toolbar"
      className="fixed top-0 left-0 w-full z-[100] bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg border-b border-purple-400"
    >
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-yellow-300" />
          <span className="font-bold text-sm hidden sm:inline">DEMO MODE — ผลการทดลองจะไม่ถูกบันทึก</span>
          <span className="font-bold text-sm sm:hidden">DEMO MODE</span>
        </div>

        <div className="flex items-center gap-2">
          {pathname !== '/demo' && (
            <button 
              onClick={handleBackToCenter}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-bold transition-colors"
            >
              Demo Center
            </button>
          )}

          <button 
            onClick={() => setShowMenu(true)}
            className={`px-3 py-1 flex items-center gap-1 rounded text-xs font-bold transition-colors ${isActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500/80 hover:bg-emerald-500'}`}
          >
            <HelpCircle className="w-4 h-4" /> 
            <span className="hidden sm:inline">
              {isActive ? 'กำลังนำชม...' : '? แนะนำการใช้งาน'}
            </span>
          </button>

          <button 
            onClick={handleExitDemo}
            className="px-3 py-1 bg-rose-500/80 hover:bg-rose-500 rounded text-xs font-bold transition-colors flex items-center gap-1"
          >
            <XCircle className="w-3 h-3" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>
      
      {showMenu && <DemoGuideMenu onClose={() => setShowMenu(false)} />}
    </div>
  );
}
