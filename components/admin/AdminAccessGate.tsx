'use client';

import type { ReactNode } from 'react';
import { PERMISSIONS } from '@/lib/permissions';
import { ProtectedPageGate } from '@/components/auth/ProtectedPageGate';
export function AdminAccessGate({ children }: { children: ReactNode }) {
  return (
    <ProtectedPageGate
      loadingText="Checking your admin access…"
      guestText="Please connect with Pi to continue."
      unauthorizedText="Admin access is required."
      fallbackPath="/account"
      requirePermissions={[PERMISSIONS.adminAccess]}
    >
      {children}
    </ProtectedPageGate>
  );
}
