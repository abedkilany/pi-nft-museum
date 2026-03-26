'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  const { user, status, error, refreshUser } = usePiAuth();

  const attemptedRef = useRef(false);
  const mountedRef = useRef(true);

  const [restoring, setRestoring] = useState(false);
  const [restoreSettled, setRestoreSettled] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
    // عند نجاح المصادقة نعيد ضبط حالة الاستعادة
    if (status === 'authenticated') {
      attemptedRef.current = false;
      if (mountedRef.current) {
        setRestoring(false);
        setRestoreSettled(true);
      }
      return;
    }

    // إذا كانت الحالة loading من المزود نفسه، لا نفعل شيئًا وننتظر
    if (status === 'loading') {
      return;
    }

    // إذا كان المستخدم guest ونحتاج مصادقة، نحاول الاستعادة مرة واحدة
    if (status === 'guest' && requireAuth && autoAuthenticate && !attemptedRef.current) {
      attemptedRef.current = true;
      if (mountedRef.current) {
        setRestoring(true);
      }

      void refreshUser()
        .catch(() => null)
        .finally(() => {
          if (!mountedRef.current) return;
          setRestoring(false);
          setRestoreSettled(true);
        });

      return;
    }

    // إذا لم نكن بحاجة لمحاولة صامتة، نعتبر الحالة settled
    if (mountedRef.current) {
      setRestoreSettled(true);
      setRestoring(false);
    }
  }, [autoAuthenticate, refreshUser, requireAuth, status]);

  useEffect(() => {
    // لا تعمل redirect قبل اكتمال التحقق
    if (!restoreSettled) return;
    if (status === 'loading' || restoring) return;

    // مستخدم مسجل لكن بلا صلاحية
    if (status === 'authenticated' && !isAuthorized && fallbackPath) {
      router.replace(fallbackPath);
    }
  }, [fallbackPath, isAuthorized, restoring, router, status, restoreSettled]);

  const shouldShowLoading =
    status === 'loading' ||
    restoring ||
    (requireAuth && autoAuthenticate && status === 'guest' && !restoreSettled);

  if (shouldShowLoading) {
    return (
      <div className="page-stack">
        <section className="card surface-section">
          <p>{loadingText}</p>
        </section>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return (
      <div className="page-stack">
        <section className="card surface-section">
          <p>{error || guestText}</p>
        </section>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="page-stack">
        <section className="card surface-section">
          <p>{unauthorizedText}</p>
        </section>
      </div>
    );
  }

  return <>{children}</>;
}