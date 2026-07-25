'use client';
import React from 'react';
import { useDemoGuideStore } from '@/store/useDemoGuideStore';
import { DEMO_GUIDE_STEPS } from '@/content/demo-guide.th';
import { X, Play, CheckCircle2, Circle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DemoGuideMenu({ onClose }: { onClose: () => void }) {
  const { currentStepIndex, goToStep, isActive, startTour } = useDemoGuideStore();

  const handleSelectStep = (index: number) => {
    goToStep(index);
    if (!isActive) startTour();
    onClose();
  };

  // Group steps by rough categories (just based on index for simplicity in this demo, 
  // but could be properly categorized via a category field in DemoGuideStep)
  const categories = [
    { title: "เริ่มต้นและการนำทาง", range: [0, 1] },
    { title: "กระบวนการเรียนรู้และกิจกรรม", range: [2, 12] },
    { title: "Gamification และแรงจูงใจ", range: [13, 17] },
    { title: "ข้อมูลและการติดตาม", range: [18, 19] }
  ];

  return (
    <div className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-100"
      >
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">เลือกหัวข้อการนำชม</h2>
            <p className="text-indigo-200 text-sm mt-1">สามารถเลือกหัวข้อที่ต้องการดูแบบเฉพาะเจาะจงได้</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map((cat, catIdx) => (
              <div key={catIdx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 font-bold text-gray-700">
                  {cat.title}
                </div>
                <div className="divide-y divide-gray-100">
                  {DEMO_GUIDE_STEPS.slice(cat.range[0], cat.range[1] + 1).map((step, idx) => {
                    const actualIndex = cat.range[0] + idx;
                    const isCurrent = currentStepIndex === actualIndex;
                    const isPast = actualIndex < currentStepIndex;

                    return (
                      <button
                        key={step.id}
                        onClick={() => handleSelectStep(actualIndex)}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-indigo-50 ${
                          isCurrent ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'border-l-4 border-transparent'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isCurrent ? (
                            <Play size={18} className="text-indigo-600 fill-current" />
                          ) : isPast ? (
                            <CheckCircle2 size={18} className="text-emerald-500" />
                          ) : (
                            <Circle size={18} className="text-gray-300" />
                          )}
                        </div>
                        <div>
                          <div className={`font-medium text-sm ${isCurrent ? 'text-indigo-700' : 'text-gray-700'}`}>
                            {step.title}
                          </div>
                          <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                            {step.whatIsIt}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
