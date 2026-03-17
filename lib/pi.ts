declare global {
  interface Window {
    Pi?: {
      init: (options: { version: string; sandbox: boolean; apiKey?: string }) => void;
      authenticate: (
        scopes: string[],
        onIncompletePaymentFound?: (payment: unknown) => void
      ) => Promise<{
        accessToken?: string;
        user?: {
          uid?: string;
          username?: string;
          wallet_address?: string;
        };
      }>;
      createPayment?: (
        paymentData: {
          amount: number;
          memo: string;
          metadata: Record<string, unknown>;
        },
        callbacks: {
          onReadyForServerApproval: (paymentId: string) => void;
          onReadyForServerCompletion: (paymentId: string, txid: string) => void;
          onCancel: (paymentId: string) => void;
          onError: (error: Error, payment?: unknown) => void;
        }
      ) => void;
    };
    __piSdkInitialized?: boolean;
  }
}

const PI_SDK_URL = 'https://sdk.minepi.com/pi-sdk.js';

function isSandboxMode() {
  return process.env.NEXT_PUBLIC_PI_SANDBOX === 'true';
}

function getPiApiKey() {
  return process.env.NEXT_PUBLIC_PI_API_KEY || '';
}

function ensureSdkScript() {
  if (typeof window === 'undefined') return;

  const existing = document.querySelector(`script[src="${PI_SDK_URL}"]`) as HTMLScriptElement | null;
  if (existing) return;

  const script = document.createElement('script');
  script.src = PI_SDK_URL;
  script.async = true;
  script.dataset.piSdk = 'true';
  document.head.appendChild(script);
}

export function initializePi() {
  if (typeof window === 'undefined' || !window.Pi) return false;

  try {
    if (!window.__piSdkInitialized) {
      window.Pi.init({
        version: '2.0',
        sandbox: isSandboxMode(),
        ...(getPiApiKey() ? { apiKey: getPiApiKey() } : {})
      });
      window.__piSdkInitialized = true;
    }
    return true;
  } catch (error) {
    console.error('Pi init failed', error);
    return false;
  }
}

export async function waitForPiSdk(timeoutMs = 12000, intervalMs = 250) {
  if (typeof window === 'undefined') return false;

  ensureSdkScript();
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const ready = initializePi();
    if (ready) return true;
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }

  return false;
}

export async function authenticateWithPi() {
  const ready = await waitForPiSdk();
  if (!ready || typeof window === 'undefined' || !window.Pi) {
    throw new Error('Pi SDK not available. Open the app from Pi Browser or Pi Sandbox and try again.');
  }

  const scopes = ['username', 'payments', 'wallet_address'];
  return window.Pi.authenticate(scopes, (payment) => {
    console.log('Incomplete payment found:', payment);
  });
}

export async function createPiPayment(paymentData: { amount: number; memo: string; metadata: Record<string, unknown> }, callbacks: {
  onReadyForServerApproval: (paymentId: string) => void;
  onReadyForServerCompletion: (paymentId: string, txid: string) => void;
  onCancel: (paymentId: string) => void;
  onError: (error: Error, payment?: unknown) => void;
}) {
  const ready = await waitForPiSdk();
  if (!ready || typeof window === 'undefined' || !window.Pi?.createPayment) {
    throw new Error('Pi payment SDK not available. Open the app from Pi Browser or Pi Sandbox and try again.');
  }

  window.Pi.createPayment(paymentData, callbacks);
}
