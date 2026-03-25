export function getUserAgent(source?: string | null) {
  if (typeof source === "string") return source;
  if (typeof navigator !== "undefined") return navigator.userAgent || '';
  return '';
}

export function isPiBrowserUserAgent(source?: string | null) {
  const userAgent = getUserAgent(source).toLowerCase();
  return userAgent.includes('pibrowser') || userAgent.includes(' pi browser') || userAgent.includes('minepi');
}

export function isIosUserAgent(source?: string | null) {
  const userAgent = getUserAgent(source).toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

export function shouldPreferPiBrowserBearerFallback(source?: string | null) {
  const userAgent = getUserAgent(source);
  return isPiBrowserUserAgent(userAgent) && isIosUserAgent(userAgent);
}
