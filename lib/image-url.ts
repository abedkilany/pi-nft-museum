const SAME_ORIGIN_PREFIXES = ['/', './', '../'];
const IPFS_HOSTNAMES = new Set([
  'gateway.pinata.cloud',
  'ipfs.io',
  'cloudflare-ipfs.com',
  'dweb.link',
]);

function isSameOriginish(url: string) {
  return SAME_ORIGIN_PREFIXES.some((prefix) => url.startsWith(prefix));
}

function shouldProxyAbsoluteUrl(parsed: URL) {
  if (parsed.protocol !== 'https:') return false;
  if (IPFS_HOSTNAMES.has(parsed.hostname)) return true;
  if (parsed.pathname.startsWith('/ipfs/')) return true;
  return false;
}

export function getDisplayImageUrl(rawUrl: string | null | undefined) {
  const url = String(rawUrl || '').trim();
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (isSameOriginish(url)) return url;

  try {
    const parsed = new URL(url);
    if (!shouldProxyAbsoluteUrl(parsed)) return url;
    return `/api/ipfs?url=${encodeURIComponent(parsed.toString())}`;
  } catch {
    return url;
  }
}
