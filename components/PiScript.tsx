'use client';

import Script from 'next/script';

declare global {
  interface Window {
    Pi?: {
      init: (options: { version: string; sandbox?: boolean }) => void;
      authenticate: (
        scopes: string[],
        onIncompletePaymentFound?: (payment: unknown) => void
      ) => Promise<{ accessToken?: string; user?: { uid?: string; username?: string } }>;
    };
    __pi_initialized__?: boolean;
  }
}

export function PiScript() {
  return (
    <Script
      src="https://sdk.minepi.com/pi-sdk.js"
      strategy="afterInteractive"
      onLoad={() => {
        try {
          if (window.Pi && !window.__pi_initialized__) {
            window.Pi.init({
              version: '2.0',
              sandbox: false,
            });
            window.__pi_initialized__ = true;
            console.log('Pi SDK initialized');
          }
        } catch (error) {
          console.error('Pi SDK init failed', error);
        }
      }}
    />
  );
}