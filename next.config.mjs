/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self' https://*.minepi.com https://*.pi.network",
  "img-src 'self' data: blob: https://images.unsplash.com https://*.pinata.cloud https://gateway.pinata.cloud",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline' https://sdk.minepi.com${isDev ? " 'unsafe-eval'" : ''}`,
  "connect-src 'self' https://api.minepi.com https://sdk.minepi.com https://*.minepi.com https://*.pi.network https://*.pinata.cloud https://gateway.pinata.cloud https://socialchain.app",
  "frame-src 'self' https://sdk.minepi.com https://*.pi.network https://*.minepi.com",
  "object-src 'none'",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
  { key: 'Origin-Agent-Cluster', value: '?1' },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'gateway.pinata.cloud' },
      { protocol: 'https', hostname: '**.pinata.cloud' },
    ],
  },
};

export default nextConfig;