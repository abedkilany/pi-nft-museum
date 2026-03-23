'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { beginClientTrace, buildObservabilityHeaders, consumeOrCreateTraceId, getClientSessionId } from '@/lib/observability-client';

type EventPayload = Record<string, unknown> & {
  category: string;
  type: string;
  name: string;
  status?: string;
};

function sendEvent(payload: EventPayload, options?: { beginTrace?: boolean }) {
  const sessionId = getClientSessionId();
  const traceId = options?.beginTrace
    ? beginClientTrace(typeof payload.traceId === 'string' ? payload.traceId : null)
    : consumeOrCreateTraceId(typeof payload.traceId === 'string' ? payload.traceId : null);

  const body = JSON.stringify({
    status: 'SUCCESS',
    source: 'CLIENT',
    ...payload,
    sessionId,
    traceId,
    correlationId: traceId,
    url: window.location.href,
    route: window.location.pathname,
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon('/api/events', blob);
    return;
  }

  void fetch('/api/events', {
    method: 'POST',
    headers: buildObservabilityHeaders({ 'Content-Type': 'application/json' }, traceId),
    body,
    keepalive: true,
    cache: 'no-store'
  }).catch(() => null);
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

function buildClickPayload(target: HTMLElement): EventPayload | null {
  const clickable = target.closest('button, a, img, [role="button"], [data-track-event]') as HTMLElement | null;
  if (!clickable) return null;

  const explicit = clickable.getAttribute('data-track-event');
  const href = clickable instanceof HTMLAnchorElement ? clickable.href : clickable.getAttribute('href');
  const src = clickable instanceof HTMLImageElement ? clickable.currentSrc || clickable.src : clickable.getAttribute('src');
  const entityType = clickable.getAttribute('data-entity-type');
  const entityId = clickable.getAttribute('data-entity-id');

  return {
    category: 'USER_ACTION',
    type: explicit ? 'CUSTOM_CLICK' : clickable.tagName === 'IMG' ? 'IMAGE_CLICK' : 'CLICK',
    name: explicit || (clickable.tagName === 'IMG' ? 'IMAGE_CLICKED' : clickable.tagName === 'A' ? 'LINK_CLICKED' : 'BUTTON_CLICKED'),
    feature: clickable.getAttribute('data-feature') || null,
    entityType,
    entityId,
    message: getElementLabel(clickable),
    data: {
      tagName: clickable.tagName,
      label: getElementLabel(clickable),
      href: href || null,
      src: src || null,
      id: clickable.id || null,
      classes: clickable.className || null,
      text: clickable.textContent?.trim()?.slice(0, 160) || null
    }
  };
}

export function AppEventClient() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPageViewKey = useRef('');

  useEffect(() => {
    const query = searchParams?.toString() || '';
    const key = `${pathname}?${query}`;
    if (lastPageViewKey.current === key) return;
    lastPageViewKey.current = key;

    sendEvent({
      category: 'USER_ACTION',
      type: 'PAGE_VIEW',
      name: 'PAGE_VIEWED',
      feature: 'navigation',
      message: document.title,
      data: {
        title: document.title,
        referrer: document.referrer || null,
        query: query || null
      }
    });
  }, [pathname, searchParams]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const payload = buildClickPayload(target);
      if (!payload) return;
      sendEvent(payload, { beginTrace: true });
    };

    const onSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null;
      if (!form) return;
      sendEvent({
        category: 'USER_ACTION',
        type: 'FORM_SUBMIT',
        name: 'FORM_SUBMITTED',
        feature: form.getAttribute('data-feature') || 'form',
        message: form.getAttribute('name') || form.id || window.location.pathname,
        data: {
          action: form.action || null,
          id: form.id || null,
          method: form.method || null,
          classes: form.className || null
        }
      }, { beginTrace: true });
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, []);

  return null;
}
