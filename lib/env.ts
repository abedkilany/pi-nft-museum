const isServer = typeof window === 'undefined';

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getEnv(name: string, fallback?: string): string {
  return readEnv(name) ?? fallback ?? '';
}

export function requireEnv(name: string, options?: { minLength?: number; allowInDevelopment?: boolean }): string {
  const value = readEnv(name);
  const minLength = options?.minLength ?? 1;
  const allowInDevelopment = options?.allowInDevelopment ?? false;

  if (value && value.length >= minLength) return value;

  const env = process.env.NODE_ENV || 'development';
  if (allowInDevelopment && env !== 'production') {
    return value ?? '';
  }

  throw new Error(`Missing required environment variable: ${name}`);
}

export function requireOneOfEnv(names: string[], options?: { minLength?: number; allowInDevelopment?: boolean }): string {
  const minLength = options?.minLength ?? 1;
  for (const name of names) {
    const value = readEnv(name);
    if (value && value.length >= minLength) return value;
  }

  const env = process.env.NODE_ENV || 'development';
  if (options?.allowInDevelopment && env !== 'production') {
    return '';
  }

  throw new Error(`Missing required environment variable. Expected one of: ${names.join(', ')}`);
}

export function getBooleanEnv(name: string, fallback = false): boolean {
  const value = readEnv(name);
  if (!value) return fallback;
  return value.toLowerCase() === 'true';
}

export function getCsvEnv(name: string): string[] {
  return getEnv(name)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getAppBaseUrl(): string {
  return (
    getEnv('NEXT_PUBLIC_APP_URL') ||
    getEnv('APP_URL') ||
    (isServer ? 'http://localhost:3000' : window.location.origin)
  );
}

export function getNodeEnv(): string {
  return process.env.NODE_ENV || 'development';
}

export function isProductionEnv(): boolean {
  return getNodeEnv() === 'production';
}

export function getServerEnvSummary() {
  return {
    nodeEnv: getNodeEnv(),
    vercelEnv: getEnv('VERCEL_ENV', 'local'),
    appUrl: getAppBaseUrl(),
    hasDatabaseUrl: Boolean(readEnv('DATABASE_URL')),
    hasAppSessionSecret: Boolean(readEnv('APP_SESSION_SECRET') || readEnv('AUTH_SECRET') || readEnv('NEXTAUTH_SECRET')),
    hasPiApiKey: Boolean(readEnv('NEXT_PUBLIC_PI_API_KEY')),
    hasPiServerApiKey: Boolean(readEnv('PI_SERVER_API_KEY') || readEnv('PI_API_KEY')),
    hasPinataJwt: Boolean(readEnv('PINATA_JWT')),
    hasSentryDsn: Boolean(readEnv('SENTRY_DSN') || readEnv('NEXT_PUBLIC_SENTRY_DSN')),
  };
}
