'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Coins } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import { useAppStore } from '@/store/useAppStore';

interface ShopModalProps {
  onClose: () => void;
}

export default function ShopModal({ onClose }: ShopModalProps) {
  const { student, progress, setProgress } = useAppStore();
  const [items, setItems] = useState<Record<string, any>[]>([]);
  const [inventory, setInventory] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchShopData = async () => {
    // Fetch items
    const { data: shopItems } = await supabase.from('items').select('*');
    if (shopItems) setItems(shopItems);

    // Fetch inventory
    const { data: inv } = await supabase.from('student_inventory').select('item_id').eq('student_id', student.id);
    if (inv) {
        setInventory(inv.map(i => i.item_id));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchShopData();
  }, []);

  const handleBuy = async (item: Record<string, any>) => {
    if ((progress?.coins || 0) < item.price) {
      setMessage('เหรียญไม่พอ!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    try {
      // Deduct coins
      const newCoins = (progress?.coins || 0) - item.price;
      const { error: coinError } = await supabase
        .from('learning_paths')
        .update({ coins: newCoins })
        .eq('student_id', student.id);
      if (coinError) throw coinError;
      
      // Add to inventory
      const { error: inventoryError } = await supabase
        .from('student_inventory')
        .insert([{ student_id: student.id, item_id: item.id }]);
      if (inventoryError) {
        await supabase
          .from('learning_paths')
          .update({ coins: progress?.coins || 0 })
          .eq('student_id', student.id);
        throw inventoryError;
      }
      
      // Update coins ledger
      await supabase.from('coins_transactions').insert([{
        student_id: student.id,
        amount: -item.price,
        source: `SHOP_BUY_${item.item_code}`
      }]);

      setProgress({ ...progress, coins: newCoins });
      
      // Update local inventory state
      const newInv = [...inventory, item.id];
      setInventory(newInv);
      setMessage(`ซื้อ ${item.name} สำเร็จ!`);
      setTimeout(() => setMessage(''), 2000);
      
    } catch (err) {
      console.error(err);
      setMessage('ซื้อไอเทมไม่สำเร็จ กรุณาลองใหม่');
      setTimeout(() => setMessage(''), 2500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative"
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-white bg-slate-700/50 hover:bg-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
        >
          <X className="w-4 h-4 text-rose-400" /> กลับหน้าหลัก
        </button>

        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
             ร้านค้าไอเทม
          </h2>
          <div className="mt-2 flex items-center gap-2 bg-slate-900 inline-flex px-4 py-2 rounded-full border border-slate-700">
            <Coins className="w-5 h-5 text-amber-400" />
            <span className="text-white font-bold">{progress?.coins || 0} เหรียญ</span>
          </div>
          {message && <div className="mt-4 text-emerald-400 font-medium">{message}</div>}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center text-slate-400">กำลังโหลด...</div>
          ) : (
            <div className="space-y-4">
              {items.map(item => {
                const isBought = inventory.includes(item.id);
                
                return (
                  <div key={item.id} className="bg-slate-700/30 border border-slate-600 rounded-2xl p-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl bg-slate-800 w-16 h-16 rounded-xl flex items-center justify-center border border-slate-600 shadow-inner">
                        {item.image_url}
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">{item.name}</h3>
                        <p className="text-slate-400 text-sm">ราคา {item.price} เหรียญ</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleBuy(item)}
                      disabled={isBought || (progress?.coins || 0) < item.price}
                      className={`px-6 py-3 rounded-xl font-bold transition-all ${
                        isBought 
                          ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                          : (progress?.coins || 0) < item.price
                            ? 'bg-rose-500/20 text-rose-400 cursor-not-allowed'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                      }`}
                    >
                      {isBought ? 'ขายแล้ว' : 'ซื้อ'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
      </motion.div>
    </div>
  );
}
