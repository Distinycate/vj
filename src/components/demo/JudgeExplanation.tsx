'use client';

import { useDemoStore } from '@/store/useDemoStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';

interface JudgeExplanationProps {
  id: string;
  title: string;
  description: string;
  benefit: string;
  observe: string;
  type?: 'intro' | 'tooltip' | 'panel';
}

export default function JudgeExplanation({ id, title, description, benefit, observe, type = 'panel' }: JudgeExplanationProps) {
  const { isDemoMode, showExplanations } = useDemoStore();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isDemoMode || !showExplanations || isDismissed) return null;

  if (type === 'panel') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-purple-900/40 border border-purple-500/30 rounded-2xl p-5 mb-6 shadow-lg relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
        <button 
          onClick={() => setIsDismissed(true)}
          className="absolute top-4 right-4 text-purple-300 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <Info className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-purple-300">{title}</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
            <strong className="text-slate-300 block mb-1">ส่วนนี้คืออะไร:</strong>
            <p className="text-slate-400">{description}</p>
          </div>
          <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
            <strong className="text-emerald-400 block mb-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> ประโยชน์:</strong>
            <p className="text-slate-400">{benefit}</p>
          </div>
          <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
            <strong className="text-amber-400 block mb-1 flex items-center gap-1"><ChevronRight className="w-3 h-3"/> จุดสังเกต:</strong>
            <p className="text-slate-400">{observe}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Fallback for tooltip (could be expanded)
  return null;
}
