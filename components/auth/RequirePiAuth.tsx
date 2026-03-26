'use client';

import type { ReactNode } from 'react';
import { ProtectedPageGate } from '@/components/auth/ProtectedPageGate';
type Props = {
  children?: ReactNode;
  loadingText?: string;
  guestText?: string;
};
export function RequirePiAuth({
  children,
  loadingText = 'Checking your Pi session…',
  guestText = 'Please open this page from Pi Browser and connect with Pi.',
}: Props) {
  return (
    <ProtectedPageGate
      loadingText={loadingText}
      guestText={guestText}
      unauthorizedText={guestText}
      fallbackPath={null}
      autoAuthenticate
    >
      {children}
    </ProtectedPageGate>
  );
}
