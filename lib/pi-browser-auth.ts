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

  // In Pi Browser on iOS, the reported UA may not include an explicit PiBrowser token.
  // Our traces show iPhone WebKit UAs inside Pi Browser failing to return auth cookies,
  // so we intentionally prefer the bearer fallback for iOS user agents in this app.
  if (isIosUserAgent(userAgent)) return true;

  return isPiBrowserUserAgent(userAgent) && isIosUserAgent(userAgent);
}
