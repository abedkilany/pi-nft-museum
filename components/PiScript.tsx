'use client';

import Script from 'next/script';

export function PiScript() {
  return <Script src="https://sdk.minepi.com/pi-sdk.js" strategy="afterInteractive" />;
}
