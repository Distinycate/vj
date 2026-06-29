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
    <div className="bg-rose-500/90 text-white text-sm font-bold text-center py-2 px-4 flex items-center justify-center gap-2 border-b border-rose-600 fixed top-0 left-0 right-0 z-50 animate-pulse">
      <WifiOff className="w-4 h-4" />
      <span>คุณกำลังใช้งานแบบออฟไลน์ (ระบบจะจัดเก็บผลลัพธ์ไว้ และซิงค์ข้อมูลเมื่อเชื่อมต่อเน็ตอีกครั้ง)</span>
    </div>
  );
}
