'use client';

import { PiConnectButton } from '@/components/PiConnectButton';

export default function LoginPageClient() {
  return (
    <div className="card" style={{ maxWidth: 480, margin: '40px auto' }}>
      <div className="section-head compact">
        <div>
          <span className="section-kicker">Pi Sign In</span>
          <h1>Login with Pi</h1>
        </div>
        <p>Open this page in Pi Browser, then continue with Pi authentication.</p>
      </div>

      <div className="card-actions" style={{ marginTop: 16 }}>
        <PiConnectButton className="button primary">
          Login with Pi
        </PiConnectButton>
      </div>
    </div>
  );
}
