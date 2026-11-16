'use client';

import { useRouter } from 'next/navigation';
import GrammarPresentationDeck from '@/components/admin/GrammarPresentationDeck';

export default function AdminTeachPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 p-2 md:p-4">
      <GrammarPresentationDeck onExit={() => router.push('/admin')} />
    </div>
  );
}

