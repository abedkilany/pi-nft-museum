'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usePiAuth } from '@/components/auth/PiAuthProvider';

type ProtectedPageGateProps = {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredPermissions?: string[];
  fallbackPath?: string;
  loadingText?: string;
  unauthorizedText?: string;
};

function normalizeAuthStatus(auth: any): 'loading' | 'authenticated' | 'unauthenticated' {
  if (
    auth?.authStatus === 'loading' ||
    auth?.status === 'loading' ||
    auth?.isLoading === true ||
    auth?.loading === true ||
    auth?.initializing === true ||
    auth?.isInitializing === true ||
    auth?.isRestoringSession === true
  ) {
    return 'loading';
  }

  if (
    auth?.authStatus === 'authenticated' ||
    auth?.status === 'authenticated' ||
    auth?.isAuthenticated === true ||
    !!auth?.user
  ) {
    return 'authenticated';
  }

  return 'unauthenticated';
}

function hasAllPermissions(auth: any, requiredPermissions: string[]): boolean {
  if (!requiredPermissions.length) return true;

  if (typeof auth?.hasPermission === 'function') {
    return requiredPermissions.every((permission) => auth.hasPermission(permission));
  }

  const userPermissions = Array.isArray(auth?.user?.permissions) ? auth.user.permissions : [];
  return requiredPermissions.every((permission) => userPermissions.includes(permission));
}

export default function ProtectedPageGate({
  children,
  requireAuth = true,
  requiredPermissions = [],
  fallbackPath = '/login',
  loadingText = 'جاري التحقق من الجلسة...',
  unauthorizedText = 'ليس لديك صلاحية للوصول إلى هذه الصفحة.',
}: ProtectedPageGateProps) {
  const auth = usePiAuth() as any;
  const router = useRouter();
  const pathname = usePathname();

  const [hasAttemptedSilentRestore, setHasAttemptedSilentRestore] = useState(false);
  const [hasSettledAtLeastOnce, setHasSettledAtLeastOnce] = useState(false);
  const redirectTriggeredRef = useRef(false);

  const authStatus = useMemo(() => normalizeAuthStatus(auth), [auth]);
  const isAuthenticated = authStatus === 'authenticated';
  const isLoading = authStatus === 'loading';

  const canAccess = useMemo(() => {
    if (!requireAuth) return true;
    if (!isAuthenticated) return false;
    return hasAllPermissions(auth, requiredPermissions);
  }, [requireAuth, isAuthenticated, auth, requiredPermissions]);

  useEffect(() => {
    if (!isLoading) {
      setHasSettledAtLeastOnce(true);
    }
  }, [isLoading]);

  useEffect(() => {
    if (hasAttemptedSilentRestore) return;
    if (authStatus !== 'loading') return;

    const tryRestore = async () => {
      try {
        if (typeof auth?.restoreSessionSilently === 'function') {
          await auth.restoreSessionSilently();
          return;
        }

        if (typeof auth?.restoreSession === 'function') {
          await auth.restoreSession();
          return;
        }

        if (typeof auth?.refreshSession === 'function') {
          await auth.refreshSession();
          return;
        }

        if (typeof auth?.refreshAuth === 'function') {
          await auth.refreshAuth();
          return;
        }

        if (typeof auth?.bootstrapAuth === 'function') {
          await auth.bootstrapAuth();
          return;
        }

        if (typeof auth?.initializeAuth === 'function') {
          await auth.initializeAuth();
          return;
        }

        if (typeof auth?.checkAuth === 'function') {
          await auth.checkAuth();
          return;
        }
      } catch {
        // نتعمد تجاهل الخطأ هنا حتى لا نكسر تجربة الصفحة.
      } finally {
        setHasAttemptedSilentRestore(true);
      }
    };

    void tryRestore();
  }, [auth, authStatus, hasAttemptedSilentRestore]);

  useEffect(() => {
    if (redirectTriggeredRef.current) return;
    if (!requireAuth) return;

    // لا تعمل redirect أثناء loading أو قبل أن تستقر حالة المصادقة مرة واحدة على الأقل
    if (isLoading || !hasSettledAtLeastOnce) return;

    // إذا لم يكن المستخدم مسجلًا بعد اكتمال التحقق
    if (!isAuthenticated) {
      redirectTriggeredRef.current = true;
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`${fallbackPath}${next}`);
      return;
    }

    // إذا كان مسجلًا لكن لا يملك الصلاحية المطلوبة
    if (!canAccess) {
      redirectTriggeredRef.current = true;
      router.replace('/');
    }
  }, [
    requireAuth,
    isLoading,
    hasSettledAtLeastOnce,
    isAuthenticated,
    canAccess,
    fallbackPath,
    pathname,
    router,
  ]);

  // حالة الانتظار: لا نحكم مبكرًا على المستخدم أنه guest
  if (requireAuth && (!hasSettledAtLeastOnce || isLoading)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4 text-center">
        <div className="space-y-3">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <p className="text-sm opacity-80">{loadingText}</p>
        </div>
      </div>
    );
  }

  // بعد اكتمال التحقق: غير مسجل
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  // بعد اكتمال التحقق: مسجل لكن بلا صلاحية
  if (!canAccess) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4 text-center">
        <div className="space-y-3">
          <p className="text-sm opacity-80">{unauthorizedText}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}