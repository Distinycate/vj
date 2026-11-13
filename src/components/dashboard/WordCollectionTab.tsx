'use client';
import { motion } from 'framer-motion';
import { BookMarked } from 'lucide-react';

interface WordCollectionTabProps {
  collectionLoading: boolean;
  wordCollection: any[];
}

export default function WordCollectionTab({
  collectionLoading,
  wordCollection,
}: WordCollectionTabProps) {
  return (
    <motion.div 
      key="collection" 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 text-left"
    >
      <div className="glass-card p-6 sm:p-8 rounded-3xl">
        <div className="flex items-center gap-3 mb-6">
          <BookMarked className="w-8 h-8 text-indigo-400" />
          <div>
            <h3 className="text-2xl font-black text-white">สมุดคำศัพท์สะสม (Word Collection Deck)</h3>
            <p className="text-slate-400 text-sm mt-0.5">ดัชนีรวมคำศัพท์ทั้งหมดที่คุณเคยพบพร้อมสถานะระดับความเชี่ยวชาญสมบูรณ์</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {collectionLoading ? (
            <div className="col-span-full text-center py-12 text-slate-400">
              <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">กำลังโหลดสมุดคำศัพท์สะสม...</p>
            </div>
          ) : wordCollection.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-500 italic text-sm">
              คุณยังไม่มีคำศัพท์ในสมุดสะสม เริ่มต้นลุยด่านผจญภัยเพื่อเปิดพจนานุกรมคำแรกกันเลย!
            </div>
          ) : (
            wordCollection.map((item) => {
              const word = item.vocabulary;
              if (!word) return null;
              const stars = Array.from({ length: 4 }).map((_, i) => i < item.mastery_level ? '⭐' : '☆').join('');
              
              return (
                <div key={item.id} className="bg-slate-950/60 border border-slate-900/60 p-4 rounded-xl flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-black text-white uppercase notranslate" translate="no">{word.word}</h4>
                      <span className="text-[9px] px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-md font-mono">{word.difficulty_level || 'normal'}</span>
                    </div>
                    <p className="text-xs text-slate-400 font-bold mt-1 text-emerald-400">{word.meaning}</p>
                    <p className="text-xs text-slate-500 italic font-mono truncate max-w-[200px]">"{word.example_sentence || word.example || ''}"</p>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <span className="text-xs block text-slate-500 font-bold mb-1">ความจำ</span>
                    <span className="text-xs font-mono">{stars}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
}
