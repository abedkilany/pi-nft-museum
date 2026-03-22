import { NextRequest } from 'next/server';

const ALLOWED_IPFS_HOSTS = new Set([
  'gateway.pinata.cloud',
  'ipfs.io',
  'cloudflare-ipfs.com',
  'dweb.link',
]);

function isPrivateHostname(hostname: string) {
  const value = hostname.trim().toLowerCase();
  return (
    value === 'localhost' ||
    value === '127.0.0.1' ||
    value === '0.0.0.0' ||
    value === '::1' ||
    value.endsWith('.local')
  );
}

function isAllowedIpfsUrl(rawUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') return false;
  if (isPrivateHostname(parsed.hostname)) return false;
  if (ALLOWED_IPFS_HOSTS.has(parsed.hostname)) return true;
  if (parsed.pathname.startsWith('/ipfs/')) return true;
  return false;
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url') || '';
  if (!rawUrl || !isAllowedIpfsUrl(rawUrl)) {
    return new Response('Invalid IPFS URL', { status: 400 });
  }

  const upstream = await fetch(rawUrl, {
    method: 'GET',
    cache: 'force-cache',
    headers: {
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    },
  }).catch(() => null);

  if (!upstream || !upstream.ok || !upstream.body) {
    return new Response('Image fetch failed', { status: upstream?.status || 502 });
  }

  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  const etag = upstream.headers.get('etag');
  const lastModified = upstream.headers.get('last-modified');

  const headers = new Headers();
  headers.set('Content-Type', contentType);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  headers.set('X-Content-Type-Options', 'nosniff');
  if (etag) headers.set('ETag', etag);
  if (lastModified) headers.set('Last-Modified', lastModified);

  return new Response(upstream.body, {
    status: 200,
    headers,
  });
}
