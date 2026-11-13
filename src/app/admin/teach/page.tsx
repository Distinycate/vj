'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import GrammarPresentationDeck from '@/components/admin/GrammarPresentationDeck';

export default function AdminTeachPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(true);

  useEffect(() => {
    let active = true;

    async function verifyTeacherSession() {
      try {
        const res = await fetch('/api/auth/me');
        const json = await res.json();
        if (!active) return;

        if (json.authenticated && (json.role === 'ADMIN' || json.role === 'TEACHER')) {
          setAuthorized(true);
        } else {
          router.replace('/admin');
        }
      } catch {
        if (active) router.replace('/admin');
      } finally {
        if (active) setChecking(false);
      }
    }

    verifyTeacherSession();
    return () => {
      active = false;
    };
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">กำลังตรวจสอบสิทธิ์ครูผู้สอน...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 p-2 md:p-4">
      <GrammarPresentationDeck onExit={() => router.push('/admin')} />
    </div>
  );
}

