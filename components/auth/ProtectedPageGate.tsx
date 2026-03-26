'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { usePiAuth } from '@/components/auth/PiAuthProvider';

type ProtectedPageGateProps = {
  children?: ReactNode;
  requireAuth?: boolean;
  requireRoles?: string[];
  requirePermissions?: string[];
  loadingText?: string;
  guestText?: string;
  unauthorizedText?: string;
  fallbackPath?: string | null;
  autoAuthenticate?: boolean;
};

export function ProtectedPageGate({
  children,
  requireAuth = true,
  requireRoles,
  requirePermissions,
  loadingText = 'Checking your session…',
  guestText = 'Please connect with Pi to continue.',
  unauthorizedText = 'You do not have permission to open this page.',
  fallbackPath = '/account',
  autoAuthenticate = true,
}: ProtectedPageGateProps) {
  const router = useRouter();
  const { user, status, error, ensureAuthenticated } = usePiAuth();

  const hasRequiredRole = useMemo(() => {
    if (!requireRoles?.length) return true;
    return Boolean(user?.role && requireRoles.includes(user.role));
  }, [requireRoles, user?.role]);

  const hasRequiredPermissions = useMemo(() => {
    if (!requirePermissions?.length) return true;
    const currentPermissions = new Set(user?.permissions || []);
    return requirePermissions.every((permission) => currentPermissions.has(permission));
  }, [requirePermissions, user?.permissions]);

  const isAuthenticated = status === 'authenticated';
  const isAuthorized = isAuthenticated && hasRequiredRole && hasRequiredPermissions;

  useEffect(() => {
    if (status === 'guest' && requireAuth && autoAuthenticate) {
      void ensureAuthenticated();
      return;
    }

    if (status === 'authenticated' && !isAuthorized && fallbackPath) {
      router.replace(fallbackPath);
    }
  }, [autoAuthenticate, ensureAuthenticated, fallbackPath, isAuthorized, requireAuth, router, status]);

  if (status === 'loading') {
    return <div className="page-stack"><section className="card surface-section"><p>{loadingText}</p></section></div>;
  }

  if (requireAuth && !isAuthenticated) {
    return <div className="page-stack"><section className="card surface-section"><p>{error || guestText}</p></section></div>;
  }

  if (!isAuthorized) {
    return <div className="page-stack"><section className="card surface-section"><p>{unauthorizedText}</p></section></div>;
  }

  return <>{children}</>;
}
