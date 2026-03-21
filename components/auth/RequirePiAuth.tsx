'use client';

import { useEffect } from 'react';
import { usePiAuth } from '@/components/auth/PiAuthProvider';

type Props = {
  children?: React.ReactNode;
  loadingText?: string;
  guestText?: string;
};

export function RequirePiAuth({
  children,
  loadingText = 'Checking your Pi session…',
  guestText = 'Please open this page from Pi Browser and connect with Pi.',
}: Props) {
  const { status, error, ensureAuthenticated } = usePiAuth();

  useEffect(() => {
    if (status === 'guest') {
      void ensureAuthenticated();
    }
  }, [ensureAuthenticated, status]);

  if (status === 'loading') {
    return <div className="page-stack"><section className="card surface-section"><p>{loadingText}</p></section></div>;
  }

  if (status !== 'authenticated') {
    return <div className="page-stack"><section className="card surface-section"><p>{error || guestText}</p></section></div>;
  }

  return <>{children}</>;
}
