'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { withAdminGrant } from '@/lib/admin-url';

function shouldPreserveLink(href: string) {
  return href.startsWith('/admin') || href.startsWith('/api/admin');
}

export function AdminGrantPropagator() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const adminGrant = searchParams.get('admin_grant');

  useEffect(() => {
    if (!adminGrant) return;

    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'));
    for (const anchor of anchors) {
      const href = anchor.getAttribute('href');
      if (!href || !shouldPreserveLink(href)) continue;
      const nextHref = withAdminGrant(href, adminGrant);
      if (nextHref !== href) {
        anchor.setAttribute('href', nextHref);
      }
    }

    const forms = Array.from(document.querySelectorAll<HTMLFormElement>('form[action]'));
    for (const form of forms) {
      const action = form.getAttribute('action');
      if (!action || !action.startsWith('/api/admin')) continue;
      const nextAction = withAdminGrant(action, adminGrant);
      if (nextAction !== action) {
        form.setAttribute('action', nextAction);
      }
    }
  }, [adminGrant, pathname, searchParams]);

  return null;
}
