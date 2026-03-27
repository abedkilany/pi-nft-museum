'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { consumeOrCreateTraceId, sendClientAppEvent } from '@/lib/observability-client';

type EventPayload = Record<string, unknown> & {
  category: string;
  type: string;
  name: string;
  status?: string;
};

const isProduction = process.env.NODE_ENV === 'production';
const IMPORTANT_BUTTON_WORDS = [
  'connect', 'login', 'log in', 'logout', 'sign out', 'upload', 'submit', 'save', 'delete',
  'remove', 'edit', 'update', 'mint', 'pay', 'approve', 'report', 'follow', 'unfollow',
  'comment', 'reply', 'like', 'dislike', 'notifications', 'admin', 'review', 'publish'
];
const IMPORTANT_ROUTE_PREFIXES = ['/', '/gallery', '/artwork', '/artist', '/account', '/admin', '/upload', '/community', '/profile', '/review', '/notifications', '/premium'];

function normalizeText(value: string | null | undefined) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function isImportantRoute(route: string | null | undefined) {
  if (!route) return false;
  return IMPORTANT_ROUTE_PREFIXES.some((prefix) => route === prefix || route.startsWith(`${prefix}/`));
}

function inferFeatureFromRoute(route: string | null | undefined) {
  if (!route) return 'general';
  if (route.startsWith('/admin')) return 'admin';
  if (route.startsWith('/account')) return 'account';
  if (route.startsWith('/upload')) return 'uploads';
  if (route.startsWith('/artwork')) return 'artwork';
  if (route.startsWith('/community')) return 'community';
  if (route.startsWith('/profile')) return 'profile';
  if (route.startsWith('/review')) return 'review';
  if (route.startsWith('/notifications')) return 'notifications';
  if (route === '/' || route.startsWith('/gallery')) return 'navigation';
  return 'general';
}

function getElementLabel(element: HTMLElement) {
  return (
    element.getAttribute('data-track-label') ||
    element.getAttribute('aria-label') ||
    element.getAttribute('title') ||
    element.textContent?.trim()?.slice(0, 120) ||
    element.getAttribute('alt') ||
    element.id ||
    element.className ||
    element.tagName.toLowerCase()
  );
}

function hasImportantText(value: string | null | undefined) {
  const text = normalizeText(value);
  return IMPORTANT_BUTTON_WORDS.some((word) => text.includes(word));
}

function inferFeature(target: HTMLElement, route: string) {
  return target.getAttribute('data-feature') || inferFeatureFromRoute(route);
}

function shouldTrackClick(clickable: HTMLElement, route: string) {
  if (clickable.hasAttribute('data-track-event')) return true;
  const feature = inferFeature(clickable, route);
  if (feature !== 'general') return true;

  const href = clickable instanceof HTMLAnchorElement ? clickable.getAttribute('href') : clickable.getAttribute('href');
  const label = getElementLabel(clickable);
  if (href && (href.startsWith('/admin') || href.startsWith('/account') || href.startsWith('/upload') || href.startsWith('/artwork') || href.startsWith('/community') || href.startsWith('/profile') || href.startsWith('/review') || href.startsWith('/notifications'))) {
    return true;
  }

  return hasImportantText(label) || isImportantRoute(route);
}

function buildClickPayload(target: HTMLElement, route: string): EventPayload | null {
  const clickable = target.closest('button, a, img, [role="button"], [data-track-event]') as HTMLElement | null;
  if (!clickable) return null;
  if (isProduction && !shouldTrackClick(clickable, route)) return null;

  const explicit = clickable.getAttribute('data-track-event');
  const href = clickable instanceof HTMLAnchorElement ? clickable.href : clickable.getAttribute('href');
  const src = clickable instanceof HTMLImageElement ? clickable.currentSrc || clickable.src : clickable.getAttribute('src');
  const entityType = clickable.getAttribute('data-entity-type');
  const entityId = clickable.getAttribute('data-entity-id');
  const feature = inferFeature(clickable, route);
  const label = getElementLabel(clickable);

  return {
    category: 'USER_ACTION',
    type: explicit ? 'CUSTOM_CLICK' : clickable.tagName === 'IMG' ? 'IMAGE_CLICK' : 'CLICK',
    name: explicit || (clickable.tagName === 'IMG' ? 'IMAGE_CLICKED' : clickable.tagName === 'A' ? 'LINK_CLICKED' : 'BUTTON_CLICKED'),
    feature,
    entityType,
    entityId,
    message: label,
    data: {
      tagName: clickable.tagName,
      label,
      href: href || null,
      src: src || null,
      id: clickable.id || null,
      classes: clickable.className || null,
      text: clickable.textContent?.trim()?.slice(0, 160) || null
    }
  };
}

function buildFormPayload(form: HTMLFormElement, route: string): EventPayload | null {
  const feature = form.getAttribute('data-feature') || inferFeatureFromRoute(route);
  if (isProduction && feature === 'general' && !isImportantRoute(route)) return null;

  return {
    category: 'USER_ACTION',
    type: 'FORM_SUBMIT',
    name: 'FORM_SUBMITTED',
    feature,
    message: form.getAttribute('name') || form.id || route,
    data: {
      action: form.action || null,
      id: form.id || null,
      method: form.method || null,
      classes: form.className || null,
      fieldCount: form.querySelectorAll('input, select, textarea').length
    }
  };
}

export function AppEventClient() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const route = pathname || '/';
  const fullRoute = useMemo(() => {
    const query = searchParams?.toString();
    return query ? `${route}?${query}` : route;
  }, [route, searchParams]);
  const previousRouteRef = useRef<string | null>(null);

  useEffect(() => {
    const traceId = consumeOrCreateTraceId();
    sendClientAppEvent({
      category: 'NAVIGATION',
      type: 'PAGE_VIEW',
      name: 'PAGE_VIEWED',
      feature: inferFeatureFromRoute(route),
      message: `Viewed ${route}`,
      route,
      data: {
        previousRoute: previousRouteRef.current,
        query: searchParams?.toString() || null,
        referrer: typeof document !== 'undefined' ? document.referrer || null : null,
      }
    }, { beginTrace: false, keepalive: true });

    if (previousRouteRef.current && previousRouteRef.current !== fullRoute) {
      sendClientAppEvent({
        category: 'NAVIGATION',
        type: 'ROUTE_CHANGE',
        name: 'NAVIGATION_COMPLETED',
        feature: inferFeatureFromRoute(route),
        message: `Navigated to ${route}`,
        route,
        traceId,
        data: {
          from: previousRouteRef.current,
          to: fullRoute,
          query: searchParams?.toString() || null,
        }
      }, { keepalive: true });
    }

    previousRouteRef.current = fullRoute;
  }, [fullRoute, route, searchParams]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const payload = buildClickPayload(target, route);
      if (!payload) return;
      sendClientAppEvent(payload, { beginTrace: true, keepalive: true });
    };

    const onSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null;
      if (!form) return;
      const payload = buildFormPayload(form, route);
      if (!payload) return;
      sendClientAppEvent(payload, { beginTrace: true, keepalive: true });
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, [route]);

  return null;
}
