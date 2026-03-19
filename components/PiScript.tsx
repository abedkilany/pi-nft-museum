'use client';

import Script from 'next/script';

export function PiScript() {
  return (
    <Script
      src="https://sdk.minepi.com/pi-sdk.js"
      strategy="afterInteractive"
      onLoad={() => {
        try {
          const w = window as any;

          if (w.Pi && !w.__pi_initialized__) {
            w.Pi.init({
              version: '2.0',
              sandbox: false,
            });
            w.__pi_initialized__ = true;
            console.log('Pi SDK initialized');
          }
        } catch (error) {
          console.error('Pi SDK init failed', error);
        }
      }}
    />
  );
}