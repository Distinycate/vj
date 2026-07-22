import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Star } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface MissionSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (level: number) => void;
}

export default function MissionSelectionModal({ isOpen, onClose, onSelect }: MissionSelectionModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-slate-900 border border-slate-700/50 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 pointer-events-none" />
            <h2 className="text-2xl font-black text-white flex items-center gap-2 relative z-10">
              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              เลือกระดับภารกิจ
            </h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-full transition-colors relative z-10 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
            
            {/* Level 1: Basic */}
            <button 
              onClick={() => onSelect(1)}
              className="w-full text-left bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 p-5 rounded-2xl transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/10 group-hover:to-transparent transition-all" />
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">Basic Clear</h3>
                  <p className="text-sm text-slate-400">โหมดปกติ เน้นความหมายและคำศัพท์พื้นฐาน</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 text-emerald-400 ml-1" />
                </div>
              </div>
            </button>

            {/* Level 2: Listening */}
            <button 
              onClick={() => onSelect(2)}
              className="w-full text-left bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 p-5 rounded-2xl transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:to-transparent transition-all" />
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">Listening Clear</h3>
                  <p className="text-sm text-slate-400">เน้นทักษะการฟัง รับโบนัส Coins +30%</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 text-blue-400 ml-1" />
                </div>
              </div>
            </button>

            {/* Level 3: Master */}
            <button 
              onClick={() => onSelect(3)}
              className="w-full text-left bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/50 p-5 rounded-2xl transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/0 to-purple-500/0 group-hover:from-purple-500/10 group-hover:to-transparent transition-all" />
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">Master Clear</h3>
                  <p className="text-sm text-slate-400">เน้นการพิมพ์และประโยค รับโบนัส Coins +50%</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 text-purple-400 ml-1" />
                </div>
              </div>
            </button>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
