import { NextResponse } from 'next/server';

type SanitizeOptions = {
  maxDepth?: number;
  maxEntries?: number;
  maxArrayLength?: number;
  maxStringLength?: number;
};

const DEFAULTS: Required<SanitizeOptions> = {
  maxDepth: 3,
  maxEntries: 25,
  maxArrayLength: 25,
  maxStringLength: 1000,
};

export function asObject(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function asLimitedString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}…` : trimmed;
}

export function asFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function sanitizeValue(value: unknown, depth: number, options: Required<SanitizeOptions>): unknown {
  if (value == null) return null;
  if (typeof value === 'string') {
    return value.length > options.maxStringLength ? `${value.slice(0, options.maxStringLength)}…` : value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (depth >= options.maxDepth) return '[truncated]';

  if (Array.isArray(value)) {
    return value.slice(0, options.maxArrayLength).map((item) => sanitizeValue(item, depth + 1, options));
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, options.maxEntries);
    return Object.fromEntries(
      entries.map(([key, innerValue]) => [
        key.length > 80 ? `${key.slice(0, 80)}…` : key,
        sanitizeValue(innerValue, depth + 1, options),
      ]),
    );
  }

  return String(value);
}

export function asLimitedRecord(value: unknown, options?: SanitizeOptions) {
  const objectValue = asObject(value);
  if (!objectValue) return null;
  const merged = { ...DEFAULTS, ...(options || {}) };
  return sanitizeValue(objectValue, 0, merged) as Record<string, unknown>;
}

export function enforceMaxContentLength(request: Request, maxBytes: number) {
  const rawLength = request.headers.get('content-length');
  if (!rawLength) return null;

  const contentLength = Number(rawLength);
  if (!Number.isFinite(contentLength) || contentLength <= maxBytes) {
    return null;
  }

  return NextResponse.json(
    { error: 'Payload too large.' },
    { status: 413 },
  );
}
