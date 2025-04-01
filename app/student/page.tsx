'use client';

import { useSession } from 'next-auth/react';
import DailyXPButton from '@/components/DailyXPButton';

export default function StudentDashboard() {
  const { data: session } = useSession();

  const userId = 'cm8yfqu810000kxxcsw11ecj1';



  return (
    <main className="p-8 space-y-4">
      <h1 className="text-3xl font-bold">🎓 Welcome Student, {session?.user?.name || 'Learner'}!</h1>
      <p className="text-muted-foreground">This is your personalised learning zone.</p>

      {userId ? (
        <DailyXPButton userId={userId} />
      ) : (
        <p className="text-sm text-gray-500">Loading your progress…</p>
      )}
    </main>
  );
}
