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

const isProduction = process.env.NODE_ENV === 'production';
const FETCH_PATCH_FLAG = '__appEventFetchPatched';
const SKIP_URL_PARTS = ['/api/events', '/api/client-errors', '/api/auth/pi/debug'];

function normalizeUrl(input: string | URL) {
  try {
    return typeof input === 'string' ? new URL(input, window.location.origin) : new URL(input.toString(), window.location.origin);
  } catch {
    return null;
  }
}

function shouldSkipInstrumentation(url: string | URL) {
  const normalized = normalizeUrl(url);
  const value = normalized?.pathname || String(url || '');
  return SKIP_URL_PARTS.some((part) => value.includes(part));
}

function sanitizeData(data: Record<string, unknown> | undefined) {
  if (!data) return undefined;
  const clone: Record<string, unknown> = { ...data };
  for (const key of ['value', 'text', 'html', 'body', 'authorization', 'token', 'refreshToken', 'sessionToken', 'cookie']) {
    if (key in clone) clone[key] = '[redacted]';
  }
  return clone;
}

function sendEvent(payload: EventPayload, options?: { beginTrace?: boolean }) {
  if (typeof window === 'undefined') return;

  const sessionId = getClientSessionId();
  const traceId = options?.beginTrace
    ? beginClientTrace(typeof payload.traceId === 'string' ? payload.traceId : null)
    : consumeOrCreateTraceId(typeof payload.traceId === 'string' ? payload.traceId : null);

  const body = JSON.stringify({
    status: 'SUCCESS',
    source: 'CLIENT',
    ...payload,
    data: sanitizeData(payload.data as Record<string, unknown> | undefined),
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
    element.getAttribute('name') ||
    element.id ||
    element.className ||
    element.tagName.toLowerCase()
  );
}

function getFeature(target: HTMLElement | null) {
  return target?.closest('[data-feature]')?.getAttribute('data-feature') || null;
}

function buildClickPayload(target: HTMLElement): EventPayload | null {
  const clickable = target.closest('button, a, img, [role="button"], [data-track-event]') as HTMLElement | null;
  if (!clickable) return null;

  const explicit = clickable.getAttribute('data-track-event');
  const href = clickable instanceof HTMLAnchorElement ? clickable.href : clickable.getAttribute('href');
  const src = clickable instanceof HTMLImageElement ? clickable.currentSrc || clickable.src : clickable.getAttribute('src');
  const entityType = clickable.getAttribute('data-entity-type');
  const entityId = clickable.getAttribute('data-entity-id');
  const feature = clickable.getAttribute('data-feature') || getFeature(clickable);

  if (isProduction && !explicit && !entityType && !entityId && !feature) {
    return null;
  }

  return {
    category: 'USER_ACTION',
    type: explicit ? 'CUSTOM_CLICK' : clickable.tagName === 'IMG' ? 'IMAGE_CLICK' : 'CLICK',
    name: explicit || (clickable.tagName === 'IMG' ? 'IMAGE_CLICKED' : clickable.tagName === 'A' ? 'LINK_CLICKED' : 'BUTTON_CLICKED'),
    feature: feature || null,
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

function buildChangePayload(target: HTMLElement): EventPayload | null {
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
    return null;
  }

  const type = target instanceof HTMLInputElement ? target.type : target.tagName.toLowerCase();
  const safeValue = ['checkbox', 'radio'].includes(type)
    ? target instanceof HTMLInputElement
      ? String(target.checked)
      : null
    : target instanceof HTMLSelectElement
      ? target.value?.slice(0, 120) || null
      : '[redacted]';

  return {
    category: 'USER_ACTION',
    type: 'CHANGE',
    name: 'FIELD_CHANGED',
    feature: target.getAttribute('data-feature') || getFeature(target),
    entityType: 'field',
    entityId: target.name || target.id || null,
    message: `${target.tagName.toLowerCase()} changed`,
    data: {
      fieldName: target.name || null,
      fieldId: target.id || null,
      inputType: type,
      valuePreview: safeValue,
      classes: target.className || null,
    }
  };
}

function buildNavigationPayload(pathname: string, search: string) {
  return {
    category: 'NAVIGATION',
    type: 'ROUTE',
    name: 'ROUTE_VIEWED',
    feature: pathname.startsWith('/admin') ? 'admin' : 'navigation',
    message: pathname,
    data: {
      pathname,
      search: search || null,
      referrer: typeof document !== 'undefined' ? document.referrer || null : null,
    },
  } satisfies EventPayload;
}

function patchClientFetch() {
  if (typeof window === 'undefined') return;
  const globalWindow = window as typeof window & { [FETCH_PATCH_FLAG]?: boolean; __appEventOriginalFetch?: typeof fetch };
  if (globalWindow[FETCH_PATCH_FLAG]) return;
  globalWindow[FETCH_PATCH_FLAG] = true;

  const originalFetch = window.fetch.bind(window);
  globalWindow.__appEventOriginalFetch = originalFetch;

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlValue = input instanceof Request ? input.url : String(input);
    if (shouldSkipInstrumentation(urlValue)) {
      return originalFetch(input, init);
    }

    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const method = input instanceof Request ? input.method : init?.method || 'GET';
    const traceId = beginClientTrace();
    const normalized = normalizeUrl(urlValue);
    const pathname = normalized?.pathname || urlValue;

    sendEvent({
      category: 'SYSTEM_FLOW',
      type: 'FETCH',
      name: 'CLIENT_FETCH_START',
      status: 'STARTED',
      feature: pathname.startsWith('/api/auth') ? 'auth' : pathname.startsWith('/api/admin') ? 'admin' : 'network',
      message: `${method} ${pathname}`,
      method,
      data: {
        requestUrl: pathname,
        requestMethod: method,
      },
      traceId,
    });

    try {
      const response = await originalFetch(input, init);
      const durationMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt);
      const ok = response.ok;
      sendEvent({
        category: 'SYSTEM_FLOW',
        type: 'FETCH',
        name: ok ? 'CLIENT_FETCH_SUCCESS' : 'CLIENT_FETCH_NON_SUCCESS',
        status: ok ? 'SUCCESS' : 'WARNING',
        severity: ok ? 'LOW' : response.status >= 500 ? 'HIGH' : 'MEDIUM',
        isHealthy: ok,
        feature: pathname.startsWith('/api/auth') ? 'auth' : pathname.startsWith('/api/admin') ? 'admin' : 'network',
        message: `Fetch returned ${response.status} for ${pathname}`,
        method,
        httpStatus: response.status,
        durationMs,
        data: {
          requestUrl: pathname,
          requestMethod: method,
          redirected: response.redirected,
        },
        traceId,
      });
      return response;
    } catch (error) {
      const durationMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt);
      sendEvent({
        category: 'ERROR',
        type: 'FETCH',
        name: 'CLIENT_FETCH_ERROR',
        status: 'FAILED',
        severity: 'HIGH',
        isHealthy: false,
        feature: pathname.startsWith('/api/auth') ? 'auth' : pathname.startsWith('/api/admin') ? 'admin' : 'network',
        message: `Fetch failed for ${pathname}`,
        method,
        durationMs,
        errorName: error instanceof Error ? error.name : 'FetchError',
        errorCode: error instanceof Error ? error.message : null,
        data: {
          requestUrl: pathname,
          requestMethod: method,
        },
        traceId,
      });
      throw error;
    }
  }) as typeof fetch;
}

export function AppEventClient() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastRouteRef = useRef<string | null>(null);

  useEffect(() => {
    patchClientFetch();
  }, []);

  useEffect(() => {
    const currentRoute = `${pathname || ''}?${searchParams?.toString() || ''}`;
    if (lastRouteRef.current === currentRoute) return;
    lastRouteRef.current = currentRoute;
    sendEvent(buildNavigationPayload(pathname || '/', searchParams?.toString() || ''), { beginTrace: true });
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
      const feature = form.getAttribute('data-feature') || getFeature(form);
      if (isProduction && !feature) return;

      sendEvent({
        category: 'USER_ACTION',
        type: 'FORM_SUBMIT',
        name: 'FORM_SUBMITTED',
        feature: feature || 'form',
        message: form.getAttribute('name') || form.id || window.location.pathname,
        data: {
          action: form.action || null,
          id: form.id || null,
          method: form.method || null,
          classes: form.className || null
        }
      }, { beginTrace: true });
    };

    const onChange = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const payload = buildChangePayload(target);
      if (!payload) return;
      sendEvent(payload);
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    document.addEventListener('change', onChange, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
      document.removeEventListener('change', onChange, true);
    };
  }, []);

  return null;
}
