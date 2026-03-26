'use client';

import { useEffect } from 'react';
import { beginClientSpan, beginClientTrace, endClientSpan, sendClientEvent } from '@/lib/observability-client';

const isProduction = process.env.NODE_ENV === 'production';

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

function buildClickPayload(target: HTMLElement) {
  const clickable = target.closest('button, a, img, [role="button"], [data-track-event]') as HTMLElement | null;
  if (!clickable) return null;

  const explicit = clickable.getAttribute('data-track-event');
  const href = clickable instanceof HTMLAnchorElement ? clickable.href : clickable.getAttribute('href');
  const src = clickable instanceof HTMLImageElement ? clickable.currentSrc || clickable.src : clickable.getAttribute('src');
  const entityType = clickable.getAttribute('data-entity-type');
  const entityId = clickable.getAttribute('data-entity-id');
  const feature = clickable.getAttribute('data-feature');

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

export function AppEventClient() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const payload = buildClickPayload(target);
      if (!payload) return;
      beginClientTrace();
      sendClientEvent(payload, { beginSpan: true });
    };

    const onSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null;
      if (!form) return;
      const feature = form.getAttribute('data-feature');
      if (isProduction && !feature) return;

      beginClientTrace();
      sendClientEvent({
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
      }, { beginSpan: true });
    };

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/api/events')) {
        return originalFetch(input, init);
      }

      const method = ((init?.method || (typeof input !== 'string' && !(input instanceof URL) ? input.method : undefined)) || 'GET').toUpperCase();
      const isApiCall = url.includes('/api/');
      const previousSpanId = null;
      const span = isApiCall ? beginClientSpan() : null;

      if (isApiCall && span) {
        sendClientEvent({
          category: 'TRACE',
          type: 'HTTP_REQUEST',
          name: 'client.api.request',
          status: 'STARTED',
          feature: 'network',
          method,
          url,
          traceId: span.traceId,
          spanId: span.spanId,
          parentSpanId: span.parentSpanId,
          data: { phase: 'request', lifecycle: 'start' }
        });
      }

      const headers = isApiCall ? new Headers(init?.headers || (typeof input !== 'string' && !(input instanceof URL) ? input.headers : undefined)) : new Headers(init?.headers);
      if (isApiCall && span) {
        headers.set('X-Trace-Id', span.traceId);
        headers.set('X-Correlation-Id', span.traceId);
        headers.set('X-Session-Id', window.sessionStorage.getItem('app_event_session_id') || 'browser');
        headers.set('X-Span-Id', span.spanId);
        if (span.parentSpanId) headers.set('X-Parent-Span-Id', span.parentSpanId);
      }

      const startedAt = Date.now();
      try {
        const response = await originalFetch(input, { ...init, headers });
        if (isApiCall && span) {
          sendClientEvent({
            category: 'TRACE',
            type: 'HTTP_REQUEST',
            name: 'client.api.request',
            status: response.ok ? 'SUCCESS' : 'FAILED',
            feature: 'network',
            method,
            url,
            httpStatus: response.status,
            durationMs: Date.now() - startedAt,
            traceId: span.traceId,
            spanId: span.spanId,
            parentSpanId: span.parentSpanId,
            data: { phase: 'request', lifecycle: 'complete' }
          });
        }
        return response;
      } catch (error) {
        if (isApiCall && span) {
          sendClientEvent({
            category: 'TRACE',
            type: 'HTTP_REQUEST',
            name: 'client.api.request',
            status: 'FAILED',
            feature: 'network',
            method,
            url,
            durationMs: Date.now() - startedAt,
            traceId: span.traceId,
            spanId: span.spanId,
            parentSpanId: span.parentSpanId,
            errorName: error instanceof Error ? error.name : 'FetchError',
            message: error instanceof Error ? error.message : String(error),
            data: { phase: 'request', lifecycle: 'failed' }
          });
        }
        throw error;
      } finally {
        if (span) {
          endClientSpan(previousSpanId);
        }
      }
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
