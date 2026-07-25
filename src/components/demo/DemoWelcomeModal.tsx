'use client';
import React, { useEffect } from 'react';
import { useDemoGuideStore } from '@/store/useDemoGuideStore';
import { useDemoStore } from '@/store/useDemoStore';
import { Play, List, BookOpen, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DemoWelcomeModal() {
  const { isDemoMode } = useDemoStore();
  const { hasSeenWelcome, setHasSeenWelcome, startTour, goToStep } = useDemoGuideStore();

  if (!isDemoMode || hasSeenWelcome) return null;

  const handleStartFullTour = () => {
    setHasSeenWelcome(true);
    goToStep(0);
    startTour();
  };

  const handleSelfExplore = () => {
    setHasSeenWelcome(true);
    // Don't start tour, just close modal
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
      >
        <div className="relative h-32 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
          <h2 className="text-3xl font-bold text-white relative z-10 flex items-center gap-3">
            <span className="text-4xl">👑</span> ยินดีต้อนรับสู่โหมดกรรมการ (Demo)
          </h2>
          <button 
            onClick={handleSelfExplore}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors z-20"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-8">
          <p className="text-lg text-gray-700 leading-relaxed mb-6 font-medium">
            โหมดนี้จัดทำขึ้นเพื่อให้กรรมการทดลองระบบได้ครบทุกส่วน ท่านสามารถเปิดทุกด่าน ข้ามขั้นตอน จำลองผล และทดลองฟังก์ชันต่าง ๆ ได้ <strong className="text-indigo-600">โดยข้อมูลในโหมดนี้จะไม่ถูกบันทึกและไม่กระทบข้อมูลของนักเรียนจริง</strong>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={handleStartFullTour}
              className="group relative overflow-hidden bg-indigo-50 border-2 border-indigo-200 hover:border-indigo-500 rounded-xl p-5 text-left transition-all hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Play size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-indigo-900 text-lg">เริ่มนำชมระบบทั้งหมด</h3>
                  <p className="text-sm text-indigo-700/80 mt-1">เริ่มการนำชมตั้งแต่ Pre-test จนถึง Teacher Dashboard ช่วยให้เข้าใจระบบตามลำดับกระบวนการเรียนรู้</p>
                </div>
              </div>
            </button>

            <button 
              onClick={handleSelfExplore}
              className="group relative overflow-hidden bg-gray-50 border-2 border-gray-200 hover:border-gray-400 rounded-xl p-5 text-left transition-all hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="bg-gray-200 p-2 rounded-lg text-gray-600 group-hover:bg-gray-600 group-hover:text-white transition-colors">
                  <List size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">เลือกดูด้วยตนเอง</h3>
                  <p className="text-sm text-gray-600 mt-1">เข้าสู่ Demo Center และเลือกทดลองเฉพาะระบบที่สนใจ เหมาะสำหรับเมื่อมีเวลาจำกัด</p>
                </div>
              </div>
            </button>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              ท่านสามารถเรียกดูคำแนะนำได้ตลอดเวลา โดยกดปุ่ม <strong className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded">? แนะนำการใช้งาน</strong> ที่แถบด้านบน
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
