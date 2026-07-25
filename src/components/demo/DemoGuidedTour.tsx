'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useDemoGuideStore } from '@/store/useDemoGuideStore';
import { DEMO_GUIDE_STEPS, DemoGuideStep } from '@/content/demo-guide.th';
import { useDemoStore } from '@/store/useDemoStore';
import { ChevronLeft, ChevronRight, X, Play, RefreshCw, List } from 'lucide-react';
import DemoGuideMenu from './DemoGuideMenu';

export default function DemoGuidedTour() {
  const router = useRouter();
  const pathname = usePathname();
  const { isDemoMode } = useDemoStore();
  const { isActive, currentStepIndex, nextStep, prevStep, stopTour, resetTour, goToStep } = useDemoGuideStore();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);

  const step = DEMO_GUIDE_STEPS[currentStepIndex];

  useEffect(() => {
    if (!isDemoMode || !isActive || !step) {
      setTargetRect(null);
      return;
    }

    // Handle cross-route navigation
    if (pathname !== step.route) {
      setIsWaiting(true);
      router.push(step.route);
      return;
    }

    // Look for target element
    let timeoutId: NodeJS.Timeout;
    const findTarget = () => {
      const el = document.querySelector(`[data-demo-guide="${step.target}"]`);
      if (el) {
        // Found it
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
        setIsWaiting(false);
        // Scroll into view if out of bounds
        if (
          rect.top < 100 ||
          rect.bottom > window.innerHeight - 100
        ) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => setTargetRect(el.getBoundingClientRect()), 400); // Update after scroll
        }
      } else {
        // Try again in 200ms
        setIsWaiting(true);
        timeoutId = setTimeout(findTarget, 200);
      }
    };

    findTarget();

    // Listen to resize and scroll
    const handleUpdate = () => {
      const el = document.querySelector(`[data-demo-guide="${step.target}"]`);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      }
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate);
    };
  }, [isActive, currentStepIndex, isDemoMode, pathname, step, router]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;
      if (e.key === 'Escape') stopTour();
      if (e.key === 'ArrowRight' && !isWaiting) nextStep();
      if (e.key === 'ArrowLeft' && !isWaiting) prevStep();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isWaiting, nextStep, prevStep, stopTour]);

  if (!isDemoMode || !isActive || !step) return null;

  // Calculate tooltip position
  let tooltipTop = 0;
  let tooltipLeft = 0;
  let placement = 'bottom';

  if (targetRect) {
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;
    
    // Default to bottom, unless not enough space
    if (spaceBelow < 350 && spaceAbove > 350) {
      placement = 'top';
      tooltipTop = targetRect.top + window.scrollY - 20; // 20px gap
    } else {
      placement = 'bottom';
      tooltipTop = targetRect.bottom + window.scrollY + 20;
    }
    
    // Center horizontally
    tooltipLeft = targetRect.left + window.scrollX + (targetRect.width / 2);
  }

  return (
    <>
      <div 
        className="fixed inset-0 z-[9998] pointer-events-none transition-all duration-300"
        style={{
          boxShadow: targetRect ? 'inset 0 0 0 9999px rgba(0,0,0,0.6)' : 'inset 0 0 0 9999px rgba(0,0,0,0)',
        }}
      >
        {targetRect && !isWaiting && (
          <div
            className="absolute rounded-lg transition-all duration-500 ease-out border-2 border-indigo-500 pointer-events-none shadow-[0_0_15px_rgba(99,102,241,0.5)] bg-transparent"
            style={{
              top: targetRect.top + window.scrollY - 4,
              left: targetRect.left + window.scrollX - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
            }}
          />
        )}
      </div>

      {/* Tooltip Overlay */}
      <AnimatePresence>
        {!isWaiting && targetRect && (
          <motion.div
            initial={{ opacity: 0, y: placement === 'bottom' ? -20 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute z-[9999] w-[400px] max-w-[90vw] bg-white rounded-xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
            style={{
              top: placement === 'bottom' ? tooltipTop : 'auto',
              bottom: placement === 'top' ? window.innerHeight - tooltipTop + targetRect.height + 40 : 'auto',
              left: Math.max(16, Math.min(tooltipLeft - 200, window.innerWidth - 416)), // Keep within screen
            }}
          >
            {/* Header */}
            <div className="bg-indigo-600 text-white px-4 py-3 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-xs text-indigo-200 font-medium tracking-wider uppercase mb-1">
                  Step {currentStepIndex + 1} of {DEMO_GUIDE_STEPS.length}
                </span>
                <h3 className="font-bold text-lg">{step.title}</h3>
              </div>
              <button 
                onClick={stopTour}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                title="ออกจากการนำชม"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Content Body (Scrollable if too tall) */}
            <div className="p-5 overflow-y-auto max-h-[50vh] text-sm text-gray-700 space-y-4 font-body leading-relaxed">
              <div>
                <strong className="text-indigo-700 block mb-1 font-heading">ส่วนนี้คืออะไร?</strong>
                <p>{step.whatIsIt}</p>
              </div>
              
              <div>
                <strong className="text-indigo-700 block mb-1 font-heading">วิธีใช้งาน:</strong>
                <p>{step.howToUse}</p>
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                <strong className="text-amber-800 block mb-1 font-heading">ที่มาและความสำคัญ:</strong>
                <p className="text-amber-900">{step.rationale}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <strong className="text-emerald-800 block mb-1 font-heading">ข้อดีต่อนักเรียน:</strong>
                  <p className="text-emerald-900 text-xs">{step.studentBenefit}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <strong className="text-blue-800 block mb-1 font-heading">ข้อดีต่อครู:</strong>
                  <p className="text-blue-900 text-xs">{step.teacherBenefit}</p>
                </div>
              </div>

              {step.judgeFocus.length > 0 && (
                <div className="mt-2 border-l-4 border-purple-500 pl-3">
                  <strong className="text-purple-700 block font-heading">จุดที่กรรมการควรสังเกต:</strong>
                  <ul className="list-disc pl-4 mt-1 text-purple-900 text-xs space-y-1">
                    {step.judgeFocus.map((focus, i) => (
                      <li key={i}>{focus}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer / Controls */}
            <div className="bg-gray-50 border-t border-gray-100 p-3 flex justify-between items-center">
              <button
                onClick={() => setShowMenu(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <List size={16} /> เลือกหัวข้อ
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={prevStep}
                  disabled={currentStepIndex === 0}
                  className="p-2 text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-transparent rounded-lg transition-colors"
                  title="ย้อนกลับ"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={nextStep}
                  className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                >
                  {currentStepIndex === DEMO_GUIDE_STEPS.length - 1 ? 'เสร็จสิ้น' : 'ถัดไป'}
                  {currentStepIndex !== DEMO_GUIDE_STEPS.length - 1 && <ChevronRight size={18} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State when navigating between routes */}
      {isWaiting && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] bg-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-3">
          <RefreshCw className="animate-spin text-indigo-600" size={24} />
          <span className="text-gray-700 font-medium">กำลังไปยังหน้าที่เกี่ยวข้อง...</span>
        </div>
      )}

      {/* Menu Overlay */}
      {showMenu && <DemoGuideMenu onClose={() => setShowMenu(false)} />}
    </>
  );
}
