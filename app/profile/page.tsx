'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePiAuth } from '@/components/auth/PiAuthProvider';
import { RequirePiAuth } from '@/components/auth/RequirePiAuth';

export default function ProfilePage() {
  const router = useRouter();
  const { user, status } = usePiAuth();

  useEffect(() => {
    if (status === 'authenticated' && user?.username) {
      router.replace(`/profile/${user.username}`);
    }
  }, [router, status, user]);

  return (
    <RequirePiAuth loadingText="Opening your profile…">
      <div className="page-stack"><section className="card surface-section"><p>Opening your profile…</p></section></div>
    </RequirePiAuth>
  );
}
