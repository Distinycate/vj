'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Coins } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface ShopModalProps {
  onClose: () => void;
}

export default function ShopModal({ onClose }: ShopModalProps) {
  const { student, progress, setProgress } = useAppStore();
  const [items, setItems] = useState<Record<string, any>[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchShopData = async () => {
    // Fetch items
    const { data: shopItems } = await supabase.from('items').select('*');
    if (shopItems) setItems(shopItems);

    // Fetch inventory
    const { data: inv } = await supabase.from('student_inventory').select('id, item_id, quantity').eq('student_id', student.id);
    if (inv) {
        setInventory(inv);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchShopData();
  }, []);

  const handleBuy = async (item: Record<string, any>) => {
    const price = Number(item.price || 0);
    if ((progress?.coins || 0) < price) {
      setMessage('เหรียญไม่พอ!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    try {
      // Deduct coins
      const newCoins = (progress?.coins || 0) - price;
      const { error: coinError } = await supabase
        .from('learning_paths')
        .update({ coins: newCoins })
        .eq('student_id', student.id);
      if (coinError) throw coinError;
      
      // Add to inventory. If the item already exists, increase quantity instead
      // of inserting a duplicate row.
      const existingInventory = inventory.find((row) => row.item_id === item.id);
      const inventoryMutation = existingInventory
        ? supabase
            .from('student_inventory')
            .update({ quantity: Number(existingInventory.quantity || 0) + 1 })
            .eq('id', existingInventory.id)
        : supabase
            .from('student_inventory')
            .insert([{ student_id: student.id, item_id: item.id, quantity: 1 }]);
      const { error: inventoryError } = await inventoryMutation;
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
        amount: -price,
        source: `SHOP_BUY_${item.item_code}`
      }]);

      setProgress({ ...progress, coins: newCoins });
      
      // Update local inventory state
      setInventory((current) => existingInventory
        ? current.map((row) => row.id === existingInventory.id ? { ...row, quantity: Number(row.quantity || 0) + 1 } : row)
        : [...current, { id: `local-${item.id}`, item_id: item.id, quantity: 1 }]
      );
      setMessage(`ซื้อ ${item.name || item.item_name} สำเร็จ!`);
      setTimeout(() => setMessage(''), 2000);
      
    } catch (err) {
      console.error(err);
      setMessage('ซื้อไอเทมไม่สำเร็จ กรุณาลองใหม่');
      setTimeout(() => setMessage(''), 2500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <Card className="w-full max-w-lg overflow-hidden shadow-2xl relative border-none">
        <Button 
          variant="ghost"
          size="sm"
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-300 flex items-center gap-1"
        >
          <X className="w-4 h-4 text-rose-400" /> กลับหน้าหลัก
        </Button>

        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
             ร้านค้าไอเทม
          </h2>
          <div className="mt-2 flex items-center gap-2 glass-input inline-flex px-4 py-2 rounded-full border-none">
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
                const owned = inventory.find((row) => row.item_id === item.id);
                const ownedQuantity = Number(owned?.quantity || 0);
                const price = Number(item.price || 0);
                
                return (
                  <Card key={item.id} className="p-4 flex justify-between items-center border-none">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl glass-input w-16 h-16 flex items-center justify-center border-none shadow-inner rounded-xl">
                        {item.image_url}
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">{item.name || item.item_name}</h3>
                        <p className="text-slate-400 text-sm">ราคา {price} เหรียญ</p>
                        {ownedQuantity > 0 && <p className="text-xs text-emerald-400 mt-1">มีแล้ว {ownedQuantity} ชิ้น</p>}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => handleBuy(item)}
                      disabled={(progress?.coins || 0) < price}
                    >
                      ซื้อเพิ่ม
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        
      </Card>
    </div>
  );
}
