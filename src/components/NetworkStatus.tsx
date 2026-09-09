'use client';
import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-rose-500/80 backdrop-blur-xl border border-rose-400/30 text-white text-sm font-bold py-2 px-5 rounded-full flex items-center gap-2 shadow-[0_8px_32px_rgba(244,63,94,0.4)] animate-bounce">
      <WifiOff className="w-4 h-4" />
      <span>คุณกำลังออฟไลน์ (หน้าต่างที่โหลดไว้ยังดูได้)</span>
    </div>
  );
}
